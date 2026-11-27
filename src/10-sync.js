/* ---------- Locked sync: one encrypted file in a private GitHub repo ----------
   The log is encrypted on the phone (AES-GCM, key from the passphrase via PBKDF2)
   before it is sent. GitHub only ever holds the scrambled file. */
const API = "https://api.github.com";
const VAULT_PATH = "data/vault.enc";
const ITER = 600000;
let sync_ = LS.get("gl.sync", { repo: "", token: "", pass: "" });
let sha = LS.get("gl.sha", null);
const connected = () => !!(sync_.repo && sync_.token && sync_.pass);

const u8b64 = (u) => { let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
const b64u8 = (b) => { const s = atob(b.replace(/\s/g, "")); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; };
const keyCache = {};
async function deriveKey(pass, saltB64, iter) {
  const ck = saltB64 + ":" + iter + ":" + pass.length;
  if (keyCache[ck] && keyCache[ck].pass === pass) return keyCache[ck].key;
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pass), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt: b64u8(saltB64), iterations: iter }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  keyCache[ck] = { pass, key };
  return key;
}
async function lock(obj, pass, saltB64) {
  saltB64 = saltB64 || u8b64(crypto.getRandomValues(new Uint8Array(16)));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pass, saltB64, ITER);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(obj))));
  return JSON.stringify({ format: "vault", v: 1, kdf: "PBKDF2-SHA256", iter: ITER, cipher: "AES-256-GCM", salt: saltB64, iv: u8b64(iv), ct: u8b64(ct) });
}
async function unlock(text, pass) {
  let v; try { v = JSON.parse(text); } catch { throw new Error("the saved file isn't a Gut Log vault"); }
  if (v.format !== "vault" || !v.ct) throw new Error("the saved file isn't a Gut Log vault");
  const key = await deriveKey(pass, v.salt, v.iter || ITER);
  let plain;
  try { plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64u8(v.iv) }, key, b64u8(v.ct)); }
  catch { const e = new Error("passphrase doesn't open the saved data"); e.badPass = true; throw e; }
  return { doc: JSON.parse(new TextDecoder().decode(plain)), salt: v.salt };
}

function gh(path, opts = {}) {
  return fetch(API + path, { ...opts, cache: "no-store", referrerPolicy: "no-referrer", headers: { Authorization: "Bearer " + sync_.token, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", ...(opts.headers || {}) } });
}
function ghError(status) {
  if (status === 401) return "access key not accepted (expired or mistyped)";
  if (status === 403) return "access key lacks permission for the repo";
  if (status === 404) return "repo not found for this key";
  return "GitHub error " + status;
}
const b64text = (b) => new TextDecoder().decode(b64u8(b));
async function pullRemote() {
  const r = await gh(`/repos/${sync_.repo}/contents/${VAULT_PATH}`);
  if (r.status === 404) {
    const rr = await gh(`/repos/${sync_.repo}`);
    if (!rr.ok) throw new Error(ghError(rr.status));
    const info = await rr.json();
    if (!info.private) throw new Error("that repo is public. Use a private repo");
    return { doc: null, sha: null, salt: null };
  }
  if (!r.ok) throw new Error(ghError(r.status));
  const j = await r.json();
  let text = j.content ? b64text(j.content) : "";
  if (!text) { const r2 = await gh(`/repos/${sync_.repo}/git/blobs/${j.sha}`); if (!r2.ok) throw new Error(ghError(r2.status)); text = b64text((await r2.json()).content); }
  const { doc, salt } = await unlock(text, sync_.pass);
  return { doc, sha: j.sha, salt };
}
async function pushRemote(salt) {
  const who = { name: "lross46", email: "347590180+lross46@users.noreply.github.com" };
  const text = await lock(data, sync_.pass, salt);
  const body = { message: "Update data", content: btoa(text), author: who, committer: who };
  if (sha) body.sha = sha;
  const r = await gh(`/repos/${sync_.repo}/contents/${VAULT_PATH}`, { method: "PUT", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
  if (r.status === 409 || r.status === 422) return false;
  if (!r.ok) throw new Error(ghError(r.status));
  sha = (await r.json()).content.sha; LS.set("gl.sha", sha);
  return true;
}

/* merge two copies: newest edit of each item wins, deletions are kept as markers */
function mergeList(a = [], b = []) {
  const m = new Map(); for (const x of a) m.set(x.id, x);
  for (const y of b) { const x = m.get(y.id); if (!x || (y.at || 0) > (x.at || 0)) m.set(y.id, y); }
  return [...m.values()];
}
const newer = (x, y) => ((y?.at || 0) > (x?.at || 0) ? y : x);
function merge(a, b) {
  const out = EMPTY();
  out.days = { ...a.days }; for (const [k, d] of Object.entries(b.days || {})) out.days[k] = newer(out.days[k], d);
  for (const k of ["meds", "tests", "moments", "flares", "questions"]) out[k] = mergeList(a[k], b[k]);
  for (const k of ["profile", "me", "helpline"]) out[k] = newer(a[k] || {}, b[k] || {});
  out.at = Math.max(a.at || 0, b.at || 0);
  return out;
}

let syncing = false, again = false, syncTimer = null, syncStatus = { s: "off", msg: "", at: LS.get("gl.syncedAt", 0) };
function syncText() {
  if (!connected()) return "Not connected. Your log is saved on this phone only.";
  if (syncStatus.s === "err") return "Last sync failed: " + syncStatus.msg + ". Your changes are safe on this phone.";
  if (syncStatus.s === "offline") return "Offline. Changes are saved on this phone and will sync later.";
  return syncStatus.at ? "Locked copy last saved " + new Date(syncStatus.at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) + "." : "Not synced yet.";
}
function setSync(s, msg = "") {
  syncStatus.s = s; syncStatus.msg = msg;
  if (s === "ok") { syncStatus.at = Date.now(); LS.set("gl.syncedAt", syncStatus.at); }
  const b = $("#syncBtn"); if (!b) return;
  b.className = "hdrbtn " + ({ off: "off", err: "err", offline: "err" }[s] || "");
  $("#syncTxt").textContent = { off: "On phone only", busy: "Syncing…", ok: dirty ? "Saved on phone" : "Locked & synced", err: "Sync problem", offline: "Offline" }[s];
  const i = $("#syncInfo"); if (i) i.textContent = syncText();
}
function scheduleSync(ms = 15000) { clearTimeout(syncTimer); if (connected()) { syncTimer = setTimeout(sync, ms); setSync(syncStatus.s === "busy" ? "busy" : syncStatus.s === "off" ? "ok" : syncStatus.s); } }
function flushSync() { if (dirty && connected()) { clearTimeout(syncTimer); sync(); } }
async function sync() {
  if (!connected()) { setSync("off"); return false; }
  if (syncing) { again = true; return false; }
  syncing = true; setSync("busy");
  let ok = false;
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const { doc, sha: rsha, salt } = await pullRemote();
      if (doc && rsha !== sha) { data = merge(data, doc); LS.set("gl.data", data); }
      sha = rsha; LS.set("gl.sha", sha);
      if (!dirty && doc) { ok = true; break; }
      if (await pushRemote(salt)) { dirty = false; LS.set("gl.dirty", false); ok = true; break; }
    }
    setSync(ok ? "ok" : "err", ok ? "" : "the saved copy kept changing");
    if ($("#sheet").hidden) render();
  } catch (e) {
    setSync(navigator.onLine === false ? "offline" : "err", e.message);
  } finally {
    syncing = false;
    if (again) { again = false; sync(); }
  }
  return ok;
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") flushSync();
  else { viewDay = viewDay > todayIso() ? todayIso() : viewDay; if (connected() && !syncing) sync(); }
});
window.addEventListener("online", () => flushSync());

/* ---------- Settings ---------- */
function settingsSheet() {
  openSheet(`${sheetHead("Sync and settings")}
  <div class="card" style="margin:0;gap:6px"><div class="row" style="justify-content:flex-start;gap:8px"><span style="color:var(--accent);display:flex">${ico("lock", `style="width:20px;height:20px"`)}</span><b>${connected() ? "Locked sync is on" : "Saved on this phone only"}</b></div><div class="sub" id="syncInfo">${esc(syncText())}</div></div>
  <div class="sub">Your log is scrambled on this phone with your passphrase, then saved as one file in your own private GitHub repo. Without the passphrase nobody can read it, including GitHub.</div>
  <label class="f"><span>Private repo</span><input id="sRepo" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="lross46/your-private-repo" value="${esc(sync_.repo)}"></label>
  <label class="f"><span>GitHub access key</span><input id="sTok" type="password" autocomplete="off" placeholder="github_pat_…" value="${esc(sync_.token)}"></label>
  <label class="f"><span>Passphrase</span><input id="sPass" type="password" autocomplete="new-password" placeholder="at least 12 characters" value="${esc(sync_.pass)}"></label>
  <label class="qrow"><input type="checkbox" id="sShow"><span>Show what I typed</span></label>
  <div class="warn">If you lose the passphrase, the copy on GitHub can't be opened by anyone. Keep it in your password manager.</div>
  <div class="sub" id="sErr" hidden style="color:var(--sev)"></div>
  <button class="btn primary" data-act="syncSave">${connected() ? "Save and sync now" : "Turn on locked sync"}</button>
  ${connected() ? `<button class="btn" data-act="syncOff">Turn off sync on this phone</button>` : ""}
  <div class="sub">On iPhone, the Home Screen app keeps its own storage, separate from Safari. Set this up inside the Home Screen app.</div>
  <div class="label" style="margin-top:8px">This phone</div>
  <button class="btn danger" data-act="wipe">Delete everything on this phone</button>
  <div class="sub">App version 46</div>
  <div class="sub">Gut Log is a personal diary to share with your IBD team. It isn't medical advice and doesn't replace your doctor or nurse.</div>`);
}
document.addEventListener("change", (e) => { if (e.target.id === "sShow") for (const id of ["#sTok", "#sPass"]) $(id).type = e.target.checked ? "text" : "password"; });
async function syncSave() {
  const repo = $("#sRepo").value.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\.git$|\/$/g, ""), token = $("#sTok").value.trim(), pass = $("#sPass").value;
  const err = (t) => { const x = $("#sErr"); x.textContent = t; x.hidden = false; };
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) return err("Repo should look like owner/name.");
  if (!token) return err("Paste the access key.");
  if (pass.length < 12) return err("Use a passphrase of at least 12 characters.");
  const changed = repo !== sync_.repo;
  sync_ = { repo, token, pass }; LS.set("gl.sync", sync_);
  if (changed) { sha = null; LS.del("gl.sha"); }
  dirty = true; LS.set("gl.dirty", true);
  const b = $('#sheet [data-act="syncSave"]'); b.disabled = true; b.innerHTML = `<span class="spin"></span> Locking and syncing…`;
  const ok = await sync();
  if (ok) { toast("Locked sync is on"); closeSheet(); render(); return; }
  b.disabled = false; b.textContent = "Try again";
  err("Couldn't sync: " + (syncStatus.msg || "unknown problem") + ".");
}
function syncOff() {
  sync_ = { repo: sync_.repo, token: "", pass: "" }; LS.set("gl.sync", sync_);
  setSync("off"); toast("Sync off. Log stays on this phone"); closeSheet();
}
function wipe() {
  for (const k of ["gl.data", "gl.dirty", "gl.sha", "gl.sync", "gl.syncedAt", "gl.tab", "gl.period"]) LS.del(k);
  data = EMPTY(); dirty = false; sha = null; sync_ = { repo: "", token: "", pass: "" };
  setSync("off"); closeSheet(); tab = "today"; render(); toast("Everything on this phone deleted");
}
