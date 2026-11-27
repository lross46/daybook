"use strict";
/* Gut Log: a personal log for ulcerative colitis. Data lives on this phone and,
   if set up, is synced to a private GitHub repo as one encrypted file. */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};

/* ---------- dates ---------- */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_L = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseIso = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const todayIso = () => iso(new Date());
const addDays = (s, n) => { const d = parseIso(s); d.setDate(d.getDate() + n); return iso(d); };
const daysBetween = (a, b) => Math.round((parseIso(b) - parseIso(a)) / 864e5);
const fmtDay = (s) => { const d = parseIso(s); return `${DOW[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`; };
const fmtDate = (s) => { if (!s) return ""; const d = parseIso(s); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
/* rough dates: "2019", "2019-04" or "2019-04-12" */
const fmtRough = (s) => { if (!s) return "date not set"; const p = s.split("-"); if (p.length === 1) return p[0]; if (p.length === 2) return `${MONTHS[+p[1] - 1]} ${p[0]}`; return fmtDate(s); };
const roughYear = (s) => { if (!s) return null; const p = s.split("-").map(Number); return p[0] + ((p[1] || 7) - 1) / 12 + ((p[2] || 15) - 1) / 365; };
const roughSort = (s) => (s || "0000").padEnd(10, "-99");
const roughLo = (s) => (s || "0000").padEnd(10, "-00");

/* ---------- data ---------- */
const EMPTY = () => ({ v: 1, days: {}, meds: [], tests: [], moments: [], flares: [], questions: [], profile: {}, me: {}, helpline: {}, at: 0 });
let data = LS.get("gl.data", null) || EMPTY();
for (const k of Object.keys(EMPTY())) if (data[k] === undefined) data[k] = EMPTY()[k];
let dirty = LS.get("gl.dirty", false);
function save(msg) {
  data.at = Date.now();
  LS.set("gl.data", data);
  dirty = true; LS.set("gl.dirty", true);
  if (msg) toast(msg);
  if (typeof scheduleSync === "function") scheduleSync();
}
const live = (arr) => arr.filter((x) => !x.del);
const stamp = (o) => { o.at = Date.now(); return o; };

/* ---------- reference lists ---------- */
const STEROIDS = ["prednisolone", "prednisone", "budesonide", "hydrocortisone", "methylprednisolone", "beclometasone", "beclomethasone"];
const isSteroid = (name) => STEROIDS.some((s) => (name || "").toLowerCase().includes(s));
const KNOWN_MEDS = ["Mesalazine", "Sulfasalazine", "Balsalazide", "Olsalazine", "Prednisolone", "Budesonide", "Hydrocortisone", "Beclometasone", "Azathioprine", "Mercaptopurine", "Methotrexate", "Ciclosporin", "Tacrolimus", "Infliximab", "Adalimumab", "Golimumab", "Vedolizumab", "Ustekinumab", "Mirikizumab", "Risankizumab", "Guselkumab", "Tofacitinib", "Filgotinib", "Upadacitinib", "Ozanimod", "Etrasimod", "Vitamin D", "Iron", "Folic acid", "Loperamide"];
const FORMS = ["Tablet", "Rectal", "Injection", "Drip"];
const WHY = ["Didn't work", "Stopped working", "Side effects", "Course finished", "Switched", "Other"];
const TAGS = [["lowmood", "Low mood"], ["anxious", "Anxious / stress"], ["sleep", "Bad sleep"], ["ill", "Ill / infection"], ["alcohol", "High alcohol"], ["food", "Unusual food"], ["othertag", "Other"]];
const EXTRA = [["joint", "Joints"], ["eye", "Eyes"], ["skin", "Skin"], ["mouth", "Mouth ulcers"]];
const EXTENT = ["Rectum only", "Left side", "Whole colon"];
const BLOOD = ["None", "Streaks", "Some", "A lot"];
const MUCUS = ["None", "A little", "Some", "A lot"];
const URG = ["Normal", "Hurry", "Rush", "Accident"];
const WELL = ["Good", "OK", "Poor", "Bad"];
const STATE = ["Remission", "Mild", "Moderate", "Severe"];
const SC = ["var(--ok)", "var(--mild)", "var(--mod)", "var(--sev)"];
const SC_HEX = ["#2f9a58", "#d39b16", "#e0702f", "#c4353f"];
const MED_COLORS = ["var(--med1)", "var(--med2)", "var(--med3)", "var(--med4)", "var(--mod)", "var(--sev)", "var(--mild)", "var(--ok)"];
const MED_HEX = ["#3f7fd1", "#8d5bd0", "#e0a21a", "#1f9a8a", "#e0702f", "#c4353f", "#d39b16", "#2f9a58"];

/* SCCAI (Simple Clinical Colitis Activity Index) from one day's log */
function sccai(d) {
  if (!d) return null;
  const night = d.night || 0, dayStools = Math.max(0, (d.stools || 0) - night);
  const f = dayStools <= 3 ? 0 : dayStools <= 6 ? 1 : dayStools <= 9 ? 2 : 3;
  const n = night === 0 ? 0 : night <= 3 ? 1 : 2;
  return f + n + (d.urg || 0) + (d.blood || 0) + (d.well || 0) + (d.extra || []).length;
}
const lvl = (s) => (s == null ? null : s <= 2 ? 0 : s <= 5 ? 1 : s <= 11 ? 2 : 3);
const dayLogged = (k) => data.days[k] && !data.days[k].del;

/* ---------- flares ---------- */
const openFlare = () => live(data.flares).find((f) => !f.end);
const inFlare = (k) => live(data.flares).some((f) => roughLo(f.start) <= k && (!f.end || roughSort(f.end) >= k));

/* ---------- toast & sheet ---------- */
function toast(m) { const t = $("#toast"); t.textContent = m; t.classList.add("on"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("on"), 2400); }
let sheetOnClose = null;
function openSheet(html, onClose) {
  const s = $("#sheet"); s.innerHTML = `<div class="grab"></div>${html}`; s.hidden = false; $("#scrim").hidden = false; s.scrollTop = 0; sheetOnClose = onClose || null;
}
function closeSheet() { $("#sheet").hidden = true; $("#scrim").hidden = true; $("#sheet").innerHTML = ""; const f = sheetOnClose; sheetOnClose = null; if (f) f(); }
const sheetHead = (title, sub = "") => `<div class="row"><div><h2>${esc(title)}</h2>${sub ? `<div class="sub">${sub}</div>` : ""}</div><button class="btn small" data-act="close">Close</button></div>`;
