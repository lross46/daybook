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
const S=(vb,inner,extra='')=>`<svg viewBox="${vb}" ${extra}>${inner}</svg>`;
const stroke='fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
// ---------- icons ----------
const I={
  sleep:'<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  stress:'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  alcohol:'<path d="M8 3h8l-1 7a3 3 0 0 1-6 0zM12 13v7M8 21h8"/>',
  spicy:'<path d="M14 6c4 1 6 5 4 10s-9 6-12 3c4 0 7-3 7-8 0-2 0-4 1-5zM14 6c0-2 1-3 3-3"/>',
  othertag:'<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  food:'<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 1-3 4-3 8h3v10"/>',
  dairy:'<path d="M8 2h8M9 2v3l-2 4v13h10V9l-2-4V2M7 13h10"/>',
  coffee:'<path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 10h1a3 3 0 0 1 0 6h-1M8 2v3M12 2v3"/>',
  travel:'<path d="M2 16l20-8-3-2-7 3-6-4-2 1 4 5-4 2-2-1-1 1 3 3z"/>',
  sport:'<circle cx="14" cy="4" r="2"/><path d="M6 21l4-6 3 2 1 4M10 15l1-6-4 1-2 3M11 9l4 1 2 3 3 1"/>',
  hospital:'<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 7v10M7 12h10"/>',
  scope:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/>',
  pill:'<rect x="2" y="8" width="20" height="8" rx="4"/><path d="M12 8v8"/>',
  flag:'<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  drop:'<path d="M12 3s7 7.5 7 12a7 7 0 0 1-14 0c0-4.5 7-12 7-12z"/>',
  toilet:'<path d="M6 3h5v8H6zM4 11h16a8 8 0 0 1-8 8h-1l1 2H8l1-3a8 8 0 0 1-5-7z"/>',
  moon:'<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  bolt:'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  check:'<path d="M5 12l5 5 9-10"/>',
  joint:'<path d="M9 2v7a3 3 0 0 0 0 6v7M15 2v7a3 3 0 0 1 0 6v7"/><circle cx="12" cy="12" r="2"/>',
  eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  skin:'<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="9" cy="9" r="1.5"/><circle cx="15" cy="13" r="2"/><circle cx="9" cy="16" r="1"/>',
  mouth:'<path d="M3 12c3-4 15-4 18 0-3 5-15 5-18 0z"/><circle cx="14" cy="13" r="1.3"/>',
  phone:'<path d="M5 3h4l2 5-3 2a12 12 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
  cal:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  q:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 1-1 1.7M12 17h.01"/>',
  lowmood:'<path d="M7 15a4 4 0 0 1 .5-8A5.5 5.5 0 0 1 18 8a3.5 3.5 0 0 1 0 7z"/><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3"/>',
  anxious:'<circle cx="12" cy="12" r="9"/><path d="M8 16c1-1 2 1 3 0s2 1 3 0 2 1 2 0M9 10h.01M15 10h.01"/>',
  ill:'<path d="M14 14.8V4a2 2 0 0 0-4 0v10.8a4 4 0 1 0 4 0z"/><path d="M12 9v7"/>',
  nsaid:'<circle cx="12" cy="12" r="8"/><path d="M6.5 17.5l11-11"/>',
  steroid:'<path d="M12 2l2.5 6.5L21 9l-5 4.5L17.5 21 12 17l-5.5 4L8 13.5 3 9l6.5-.5z"/>'
};
const ico=(k,size='')=>S('0 0 24 24',I[k],`${stroke} ${size}`);

// Blood drops: empty with slash, streak, half, full
const dropPath='M20 4s12 13 12 21a12 12 0 0 1-24 0C8 17 20 4 20 4z';
const bloodIco=(n)=>{const id='bg'+n;const fill=[0,0,.5,1][n];
  let s=`<defs><linearGradient id="${id}" x1="0" y1="1" x2="0" y2="0"><stop offset="${fill}" stop-color="var(--blood)"/><stop offset="${fill}" stop-color="var(--blood)" stop-opacity="0"/></linearGradient></defs>`;
  s+=`<path d="${dropPath}" fill="url(#${id})" stroke="var(--blood)" stroke-width="2.5"/>`;
  if(n===0)s+=`<path d="M10 34L30 10" stroke="var(--muted)" stroke-width="2.5" stroke-linecap="round"/>`;
  if(n===1)s+=`<path d="M16 22v8M21 20v10M25 24v5" stroke="var(--blood)" stroke-width="2.5" stroke-linecap="round"/>`;
  return S('0 0 40 40',s)};
// Urgency: chevrons
const urgIco=n=>{if(n===0)return S('0 0 40 40','<path d="M8 22c4-5 8-5 12 0s8 5 12 0" fill="none" stroke="var(--ok)" stroke-width="3" stroke-linecap="round"/>');
  const c=SC[n];let s='';for(let i=0;i<n;i++){const x=8+i*9+(3-n)*4.5;s+=`<path d="M${x} 10l9 10-9 10" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`}
  if(n===3)s=`<circle cx="20" cy="20" r="15" fill="${c}"/><path d="M20 11v11" stroke="#fff" stroke-width="4" stroke-linecap="round"/><circle cx="20" cy="28.5" r="2.4" fill="#fff"/>`;
  return S('0 0 40 40',s)};
// Bristol stool scale drawings
const BR=[
 '<circle cx="8" cy="14" r="4.5"/><circle cx="19" cy="11" r="4"/><circle cx="30" cy="14" r="4.5"/>',
 '<circle cx="9" cy="13" r="5.5"/><circle cx="16" cy="11" r="5.5"/><circle cx="23" cy="13" r="5.5"/><circle cx="30" cy="11" r="5.5"/>',
 '<rect x="4" y="7" width="32" height="11" rx="5.5"/><path d="M12 8v4M19 17v-4M27 8v4" stroke="var(--surface)" stroke-width="1.5"/>',
 '<path d="M5 15c5-8 10 2 15-4s10 0 15-3" fill="none" stroke="var(--stool)" stroke-width="7" stroke-linecap="round"/>',
 '<ellipse cx="9" cy="13" rx="6" ry="4.5"/><ellipse cx="21" cy="11" rx="5.5" ry="4"/><ellipse cx="32" cy="14" rx="5" ry="4"/>',
 '<path d="M4 15c2-5 6-3 8-6 3 3 5-1 8 2 3-3 6 0 8-2 2 3 6 2 8 6 0 4-5 4-8 3-3 2-7 1-10 1-4 1-8 1-10-1-3 0-4-1-4-3z" fill="var(--stool-2)"/>',
 '<ellipse cx="20" cy="15" rx="17" ry="5" fill="var(--stool-2)" opacity=".75"/><path d="M8 14c3-2 5 2 8 0s5 2 8 0 5 2 8 0" fill="none" stroke="var(--stool)" stroke-width="1.5"/>'
];
const brIco=i=>S('0 0 40 24',`<g fill="var(--stool)">${BR[i]}</g>`);
// Faces
const face=n=>{const c=SC[n],m=[ 'M13 25c4 5 10 5 14 0','M13 26h14','M13 28c4-4 10-4 14 0','M12 29c4-6 12-6 16 0'][n];
  const brow=n===3?'<path d="M11 12l5 2M29 12l-5 2" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>':'';
  return S('0 0 40 40',`<circle cx="20" cy="20" r="18" fill="${c}"/><circle cx="14" cy="17" r="2.4" fill="#fff"/><circle cx="26" cy="17" r="2.4" fill="#fff"/>${brow}<path d="${m}" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>`)};
// Capsule
const capsule=(c,half=true)=>S('0 0 58 32',`<rect x="3" y="5" width="52" height="22" rx="11" fill="${c}" opacity=".25"/><path d="M14 5h15v22H14a11 11 0 0 1 0-22z" fill="${c}"/><rect x="3" y="5" width="52" height="22" rx="11" fill="none" stroke="${c}" stroke-width="2"/><path d="M12 10h8" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".7"/>`,'class="cap"');
const bullet=(c)=>S('0 0 58 32',`<path d="M10 9h30a10 7 0 0 1 0 14H10a4 4 0 0 1-4-4v-6a4 4 0 0 1 4-4z" fill="${c}"/><path d="M14 13h12" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".7"/>`,'class="cap"');
const tablet=(c)=>S('0 0 58 32',`<circle cx="29" cy="16" r="12" fill="${c}"/><path d="M20 16h18" stroke="#fff" stroke-width="2" opacity=".7"/>`,'class="cap"');

I.camera='<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>';
I.paste='<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V2h6v2M9 10h6M9 14h6M9 18h3"/>';
I.mic='<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4"/>';
I.cut='<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.5 7.5L20 18M8.5 16.5L20 6"/>';
I.diag='<path d="M9 3h6v4H9zM6 5H4v16h16V5h-2M8 12h8M8 16h5"/>';
I.liver='<path d="M3 9c0-3 3-5 8-5 6 0 10 2 10 5 0 4-5 6-9 9-2 1.5-4 2-5 0C5 15 3 13 3 9z"/>';
I.pen='<path d="M4 20l4-1 11-11-3-3L5 16zM14 6l3 3"/>';
I.tube='<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3M7.5 14h9"/>';
I.gear='<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>';
I.lock='<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>';
I.trash='<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>';
I.today='<path d="M12 5v14M5 12h14"/>';
I.trend='<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>';
I.clock='<path d="M12 7v5l3 2"/><circle cx="12" cy="12" r="9"/>';
I.doc='<path d="M7 3h7l5 5v13H7zM14 3v5h5M10 17v-3M13 17v-5M16 17v-2"/>';
const syringe=(c)=>S('0 0 58 32',`<rect x="14" y="11" width="26" height="10" rx="2" fill="${c}"/><path d="M40 16h10M6 11v10M10 16h4M50 13v6" stroke="${c}" stroke-width="2.5" stroke-linecap="round"/><path d="M18 14h10" stroke="#fff" stroke-width="2" opacity=".7"/>`,'class="cap"');
const dripbag=(c)=>S('0 0 58 32',`<rect x="20" y="2" width="18" height="20" rx="4" fill="${c}"/><path d="M29 22v8M25 9h8" stroke="${c}" stroke-width="2.5" stroke-linecap="round"/><path d="M25 9h8" stroke="#fff" stroke-width="2"/>`,'class="cap"');
const medIcon=(m,c)=>({Rectal:bullet,Injection:syringe,Drip:dripbag}[m.form]||(/vitamin|iron|folic/i.test(m.name)?tablet:capsule))(c);
I.search='<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>';
I.gantt='<path d="M4 6h9M8 12h12M4 18h7"/>';

/* ---------- navigation ---------- */
const TABS = [["today", "Today", I.today], ["trends", "Trends", I.trend], ["meds", "Meds", I.pill], ["history", "History", I.clock], ["doctor", "Doctor", I.doc]];
const TITLES = { today: "Today", trends: "Trends", meds: "Medicines", timeline: "Timeline", history: "My history", doctor: "My IBD team" };
let tab = LS.get("gl.tab", "today"); if (tab === "timeline") tab = "history";
let viewDay = todayIso();
function renderNav() {
  $("#nav").innerHTML = TABS.map(([k, l, p]) => `<button data-tab="${k}" ${k === tab ? 'aria-current="page"' : ""}>${S("0 0 24 24", p, stroke)}${l}</button>`).join("");
}
function render() {
  if (!TITLES[tab]) tab = "today";
  renderNav();
  $("#ttl").textContent = TITLES[tab];
  $("#hsub").textContent = fmtDay(todayIso()).replace(/^(\w+) /, (m, d) => ({ Sun: "Sunday", Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday" }[d] + " "));
  ({ today: renderToday, trends: renderTrends, meds: renderMeds, history: renderHistory, doctor: renderDoctor })[tab]();
}
function go(t) { tab = t; LS.set("gl.tab", t); window.scrollTo(0, 0); render(); }

/* ---------- Today ---------- */
const getDay = (k) => (dayLogged(k) ? data.days[k] : null);
function ensureDay(k) {
  if (!dayLogged(k)) data.days[k] = { stools: 0, night: 0, blood: 0, urg: 0, bristol: null, pain: 0, well: 0, extra: [], tags: [], noteExtra: "", noteTags: "" };
  return data.days[k];
}
function heroHtml() {
  const f = openFlare(), t = todayIso();
  let ring, title, sub, color;
  const r = 52, c = 2 * Math.PI * r;
  if (f) {
    const n = daysBetween(f.start, t) + 1;
    color = "var(--mod)"; title = "In a flare"; sub = `Started ${fmtDay(f.start)}`;
    ring = `<circle cx="66" cy="66" r="${r}" fill="none" stroke="var(--sunk)" stroke-width="14"/><circle cx="66" cy="66" r="${r}" fill="none" stroke="${color}" stroke-width="14" stroke-linecap="round" stroke-dasharray="${c * Math.min(n, 30) / 30} ${c}" transform="rotate(-90 66 66)"/><text x="66" y="56" text-anchor="middle" font-size="17" fill="var(--muted)">Day</text><text x="66" y="96" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="700" font-size="44" fill="var(--fg)">${n}</text>`;
  } else {
    const last = live(data.flares).filter((x) => x.end).sort((a, b) => (a.end < b.end ? 1 : -1))[0];
    const n = last ? daysBetween(last.end, t) : null;
    color = "var(--ok)"; title = "No flare"; sub = last ? `Last flare ended ${fmtDate(last.end)}` : "Tap below if a flare starts";
    ring = `<circle cx="66" cy="66" r="${r}" fill="none" stroke="var(--ok)" stroke-width="14" opacity="${n == null ? .25 : 1}"/>` + (n == null ? `<path d="M46 68l14 14 26-30" fill="none" stroke="var(--ok)" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>` : `<text x="66" y="78" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="700" font-size="${n > 999 ? 30 : 40}" fill="var(--fg)">${n}</text><text x="66" y="98" text-anchor="middle" font-size="12" fill="var(--muted)">days calm</text>`);
  }
  return `<div class="card"><div class="hero">${S("0 0 132 132", ring)}<div style="min-width:0"><div class="label">Right now</div><div class="state" style="color:${color}">${title}</div><div class="sub">${sub}</div></div></div></div>`;
}
function renderToday() {
  const k = viewDay, d = getDay(k) || { stools: 0, night: 0, blood: null, urg: null, bristol: null, pain: 0, well: null, extra: [], tags: [] };
  const isToday = k === todayIso();
  const pick = (key, labels, iconFn, val, cls = "") => `<div class="pick ${cls}" data-pick="${key}">${labels.map((l, i) => `<button aria-pressed="${val === i}" aria-label="${esc(l)}">${iconFn(i)}${l ? `<span>${l}</span>` : ""}</button>`).join("")}</div>`;
  const nTok = Math.min(30, Math.max(12, d.stools + 1));
  const toks = Array.from({ length: nTok }, (_, i) => `<button class="${i < d.stools ? "on" : ""}" data-stool="${i + 1}" aria-label="${i + 1} stools">${S("0 0 24 24", I.check, 'fill="none" stroke="#fff" stroke-width="3"')}</button>`).join("");
  const f = openFlare();
  $("#main").innerHTML = `
  <div class="row"><div class="daynav"><button data-act="dayPrev" aria-label="Previous day">‹</button><div><div class="name">${isToday ? "Today" : esc(fmtDay(k))}</div><div class="sub">${isToday ? esc(fmtDate(k)) : dayLogged(k) ? "Logged" : "Not logged"}</div></div><button data-act="dayNext" aria-label="Next day" ${isToday ? "disabled" : ""}>›</button></div>${isToday ? "" : `<button class="linkbtn" data-act="dayToday">Back to today</button>`}</div>
  <div class="card">
    <div class="row"><div><div class="label">Stools ${isToday ? "today" : "that day"}</div><div class="sub">Tap a circle to set the count</div></div><div class="count">${d.stools}</div></div>
    <div class="tokens">${toks}</div>
    <div class="row"><span class="sub" style="font-size:13.5px">${S("0 0 24 24", I.moon, `${stroke} width="18" height="18" style="display:inline;vertical-align:-4px;color:var(--med2)"`)} Of those, at night</span><div class="daynav"><button data-act="nightMinus" aria-label="One fewer at night">−</button><b class="count" style="font-size:22px;min-width:1.2em;text-align:center">${d.night || 0}</b><button data-act="nightPlus" aria-label="One more at night">+</button></div></div>
  </div>
  <div class="card"><div class="label">Blood</div>${pick("blood", BLOOD, bloodIco, d.blood, "blood")}</div>
  <div class="card"><div class="label">Urgency</div>${pick("urg", URG, urgIco, d.urg)}</div>
  <div class="card"><div class="label">Stool type <span style="text-transform:none;letter-spacing:0;font-weight:400">(optional)</span></div>${pick("bristol", BR.map((_, i) => String(i + 1)), brIco, d.bristol == null ? null : d.bristol - 1, "b7")}<div class="row sub"><span>Hard</span><span>Normal</span><span>Watery</span></div></div>
  <div class="card">
    <div class="row"><div class="label">Tummy pain</div><div class="sub" id="painTxt"></div></div>
    <div class="painbar"><div class="track"></div><div class="knob" id="knob"></div><input id="pain" type="range" min="0" max="10" step="1" value="${d.pain || 0}" aria-label="Pain from 0 to 10"></div>
  </div>
  <div class="card"><div class="label">How do you feel?</div>${pick("well", WELL, face, d.well, "faces")}</div>
  <div class="card"><div class="label">Anywhere else?</div><div class="tags" data-multi="extra">${EXTRA.map(([key, l]) => `<button data-v="${key}" aria-pressed="${(d.extra || []).includes(key)}">${ico(key)}${l}</button>`).join("")}</div>${noteBlock("noteExtra", d.noteExtra, "e.g. left knee sore since Tuesday")}</div>
  <div class="card"><div class="label">Anything that might matter?</div><div class="tags" data-multi="tags">${TAGS.map(([key, l]) => `<button data-v="${key}" aria-pressed="${(d.tags || []).includes(key)}">${ico(key)}${l}</button>`).join("")}</div>${noteBlock("noteTags", d.noteTags, "e.g. what you ate, how you slept")}</div>
  <div class="saved" id="savedTxt">${dayLogged(k) ? "Saved on this phone as you go" : "Nothing logged yet. Everything saves as you tap."}</div>
  ${isToday ? `<div class="sub" style="text-align:center">${f ? `In a flare since ${esc(fmtDay(f.start))} · day ${daysBetween(f.start, todayIso()) + 1}` : "No flare right now"}</div>${f ? `<button class="btn flare" data-act="flareEnd">Flare ended today</button>` : `<button class="btn flare" data-act="flareStart">A flare started today</button>`}` : ""}
  ${dayLogged(k) ? `<button class="linkbtn" style="align-self:center;color:var(--muted)" data-act="clearDay">Clear this day</button>` : ""}`;
  paintPain();
}
function noteBlock(key, val, ph) {
  return val ? `<textarea class="note" data-note="${key}" placeholder="${esc(ph)}">${esc(val)}</textarea>` : `<button class="noteBtn" data-act="openNote" data-key="${key}">+ Add a note</button><textarea class="note" data-note="${key}" hidden placeholder="${esc(ph)}"></textarea>`;
}
const PAIN_WORDS = ["None", "Very mild", "Mild", "Mild", "Moderate", "Moderate", "Strong", "Strong", "Severe", "Severe", "Worst"];
function paintPain() {
  const p = $("#pain"); if (!p) return; const v = +p.value, k = $("#knob");
  k.textContent = v; k.style.left = `calc(20px + ${v / 10} * (100% - 40px))`; $("#painTxt").textContent = PAIN_WORDS[v];
}
function touchDay() { const d = ensureDay(viewDay); stamp(d); save(); const s = $("#savedTxt"); if (s) s.textContent = "Saved on this phone as you go"; return d; }

document.addEventListener("click", (e) => {
  if (tab !== "today") return;
  const st = e.target.closest("[data-stool]");
  if (st) { const d = ensureDay(viewDay), n = +st.dataset.stool; d.stools = d.stools === n ? n - 1 : n; if (d.night > d.stools) d.night = d.stools; touchDay(); renderToday(); return; }
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

/* ---------- Trends ---------- */
let calMonth = todayIso().slice(0, 7);
function ring(p, c, big, small) {
  const r = 30, C = 2 * Math.PI * r;
  return `<div class="ring">${S("0 0 76 76", `<circle cx="38" cy="38" r="${r}" fill="none" stroke="var(--sunk)" stroke-width="9"/><circle cx="38" cy="38" r="${r}" fill="none" stroke="${c}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${C * Math.max(0, Math.min(1, p))} ${C}" transform="rotate(-90 38 38)"/><text x="38" y="43" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="700" font-size="15" fill="var(--fg)">${big}</text>`)}<span>${small}</span></div>`;
}
function lastNDays(n, end = todayIso()) { const out = []; for (let i = n - 1; i >= 0; i--) out.push(addDays(end, -i)); return out; }
function barChart(keys, opts = {}) {
  const W = 360, H = opts.h || 210, L = 22, R = 6, T = 24, B = 34, n = keys.length, bw = (W - L - R) / n;
  const vals = keys.map((k) => getDay(k));
  const max = Math.max(6, ...vals.map((d) => (d ? d.stools : 0)));
  const top = Math.ceil(max / 2) * 2, y = (v) => T + (H - T - B) * (1 - v / top);
  let s = "";
  // flare bands
  let i = 0;
  while (i < n) { if (inFlare(keys[i])) { let j = i; while (j + 1 < n && inFlare(keys[j + 1])) j++; s += `<rect x="${L + i * bw}" y="${T - 18}" width="${(j - i + 1) * bw}" height="${H - B - T + 18}" rx="6" fill="var(--flare)"/><text x="${L + i * bw > W - 50 ? W - R - 2 : L + i * bw + 4}" text-anchor="${L + i * bw > W - 50 ? "end" : "start"}" y="${T - 6}" font-size="10.5" font-weight="600" fill="var(--mod)">Flare</text>`; i = j + 1; } else i++; }
  for (let v = 0; v <= top; v += top > 10 ? 4 : 2) s += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-dasharray="${v ? "2 3" : ""}"/><text x="${L - 5}" y="${y(v) + 3.5}" font-size="10" text-anchor="end" fill="var(--muted)" font-family="ui-monospace,Menlo,monospace">${v}</text>`;
  vals.forEach((d, i) => {
    const x = L + i * bw + Math.min(1.5, bw * .15), w = Math.max(1, bw - Math.min(3, bw * .3));
    if (!d) { s += `<rect x="${x}" y="${y(0) - 2}" width="${w}" height="2" fill="var(--line)"/>`; return; }
    const h = Math.max(2, y(0) - y(d.stools));
    s += `<rect x="${x}" y="${y(0) - h}" width="${w}" height="${h}" rx="${Math.min(3, w / 3)}" fill="${SC[lvl(sccai(d))]}"/>`;
    const ds = Math.min(.25, Math.max(.12, bw / 40)), dw = 40 * ds;
    if (d.blood) s += `<path transform="translate(${x + w / 2 - dw / 2} ${y(0) - h - dw - 3}) scale(${ds})" d="${dropPath}" fill="var(--blood)"/>`;
    /* a moon under the bar = woke at night */
    if (d.night > 0) { const ms = Math.min(.42, Math.max(.2, bw / 24)); s += `<path transform="translate(${x + w / 2 - 12 * ms} ${y(0) + 4}) scale(${ms})" d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="var(--med2)"/>`; }
  });
  const lab = [[keys[0], 0, "start"], [keys[Math.floor(n / 2)], Math.floor(n / 2), "middle"], [keys[n - 1], n - 1, "end"]];
  lab.forEach(([k, i, a]) => s += `<text x="${L + i * bw + bw / 2}" y="${H - 6}" font-size="10" text-anchor="${a}" fill="var(--muted)">${k === todayIso() ? "Today" : parseIso(k).getDate() + " " + MONTHS[parseIso(k).getMonth()]}</text>`);
  return S(`0 0 ${W} ${H}`, s, `class="chart" role="img" aria-label="Stools per day, coloured by colitis score"`);
}
/* What comes before bad days: for each tag, compare the 2 days after tagged days with the 2 days after untagged days.
   Uses the day score (stools, night, blood, urgency...), leaves out flare days, and only judges a tag used 5+ times. */
let bdWin = LS.get("gl.bdwin", 3);
document.addEventListener("click", (e) => { const b = e.target.closest("[data-bdwin]"); if (!b) return; bdWin = +b.dataset.bdwin; LS.set("gl.bdwin", bdWin); renderTrends(); });
function badDays(keys) {
  const ok = (k) => dayLogged(k) && !inFlare(k);
  const after = (k) => { const w = Array.from({ length: bdWin }, (_, i) => addDays(k, i + 1)).filter(ok); return w.length ? Math.max(...w.map((x) => sccai(data.days[x]))) : null; }; /* the worst day in the window */
  const days = keys.filter(ok).map((k) => ({ k, tags: data.days[k].tags || [], out: after(k) })).filter((d) => d.out !== null);
  if (days.length < 10) return null;
  const res = [];
  for (const [t, l] of TAGS) {
    const A = days.filter((d) => d.tags.includes(t)), B = days.filter((d) => !d.tags.includes(t));
    if (!A.length || !B.length) continue;
    const mB = B.reduce((a, d) => a + d.out, 0) / B.length, mA = A.reduce((a, d) => a + d.out, 0) / A.length;
    const worse = A.filter((d) => d.out > mB + 0.5).length, diff = mA - mB;
    const verdict = A.length < 5 ? 0 : diff >= 1 && worse / A.length >= 0.6 ? 3 : diff >= 0.5 ? 2 : 1;
    res.push({ t, l, n: A.length, worse, diff, verdict, days: A.map((d) => d.k).reverse() });
  }
  return res.sort((a, b) => b.verdict - a.verdict || b.diff - a.diff);
}
const VERDICT = [["Not enough yet", "var(--muted)", "var(--sunk)"], ["No sign", "var(--ok)", "var(--sunk)"], ["Maybe", "var(--mild)", "var(--sunk)"], ["Clear sign", "var(--sev)", "var(--blood-soft)"]];
function badDaysCard(keys) {
  const r = badDays(keys);
  const clear = r ? r.filter((x) => x.verdict === 3).map((x) => x.l) : [];
  const sum = r === null ? "Needs at least 10 logged days outside flares" : clear.length ? `Clear sign: ${clear.join(", ")}` : "No clear signs in this period";
  return `<div class="card">${foldHead("trigBody", "What comes before bad days", sum)}<div id="trigBody" ${foldOpen.trigBody ? "" : "hidden"} style="display:flex;flex-direction:column;gap:8px">
    <div class="seg" style="grid-template-columns:repeat(3,1fr)">${[2, 3, 4].map((n) => `<button data-bdwin="${n}" aria-pressed="${n === bdWin}">${n} days after</button>`).join("")}</div>
    ${r === null ? `<div class="sub">Keep logging. It needs at least 10 days outside flares in the period picked above.</div>` : !r.length ? `<div class="sub">No tags used in this period yet. Add them on Today under "Anything that might matter?".</div>` :
    r.map((x) => { const [vl, vc, vb] = VERDICT[x.verdict]; return `<details class="bd"><summary>${ico(x.t)}<span class="grow"><b>${esc(x.l)}</b><span class="sub">${x.n < 5 ? `used ${x.n} time${x.n > 1 ? "s" : ""}, needs 5` : `worse in the next ${bdWin} days ${x.worse} of ${x.n} times`}</span></span><span class="vd" style="color:${vc};background:${vb}">${vl}</span></summary>
      <div class="bdd">${x.days.map((k) => `<button data-day="${k}">${esc(fmtDay(k))}</button>`).join("")}</div></details>`; }).join("")}
    <div class="sub">Compares the days after a tag with the days after days without it, using the day score. Flare days are left out. A pattern, not proof. Tap a tag to see its days.</div></div></div>`;
}
let tPeriod = LS.get("gl.tperiod", 1);
document.addEventListener("click", (e) => { const b = e.target.closest("[data-tperiod]"); if (!b) return; tPeriod = +b.dataset.tperiod; LS.set("gl.tperiod", tPeriod); renderTrends(); });
function renderTrends() {
  const keys = periodRange(tPeriod).keys, logged = keys.filter(dayLogged);
  if (Object.keys(data.days).filter(dayLogged).length === 0) {
    $("#main").innerHTML = `<div class="card"><div class="label">Nothing to show yet</div><p class="sub" style="margin:0;font-size:14px">Log a few days on Today and your charts appear here: stools per day, blood, flares, a calendar and what tends to come before bad days.</p><button class="btn primary" data-tab="today">Log today</button></div>`;
    return;
  }
  const calm = logged.filter((k) => lvl(sccai(data.days[k])) === 0).length;
  const blood = logged.filter((k) => data.days[k].blood > 0).length;
  const nights = logged.filter((k) => data.days[k].night > 0).length;
  const n = logged.length || 1;
  $("#main").innerHTML = `
  ${heroHtml()}
  <div class="seg" id="tperiod">${PERIODS.map(([l, m]) => `<button data-tperiod="${m}" aria-pressed="${m === tPeriod}">${l}</button>`).join("")}</div>
  <div class="card"><div class="tsum"><span><b style="color:var(--ok)">${calm}</b> calm days</span><span><b style="color:var(--blood)">${blood}</b> with blood</span><span><b style="color:var(--med2)">${nights}</b> nights woken</span></div><div class="sub" style="margin-top:-6px">${logged.length} of ${keys.length} days logged</div>${barChart(keys)}<div class="legend"><span><b>Day score:</b></span><span><i class="s0"></i>Calm</span><span><i class="s1"></i>Mild</span><span><i class="s2"></i>Moderate</span><span><i class="s3"></i>Severe</span></div><div class="legend"><span><i style="background:var(--flare);border:1px solid var(--mod)"></i>Flare</span><span><svg viewBox="0 0 40 40" width="9" height="11" aria-hidden="true" style="display:inline-block;vertical-align:-1px;margin-right:4px"><path d="${dropPath}" fill="var(--blood)"/></svg>Blood</span><span><svg viewBox="0 0 24 24" width="11" height="11" aria-hidden="true" style="display:inline-block;vertical-align:-1px;margin-right:4px"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="var(--med2)"/></svg>Woke at night</span></div><div class="sub">Bar height = stools that day. Drop on top = blood, moon underneath = woke at night. Colour = how bad the day was, worked out from your log (not the flare grade).</div></div>
  <div class="card">${foldHead("calBody", "Calendar", `${MONTHS_L[+calMonth.slice(5) - 1]} ${calMonth.slice(0, 4)} · tap a day to open it`)}<div id="calBody" ${foldOpen.calBody ? "" : "hidden"} style="display:flex;flex-direction:column;gap:12px"><div class="row"><div class="daynav"><button data-act="calPrev" aria-label="Previous month">‹</button><div class="name">${MONTHS_L[+calMonth.slice(5) - 1]} ${calMonth.slice(0, 4)}</div><button data-act="calNext" aria-label="Next month" ${calMonth >= todayIso().slice(0, 7) ? "disabled" : ""}>›</button></div></div>${calendar(calMonth)}</div></div>
  ${badDaysCard(keys)}`;
}
function calendar(ym) {
  const [y, m] = ym.split("-").map(Number), first = new Date(y, m - 1, 1), dim = new Date(y, m, 0).getDate();
  const off = (first.getDay() + 6) % 7, t = todayIso();
  let h = ["M", "T", "W", "T", "F", "S", "S"].map((d) => `<div class="hd">${d}</div>`).join("") + "<div></div>".repeat(off);
  for (let d = 1; d <= dim; d++) {
    const k = `${ym}-${pad(d)}`, day = getDay(k);
    if (k > t) { h += `<div style="color:var(--line)">${d}</div>`; continue; }
    h += day ? `<div class="s${lvl(sccai(day))}" data-day="${k}" style="cursor:pointer">${d}${day.blood ? S("0 0 40 40", `<path d="${dropPath}" fill="#fff"/>`, 'class="dr"') : ""}${day.night > 0 ? S("0 0 24 24", `<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="#fff"/>`, 'class="mn"') : ""}</div>` : `<div class="empty" data-day="${k}" style="cursor:pointer">${d}</div>`;
  }
  return `<div class="cal">${h}</div>`;
}

/* ---------- rough date picker (year, optional month) ---------- */
function roughInput(id, val, opts = {}) {
  const [y, m, d] = (val || "").split("-");
  const now = new Date().getFullYear(), years = [];
  for (let i = now; i >= 1960; i--) years.push(i);
  const days = []; for (let i = 1; i <= 31; i++) days.push(pad(i));
  return `<div class="two" data-rough="${id}" style="grid-template-columns:.8fr 1.5fr 1fr 44px"><select aria-label="Day"><option value="">Day</option>${days.map((v) => `<option value="${v}" ${d === v ? "selected" : ""}>${+v}</option>`).join("")}</select><select aria-label="Month"><option value="">Month</option>${MONTHS_L.map((n, i) => `<option value="${pad(i + 1)}" ${m === pad(i + 1) ? "selected" : ""}>${n}</option>`).join("")}</select><select aria-label="Year"><option value="">${opts.blank || "Year"}</option>${years.map((v) => `<option ${String(v) === y ? "selected" : ""}>${v}</option>`).join("")}</select><label class="calbtn" aria-label="Pick from calendar">${ico("cal")}<input type="date" data-calfor="${id}" max="${todayIso()}" value="${y && m && d ? `${y}-${m}-${d}` : ""}"></label></div>`;
}
/* the calendar button fills day, month and year */
document.addEventListener("change", (e) => {
  const id = e.target.dataset?.calfor; if (!id || !e.target.value) return;
  const [y, m, d] = e.target.value.split("-"), sel = $$(`[data-rough="${id}"] select`);
  sel[0].value = d; sel[1].value = m; if (![...sel[2].options].some((o) => o.value === y)) sel[2].add(new Option(y, y), 1); sel[2].value = y;
});
/* "YYYY", "YYYY-MM" or "YYYY-MM-DD"; a day only counts with a month, and is kept inside that month */
function readRough(id) {
  const el = $(`[data-rough="${id}"]`); if (!el) return "";
  const [d, m, y] = $$("select", el).map((s) => s.value);
  if (!y) return ""; if (!m) return y; if (!d) return `${y}-${m}`;
  const last = new Date(+y, +m, 0).getDate();
  return `${y}-${m}-${pad(Math.min(+d, last))}`;
}
const segHtml = (id, opts, val, cols) => `<div class="seg" data-seg="${id}" style="grid-template-columns:repeat(${cols || opts.length},1fr)">${opts.map((o) => `<button type="button" aria-pressed="${o === val}">${esc(o)}</button>`).join("")}</div>`;
const segVal = (id) => { const b = $(`[data-seg="${id}"] button[aria-pressed="true"]`); return b ? b.textContent : ""; };
const chipsHtml = (id, opts, val) => `<div class="chips" data-chips="${id}">${opts.map((o) => `<button type="button" aria-pressed="${o === val}">${esc(o)}</button>`).join("")}</div>`;
const chipVal = (id) => { const b = $(`[data-chips="${id}"] button[aria-pressed="true"]`); return b ? b.textContent : ""; };
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-seg] button, [data-chips] button"); if (!b) return;
  const g = b.parentElement, single = g.dataset.seg || g.dataset.chips;
  const was = b.getAttribute("aria-pressed") === "true";
  [...g.children].forEach((x) => x.setAttribute("aria-pressed", x === b && !(g.dataset.chips && was)));
  g.dispatchEvent(new CustomEvent("segchange", { bubbles: true, detail: { id: single, value: b.textContent } }));
});

/* ---------- Medicines ---------- */
const medColor = (m) => MED_COLORS[(m.color ?? 0) % MED_COLORS.length];
const medHex = (m) => MED_HEX[(m.color ?? 0) % MED_HEX.length];
const curDose = (m) => { const c = (m.changes || []).slice(-1)[0]; return c ? { dose: c.dose, freq: c.freq, from: c.from } : { dose: m.dose, freq: m.freq, from: m.start }; };
const doseText = (m) => { const c = curDose(m); return [c.dose, c.freq].filter(Boolean).join(" · ") || "Dose not set"; };
const currentMeds = () => live(data.meds).filter((m) => !m.stop).sort((a, b) => roughSort(a.start) < roughSort(b.start) ? -1 : 1);
const pastMeds = () => live(data.meds).filter((m) => m.stop).sort((a, b) => roughSort(a.stop) < roughSort(b.stop) ? 1 : -1);
function steroidCourses() {
  const list = live(data.meds).filter((m) => isSteroid(m.name)).sort((a, b) => (roughSort(a.start) < roughSort(b.start) ? -1 : 1));
  const cutoff = addDays(todayIso(), -365).slice(0, 7);
  const recent = list.filter((m) => !m.stop || roughSort(m.stop) >= roughSort(cutoff) || roughSort(m.start) >= roughSort(cutoff));
  return { all: list, recent };
}
/* ppy = pixels per year: 0 fits everything in w; bigger values make a wider chart that scrolls sideways */
function medGantt(w = 360, ppy = 0, show = null) {
  const meds = live(data.meds).filter((m) => m.start);
  medGantt.names = [];
  const anyMoment = live(data.flares).some((f) => f.start) || live(data.moments).some((m) => m.when && ["colonoscopy", "hospital", "surgery"].includes(m.type));
  if (!meds.length && !anyMoment) return "";
  const names = [...new Set(meds.sort((a, b) => roughSort(a.start) < roughSort(b.start) ? -1 : 1).map((m) => m.name))];
  const flares = live(data.flares).filter((f) => f.start), moms = live(data.moments).filter((m) => m.when && ["colonoscopy", "hospital", "surgery"].includes(m.type));
  const nowY = roughYear(todayIso()), y0 = Math.floor(Math.min(...meds.map((m) => roughYear(m.start)), ...flares.map((f) => roughYear(f.start)), ...moms.map((m) => roughYear(m.when)), data.profile.diagYear ? +data.profile.diagYear : 9999)), y1 = Math.ceil(nowY + .01);
  /* layers switched off on the History chart */
  if (show) { if (!show.meds) names.length = 0; if (!show.flares) flares.length = 0; for (let k = moms.length - 1; k >= 0; k--) if (!show[moms[k].type === "colonoscopy" ? "scope" : "hosp"]) moms.splice(k, 1); }
  const L = 8, R = 8;
  if (ppy) w = Math.max(w, Math.round((y1 - y0) * ppy) + L + R);
  const months = ppy >= 150, top = flares.length || moms.length ? 24 : 0, foot = months ? 34 : 22;
  const x = (v) => L + (v - y0) / (y1 - y0) * (w - L - R), rowH = 29, H = top + names.length * rowH + 8 + foot;
  const gy = H - foot;
  let s = "";
  /* flares as orange bands behind every medicine, colonoscopies and hospital stays as marks on top */
  for (const f of flares) { const a = roughYear(f.start), b = f.end ? roughYear(f.end) : nowY; s += `<rect x="${x(a)}" y="2" width="${Math.max(3, x(b) - x(a))}" height="${gy - 2}" fill="var(--mod)" opacity=".2" data-flare="${f.id}"/>`; }
  for (const m of moms) {
    const cx = x(roughYear(m.when));
    if (m.type === "colonoscopy") s += `<path d="M${cx} 5l6 7-6 7-6-7z" fill="var(--fg)" data-moment="${m.id}"/><rect x="${cx - 11}" y="1" width="22" height="22" fill="transparent" data-moment="${m.id}"/>`;
    else s += `<g transform="translate(${cx - 8} 3)" data-moment="${m.id}"><rect width="16" height="16" fill="transparent"/>${S("0 0 24 24", I[m.type === "hospital" ? "hospital" : "cut"], 'width="16" height="16" fill="none" stroke="var(--sev)" stroke-width="2.4"')}</g>`;
  }
  const mono = 'font-family="ui-monospace,Menlo,monospace"';
  if (months) {
    for (let yr = y0; yr < y1; yr++) for (let mo = 0; mo < 12; mo++) {
      const xx = x(yr + mo / 12), mid = x(yr + (mo + .5) / 12);
      s += `<line x1="${xx}" x2="${xx}" y1="4" y2="${gy}" stroke="var(--line)" ${mo ? 'opacity=".45"' : ""}/>`;
      s += `<text x="${mid}" y="${gy + 12}" font-size="9" text-anchor="middle" fill="var(--muted)" ${mono}>${ppy >= 260 ? MONTHS[mo].slice(0, ppy >= 420 ? 3 : 1) : ""}</text>`;
      if (!mo) s += `<text x="${xx + 2}" y="${gy + 27}" font-size="10" font-weight="600" fill="var(--fg)" ${mono}>${yr}</text>`;
    }
    s += `<line x1="${x(y1)}" x2="${x(y1)}" y1="4" y2="${gy}" stroke="var(--line)"/>`;
  } else {
    const step = (w - L - R) / (y1 - y0) < 22 ? 2 : 1;
    for (let yr = y0; yr <= y1; yr += step) s += `<line x1="${x(yr)}" x2="${x(yr)}" y1="4" y2="${gy}" stroke="var(--line)"/><text x="${x(yr)}" y="${H - 6}" font-size="9.5" text-anchor="${yr === y0 ? "start" : yr + step > y1 ? "end" : "middle"}" fill="var(--muted)" ${mono}>${ppy ? yr : String(yr).slice(2)}</text>`;
  }
  const today = x(nowY); s += `<line x1="${today}" x2="${today}" y1="4" y2="${gy}" stroke="var(--accent)" stroke-dasharray="3 3"/>`;
  names.forEach((n, i) => {
    const yy = top + 8 + i * rowH, ms = meds.filter((m) => m.name === n), st = isSteroid(n);
    const why = ms.filter((m) => m.stop && m.why && m.why !== "Course finished").map((m) => m.why.toLowerCase()).slice(-1)[0];
    const label = `${esc(n)}${st ? ' <tspan fill="var(--muted)" font-weight="400">· steroid</tspan>' : ""}${why ? ` <tspan fill="var(--muted)" font-weight="400">· ${esc(why)}</tspan>` : ""}`;
    /* zoomed in, names are laid over the chart on the left so they stay put while it scrolls */
    if (ppy) medGantt.names.push({ y: yy - 3, label });
    else s += `<text x="${L}" y="${yy + 8}" font-size="11" font-weight="600" fill="var(--fg)">${label}</text>`;
    ms.forEach((m) => { const a = roughYear(m.start), b = m.stopDay ? roughYear(m.stopDay) : m.stop ? roughYear(m.stop) : nowY; s += `<rect x="${x(a)}" y="${yy + 12}" width="${Math.max(4, x(b) - x(a))}" height="10" rx="5" fill="${medColor(m)}"/><rect x="${x(a)}" y="${yy + 5}" width="${Math.max(16, x(b) - x(a))}" height="24" fill="transparent" data-med="${m.id}"/>`; });
  });
  medGantt.sc = { x, y0, y1 };
  return S(`0 0 ${w} ${H}`, s, ppy ? `width="${w}" height="${H}" style="display:block;max-width:none"` : `style="width:100%;min-width:340px;height:auto"`);
}
const ZOOMS = [["Everything", 0], ["Years", 70], ["Months", 300]];
let medZoom = LS.get("gl.zoom", 0);
function renderMeds() {
  const cur = currentMeds(), past = pastMeds(), st = steroidCourses();
  const names = [...new Set(past.map((m) => m.name))];
  $("#main").innerHTML = `<div data-fscope style="display:contents">
  <button class="btn primary" data-act="medAdd">+ Add medicine</button>
  ${cur.length + past.length > 3 ? findBox("Search medicines") : ""}
  <div class="card" data-fgroup>${cur.length ? `<button class="about fold" data-act="listToggle" data-fold="nowList" aria-expanded="false"><span class="grow"><b>Taking now (${cur.length})</b><span class="sub">${esc(cur.map((m) => m.name).slice(0, 3).join(", ") + (cur.length > 3 ? ` and ${cur.length - 3} more` : ""))}</span></span><span class="chev" aria-hidden="true">›</span></button>` : `<div class="label">Taking now</div>`}
    <div id="nowList" ${cur.length ? "hidden" : ""}>${cur.length ? cur.map((m) => `<button class="medtap" data-med="${m.id}" data-fi="${findText(m.name, doseText(m), m.form, m.note, isSteroid(m.name) && "steroid")}">${medIcon(m, medColor(m))}<div class="grow"><div class="row"><span class="name">${esc(m.name)}</span><span class="sub">since ${esc(fmtRough(m.start))} ›</span></div><div class="sub">${esc(doseText(m))}${m.form ? " · " + esc(m.form.toLowerCase()) : ""}</div></div></button>`).join("") : `<div class="empty-note">No medicines added yet.</div>`}</div>
  </div>
  <div class="empty-note" data-fempty hidden>No medicine matches. Try another word.</div>
  ${past.length ? `<div class="card" data-fgroup><button class="about fold" data-act="listToggle" data-fold="evList" data-show="${esc(names.slice(0, 3).join(", ") + (names.length > 3 ? ` and ${names.length - 3} more` : ""))}" aria-expanded="false"><span class="grow"><b>Tried before (${past.length})</b><span class="sub">${esc(names.slice(0, 3).join(", ") + (names.length > 3 ? ` and ${names.length - 3} more` : ""))}</span></span><span class="chev" aria-hidden="true">›</span></button>
    <div id="evList" hidden>${past.map((m) => `<div class="tr" data-med="${m.id}" data-fi="${findText(m.name, doseText(m), m.why, m.note, fmtRough(m.start), fmtRough(m.stop), isSteroid(m.name) && "steroid")}"><span class="dot" style="background:${medColor(m)}"></span><div style="min-width:0"><div class="row"><span class="name">${esc(m.name)}</span><span class="sub">${esc(fmtRough(m.start))} to ${esc(fmtRough(m.stop))}</span></div><div class="sub">${esc([doseText(m) === "Dose not set" ? "" : doseText(m), m.why, m.note].filter(Boolean).join(" · ") || "Reason not set")}${isSteroid(m.name) ? " · steroid" : ""}</div></div></div>`).join("")}</div></div>` : ""}
  <button class="card about" data-act="steroidOpen"><span class="grow"><b>Steroid courses</b><span class="sub"><b style="color:var(--mild)">${st.recent.length}</b> in the last 12 months · ${st.all.length} ever</span></span><span class="chev" aria-hidden="true">›</span></button></div>`;
}
function steroidOpen() {
  const st = steroidCourses(), recent = new Set(st.recent.map((m) => m.id));
  openSheet(`${sheetHead("Steroid courses", `${st.recent.length} in the last 12 months · ${st.all.length} ever`)}
    ${st.all.length ? `<div>${st.all.map((m) => `<div class="tr" data-med="${m.id}"><span class="dot" style="background:${medColor(m)}"></span><div style="min-width:0"><div class="row"><span class="name">${esc(m.name)}</span><span class="sub">${esc(fmtRough(m.start))} to ${m.stop ? esc(fmtRough(m.stopDay || m.stop)) : "now"}</span></div><div class="sub">${esc([doseText(m) === "Dose not set" ? "" : doseText(m), m.form, m.why, m.note].filter(Boolean).join(" · ") || "No details yet")}${recent.has(m.id) ? ' · <b style="color:var(--mild)">last 12 months</b>' : ""}</div></div></div>`).join("")}</div>
    <div class="sub">Oldest first. Tap one to see it. Prednisolone, budesonide, hydrocortisone and similar count as steroids.</div>` : `<div class="empty-note">No steroid courses yet. Add one with + Add medicine.</div>`}`);
}
function medForm(m) {
  const now = !m || !m.stop;
  openSheet(`${sheetHead(m ? "Fix details" : "Add a medicine")}
  <label class="f"><span>Medicine</span><input id="mName" list="medNames" value="${esc(m?.name || "")}" placeholder="Start typing, e.g. mesalazine" autocomplete="off"><datalist id="medNames">${KNOWN_MEDS.map((n) => `<option>${n}</option>`).join("")}</datalist></label>
  <div class="f"><span>Form</span>${segHtml("mForm", FORMS, m?.form || "Tablet")}</div>
  <div class="f"><span>Dose and how often</span><div class="two"><input id="mDose" value="${esc(m?.dose || "")}" placeholder="e.g. 2.4 g"><input id="mFreq" value="${esc(m?.freq || "")}" placeholder="e.g. once a day"></div></div>
  <div class="f"><span>Started</span>${roughInput("mStart", m?.start)}</div>
  <div class="f"><span>Still taking it?</span>${segHtml("mNow", ["Yes", "No, stopped"], now ? "Yes" : "No, stopped")}</div>
  <div id="mStopBox" class="f" ${now ? "hidden" : ""} style="gap:10px"><div class="f"><span>Stopped</span>${roughInput("mStop", m?.stop)}</div><div class="f"><span>Why?</span>${chipsHtml("mWhy", WHY, m?.why)}</div><input id="mNote" value="${esc(m?.note || "")}" placeholder="Note (optional), e.g. nausea"></div>
  <div class="warn" id="mErr" hidden></div>
  <button class="btn primary" data-act="medSave" data-id="${m?.id || ""}">${m ? "Save" : "Add medicine"}</button>
  ${m ? `<button class="btn danger" data-act="medDelete" data-id="${m.id}">Delete this medicine</button>` : ""}`);
}
document.addEventListener("segchange", (e) => { if (e.detail.id === "mNow") $("#mStopBox").hidden = e.detail.value === "Yes"; });
function medSave(id) {
  const name = $("#mName").value.trim(), start = readRough("mStart"), now = segVal("mNow") === "Yes";
  const err = (t) => { const x = $("#mErr"); x.textContent = t; x.hidden = false; };
  if (!name) return err("Add the medicine's name.");
  if (!start) return err("Add at least the year you started it.");
  const stop = now ? null : readRough("mStop");
  if (!now && !stop) return err("Add at least the year you stopped it.");
  if (stop && roughSort(stop) < roughSort(start)) return err("The stop date is before the start date.");
  let m = id && data.meds.find((x) => x.id === id);
  if (!m) { m = { id: uid(), changes: [], color: live(data.meds).filter((x) => x.name.toLowerCase() !== name.toLowerCase()).length % MED_COLORS.length }; const same = live(data.meds).find((x) => x.name.toLowerCase() === name.toLowerCase()); if (same) m.color = same.color; data.meds.push(m); }
  Object.assign(m, { name: name[0].toUpperCase() + name.slice(1), form: segVal("mForm"), dose: $("#mDose").value.trim(), freq: $("#mFreq").value.trim(), start, stop, why: now ? "" : chipVal("mWhy"), note: now ? "" : $("#mNote").value.trim() });
  stamp(m); save(id ? "Saved" : "Medicine added"); closeSheet(); render();
}
function medActions(m) {
  if (m.stop) return medForm(m);
  openSheet(`${sheetHead(m.name, esc(doseText(m)) + " · since " + esc(fmtRough(m.start)))}
  ${segHtml("mAct", ["Change dose", "Stop taking", "Fix details"], "Change dose")}
  <div data-pane="0" class="f" style="gap:10px"><div class="f"><span>New dose and how often</span><div class="two"><input id="cDose" placeholder="e.g. 4.8 g"><input id="cFreq" value="${esc(curDose(m).freq || "")}" placeholder="e.g. once a day"></div></div><div class="f"><span>From</span><input id="cFrom" type="date" value="${todayIso()}" max="${todayIso()}"></div><div class="sub">The old dose stays in your history and shows in History as a change.</div><button class="btn primary" data-act="medDose" data-id="${m.id}">Save new dose</button></div>
  <div data-pane="1" class="f" style="gap:10px" hidden><div class="f"><span>Stopped on</span><input id="sDate" type="date" value="${todayIso()}" max="${todayIso()}"></div><div class="f"><span>Why?</span>${chipsHtml("sWhy", WHY, "")}</div><input id="sNote" placeholder="Note (optional)"><div class="sub">It moves to "Tried before" and History gets a moment for it.</div><button class="btn primary" data-act="medStop" data-id="${m.id}">Stop medicine</button></div>
  <div data-pane="2" class="f" hidden><div class="sub">For fixing a mistake. It isn't recorded as a change.</div><button class="btn" data-act="medFix" data-id="${m.id}">Open details</button></div>`);
}
document.addEventListener("segchange", (e) => { if (e.detail.id === "mAct") { const i = ["Change dose", "Stop taking", "Fix details"].indexOf(e.detail.value); $$("#sheet [data-pane]").forEach((p) => p.hidden = +p.dataset.pane !== i); } });
function medDose(id) {
  const m = data.meds.find((x) => x.id === id), dose = $("#cDose").value.trim(), freq = $("#cFreq").value.trim(), from = $("#cFrom").value || todayIso();
  if (!dose) { toast("Add the new dose"); return; }
  m.changes = m.changes || []; m.changes.push({ from, dose, freq }); m.changes.sort((a, b) => (a.from < b.from ? -1 : 1));
  stamp(m); save("Dose changed"); closeSheet(); render();
}
function medStop(id) {
  const m = data.meds.find((x) => x.id === id), d = $("#sDate").value || todayIso();
  m.stop = d.slice(0, 7); m.stopDay = d; m.why = chipVal("sWhy"); m.note = $("#sNote").value.trim();
  stamp(m); save("Stopped. Moved to Tried before"); closeSheet(); render();
}

/* ---------- History ---------- */
const MTYPES = [["colonoscopy", "Colonoscopy", "scope", "var(--accent)"], ["flare", "Flare", "flag", "var(--mod)"], ["hospital", "Hospital stay", "hospital", "var(--sev)"], ["surgery", "Surgery", "cut", "var(--sev)"], ["diagnosis", "Diagnosis", "diag", "var(--accent)"], ["other", "Other", "pen", "var(--muted)"]];
const mtype = (k) => MTYPES.find((m) => m[0] === k) || MTYPES[5];
const SEV = ["Mild", "Moderate", "Severe"];
const RESULT = ["No inflammation", "Mild", "Moderate", "Severe"];
const colonoscopies = () => live(data.moments).filter((m) => m.type === "colonoscopy").sort((a, b) => (roughSort(a.when) < roughSort(b.when) ? -1 : 1));
const failedMeds = () => pastMeds().filter((m) => ["Didn't work", "Stopped working", "Side effects"].includes(m.why));

function timelineItems() {
  const out = [];
  for (const m of live(data.moments)) {
    const [, label, ic, c] = mtype(m.type), d = m.details || {};
    let desc = "";
    if (m.type === "colonoscopy") desc = [d.result, d.extent && "reached " + d.extent.toLowerCase(), d.polyps && d.polyps !== "None" ? d.polyps.toLowerCase() : d.polyps === "None" ? "no polyps" : "", d.biopsy && "biopsy: " + d.biopsy, d.nextDue && "next due " + d.nextDue].filter(Boolean).join(" · ");
    if (m.type === "hospital") desc = d.days ? `${d.days} days` : "";
    if (m.type === "surgery") desc = d.what || "";
    if (m.type === "diagnosis") desc = d.extent || "";
    out.push({ key: roughSort(m.when), when: fmtRough(m.when), title: m.type === "other" ? d.title || "Other" : m.type === "diagnosis" ? "Diagnosed" : label, desc: [desc, m.note].filter(Boolean).join(". "), ic, c, act: `data-moment="${m.id}"`, g: "tests" });
  }
  for (const f of live(data.flares)) out.push({ key: roughSort(f.start), when: fmtRough(f.start), title: f.end ? "Flare" : "Flare (ongoing)", desc: [f.end ? "until " + fmtRough(f.end) : "", f.note].filter(Boolean).join(" · "), ic: "flag", c: "var(--mod)", act: `data-flare="${f.id}"`, g: "flares" });
  for (const m of live(data.meds)) {
    out.push({ key: roughSort(m.start), when: fmtRough(m.start), title: `Started ${m.name}`, desc: [m.dose, m.freq].filter(Boolean).join(" · ") + (isSteroid(m.name) ? " · steroid" : ""), ic: "pill", c: medColor(m), act: `data-med="${m.id}"`, auto: 1, g: "meds" });
    for (const ch of m.changes || []) out.push({ key: roughSort(ch.from), when: fmtRough(ch.from), title: `${m.name} dose changed`, desc: [ch.dose, ch.freq].filter(Boolean).join(" · "), ic: "pill", c: medColor(m), act: `data-med="${m.id}"`, auto: 1, g: "meds" });
    if (m.stop) out.push({ key: roughSort(m.stopDay || m.stop), when: fmtRough(m.stopDay || m.stop), title: `Stopped ${m.name}`, desc: [m.why, m.note].filter(Boolean).join(": "), ic: "pill", c: medColor(m), act: `data-med="${m.id}"`, auto: 1, g: "meds" });
  }
  return out.sort((a, b) => (a.key < b.key ? 1 : -1));
}
/* ---------- search and filter inside a tab ---------- */
const FGROUPS = [["all", "All"], ["meds", "Medicines"], ["flares", "Flares"], ["tests", "Tests & hospital"]];
const findBox = (ph) => `<label class="find">${S("0 0 24 24", I.search, stroke)}<input type="search" data-find placeholder="${ph}" autocomplete="off" enterkeyhint="search" aria-label="${ph}"></label>`;
const findChips = () => `<div class="chips" role="group" aria-label="Show">${FGROUPS.map(([k, l]) => `<button type="button" data-fgrp="${k}" aria-pressed="${k === "all"}">${l}</button>`).join("")}</div>`;
const findText = (...parts) => esc(parts.filter(Boolean).join(" ").toLowerCase());
function eventList(items) {
  const years = [...new Set(items.map((m) => m.key.slice(0, 4)))];
  return years.map((y) => `<div data-fgroup><div class="yh">${y === "0000" ? "Date not set" : y}</div><div class="tl">${items.filter((m) => m.key.slice(0, 4) === y).map((m) => `<div class="ev" style="--c:${m.c}" ${m.act} data-g="${m.g}" data-y="${y}" data-fi="${findText(m.when, m.title, m.desc)}"><div class="ic"><span>${ico(m.ic)}</span></div><div class="body"><div class="yr">${esc(m.when)}</div><div class="t">${esc(m.title)}</div>${m.desc ? `<div class="d">${esc(m.desc)}</div>` : ""}</div></div>`).join("")}</div></div>`).join("") + `<div class="empty-note" data-fempty hidden>Nothing matches. Try another word.</div>`;
}
function applyFind(scope) {
  if (!scope) return;
  const q = (scope.querySelector("[data-find]")?.value || "").trim().toLowerCase();
  const g = scope.querySelector("[data-fgrp][aria-pressed=true]")?.dataset.fgrp || "all";
  let first = null, any = false;
  for (const it of scope.querySelectorAll("[data-fi]")) {
    const show = (g === "all" || !it.dataset.g || it.dataset.g === g) && (!q || it.dataset.fi.includes(q));
    it.hidden = !show; if (show) { any = true; first = first || it; }
  }
  for (const grp of scope.querySelectorAll("[data-fgroup]")) grp.hidden = !grp.querySelector("[data-fi]:not([hidden])");
  for (const e of scope.querySelectorAll("[data-fempty]")) e.hidden = any;
  if (q || g !== "all") for (const fb of scope.querySelectorAll('[data-act="listToggle"][data-fold]:not([data-fold="tlBody"])')) listToggle(fb, true);
  if (q && first && first.dataset.y && scope.querySelector("#ganttBox")) jumpTo(+first.dataset.y, true);
}
document.addEventListener("input", (e) => { if (e.target.matches("[data-find]")) applyFind(e.target.closest("[data-fscope]")); });
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-fgrp]"); if (!b) return;
  for (const x of b.parentElement.children) x.setAttribute("aria-pressed", x === b);
  applyFind(b.closest("[data-fscope]"));
});
function lifeStrip(w = 360) {
  const t = todayIso(), nowY = roughYear(t);
  const years = [data.profile.diagYear && +data.profile.diagYear, ...live(data.flares).map((f) => roughYear(f.start)), ...live(data.moments).map((m) => roughYear(m.when)), ...live(data.meds).map((m) => roughYear(m.start))].filter(Boolean);
  if (!years.length) return "";
  const y0 = Math.floor(Math.min(...years)), y1 = Math.ceil(nowY + .01), L = 8, R = 8, x = (v) => L + (v - y0) / (y1 - y0) * (w - L - R);
  let s = `<rect x="${x(data.profile.diagYear ? +data.profile.diagYear : y0)}" y="44" width="${x(nowY) - x(data.profile.diagYear ? +data.profile.diagYear : y0)}" height="16" rx="3" fill="var(--ok)" opacity=".55"/>`;
  for (const f of live(data.flares)) {
    const a = roughYear(f.start), b = f.end ? roughYear(f.end) : nowY;
    s += `<rect x="${x(a)}" y="34" width="${Math.max(4, x(b) - x(a))}" height="36" rx="3" fill="var(--mod)"/>`;
  }
  for (const m of live(data.moments)) {
    if (m.type === "colonoscopy") s += `<path d="M${x(roughYear(m.when))} 82l6 7-6 7-6-7z" fill="var(--fg)"/>`;
    if (m.type === "hospital" || m.type === "surgery") s += `<g transform="translate(${x(roughYear(m.when)) - 9} 4)">${S("0 0 24 24", I[m.type === "hospital" ? "hospital" : "cut"], 'width="18" height="18" fill="none" stroke="var(--sev)" stroke-width="2.4"')}</g>`;
  }
  const step = y1 - y0 > 12 ? 2 : 1;
  for (let yr = y0; yr <= y1; yr += step) s += `<text x="${x(yr)}" y="114" font-size="9.5" text-anchor="${yr === y0 ? "start" : yr + step > y1 ? "end" : "middle"}" fill="var(--muted)" font-family="ui-monospace,Menlo,monospace">${yr}</text>`;
  return S(`0 0 ${w} 120`, s, `style="width:100%;min-width:340px;height:auto"`);
}
function profileRows() {
  const p = data.profile, cs = colonoscopies(), last = cs[cs.length - 1], fm = failedMeds(), st = steroidCourses().all;
  return [
    ["diag", "Diagnosed", p.diagYear ? `${p.diagYear} · ${new Date().getFullYear() - p.diagYear} years ago` : "Not set", 0],
    ["scope", "Extent", p.extentNow || p.extentMax ? [p.extentNow && `${p.extentNow} now`, p.extentMax && p.extentMax !== p.extentNow && `furthest ever: ${p.extentMax.toLowerCase()}`].filter(Boolean).join(" · ") : "Not set", 0],
    ["scope", "Colonoscopies", cs.length ? `${cs.length} · last ${fmtRough(last.when)}: ${[last.details?.result, last.details?.polyps === "None" ? "no polyps" : last.details?.polyps?.toLowerCase()].filter(Boolean).join(", ") || "result not set"}${last.details?.nextDue ? " · next due " + last.details.nextDue : ""}` : "None added", 1],
    ["pill", "Medicines that failed", fm.length ? fm.map((m) => `${m.name} (${m.why.toLowerCase()})`).join(", ") : "None", 1],
    ["steroid", "Steroid courses ever", st.length ? `${st.length} (${st.map((m) => (m.start || "").slice(0, 4)).join(", ")}) · ${steroidCourses().recent.length} in the last 12 months` : "None", 1],
    ["joint", "Other symptoms ever", (p.symptomsEver || []).length ? p.symptomsEver.join(", ") : "None", 0],
  ];
}
function renderHistory() {
  const items = timelineItems(), p = data.profile, st = steroidCourses().all.length;
  const sum = [p.diagYear && `Diagnosed ${p.diagYear}`, p.extentNow && p.extentNow.toLowerCase(), st && `${st} steroid course${st > 1 ? "s" : ""}`].filter(Boolean).join(" · ") || "Tap to add your diagnosis and extent";
  $("#main").innerHTML = `<div data-fscope style="display:contents">
  <button class="btn primary" data-act="momentAdd">+ Add an event</button>
  ${items.length ? findBox("Search medicines, flares, tests") : ""}
  <button class="card about" data-act="aboutOpen"><span class="ki">${S("0 0 24 24", I.diag, stroke)}</span><span class="grow"><b>About my colitis</b><span class="sub">${esc(sum)}</span></span><span class="chev" aria-hidden="true">›</span></button>
  ${items.length ? `${timelineCard()}
  <div class="card"><button class="about fold" data-act="listToggle" data-fold="evList" aria-expanded="false"><span class="grow"><b>All events (${items.length})</b><span class="sub">Newest first, grouped by year</span></span><span class="chev" aria-hidden="true">›</span></button>
    <div id="evList" hidden>${findChips()}${eventList(items)}</div></div>` : `<div class="card"><div class="empty-note">Nothing yet. Add your diagnosis, colonoscopies, flares and hospital stays. A rough date is fine. Medicines from Meds appear here too.</div></div>`}</div>`;
}
function aboutOpen() {
  openSheet(`${sheetHead("About my colitis")}
    <div class="kv">${profileRows().map(([k, t, v, a]) => `<div><span class="ki">${S("0 0 24 24", I[k], stroke)}</span><div style="min-width:0"><div class="sub">${t}${a ? '<span class="auto">auto</span>' : ""}</div><div style="font-weight:500">${esc(v)}</div></div></div>`).join("")}</div>
    <div class="sub">Goes in full into every report. Rows marked "auto" fill themselves from Meds and your events.</div>
    <button class="btn primary" data-act="profileEdit">Edit</button>`);
}
/* folded sections stay open while the tab redraws (e.g. after ticking a question) */
const foldOpen = {};
const foldHead = (id, title, sub) => `<button class="about fold" data-act="listToggle" data-fold="${id}" aria-expanded="${!!foldOpen[id]}"><span class="grow"><b>${esc(title)}</b><span class="sub">${esc(sub)}</span></span><span class="chev" aria-hidden="true"${foldOpen[id] ? ' style="transform:rotate(90deg)"' : ""}>›</span></button>`;
/* open or close a folded section: the button names its section with data-fold (default: the list) */
function listToggle(el, open) {
  const id = el?.dataset.fold || "evList", l = $("#" + id); if (!l) return;
  l.hidden = open === undefined ? !l.hidden : !open; foldOpen[id] = !l.hidden;
  const b = el || $(`[data-act="listToggle"][data-fold="${id}"]`) || $('[data-act="listToggle"]:not([data-fold])');
  if (b) { b.setAttribute("aria-expanded", !l.hidden); const c = b.querySelector(".chev"); if (c) c.style.transform = l.hidden ? "" : "rotate(90deg)"; }
  if (id === "tlBody" && !l.hidden) { drawChart(); const gb = $("#ganttBox"); if (gb) gb.scrollLeft = gb.scrollWidth; }
}
function profileEdit() {
  const p = data.profile;
  openSheet(`${sheetHead("About my colitis")}
  <label class="f"><span>Diagnosed (year)</span><input id="pDiag" inputmode="numeric" maxlength="4" value="${esc(p.diagYear || "")}" placeholder="e.g. 2011"></label>
  <div class="f"><span>Extent now</span>${segHtml("pNow", EXTENT, p.extentNow)}</div>
  <div class="f"><span>Furthest it has ever reached</span>${segHtml("pMax", EXTENT, p.extentMax)}</div>
  <div class="f"><span>Other symptoms I've ever had</span><div class="tags" id="pSym">${[...EXTRA, ["liver", "Liver (e.g. PSC)"]].map(([k, l]) => `<button type="button" aria-pressed="${(p.symptomsEver || []).includes(l)}" data-l="${esc(l)}">${ico(k)}${l}</button>`).join("")}</div></div>
  <div class="sub">Colonoscopies, medicines that failed and steroid courses fill in automatically.</div>
  <button class="btn primary" data-act="profileSave">Save</button>`);
}
document.addEventListener("click", (e) => { const b = e.target.closest("#pSym button"); if (b) b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") !== "true"); });
function profileSave() {
  const y = $("#pDiag").value.trim();
  if (y && !/^(19|20)\d\d$/.test(y)) { toast("Year should look like 2011"); return; }
  data.profile = stamp({ diagYear: y, extentNow: segVal("pNow"), extentMax: segVal("pMax"), symptomsEver: $$("#pSym button[aria-pressed=true]").map((b) => b.dataset.l) });
  save("Saved"); closeSheet(); render();
}
function momentForm(m, type) {
  type = m ? m.type : type || "colonoscopy";
  const d = m?.details || {};
  const panes = {
    colonoscopy: `<div class="f"><span>What did it show?</span>${segHtml("cRes", RESULT, d.result)}</div><div class="f"><span>How far it reached</span>${segHtml("cExt", EXTENT, d.extent)}</div><div class="f"><span>Polyps or dysplasia?</span>${segHtml("cPol", ["None", "Polyps", "Dysplasia"], d.polyps)}</div><label class="f"><span>Biopsy result (optional)</span><input id="cBio" value="${esc(d.biopsy || "")}" placeholder="e.g. mild chronic inflammation"></label><label class="f"><span>Next one due (optional)</span><input id="cNext" value="${esc(d.nextDue || "")}" placeholder="e.g. 2027"></label>`,
    flare: `<div class="f"><span>Ended</span>${roughInput("fEnd", d.end, { blank: "Still going" })}</div><div class="f"><span>How bad</span>${segHtml("fSev", SEV, d.sev || "Moderate")}</div>`,
    hospital: `<label class="f"><span>How many days?</span><input id="hDays" inputmode="numeric" value="${esc(d.days || "")}" placeholder="e.g. 5"></label>`,
    surgery: `<label class="f"><span>What surgery?</span><input id="sWhat" value="${esc(d.what || "")}" placeholder="e.g. colectomy"></label>`,
    diagnosis: `<div class="f"><span>Which type?</span>${segHtml("dExt", EXTENT, d.extent)}</div>`,
    other: `<label class="f"><span>Title</span><input id="oTitle" value="${esc(d.title || "")}" placeholder="e.g. Iron infusion"></label>`,
  };
  openSheet(`${sheetHead(m ? "Edit moment" : "Add a moment")}
  ${m ? "" : `<div class="label">What happened?</div><div class="addgrid" style="grid-template-columns:repeat(3,1fr)" id="mtGrid">${MTYPES.map(([k, l, ic]) => `<button type="button" data-mt="${k}" style="${k === type ? "border-color:var(--accent);background:var(--accent-soft)" : ""}">${S("0 0 24 24", I[ic], stroke)}<b>${l}</b></button>`).join("")}</div>`}
  ${type === "flare" ? "" : `<div class="f" style="gap:10px" id="mtPane">${panes[type]}</div>`}
  <div class="f"><span>${type === "flare" ? "Started" : "When"}</span>${roughInput("mWhen", m?.when)}</div>
  ${type === "flare" ? `<div class="f" style="gap:10px" id="mtPane">${panes[type]}</div>` : ""}
  <label class="f"><span>Note (optional)</span><input id="mNoteIn" value="${esc(m?.note || "")}" placeholder="e.g. doctor's comments, where it was done"></label>
  <button class="btn primary" data-act="momentSave" data-id="${m?.id || ""}" data-type="${type}">${m ? "Save" : "Add to history"}</button>
  ${m ? `<button class="btn danger" data-act="momentDelete" data-id="${m.id}">Delete this moment</button>` : ""}`);
}
function momentSave(id, type) {
  const when = readRough("mWhen");
  if (!when) { toast(type === "flare" ? "Add at least the year it started" : "Add at least the year"); return; }
  if (type === "flare") {
    const end = readRough("fEnd");
    let f = id && data.flares.find((x) => x.id === id); if (!f) { f = { id: uid() }; data.flares.push(f); }
    const keep = (old, nu) => (old && nu && old.slice(0, nu.length) === nu ? old : nu);
    Object.assign(f, { start: keep(f.start, when), end: end ? keep(f.end, end) : null, sev: segVal("fSev"), note: $("#mNoteIn").value.trim() }); stamp(f);
  } else {
    const det = { colonoscopy: () => ({ result: segVal("cRes"), extent: segVal("cExt"), polyps: segVal("cPol"), biopsy: $("#cBio").value.trim(), nextDue: $("#cNext").value.trim() }), hospital: () => ({ days: $("#hDays").value.trim() }), surgery: () => ({ what: $("#sWhat").value.trim() }), diagnosis: () => ({ extent: segVal("dExt") }), other: () => ({ title: $("#oTitle").value.trim() }) }[type]();
    let m = id && data.moments.find((x) => x.id === id); if (!m) { m = { id: uid(), type }; data.moments.push(m); }
    Object.assign(m, { when, details: det, note: $("#mNoteIn").value.trim() }); stamp(m);
    if (type === "diagnosis" && !data.profile.diagYear) { data.profile.diagYear = when.slice(0, 4); if (det.extent && !data.profile.extentNow) data.profile.extentNow = det.extent; }
  }
  save(id ? "Saved" : "Added to your history"); closeSheet(); render();
}
function flareForm(f) {
  momentForm({ id: f.id, type: "flare", when: f.start, details: { end: f.end, sev: f.sev }, note: f.note }, "flare");
  const b = $('#sheet [data-act="momentDelete"]'); if (b) { b.dataset.act = "flareDelete"; b.textContent = "Delete this flare"; }
}

/* ---------- tap an item: see it first, edit only from the Edit button ---------- */
const kvRows = (rows) => `<div class="kv mini view">${rows.filter(([, v]) => v).map(([k, v]) => `<div><span class="sub">${k}</span><span>${esc(v)}</span></div>`).join("")}</div>`;
const yrsBetween = (a, b) => { const d = roughYear(b) - roughYear(a); return d < 0.1 ? `${Math.max(1, Math.round(d * 52))} weeks` : d < 1 ? `${Math.round(d * 12)} months` : `${d < 2 ? Math.round(d * 10) / 10 : Math.round(d)} years`; };
function medView(m) {
  const c = curDose(m), st = isSteroid(m.name);
  const changes = (m.changes || []).map((x) => `${fmtRough(x.from)}: ${[x.dose, x.freq].filter(Boolean).join(" · ")}`);
  openSheet(`${sheetHead(m.name, m.stop ? `${esc(fmtRough(m.start))} to ${esc(fmtRough(m.stopDay || m.stop))}` : `Taking since ${esc(fmtRough(m.start))}`)}
    ${kvRows([[m.stop ? "Last dose" : "Dose now", [c.dose, c.freq].filter(Boolean).join(" · ")], ["Form", m.form], ["Type", st ? "Steroid" : ""], ["How long", m.start ? yrsBetween(m.start, m.stop ? m.stopDay || m.stop : todayIso()) : ""], ["Why stopped", m.stop ? m.why : ""], ["Note", m.note]])}
    ${changes.length ? `<div><div class="label">Dose changes</div>${kvRows(changes.map((t) => ["", t]))}</div>` : ""}
    <button class="btn" data-act="medEdit" data-id="${m.id}">${m.stop ? "Edit" : "Change dose, stop or edit"}</button>`);
}
function momentView(m) {
  const [, label] = mtype(m.type), d = m.details || {};
  const title = m.type === "other" ? d.title || "Other" : m.type === "diagnosis" ? "Diagnosed" : label;
  openSheet(`${sheetHead(title, esc(fmtRough(m.when)))}
    ${kvRows([["Result", d.result], ["Reached", d.extent], ["Polyps", d.polyps], ["Biopsy", d.biopsy], ["Next due", d.nextDue], ["Days in hospital", d.days], ["Surgery", d.what], ["Note", m.note]])}
    <button class="btn" data-act="momentEdit" data-id="${m.id}">Edit</button>`);
}
function flareView(f) {
  const end = f.end || todayIso(), a = roughSort(f.start), b = roughSort(end);
  const meds = live(data.meds).filter((m) => m.start && roughSort(m.start) <= b && (!m.stop || roughSort(m.stopDay || m.stop) >= a)).map((m) => m.name);
  const moms = live(data.moments).filter((m) => m.when && roughSort(m.when) >= a && roughSort(m.when) <= b).map((m) => `${mtype(m.type)[1]} ${fmtRough(m.when)}`);
  openSheet(`${sheetHead(f.end ? "Flare" : "Flare (ongoing)", `${esc(fmtRough(f.start))} to ${f.end ? esc(fmtRough(f.end)) : "now"}`)}
    ${kvRows([["How long", yrsBetween(f.start, end)], ["How bad", f.sev], ["Medicines at the time", [...new Set(meds)].join(", ")], ["During it", moms.join(", ")], ["Note", f.note]])}
    <button class="btn" data-act="flareEdit" data-id="${f.id}">Edit</button>`);
}
/* ---------- Timeline: medicines, flares, colonoscopies and hospital stays together ---------- */
const LAYERS = [["meds", "Medicines", `<i style="background:var(--med1);height:6px;border-radius:3px;width:14px"></i>`], ["flares", "Flares", `<i style="background:var(--mod);opacity:.45"></i>`], ["scope", "Colonoscopy", "◆"], ["hosp", "Hospital / surgery", `<b style="color:var(--sev)">✚</b>`]];
let chartShow = Object.assign({ meds: true, flares: true, scope: true, hosp: true }, LS.get("gl.show", {}));
function timelineCard() {
  return `<div class="card"><button class="about fold" data-act="listToggle" data-fold="tlBody" aria-expanded="false"><span class="grow"><b>Timeline</b><span class="sub">Medicines, flares, colonoscopies and hospital stays on one chart</span></span><span class="chev" aria-hidden="true">›</span></button>
    <div id="tlBody" hidden style="display:flex;flex-direction:column;gap:10px">
    <div class="seg" id="zoomSeg" style="grid-template-columns:repeat(3,1fr)">${ZOOMS.map(([l, v]) => `<button data-zoom="${v}" aria-pressed="${v === medZoom}">${l}</button>`).join("")}</div>
    <div class="chips layers" role="group" aria-label="Show on the chart">${LAYERS.map(([k, l, sw]) => `<button type="button" data-layer="${k}" aria-pressed="${chartShow[k]}">${sw} ${l}</button>`).join("")}</div>
    <div id="chartWrap"></div>
    <div class="sub">Tap a bar or mark to open it. Tap the buttons above to show or hide things.</div></div></div>`;
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-layer]"); if (!b) return;
  chartShow[b.dataset.layer] = !chartShow[b.dataset.layer]; LS.set("gl.show", chartShow);
  b.setAttribute("aria-pressed", chartShow[b.dataset.layer]);
  const gb = $("#ganttBox"), left = gb ? gb.scrollLeft : 0; drawChart(); if ($("#ganttBox")) $("#ganttBox").scrollLeft = left;
});
function drawChart() {
  const w = $("#chartWrap"); if (!w) return;
  const chart = medGantt(360, medZoom, chartShow), sc = medGantt.sc, years = [];
  for (let y = Math.floor(sc.y0); y < Math.ceil(sc.y1); y++) years.push(y);
  w.innerHTML = `${medZoom ? `<div class="jump" aria-label="Go to year">${years.map((y) => `<button type="button" data-jump="${y}">${y}</button>`).join("")}</div>` : ""}
    <div style="position:relative"><div class="wide" id="ganttBox">${chart}</div>${medGantt.names.map((n) => `<svg class="gname" style="top:${n.y}px" height="16" width="300"><text x="4" y="12" font-size="11" font-weight="600" fill="var(--fg)" paint-order="stroke" stroke="var(--surface)" stroke-width="4" stroke-linejoin="round">${n.label}</text></svg>`).join("")}</div>`;
  const jr = w.querySelector(".jump"); if (jr) jr.scrollLeft = jr.scrollWidth;
}
/* scroll the chart so the year sits near the left edge; zoom in first if the whole history is showing */
function jumpTo(y, soft) {
  if (!medZoom || $("#tlBody")?.hidden) { if (soft) return; medZoom = 70; LS.set("gl.zoom", medZoom); for (const b of $$("#zoomSeg button")) b.setAttribute("aria-pressed", +b.dataset.zoom === medZoom); drawChart(); }
  const gb = $("#ganttBox"); if (!gb) return;
  gb.scrollTo({ left: Math.max(0, medGantt.sc.x(y) - 30), behavior: "smooth" });
  for (const b of $$("[data-jump]")) b.setAttribute("aria-pressed", +b.dataset.jump === y);
}
document.addEventListener("click", (e) => { const j = e.target.closest("[data-jump]"); if (j) jumpTo(+j.dataset.jump); });

/* ---------- Doctor tab ---------- */
const PERIODS = [["1 month", 1], ["3 months", 3], ["6 months", 6], ["1 year", 12]];
const REP_PARTS = [["hist", "Full history"], ["activity", "Colitis activity"], ["meds", "Medicines and steroids"], ["questions", "Questions"], ["days", "Day by day"]];
let repInc = Object.assign({ hist: true, activity: true, meds: true, questions: true, days: true }, LS.get("gl.rep", {}));
document.addEventListener("click", (e) => { const b = e.target.closest("[data-rep]"); if (!b) return; repInc[b.dataset.rep] = !repInc[b.dataset.rep]; LS.set("gl.rep", repInc); b.setAttribute("aria-pressed", repInc[b.dataset.rep]); });
let period = LS.get("gl.period", 3);
function periodRange(months = period) {
  const end = todayIso(), d = parseIso(end); d.setMonth(d.getMonth() - months); d.setDate(d.getDate() + 1);
  const start = iso(d), keys = []; for (let k = start; k <= end; k = addDays(k, 1)) keys.push(k);
  return { start, end, keys, label: `${fmtDate(start)} to ${fmtDate(end)}`, len: `${months === 12 ? "1 year" : months + (months === 1 ? " month" : " months")} (${keys.length} days)` };
}
function periodStats(r) {
  const logged = r.keys.filter(dayLogged), D = logged.map((k) => data.days[k]), n = D.length || 1;
  const fl = live(data.flares).filter((f) => roughLo(f.start) <= r.end && (!f.end || roughSort(f.end) >= r.start));
  return {
    logged: logged.length,
    avgStools: D.reduce((a, d) => a + d.stools, 0) / n,
    blood: D.filter((d) => d.blood > 0).length,
    urg: D.filter((d) => d.urg > 0).length,
    nights: D.filter((d) => d.night > 0).length,
    pain: D.reduce((a, d) => a + (d.pain || 0), 0) / n,
    flares: fl,
    latest: logged.length ? sccai(data.days[logged[logged.length - 1]]) : null,
    latestDay: logged[logged.length - 1],
  };
}
function sccaiBars(keys, w = 360, h = 90, hex = false) {
  const n = keys.length, bw = w / n, top = 12, col = hex ? SC_HEX : SC;
  let s = "";
  keys.forEach((k, i) => { const d = getDay(k); if (!d) return; const v = sccai(d), hh = Math.max(3, v / top * (h - 14)); s += `<rect x="${i * bw}" y="${h - 12 - hh}" width="${Math.max(.8, bw - .8)}" height="${hh}" rx="1" fill="${col[lvl(v)]}"/>`; });
  let lastM = "", lastX = -99;
  keys.forEach((k, i) => { const m = k.slice(0, 7); if (m !== lastM && (parseIso(k).getDate() <= 3 || (i === 0 && parseIso(k).getDate() <= 20)) && i * bw - lastX >= 26) { lastX = i * bw; s += `<text x="${i * bw}" y="${h}" font-size="9.5" fill="${hex ? "#6b7a77" : "var(--muted)"}">${MONTHS[parseIso(k).getMonth()]}</text>`; } lastM = m; });
  return S(`0 0 ${w} ${h}`, s, `style="width:100%;height:auto"`);
}
function renderDoctor() {
  const hl = data.helpline || {}, me = data.me || {}, r = periodRange(), st = periodStats(r), qs = live(data.questions);
  const kpi = (k, v, l, c) => `<div class="kpi">${S("0 0 24 24", I[k], `fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`)}<div><b>${v}</b><span>${l}</span></div></div>`;
  $("#main").innerHTML = `
  <div class="card"><div class="row"><div class="grow"><div class="label">IBD helpline</div>${hl.number ? `<div class="count" style="font-size:22px;user-select:all">${esc(hl.number)}</div>${hl.hours ? `<div class="sub">${esc(hl.hours)}</div>` : ""}` : `<div class="sub">Add your IBD team's helpline number.</div>`}</div>
    ${hl.number ? `<a class="btn" href="tel:${esc(hl.number.replace(/[^\d+]/g, ""))}" style="display:flex;align-items:center;gap:6px;background:var(--ok);color:#fff;border-color:var(--ok)">${S("0 0 24 24", I.phone, `${stroke} width="18" height="18"`)}Call</a>` : ""}</div>
    <button class="linkbtn" data-act="helplineEdit">${hl.number ? "Edit number" : "+ Add number"}</button></div>
  <button class="card about" data-act="meEdit"><span class="ki">${S("0 0 24 24", I.diag, stroke)}</span><span class="grow"><b>My details</b><span class="sub">${esc([me.name, me.nhs && "NHS " + me.nhs].filter(Boolean).join(" · ") || "Tap to add name, date of birth and NHS number")}</span></span><span class="chev" aria-hidden="true">›</span></button>
  <div class="card">${foldHead("qBody", "Questions for next visit", qs.filter((q) => !q.done).length ? `${qs.filter((q) => !q.done).length} to ask` : "None yet")}
    <div id="qBody" ${foldOpen.qBody ? "" : "hidden"} style="display:flex;flex-direction:column;gap:12px">
    <div class="f" id="qs">${qs.map((q) => `<label class="qrow"><input type="checkbox" data-q="${q.id}" ${q.done ? "checked" : ""}><span style="${q.done ? "text-decoration:line-through;color:var(--muted)" : ""}">${esc(q.text)}</span><button class="x" data-qdel="${q.id}" aria-label="Delete question">×</button></label>`).join("")}</div>
    <form id="qForm" class="row" style="gap:8px"><input id="qIn" class="in" placeholder="Type a question"><button class="btn small" style="padding:10px 14px">Add</button></form>
    ${qs.some((q) => q.done) ? `<button class="linkbtn" data-act="qClear">Remove ticked questions</button>` : ""}</div></div>
  <div class="card rep">${foldHead("repBody", "Report for my IBD team", `Last ${PERIODS.find(([, m]) => m === period)?.[0] || ""} · PDF or Excel`)}
    <div id="repBody" ${foldOpen.repBody ? "" : "hidden"} style="display:flex;flex-direction:column;gap:12px">
    <div class="seg" id="period">${PERIODS.map(([l, m]) => `<button data-period="${m}" aria-pressed="${m === period}">${l}</button>`).join("")}</div>
    <div class="sub">Put in the report</div>
    <div class="chips" role="group" aria-label="Put in the report">${REP_PARTS.map(([k, l]) => `<button type="button" data-rep="${k}" aria-pressed="${!!repInc[k]}">${l}</button>`).join("")}</div>
    <div class="btns"><button class="btn primary" data-act="pdf">Save PDF</button><button class="btn primary" data-act="excel">Save Excel</button></div></div></div>
  <div class="sub" style="text-align:center">A personal log. It doesn't give medical advice.</div>`;
}
document.addEventListener("submit", (e) => {
  if (e.target.id !== "qForm") return; e.preventDefault();
  const v = $("#qIn").value.trim(); if (!v) return;
  data.questions.push(stamp({ id: uid(), text: v, done: false })); save(); renderDoctor(); $("#qIn")?.focus();
});
document.addEventListener("change", (e) => { const id = e.target.dataset?.q; if (!id) return; const q = data.questions.find((x) => x.id === id); q.done = e.target.checked; stamp(q); save(); renderDoctor(); });
function helplineEdit() {
  const hl = data.helpline || {};
  openSheet(`${sheetHead("IBD helpline")}<label class="f"><span>Number</span><input id="hlNum" type="tel" value="${esc(hl.number || "")}"></label><label class="f"><span>When it's open (optional)</span><input id="hlHrs" value="${esc(hl.hours || "")}" placeholder="e.g. Mon to Fri, 9:00 to 17:00"></label><button class="btn primary" data-act="helplineSave">Save</button>`);
}
function meEdit() {
  const me = data.me || {};
  openSheet(`${sheetHead("My details", "Stored only inside your locked data")}<label class="f"><span>Name</span><input id="meName" autocomplete="off" value="${esc(me.name || "")}"></label><label class="f"><span>Date of birth</span><input id="meDob" type="date" value="${esc(me.dob || "")}"></label><label class="f"><span>NHS number</span><input id="meNhs" inputmode="numeric" autocomplete="off" value="${esc(me.nhs || "")}" placeholder="10 digits"></label><button class="btn primary" data-act="meSave">Save</button>`);
}

/* ---------- PDF report ---------- */
function reportHtml() {
  const r = periodRange(), st = periodStats(r), me = data.me || {}, p = data.profile, inc = repInc, summ = inc.activity || inc.meds || inc.questions;
  const pr = (rows) => `<table>${rows.map(([a, b]) => `<tr><td class="muted" style="width:32%">${a}</td><td>${esc(b)}</td></tr>`).join("")}</table>`;
  const cs = colonoscopies(), fm = failedMeds(), stc = steroidCourses();
  const allMeds = live(data.meds).sort((a, b) => (roughSort(a.start) < roughSort(b.start) ? 1 : -1));
  const gantt = medGantt(680).replace(/var\(--med(\d)\)/g, (m, i) => MED_HEX[i - 1]).replace(/var\(--(ok|mild|mod|sev)\)/g, (m, k) => SC_HEX[["ok", "mild", "mod", "sev"].indexOf(k)]).replace(/var\(--fg\)/g, "#152120").replace(/var\(--muted\)/g, "#6b7a77").replace(/var\(--line\)/g, "#dde5e3").replace(/min-width:340px;/, "");
  const moments = timelineItems().filter((x) => !x.auto);
  const days = r.keys.filter(dayLogged).reverse();
  const tagName = (k) => (TAGS.find((t) => t[0] === k) || [k, k])[1];
  const exName = (k) => (EXTRA.find((t) => t[0] === k) || [k, k])[1];
  return `
  <div class="top"><div><h1>Ulcerative colitis report</h1><div class="muted">${inc.hist ? "Full history, then summary" : "Summary"} for ${esc(r.label)} · made on ${esc(fmtDate(todayIso()))}</div></div>
  <div class="pt"><div><span class="muted">Name</span><span>${esc(me.name || "")}</span></div><div><span class="muted">Date of birth</span><span>${me.dob ? esc(fmtDate(me.dob)) : ""}</span></div><div><span class="muted">NHS number</span><span>${esc(me.nhs || "")}</span></div><div><span class="muted">Diagnosed</span><span>${esc([p.diagYear, p.extentNow && p.extentNow.toLowerCase()].filter(Boolean).join(" · "))}</span></div></div></div>
  ${inc.hist ? `<h2>About my colitis</h2>
  ${pr([["Diagnosed", p.diagYear || "Not recorded"], ["Extent", p.extentNow || p.extentMax ? `${p.extentNow || "?"} now · furthest ever: ${(p.extentMax || "?").toLowerCase()}` : "Not recorded"],
    ["Colonoscopies", cs.length ? `${cs.length}: ` + cs.map((c) => `${fmtRough(c.when)} (${[c.details?.result, c.details?.polyps === "None" ? "no polyps" : c.details?.polyps, c.details?.biopsy && "biopsy: " + c.details.biopsy].filter(Boolean).join(", ") || "no details"})`).join("; ") + (cs[cs.length - 1].details?.nextDue ? `. Next due ${cs[cs.length - 1].details.nextDue}.` : "") : "None recorded"],
    ["Medicines that failed", fm.length ? fm.map((m) => `${m.name}: ${m.why.toLowerCase()}${m.note ? ", " + m.note : ""} (${fmtRough(m.stop)})`).join(". ") : "None recorded"],
    ["Steroid courses ever", stc.all.length ? `${stc.all.length} (${stc.all.map((m) => m.name.toLowerCase() + " " + (m.start || "").slice(0, 4)).join(", ")}) · ${stc.recent.length} in the last 12 months` : "None recorded"],
    ["Other symptoms ever", (p.symptomsEver || []).join(", ") || "None recorded"]])}
  ${gantt ? `<h2>Timeline</h2>${gantt}${live(data.flares).length || live(data.moments).length ? `<div class="legend"><span><i style="background:${SC_HEX[2]};opacity:.35"></i>Flare</span><span>◆ Colonoscopy</span><span style="color:${SC_HEX[3]}">✚ Hospital stay / surgery</span></div>` : ""}` : ""}
  <div class="two"><div><h2>Key moments</h2>${moments.length ? `<table>${moments.map((m) => `<tr><td style="white-space:nowrap">${esc(m.when)}</td><td>${esc(m.title)}${m.desc ? ": " + esc(m.desc) : ""}</td></tr>`).join("")}</table>` : `<div class="muted">None recorded</div>`}</div>
  <div><h2>Every medicine</h2>${allMeds.length ? `<table><tr><th>Medicine</th><th>Dose</th><th>Dates</th><th>Outcome</th></tr>${allMeds.map((m) => `<tr><td>${esc(m.name)}${isSteroid(m.name) ? " (steroid)" : ""}</td><td>${esc([m.dose, m.freq].filter(Boolean).join(", "))}${(m.changes || []).map((c) => `<br>→ ${esc([c.dose, c.freq].filter(Boolean).join(", "))} from ${esc(fmtRough(c.from))}`).join("")}</td><td>${esc(fmtRough(m.start))} to ${m.stop ? esc(fmtRough(m.stop)) : "now"}</td><td>${m.stop ? esc([m.why, m.note].filter(Boolean).join(": ") || "Stopped") : "Taking"}</td></tr>`).join("")}</table>` : `<div class="muted">None recorded</div>`}</div></div>` : ""}

  ${inc.hist && summ ? `<div class="pb"></div>` : ""}
  ${summ ? `<h1>Summary for the period</h1><div class="muted" style="font-size:11pt;margin-bottom:4px">${esc(r.label)} · ${esc(r.len)} · ${st.logged} days logged</div>
` : ""}
  ${inc.activity ? `<h2>Colitis activity</h2>
  ${st.logged ? `<div class="score"><div class="n" style="color:${SC_HEX[lvl(st.latest)]}">${st.latest}</div><div><b>${STATE[lvl(st.latest)]}</b> · SCCAI on ${esc(fmtDay(st.latestDay))}, worked out from the daily log<br><span class="muted">Remission 0-2 · Mild 3-5 · Moderate 6-11 · Severe 12+</span></div></div>${sccaiBars(r.keys, 680, 110, true)}<div class="legend">${STATE.map((l, i) => `<span><i style="background:${SC_HEX[i]}"></i>${l}</span>`).join("")}</div>` : `<div class="muted">No days logged in this period.</div>`}
  <h2>Period at a glance</h2>
  <div class="grid">${[["Stools a day (avg)", st.avgStools.toFixed(1)], ["Days with blood", `${st.blood} of ${st.logged}`], ["Days with urgency", st.urg], ["Nights woken", st.nights], ["Average pain (0-10)", st.pain.toFixed(1)], ["Flares", st.flares.length ? st.flares.map((f) => `from ${fmtRough(f.start)}${f.end ? " to " + fmtRough(f.end) : ", ongoing"}`).join("; ") : "None"]].map(([t, v]) => `<div class="k"><b>${esc(v)}</b><span>${t}</span></div>`).join("")}</div>
` : ""}
  <div class="two"><div>${inc.meds ? `<h2>Current medicines</h2>${currentMeds().length ? `<table><tr><th>Medicine</th><th>Dose</th><th>Since</th></tr>${currentMeds().map((m) => `<tr><td>${esc(m.name)}${m.form && m.form !== "Tablet" ? " (" + esc(m.form.toLowerCase()) + ")" : ""}</td><td>${esc(doseText(m))}</td><td>${esc(fmtRough(m.start))}</td></tr>`).join("")}</table>` : `<div class="muted">None recorded</div>`}
    <div class="muted" style="margin-top:4px">Changes in this period: ${(() => { const ch = []; for (const m of live(data.meds)) { if (roughLo(m.start) >= r.start) ch.push(`started ${m.name}`); for (const c of m.changes || []) if (roughLo(c.from) >= r.start) ch.push(`${m.name} to ${c.dose}`); if (m.stop && roughSort(m.stop) >= r.start) ch.push(`stopped ${m.name}`); } return esc(ch.join(", ") || "none"); })()}.</div>
    <h2>Steroids</h2><div>${stc.recent.length} course${stc.recent.length === 1 ? "" : "s"} in the last 12 months · ${stc.all.length} ever</div>` : ""}</div>
  <div>${inc.questions && live(data.questions).filter((q) => !q.done).length ? `<h2>Questions for this visit</h2><ul>${live(data.questions).filter((q) => !q.done).map((q) => `<li>${esc(q.text)}</li>`).join("")}</ul>` : ""}</div></div>


  ${inc.days && days.length ? `${inc.hist || summ ? `<div class="pb"></div>` : ""}<h2>Day by day</h2><div class="muted" style="margin-bottom:4px">Newest first. Shaded rows = flare. Score = SCCAI. Type = Bristol stool scale (1 hard to 7 watery).</div>
  <table class="days"><tr><th>Day</th><th>Score</th><th>Stools</th><th>Night</th><th>Blood</th><th>Urgency</th><th>Type</th><th>Pain</th><th>Feeling</th><th>Other symptoms, tags and notes</th></tr>
  ${days.map((k) => { const d = data.days[k], v = sccai(d); return `<tr class="${inFlare(k) ? "fl" : ""}"><td style="white-space:nowrap">${esc(fmtDay(k))}</td><td><span class="dot" style="background:${SC_HEX[lvl(v)]}"></span>${v}</td><td>${d.stools}</td><td>${d.night || 0}</td><td>${BLOOD[d.blood || 0]}</td><td>${URG[d.urg || 0]}</td><td>${d.bristol || ""}</td><td>${d.pain || 0}</td><td>${WELL[d.well || 0]}</td><td>${esc([(d.extra || []).map(exName).join(", "), d.noteExtra, (d.tags || []).map(tagName).join(", "), d.noteTags].filter(Boolean).join(" · "))}</td></tr>`; }).join("")}</table>` : ""}
  <div class="foot">Personal symptom log kept by the patient. Not a medical record. SCCAI = Simple Clinical Colitis Activity Index, calculated automatically from daily entries.</div>`;
}
let pdfP = null, pdfFile = null;
function loadPdfLib() {
  if (window.html2pdf) return Promise.resolve();
  return pdfP || (pdfP = new Promise((res, rej) => { const sc = document.createElement("script"); sc.src = "vendor/html2pdf.bundle.min.js"; sc.onload = res; sc.onerror = () => { pdfP = null; rej(); }; document.head.appendChild(sc); }));
}
/* The PDF is made on the phone (iPhone Home Screen apps ignore the print screen), then shared with a tap. */
async function makePdf(btn) {
  if (!REP_PARTS.some(([k]) => repInc[k])) { toast("Pick at least one thing to put in the report"); return; }
  if (btn) { btn.disabled = true; btn.innerHTML = `<span class="spin"></span> Making PDF…`; }
  const r = periodRange(), name = `Colitis report ${r.end}.pdf`;
  const box = document.createElement("div");
  const wrap = document.createElement("div");
  wrap.style.cssText = "position:fixed;left:-10000px;top:0;width:720px";
  box.className = "pdfdoc"; box.style.width = "720px";
  box.innerHTML = reportHtml(); wrap.appendChild(box); document.body.appendChild(wrap);
  /* the PDF tool draws each chart as a picture, so give every chart a fixed size and plain colours */
  for (const sv of box.querySelectorAll("svg")) {
    const b = sv.getBoundingClientRect(); sv.setAttribute("width", Math.round(b.width)); sv.setAttribute("height", Math.round(b.height)); sv.style.width = sv.style.height = "";
    sv.innerHTML = sv.innerHTML.replace(/var\(--accent\)/g, "#1f7a6d").replace(/var\(--[a-z0-9]+\)/g, "#6b7a77");
  }
  try {
    await loadPdfLib();
    const blob = await html2pdf().set({ margin: [10, 10, 12, 10], image: { type: "jpeg", quality: 0.92 }, html2canvas: { scale: 2, scrollX: 0, scrollY: 0, backgroundColor: "#ffffff", useCORS: false }, jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }, pagebreak: { mode: ["css", "legacy"], before: ".pb", avoid: ["tr", ".score", ".k", ".top"] } }).from(box).outputPdf("blob");
    pdfFile = new File([blob], name, { type: "application/pdf" });
    openSheet(`${sheetHead("Your PDF is ready", esc(r.label))}<button class="btn primary" data-act="sharePdf">Share or save PDF</button><div class="sub">Pick Save to Files, Mail, WhatsApp or AirDrop.</div>`);
  } catch (e) { toast("Couldn't make the PDF. Try again."); }
  finally { wrap.remove(); if (btn && btn.isConnected) { btn.disabled = false; btn.textContent = "Save PDF"; } }
}
async function sharePdf() { if (pdfFile) { await shareOrDownload(pdfFile, pdfFile.name); } }

/* ---------- Excel ---------- */
async function shareOrDownload(blob, name) {
  const file = new File([blob], name, { type: blob.type });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: name }); return; } catch (e) { if (e.name === "AbortError") return; }
  }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function makeExcel() {
  if (!window.XLSX) { toast("Excel tool didn't load. Try again online."); return; }
  const tagName = (k) => (TAGS.find((t) => t[0] === k) || [k, k])[1];
  const days = Object.keys(data.days).filter(dayLogged).sort().map((k) => { const d = data.days[k], v = sccai(d); const row = { Date: k, SCCAI: v, Activity: STATE[lvl(v)], Flare: inFlare(k) ? "yes" : "", Stools: d.stools, "Night stools": d.night || 0, Blood: BLOOD[d.blood || 0], Urgency: URG[d.urg || 0], "Stool type (Bristol)": d.bristol || "", Pain: d.pain || 0, Feeling: WELL[d.well || 0] }; for (const [k2, l] of EXTRA) row[l] = (d.extra || []).includes(k2) ? 1 : 0; row["Note (other symptoms)"] = d.noteExtra || ""; for (const [k2, l] of TAGS) row[l] = (d.tags || []).includes(k2) ? 1 : 0; row["Note (other)"] = d.noteTags || ""; return row; });
  const meds = []; for (const m of live(data.meds)) { meds.push({ Medicine: m.name, Steroid: isSteroid(m.name) ? "yes" : "", Form: m.form || "", Dose: m.dose || "", "How often": m.freq || "", From: m.start || "", To: m.stop || "", "Why stopped": m.why || "", Note: m.note || "" }); for (const c of m.changes || []) meds.push({ Medicine: m.name, Steroid: isSteroid(m.name) ? "yes" : "", Form: m.form || "", Dose: c.dose || "", "How often": c.freq || "", From: c.from, To: "", "Why stopped": "", Note: "dose change" }); }
  const hist = timelineItems().filter((x) => !x.auto).map((m) => ({ When: m.when, What: m.title, Details: m.desc }));
  const p = data.profile, ab = [{ Field: "Diagnosed", Value: p.diagYear || "" }, { Field: "Extent now", Value: p.extentNow || "" }, { Field: "Furthest extent", Value: p.extentMax || "" }, { Field: "Other symptoms ever", Value: (p.symptomsEver || []).join(", ") }];
  const wb = XLSX.utils.book_new();
  for (const [n, rows] of [["Days", days], ["Medicines", meds], ["History", hist], ["About", ab]]) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length ? rows : [{ "(empty)": "" }]), n);
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  shareOrDownload(new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `gut-log-${todayIso()}.xlsx`);
}
/* ---------- Toilet finder ----------
   In Great Britain it uses a copy of the OpenStreetMap toilets, pubs, cafés and fast food
   that is rebuilt every week and served with this app, so the lookup happens on the phone
   and the location goes nowhere. Elsewhere it asks the public map server. */
const NEAR_TOILET = 1300, NEAR_VENUE = 450;
const KINDS = ["toilet", "pub", "bar", "café", "fast food", "hotel", "department store", "shopping centre"];
function distM(a, b, c, d) {
  const R = 6371e3, r = Math.PI / 180, x = (c - a) * r, y = (d - b) * r;
  const h = Math.sin(x / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(y / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const fmtDist = (m) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`);
const walkMin = (m) => Math.max(1, Math.round(m / 80));
const mapsSearch = (lat, lon, what = "public toilets") => lat != null ? `https://maps.apple.com/?q=${encodeURIComponent(what)}&sll=${lat},${lon}` : `https://maps.apple.com/?q=${encodeURIComponent(what)}`;
const mapsWalk = (lat, lon, name) => `https://maps.apple.com/?daddr=${lat},${lon}&dirflg=w&q=${encodeURIComponent(name || "Toilet")}`;
const inGB = (lat, lon) => lat > 49.8 && lat < 61 && lon > -8.7 && lon < 2;

function toiletSheet(body) {
  openSheet(`${sheetHead("Toilets near you", "From OpenStreetMap. Check signs: details can be out of date.")}${body}`);
}
function findToilets() {
  toiletSheet(`<div class="ok-note"><span class="spin"></span> Finding where you are…</div>`);
  if (!navigator.geolocation) return toiletFail(null, "This phone can't share its location here.");
  navigator.geolocation.getCurrentPosition(
    (p) => loadToilets(p.coords.latitude, p.coords.longitude),
    (e) => toiletFail(null, e.code === 1 ? "Location is off for this app. Allow it in Settings, or use Maps below." : "Couldn't get your location."),
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
}
function toiletFail(lat, msg, lon) {
  if ($("#sheet").hidden) return;
  toiletSheet(`<div class="warn">${esc(msg)}</div><a class="btn primary" href="${mapsSearch(lat, lon)}" target="_blank" rel="noopener">Open in Maps</a>`);
}

/* places from the weekly copy: [lat, lon, kind, name, flags, hours] */
async function tilePlaces(lat, lon) {
  const ks = new Set();
  for (const dy of [-0.013, 0, 0.013]) for (const dx of [-0.02, 0, 0.02]) ks.add(`${Math.floor((lat + dy) * 10)}_${Math.floor((lon + dx) * 10)}`);
  const out = [];
  await Promise.all([...ks].map(async (k) => {
    try { const r = await fetch(`toilets/${k}.json`); if (r.ok) out.push(...(await r.json())); } catch {}
  }));
  return out.map(([la, lo, kind, name, fl = "", hours]) => ({ la, lo, kind, name, fl, hours }));
}
/* fallback outside Great Britain: the public Overpass server (often busy) */
async function livePlaces(lat, lon) {
  const box = (km) => { const a = km / 111, b = a / Math.cos(lat * Math.PI / 180); return [lat - a, lon - b, lat + a, lon + b].map((v) => v.toFixed(5)).join(","); };
  const q = `[out:json][timeout:25];(nwr["amenity"="toilets"](${box(1.3)});nwr["toilets"="yes"](${box(1.3)});node["amenity"~"^(pub|bar|cafe|fast_food)$"](${box(0.45)}););out center 300;`;
  let last = "";
  for (let i = 0; i < 2; i++) {
    try {
      const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 30000);
      const r = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: "data=" + encodeURIComponent(q), headers: { "Content-Type": "application/x-www-form-urlencoded" }, signal: ctl.signal, referrerPolicy: "origin" });
      clearTimeout(t);
      if (r.ok) {
        const j = await r.json(), K = { toilets: 0, pub: 1, bar: 2, cafe: 3, fast_food: 4 };
        return (j.elements || []).map((el) => { const t = el.tags || {}; return { la: el.lat ?? el.center?.lat, lo: el.lon ?? el.center?.lon, kind: K[t.amenity] ?? 3, name: t.name || "", fl: (t.fee === "no" ? "f" : t.fee === "yes" ? "p" : "") + (t.wheelchair === "yes" ? "a" : "") + (t.toilets === "yes" ? "y" : ""), hours: t.opening_hours, no: t.toilets === "no" }; }).filter((x) => x.la != null && !x.no);
      }
      last = String(r.status);
    } catch (e) { last = e.name === "AbortError" ? "slow" : "blocked"; }
    await new Promise((res) => setTimeout(res, 2500));
  }
  throw new Error(last);
}

async function loadToilets(lat, lon) {
  if ($("#sheet").hidden) return;
  toiletSheet(`<div class="ok-note"><span class="spin"></span> Looking for toilets…</div>`);
  let places;
  try { places = inGB(lat, lon) ? await tilePlaces(lat, lon) : await livePlaces(lat, lon); }
  catch (e) { return toiletFail(lat, `The toilet map server is busy (${e.message}). Try Maps instead.`, lon); }
  if ($("#sheet").hidden) return;
  const known = [], likely = [];
  for (const p of places) {
    const d = distM(lat, lon, p.la, p.lo), isToilet = p.kind === 0 || p.fl.includes("y");
    if (d > (isToilet ? NEAR_TOILET : NEAR_VENUE)) continue;
    const kind = KINDS[p.kind] || "place";
    const bits = [];
    if (p.kind !== 0 && p.name) bits.push(kind);
    if (p.fl.includes("f")) bits.push("free"); else if (p.fl.includes("p")) bits.push("paid");
    if (p.fl.includes("c")) bits.push("customers");
    if (p.fl.includes("a")) bits.push("accessible");
    if (p.fl.includes("r")) bits.push("RADAR key");
    if (p.hours) bits.push(p.hours === "24/7" ? "open 24/7" : p.hours);
    const name = p.name || (p.kind === 0 ? "Public toilet" : kind[0].toUpperCase() + kind.slice(1));
    (isToilet ? known : likely).push({ la: p.la, lo: p.lo, name, bits, d });
  }
  known.sort((a, b) => a.d - b.d); likely.sort((a, b) => a.d - b.d);
  const row = (x) => `<a class="tr" href="${mapsWalk(x.la, x.lo, x.name)}" target="_blank" rel="noopener" style="grid-template-columns:1fr auto;text-decoration:none;color:inherit"><div style="min-width:0"><div class="name">${esc(x.name)}</div><div class="sub">${esc(x.bits.join(" · ") || "no details")}</div></div><div style="text-align:right"><div class="name">${fmtDist(x.d)}</div><div class="sub">${walkMin(x.d)} min walk</div></div></a>`;
  toiletSheet(`${known.length ? `<div class="label">Toilets</div><div>${known.slice(0, 10).map(row).join("")}</div>` : `<div class="warn">No toilets on the map within 1.3 km.</div>`}
    ${likely.length ? `<div class="label" style="margin-top:6px">Pubs, cafés and more, close by</div><div class="sub">Most have a toilet, usually for customers. Asking politely often works.</div><div>${likely.slice(0, 8).map(row).join("")}</div>` : ""}
    <div class="sub">Tap one for walking directions.</div>
    <div class="two"><a class="btn" href="${mapsSearch(lat, lon, "pub")}" target="_blank" rel="noopener">Pubs in Maps</a><a class="btn" href="${mapsSearch(lat, lon, "cafe")}" target="_blank" rel="noopener">Cafés in Maps</a></div>`);
}
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
/* ---------- actions ---------- */
const byId = (arr, id) => arr.find((x) => x.id === id);
function tomb(arr, id, msg) { const x = byId(arr, id); if (x) { x.del = true; stamp(x); } save(msg); closeSheet(); render(); }
let xlsxP = null;
function loadXlsx() {
  if (window.XLSX) return Promise.resolve();
  return xlsxP || (xlsxP = new Promise((res, rej) => { const s = document.createElement("script"); s.src = "vendor/xlsx.mini.min.js"; s.onload = res; s.onerror = () => { xlsxP = null; rej(); }; document.head.appendChild(s); }));
}
/* deleting needs a second tap */
function confirmTap(el) {
  if (el.dataset.armed) return true;
  el.dataset.armed = "1"; el._txt = el.innerHTML; el.textContent = "Tap again to delete";
  setTimeout(() => { if (el.isConnected) { delete el.dataset.armed; el.innerHTML = el._txt; } }, 3500);
  return false;
}
const NEEDS_CONFIRM = new Set(["medDelete", "momentDelete", "flareDelete", "clearDay", "wipe"]);
const ACTS = {
  close: () => closeSheet(),
  settings: () => settingsSheet(),
  syncSave: () => syncSave(),
  syncOff: () => syncOff(),
  wipe: () => wipe(),
  toilet: () => findToilets(),
  /* Today */
  dayPrev: () => { viewDay = addDays(viewDay, -1); renderToday(); },
  dayNext: () => { if (viewDay < todayIso()) viewDay = addDays(viewDay, 1); renderToday(); },
  dayToday: () => { viewDay = todayIso(); renderToday(); },
  nightMinus: () => { const d = ensureDay(viewDay); d.night = Math.max(0, (d.night || 0) - 1); touchDay(); renderToday(); },
  nightPlus: () => { const d = ensureDay(viewDay); if ((d.night || 0) < (d.stools || 0)) { d.night = (d.night || 0) + 1; touchDay(); renderToday(); } else toast("Add the stool first, then mark it as at night"); },
  openNote: (el) => { const t = $(`textarea[data-note="${el.dataset.key}"]`); el.remove(); t.hidden = false; t.focus(); },
  flareStart: () => { if (openFlare()) return; data.flares.push(stamp({ id: uid(), start: viewDay, end: null, sev: "Moderate", note: "" })); save("Flare started. Day 1"); render(); },
  flareEnd: () => { const f = openFlare(); if (!f) return; f.end = viewDay < roughLo(f.start) ? roughLo(f.start) : viewDay; stamp(f); save("Flare ended. Well done"); render(); },
  clearDay: () => { data.days[viewDay] = { del: true, at: Date.now() }; save("Day cleared"); renderToday(); },
  /* Trends */
  calPrev: () => { const d = parseIso(calMonth + "-01"); d.setMonth(d.getMonth() - 1); calMonth = iso(d).slice(0, 7); renderTrends(); },
  calNext: () => { const d = parseIso(calMonth + "-01"); d.setMonth(d.getMonth() + 1); const n = iso(d).slice(0, 7); if (n <= todayIso().slice(0, 7)) calMonth = n; renderTrends(); },
  /* Meds */
  medAdd: () => medForm(null),
  steroidOpen: () => steroidOpen(),
  medSave: (el) => medSave(el.dataset.id),
  medDelete: (el) => tomb(data.meds, el.dataset.id, "Medicine deleted"),
  medDose: (el) => medDose(el.dataset.id),
  medStop: (el) => medStop(el.dataset.id),
  medFix: (el) => medForm(byId(data.meds, el.dataset.id)),
  medEdit: (el) => { const m = byId(data.meds, el.dataset.id); if (m) medActions(m); },
  momentEdit: (el) => { const m = byId(data.moments, el.dataset.id); if (m) momentForm(m); },
  flareEdit: (el) => { const f = byId(data.flares, el.dataset.id); if (f) flareForm(f); },
  /* History */
  profileEdit: () => profileEdit(),
  aboutOpen: () => aboutOpen(),
  listToggle: (el) => listToggle(el),
  profileSave: () => profileSave(),
  momentAdd: () => momentForm(null),
  momentSave: (el) => momentSave(el.dataset.id, el.dataset.type),
  momentDelete: (el) => tomb(data.moments, el.dataset.id, "Moment deleted"),
  flareDelete: (el) => tomb(data.flares, el.dataset.id, "Flare deleted"),
  /* Doctor */
  helplineEdit: () => helplineEdit(),
  helplineSave: () => { data.helpline = stamp({ number: $("#hlNum").value.trim(), hours: $("#hlHrs").value.trim() }); save("Saved"); closeSheet(); render(); },
  meEdit: () => meEdit(),
  meSave: () => {
    const nhs = $("#meNhs").value.replace(/\s/g, "");
    if (nhs && !/^\d{10}$/.test(nhs)) { toast("An NHS number has 10 digits"); return; }
    data.me = stamp({ name: $("#meName").value.trim(), dob: $("#meDob").value, nhs: nhs ? `${nhs.slice(0, 3)} ${nhs.slice(3, 6)} ${nhs.slice(6)}` : "" });
    save("Saved"); closeSheet(); render();
  },
  qClear: () => { for (const q of data.questions) if (q.done && !q.del) { q.del = true; stamp(q); } save("Removed"); renderDoctor(); },
  pdf: (el) => makePdf(el),
  sharePdf: () => sharePdf(),
  excel: async (el) => { el.disabled = true; try { await loadXlsx(); makeExcel(); } catch { toast("Excel tool didn't load. Try again online."); } el.disabled = false; },
};
document.addEventListener("click", (e) => {
  const a = e.target.closest("[data-act]");
  if (a && ACTS[a.dataset.act]) {
    if (NEEDS_CONFIRM.has(a.dataset.act) && !confirmTap(a)) return;
    e.preventDefault(); ACTS[a.dataset.act](a); return;
  }
  const t = e.target.closest("[data-tab]"); if (t) { if (!$("#sheet").hidden) closeSheet(); go(t.dataset.tab); return; }
  if (e.target.id === "scrim") { closeSheet(); return; }
  const day = e.target.closest("[data-day]"); if (day) { viewDay = day.dataset.day; go("today"); return; }
  const med = e.target.closest("[data-med]"); if (med) { const m = byId(data.meds, med.dataset.med); if (m) medView(m); return; }
  const mt = e.target.closest("[data-mt]"); if (mt) { const when = readRough("mWhen"), note = $("#mNoteIn")?.value || ""; momentForm(null, mt.dataset.mt); if (when) $('[data-rough="mWhen"]').outerHTML = roughInput("mWhen", when); $("#mNoteIn").value = note; return; }
  const mo = e.target.closest("[data-moment]"); if (mo) { const x = byId(data.moments, mo.dataset.moment); if (x) momentView(x); return; }
  const fl = e.target.closest("[data-flare]"); if (fl) { const x = byId(data.flares, fl.dataset.flare); if (x) flareView(x); return; }
  const qd = e.target.closest("[data-qdel]"); if (qd) { e.preventDefault(); const q = byId(data.questions, qd.dataset.qdel); if (q) { q.del = true; stamp(q); save(); renderDoctor(); } return; }
  const zm = e.target.closest("[data-zoom]"); if (zm) { medZoom = +zm.dataset.zoom; LS.set("gl.zoom", medZoom); for (const b of $$("#zoomSeg button")) b.setAttribute("aria-pressed", b === zm); drawChart(); const gb = $("#ganttBox"); if (gb) gb.scrollLeft = gb.scrollWidth; return; }
  const pr = e.target.closest("[data-period]"); if (pr) { period = +pr.dataset.period; LS.set("gl.period", period); renderDoctor(); return; }
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#sheet").hidden) closeSheet(); });

/* No pinch or double-tap zoom (iPhone ignores the viewport setting in Safari, so block the gestures too). */
["gesturestart", "gesturechange"].forEach((t) => document.addEventListener(t, (e) => e.preventDefault()));

/* ---------- start ---------- */
render();
setSync(connected() ? (dirty ? "ok" : "ok") : "off");
if (connected()) sync();
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
