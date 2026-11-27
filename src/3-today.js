
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
  const week = [];
  for (let i = 6; i >= 0; i--) {
    const k = addDays(t, -i), d = getDay(k), L = d ? lvl(sccai(d)) : null;
    week.push(`<div><i style="background:${L == null ? "transparent;border:2px dashed var(--line)" : SC[L]}"></i>${DOW[parseIso(k).getDay()][0]}</div>`);
  }
  return `<div class="card"><div class="hero">${S("0 0 132 132", ring)}<div style="min-width:0"><div class="label">Right now</div><div class="state" style="color:${color}">${title}</div><div class="sub">${sub}</div></div></div>
  <div><div class="label" style="margin-bottom:6px">Last 7 days</div><div class="week">${week.join("")}</div></div></div>`;
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
  ${isToday ? heroHtml() : ""}
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
  ${isToday ? (f ? `<button class="btn flare" data-act="flareEnd">Flare ended today</button>` : `<button class="btn flare" data-act="flareStart">A flare started today</button>`) : ""}
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
