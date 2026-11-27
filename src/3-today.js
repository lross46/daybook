
/* ---------- navigation ---------- */
const TABS = [["today", "Today", I.today], ["trends", "Trends", I.trend], ["meds", "Meds", I.pill], ["history", "History", I.clock], ["doctor", "Doctor", I.doc]];
const TITLES = { today: "Today", trends: "Trends", meds: "Medicines", timeline: "Timeline", history: "My history", doctor: "My IBD team" };
let tab = "today"; /* the app always opens on Today */
let viewDay = todayIso();
function renderNav() {
  $("#nav").innerHTML = TABS.map(([k, l, p]) => `<button data-tab="${k}" ${k === tab ? 'aria-current="page"' : ""}>${S("0 0 24 24", p, stroke)}${l}</button>`).join("");
}
function render() {
  if (!TITLES[tab]) tab = "today";
  renderNav(); document.documentElement.dataset.page = tab;
  $("#ttl").textContent = TITLES[tab];
  $("#hsub").hidden = tab === "today"; /* Today's date already shows in the day picker */
  $("#hsub").textContent = fmtDay(todayIso()).replace(/^(\w+) /, (m, d) => ({ Sun: "Sunday", Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday" }[d] + " "));
  ({ today: renderToday, trends: renderTrends, meds: renderMeds, history: renderHistory, doctor: renderDoctor })[tab]();
  for (const b of $$('[data-act="listToggle"]')) { const id = b.dataset.fold || "evList", l = $("#" + id); if (foldOpen[tab + "." + id] && l && l.hidden) listToggle(b, true); }
}
function go(t) { tab = t; window.scrollTo(0, 0); render(); }

/* ---------- Today ---------- */
const getDay = (k) => (dayLogged(k) ? data.days[k] : null);
function ensureDay(k) {
  if (!dayLogged(k)) data.days[k] = { visits: [], stools: 0, night: 0, blood: 0, mucus: 0, urg: 0, bristol: null, pain: 0, well: 0, extra: [], tags: [], noteExtra: "", noteTags: "" };
  return data.days[k];
}
function heroHtml() {
  const f = openFlare(), t = todayIso();
  let ring, title, sub, color;
  const r = 52, c = 2 * Math.PI * r;
  if (f) {
    const n = daysBetween(f.start, t) + 1;
    color = "var(--mod)"; title = "In a flare"; sub = `Started ${fmtDay(f.start)}`;
    ring = `<circle cx="66" cy="66" r="${r}" fill="none" stroke="var(--sunk)" stroke-width="14"/><circle cx="66" cy="66" r="${r}" fill="none" stroke="${color}" stroke-width="14" stroke-linecap="round" stroke-dasharray="${c * Math.min(n, 30) / 30} ${c}" transform="rotate(-90 66 66)"/><text x="66" y="56" text-anchor="middle" font-size="17" fill="var(--muted)">Day</text><text x="66" y="96" text-anchor="middle" font-weight="700" font-size="44" fill="var(--fg)">${n}</text>`;
  } else {
    const last = live(data.flares).filter((x) => x.end).sort((a, b) => (a.end < b.end ? 1 : -1))[0];
    const n = last ? daysBetween(last.end, t) : null;
    color = "var(--ok)"; title = "No flare"; sub = last ? `Last flare ended ${fmtDate(last.end)}` : "Tap below if a flare starts";
    ring = `<circle cx="66" cy="66" r="${r}" fill="none" stroke="var(--ok)" stroke-width="14" opacity="${n == null ? .25 : 1}"/>` + (n == null ? `<path d="M46 68l14 14 26-30" fill="none" stroke="var(--ok)" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>` : `<text x="66" y="78" text-anchor="middle" font-weight="700" font-size="${n > 999 ? 30 : 40}" fill="var(--fg)">${n}</text><text x="66" y="98" text-anchor="middle" font-size="12" fill="var(--muted)">days calm</text>`);
  }
  return `<div class="card"><div class="hero">${S("0 0 132 132", ring)}<div style="min-width:0"><div class="label">Right now</div><div class="state" style="color:${color}">${title}</div><div class="sub">${sub}</div></div></div></div>`;
}
function renderToday() {
  const k = viewDay, d = getDay(k) || { stools: 0, night: 0, blood: null, mucus: null, urg: null, bristol: null, pain: 0, well: null, extra: [], tags: [] };
  const isToday = k === todayIso();
  const pick = (key, labels, iconFn, val, cls = "") => `<div class="pick ${cls}" data-pick="${key}">${labels.map((l, i) => `<button aria-pressed="${val === i}" aria-label="${esc(l)}">${iconFn(i)}${l ? `<span>${l}</span>` : ""}</button>`).join("")}</div>`;
  const vs = sortVisits(visitsOf(d));
  const f = openFlare();
  $("#main").innerHTML = `
  <div class="row"><div class="daynav"><button data-act="dayPrev" aria-label="Previous day">‹</button><div><div class="name">${isToday ? "Today" : esc(fmtDay(k))}</div><div class="sub">${isToday ? esc(fmtDate(k)) : dayLogged(k) ? "Logged" : "Not logged"}</div></div><button data-act="dayNext" aria-label="Next day" ${isToday ? "disabled" : ""}>›</button></div>${isToday ? "" : `<button class="linkbtn" data-act="dayToday">Back to today</button>`}</div>
  ${isToday ? flareBar(f) : ""}
  <div class="card">
    <div class="row"><div><div class="label">Stools ${isToday ? "today" : "that day"}</div><div class="sub">${vs.length ? "Tap one to add type, blood, mucus or urgency" : "Tap + Stool each time you go"}</div></div><div class="count">${d.stools}</div></div>
    ${vs.length ? `<div class="visits">${vs.map((v) => visitRow(v)).join("")}</div>` : ""}
    <button class="btn primary" data-act="visitAdd">+ Stool</button>
    ${vs.length ? `<div class="vsum">${daySummary(d, vs)}</div>` : ""}
  </div>
  <div class="card">
    <div class="row"><div class="label">Tummy pain</div><div class="sub" id="painTxt"></div></div>
    <div class="painbar"><div class="track"></div><div class="knob" id="knob"></div><input id="pain" type="range" min="0" max="10" step="1" value="${d.pain || 0}" aria-label="Pain from 0 to 10"></div>
  </div>
  <div class="card"><div class="label">How do you feel?</div>${pick("well", WELL, face, d.well, "faces")}</div>
  <div class="card"><div class="label">Anywhere else?</div><div class="tags" data-multi="extra">${EXTRA.map(([key, l]) => `<button data-v="${key}" aria-pressed="${(d.extra || []).includes(key)}">${ico(key)}${l}</button>`).join("")}</div>${noteBlock("noteExtra", d.noteExtra, "e.g. left knee sore since Tuesday")}</div>
  <div class="card"><div class="label">Anything that might matter?</div><div class="tags" data-multi="tags">${TAGS.map(([key, l]) => `<button data-v="${key}" aria-pressed="${(d.tags || []).includes(key)}">${ico(key)}${l}</button>`).join("")}</div>${noteBlock("noteTags", d.noteTags, "e.g. what you ate, how you slept")}</div>
  <div class="saved" id="savedTxt">${dayLogged(k) ? "Saved on this phone as you go" : "Nothing logged yet. Everything saves as you tap."}</div>
  ${dayLogged(k) ? `<button class="linkbtn" style="align-self:center;color:var(--muted)" data-act="clearDay">Clear this day</button>` : ""}`;
  paintPain();
}
/* flare status as a slim banner under the date, with its button right there */
function flareBar(f) {
  if (f) return `<div class="flarebar on"><span class="fi"></span><span class="grow"><b>In a flare · day ${daysBetween(f.start, todayIso()) + 1}</b><span class="sub">Since ${esc(fmtDay(f.start))}</span></span><button class="btn flare" data-act="flareEnd">It ended today</button></div>`;
  const last = live(data.flares).filter((x) => x.end).sort((a, b) => (a.end < b.end ? 1 : -1))[0];
  return `<div class="flarebar"><span class="fi"></span><span class="grow"><b>Not in a flare</b><span class="sub">${last ? `Last one ended ${esc(fmtRough(last.end))}` : "No flares logged"}</span></span><button class="btn flare" data-act="flareStart">Flare started</button></div>`;
}
function noteBlock(key, val, ph) {
  return val ? `<textarea class="note" data-note="${key}" placeholder="${esc(ph)}">${esc(val)}</textarea>` : `<button class="noteBtn" data-act="openNote" data-key="${key}">+ Add a note</button><textarea class="note" data-note="${key}" hidden placeholder="${esc(ph)}"></textarea>`;
}
const PAIN_WORDS = ["None", "Very mild", "Mild", "Mild", "Moderate", "Moderate", "Strong", "Strong", "Severe", "Severe", "Worst"];
function paintPain() {
  const p = $("#pain"); if (!p) return; const v = +p.value, k = $("#knob");
  k.textContent = v; k.style.left = `calc(20px + ${v / 10} * (100% - 40px))`; $("#painTxt").textContent = PAIN_WORDS[v];
}
/* ---------- one entry per stool ----------
   Each visit: time, woke at night, type (Bristol 1-7), blood, mucus, urgency (all optional).
   The day's totals are worked out from the visits, so the day score works as before:
   urgency and mucus = worst of the day; blood follows the score's own wording
   (streaks only = Streaks; real blood in under half the visits = Some; half or more = A lot). */
const isNightTime = (t) => { if (!t) return false; const h = +t.slice(0, 2); return h >= 23 || h < 6; };
const nowHM = () => { const n = new Date(); return pad(n.getHours()) + ":" + pad(n.getMinutes()); };
/* days logged before visits existed: shown as that many visits carrying the day's values */
function visitsOf(d) {
  if (!d) return [];
  if (d.visits) return d.visits;
  const out = [];
  for (let i = 0; i < (d.stools || 0); i++) out.push({ id: "L" + i, t: "", night: i < (d.night || 0), bristol: d.bristol ?? null, blood: d.blood === 3 || i === 0 ? d.blood || 0 : 0, mucus: i === 0 ? d.mucus || 0 : 0, urg: i === 0 ? d.urg || 0 : 0 });
  return out;
}
const sortVisits = (vs) => [...vs].sort((a, b) => (a.t || "") < (b.t || "") ? -1 : (a.t || "") > (b.t || "") ? 1 : 0);
function sumVisits(d) {
  const vs = d.visits || [], n = vs.length, mx = (k) => Math.max(0, ...vs.map((v) => v[k] || 0));
  d.stools = n; d.night = vs.filter((v) => v.night).length;
  d.urg = mx("urg"); d.mucus = mx("mucus");
  const frank = vs.filter((v) => (v.blood || 0) >= 2).length;
  d.blood = frank ? (frank * 2 >= n ? 3 : 2) : mx("blood") ? 1 : 0;
  d.bloodN = vs.filter((v) => v.blood > 0).length; d.mucusN = vs.filter((v) => v.mucus > 0).length;
  const types = vs.map((v) => v.bristol).filter((x) => x != null), cnt = {};
  for (const t of types) cnt[t] = (cnt[t] || 0) + 1;
  d.bristol = types.length ? +Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a] || b - a)[0] : null;
}
function visitRow(v) {
  const marks = [v.night ? S("0 0 24 24", '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="var(--med2)"/>', 'class="vm"') : "",
    v.blood ? S("0 0 40 40", `<path d="${dropPath}" fill="var(--blood)"/>`, 'class="vm"') + `<span class="vt">${BLOOD[v.blood]}</span>` : "",
    v.mucus ? S("0 0 40 40", `<path d="${mucusPath}" fill="var(--mucus)"/>`, 'class="vm"') + `<span class="vt">${MUCUS[v.mucus]}</span>` : "",
    v.urg ? `<span class="vt" style="color:${SC[v.urg]}">${URG[v.urg]}</span>` : ""].join("");
  return `<button class="visit" data-visit="${v.id}"><span class="vb">${v.bristol ? brIco(v.bristol - 1) : `<span class="vdot"></span>`}</span><span class="vtime">${v.t || "–"}</span><span class="vmarks">${v.bristol ? `<span class="vt">Type ${v.bristol}</span>` : ""}${marks}</span><span class="chev">›</span></button>`;
}
function daySummary(d, vs) {
  const n = vs.length, b = vs.filter((v) => v.blood > 0).length, m = vs.filter((v) => v.mucus > 0).length, ni = vs.filter((v) => v.night).length;
  return [ni ? `${ni} at night` : "", `Blood: ${BLOOD[d.blood || 0]}${b ? ` (${b} of ${n})` : ""}`, `Mucus: ${MUCUS[d.mucus || 0]}${m ? ` (${m} of ${n})` : ""}`, `Urgency: ${URG[d.urg || 0]}`].filter(Boolean).join(" · ");
}
/* make the day's visit list real (converting an old day) before changing it */
function dayVisits() { const d = ensureDay(viewDay); if (!d.visits) d.visits = visitsOf(d).map((v) => ({ ...v, id: uid() })); return d; }
function visitAdd() {
  const d = dayVisits(), today = viewDay === todayIso(), t = today ? nowHM() : "";
  d.visits.push({ id: uid(), t, night: isNightTime(t), bristol: null, blood: 0, mucus: 0, urg: 0 });
  sumVisits(d); touchDay(); renderToday();
  toast(t ? `Stool logged at ${t}. Tap it to add details` : "Stool logged. Tap it to add details");
}
const vpick = (key, labels, iconFn, val, cls = "") => `<div class="pick ${cls}" data-vpick="${key}">${labels.map((l, i) => `<button aria-pressed="${val === i}" aria-label="${esc(l)}">${iconFn(i)}${l ? `<span>${l}</span>` : ""}</button>`).join("")}</div>`;
function visitOpen(id) {
  const d = getDay(viewDay), list = visitsOf(d), i = list.findIndex((x) => x.id === id); if (i < 0) return;
  let v = list[i]; if (!d.visits) { dayVisits(); v = d.visits[i]; }
  openSheet(`${sheetHead("Stool", esc(fmtDay(viewDay)))}
    <div class="row"><label class="f" style="flex:1"><span>Time</span><input id="vTime" type="time" value="${v.t || ""}"></label><label class="qrow" style="margin-top:18px"><input type="checkbox" id="vNight" ${v.night ? "checked" : ""}><span>Woke me up at night</span></label></div>
    <div class="f"><span>Type</span>${vpick("bristol", BR.map((_, i) => String(i + 1)), brIco, v.bristol == null ? null : v.bristol - 1, "b7")}<div class="row sub"><span>Hard</span><span>Normal</span><span>Watery</span></div></div>
    <div class="f"><span>Blood</span>${vpick("blood", BLOOD, bloodIco, v.blood || 0, "blood")}</div>
    <div class="f"><span>Mucus</span>${vpick("mucus", MUCUS, mucusIco, v.mucus || 0, "mucus")}</div>
    <div class="f"><span>Urgency</span>${vpick("urg", URG, urgIco, v.urg || 0)}</div>
    <button class="btn primary" data-act="close">Done</button>
    <button class="btn danger" data-act="visitDel" data-id="${v.id}">Delete this one</button>`, () => { if (tab === "today") renderToday(); });
  $("#sheet").dataset.vid = v.id;
}
const curVisit = () => { const d = getDay(viewDay), id = $("#sheet").dataset.vid; return d && d.visits && d.visits.find((x) => x.id === id); };
function visitChanged() { const d = ensureDay(viewDay); sumVisits(d); touchDay(); }
function visitDel(id) { const d = dayVisits(); d.visits = d.visits.filter((v) => v.id !== id); sumVisits(d); touchDay(); closeSheet(); toast("Deleted"); }
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-vpick] button"); if (!b) return;
  const v = curVisit(); if (!v) return;
  const g = b.parentElement, key = g.dataset.vpick, i = [...g.children].indexOf(b);
  if (key === "bristol") v.bristol = v.bristol === i + 1 ? null : i + 1; else v[key] = i;
  [...g.children].forEach((x, j) => x.setAttribute("aria-pressed", key === "bristol" ? v.bristol === j + 1 : v[key] === j));
  visitChanged();
});
document.addEventListener("change", (e) => {
  const v = (e.target.id === "vTime" || e.target.id === "vNight") && curVisit(); if (!v) return;
  if (e.target.id === "vTime") { v.t = e.target.value; v.night = isNightTime(v.t); $("#vNight").checked = v.night; }
  else v.night = e.target.checked;
  visitChanged();
});
function touchDay() { const d = ensureDay(viewDay); stamp(d); save(); const s = $("#savedTxt"); if (s) s.textContent = "Saved on this phone as you go"; return d; }

document.addEventListener("click", (e) => {
  if (tab !== "today") return;
  const vb = e.target.closest("[data-visit]");
  if (vb) { visitOpen(vb.dataset.visit); return; }
  const pb = e.target.closest("[data-pick] button");
  if (pb) {
    const g = pb.parentElement, key = g.dataset.pick, i = [...g.children].indexOf(pb), d = ensureDay(viewDay);
    const val = key === "bristol" ? i + 1 : i;
    d[key] = d[key] === val && key === "bristol" ? null : val;
    [...g.children].forEach((b, j) => b.setAttribute("aria-pressed", key === "bristol" ? d.bristol === j + 1 : d[key] === j));
    touchDay(); return;
  }
  const mb = e.target.closest("[data-multi] button");
  if (mb) {
    const key = mb.parentElement.dataset.multi, d = ensureDay(viewDay), v = mb.dataset.v;
    d[key] = d[key] || []; d[key] = d[key].includes(v) ? d[key].filter((x) => x !== v) : [...d[key], v];
    mb.setAttribute("aria-pressed", d[key].includes(v)); touchDay(); return;
  }
});
document.addEventListener("input", (e) => {
  if (e.target.id === "pain") { paintPain(); }
  if (e.target.dataset && e.target.dataset.note) { const d = ensureDay(viewDay); d[e.target.dataset.note] = e.target.value; clearTimeout(e.target._t); e.target._t = setTimeout(touchDay, 500); }
});
document.addEventListener("change", (e) => { if (e.target.id === "pain") { const d = ensureDay(viewDay); d.pain = +e.target.value; touchDay(); } });
