
/* ---------- Tests ---------- */
const TESTDEF = [
  { name: "Calprotectin", unit: "µg/g", hi: 200, range: "under 50", al: ["faecal calprotectin", "fecal calprotectin", "calprotectin", "calpro", "fcp"] },
  { name: "CRP", unit: "mg/L", hi: 5, range: "0 to 5", al: ["c-reactive protein", "c reactive protein", "crp"] },
  { name: "Haemoglobin", unit: "g/L", range: "about 130 to 180", al: ["haemoglobin", "hemoglobin", "hgb", "hb"] },
  { name: "Albumin", unit: "g/L", lo: 35, range: "35 to 50", al: ["albumin", "alb"] },
  { name: "White cells", unit: "×10⁹/L", lo: 4, hi: 11, range: "4 to 11", al: ["white cell count", "white blood cell count", "white blood cells", "white cells", "wbc"] },
  { name: "Platelets", unit: "×10⁹/L", lo: 150, hi: 400, range: "150 to 400", al: ["platelet count", "platelets", "plt"] },
  { name: "ESR", unit: "mm/hr", al: ["erythrocyte sedimentation rate", "esr"] },
  { name: "Ferritin", unit: "µg/L", al: ["ferritin"] },
  { name: "Vitamin D", unit: "nmol/L", al: ["vitamin d", "25-oh vitamin d", "25 hydroxy vitamin d"] },
  { name: "Vitamin B12", unit: "ng/L", al: ["vitamin b12", "b12"] },
  { name: "ALT", unit: "U/L", al: ["alanine aminotransferase", "alt"] },
  { name: "Creatinine", unit: "µmol/L", al: ["creatinine"] },
];
const testDef = (n) => TESTDEF.find((t) => t.name === n) || { name: n, unit: "" };
const SOURCES = ["NHS App", "IBD nurse call", "Hospital letter", "Home test", "Other"];

/* Reads results out of free text (pasted, dictated or OCR'd). Runs only on this phone. */
function parseResults(text) {
  const t = " " + text.toLowerCase().replace(/[‐–—]/g, "-").replace(/\s+/g, " ") + " ";
  const found = [], used = [];
  for (const def of TESTDEF) {
    for (const a of def.al) {
      const re = new RegExp(`(?:^|[^a-z0-9])${a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z])[^0-9]{0,30}?(<|>)?\\s*(\\d+(?:[.,]\\d+)?)`, "g");
      let mm; while ((mm = re.exec(t))) {
        const pos = mm.index; if (used.some(([a1, b1]) => pos >= a1 && pos < b1)) continue;
        used.push([pos, pos + mm[0].length]);
        found.push({ name: def.name, value: parseFloat(mm[2].replace(",", ".")), unit: def.unit, sign: mm[1] || "" });
        break;
      }
      if (found.some((f) => f.name === def.name)) break;
    }
  }
  return { results: found, date: parseDateIn(t), source: /nurse/.test(t) ? "IBD nurse call" : /letter|clinic/.test(t) ? "Hospital letter" : /home test|at home/.test(t) ? "Home test" : "" };
}
function parseDateIn(t) {
  const now = new Date(), mi = (s) => MONTHS_L.findIndex((m) => m.toLowerCase().startsWith(s.slice(0, 3)));
  let m;
  if ((m = t.match(/(\d{1,2})[\/.](\d{1,2})[\/.](\d{2,4})/))) { let y = +m[3]; if (y < 100) y += 2000; return iso(new Date(y, +m[2] - 1, +m[1])); }
  if ((m = t.match(/(\d{4})-(\d{2})-(\d{2})/))) return `${m[1]}-${m[2]}-${m[3]}`;
  if ((m = t.match(/(\d{1,2})(?:st|nd|rd|th)?(?: of)?[ -](jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?[ -]?(\d{4})?/))) {
    const y = m[3] ? +m[3] : now.getFullYear(); let d = new Date(y, mi(m[2]), +m[1]); if (!m[3] && d > now) d = new Date(y - 1, mi(m[2]), +m[1]); return iso(d);
  }
  if ((m = t.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* (\d{1,2})(?:st|nd|rd|th)?,? ?(\d{4})?/))) {
    const y = m[3] ? +m[3] : now.getFullYear(); return iso(new Date(y, mi(m[1]), +m[2]));
  }
  if (/yesterday/.test(t)) return addDays(todayIso(), -1);
  return "";
}
function spark(pts, def, w = 130, h = 44) {
  const ys = pts.map((p) => p.value), mx = Math.max(...ys, def.hi || 0) * 1.1 || 1, mn = Math.min(0, ...ys);
  const xs = pts.map((p) => roughYear(p.date)), x0 = Math.min(...xs) - .05, x1 = Math.max(...xs) + .05;
  const X = (v) => 4 + (v - x0) / (x1 - x0 || 1) * (w - 8), Y = (v) => h - 4 - (v - mn) / (mx - mn) * (h - 8);
  const bad = (v) => (def.hi && v > def.hi) || (def.lo && v < def.lo);
  let s = def.hi ? `<line x1="0" x2="${w}" y1="${Y(def.hi)}" y2="${Y(def.hi)}" stroke="var(--sev)" stroke-dasharray="3 3" opacity=".6"/>` : "";
  if (pts.length > 1) s += `<polyline points="${pts.map((p, i) => X(xs[i]) + "," + Y(p.value)).join(" ")}" fill="none" stroke="var(--accent)" stroke-width="2"/>`;
  pts.forEach((p, i) => s += `<circle cx="${pts.length === 1 ? w - 10 : X(xs[i])}" cy="${Y(p.value)}" r="${i === pts.length - 1 ? 4 : 2.8}" fill="${bad(p.value) ? "var(--sev)" : "var(--accent)"}"/>`);
  return S(`0 0 ${w} ${h}`, s, `style="width:${w}px;height:${h}px"`);
}
function testGroups() {
  const g = {};
  for (const t of live(data.tests)) (g[t.name] = g[t.name] || []).push(t);
  return Object.entries(g).map(([n, arr]) => [n, arr.sort((a, b) => (a.date < b.date ? -1 : 1))]).sort((a, b) => (a[1].slice(-1)[0].date < b[1].slice(-1)[0].date ? 1 : -1));
}
const isBad = (def, v) => (def.hi && v > def.hi) || (def.lo && v < def.lo);
function renderTests() {
  const g = testGroups();
  $("#main").innerHTML = `
  <div class="card"><div class="label">Add results</div>
    <div class="addgrid">
      <button data-act="tPhoto">${S("0 0 24 24", I.camera, stroke)}<b>Screenshot or photo</b><span>e.g. NHS App results</span></button>
      <button data-act="tPaste">${S("0 0 24 24", I.paste, stroke)}<b>Paste text</b><span>copied from anywhere</span></button>
      <button data-act="tVoice">${S("0 0 24 24", I.mic, stroke)}<b>Say it</b><span>e.g. after a nurse call</span></button>
      <button data-act="tType">${S("0 0 24 24", I.pen, stroke)}<b>Type it</b><span>one result at a time</span></button>
    </div><div class="sub">Read on your phone. Nothing is uploaded, and you check every value before it's saved.</div></div>
  <div class="row"><div class="label">My results</div><a class="pill" href="https://www.nhs.uk/nhs-app/" target="_blank" rel="noopener">Open NHS App ↗</a></div>
  ${g.length ? g.map(([n, pts]) => { const def = testDef(n), last = pts[pts.length - 1]; return `<div class="test" data-test="${esc(n)}"><div style="min-width:0"><div class="name">${esc(n)}</div><div class="v" style="color:${isBad(def, last.value) ? "var(--sev)" : "var(--fg)"}">${last.sign || ""}${last.value} <small>${esc(last.unit)}</small></div><div class="sub">${esc(fmtDate(last.date))}${last.source ? " · " + esc(last.source) : ""} · ${pts.length} result${pts.length > 1 ? "s" : ""}</div></div>${spark(pts, def)}</div>`; }).join("") : `<div class="empty-note">No results yet. Add them whenever you get them; gaps are normal.</div>`}`;
}
function reviewSheet(parsed, title, extra = "") {
  const rows = parsed.results;
  const opts = (sel) => TESTDEF.map((d) => `<option ${d.name === sel ? "selected" : ""}>${d.name}</option>`).join("");
  openSheet(`${sheetHead(title)}${extra}
  ${rows.length ? `<div class="label">Found ${rows.length} result${rows.length > 1 ? "s" : ""} · check them</div>` : `<div class="warn">No results recognised. Check the text, or add them one by one with "Type it".</div>`}
  <div class="f" id="revRows">${rows.map((r) => `<div class="two" style="grid-template-columns:24px 1fr 90px;align-items:center"><input type="checkbox" checked aria-label="Include"><select>${opts(r.name)}</select><input inputmode="decimal" value="${r.sign || ""}${r.value}" aria-label="Value"></div>`).join("")}</div>
  ${rows.length ? `<div class="two"><label class="f"><span>Date</span><input id="revDate" type="date" value="${parsed.date || todayIso()}" max="${todayIso()}"></label><label class="f"><span>From</span><select id="revSrc">${SOURCES.map((s) => `<option ${s === parsed.source ? "selected" : ""}>${s}</option>`).join("")}</select></label></div>${parsed.date ? "" : `<div class="sub">No date found in the text, so it's set to today. Change it if needed.</div>`}<button class="btn primary" data-act="revSave">Save results</button>` : ""}`);
}
function revSave() {
  const date = $("#revDate").value || todayIso(), src = $("#revSrc").value; let n = 0;
  for (const row of $$("#revRows > div")) {
    const [cb, sel, val] = $$("input,select", row); if (!cb.checked) continue;
    const raw = val.value.trim().replace(",", "."), sign = /^[<>]/.test(raw) ? raw[0] : "", v = parseFloat(raw.replace(/^[<>]/, ""));
    if (isNaN(v)) continue;
    data.tests.push(stamp({ id: uid(), name: sel.value, value: v, sign, unit: testDef(sel.value).unit, date, source: src })); n++;
  }
  save(n ? `Saved ${n} result${n > 1 ? "s" : ""}` : "Nothing saved"); closeSheet(); render();
}
function textEntry(kind) {
  const voice = kind === "voice";
  openSheet(`${sheetHead(voice ? "Say it" : "Paste text")}
  <div class="sub">${voice ? "Tap in the box, then the microphone on your keyboard, and say the results, e.g. \"Calprotectin 410 from the IBD nurse, 18 November\"." : "Paste results copied from the NHS App, an email or a letter."}</div>
  <textarea id="txtIn" rows="5" placeholder="${voice ? "Calprotectin 410, nurse call, 18 November" : "C-reactive protein 8 mg/L\nHaemoglobin 132 g/L"}"></textarea>
  <button class="btn primary" data-act="txtRead" data-kind="${kind}">Read it</button>`);
  setTimeout(() => $("#txtIn")?.focus(), 250);
}
function typeEntry(t) {
  const def = t ? testDef(t.name) : TESTDEF[0];
  openSheet(`${sheetHead(t ? "Edit result" : "Type a result")}
  <label class="f"><span>Test</span><select id="tyName">${TESTDEF.map((d) => `<option ${d.name === def.name ? "selected" : ""}>${d.name}</option>`).join("")}${t && !TESTDEF.find((d) => d.name === t.name) ? `<option selected>${esc(t.name)}</option>` : ""}<option value="__other">Other test…</option></select></label>
  <input id="tyOther" hidden placeholder="Test name">
  <div class="two"><label class="f"><span>Value</span><input id="tyVal" inputmode="decimal" value="${t ? (t.sign || "") + t.value : ""}"></label><label class="f"><span>Unit</span><input id="tyUnit" value="${esc(t ? t.unit : def.unit)}"></label></div>
  <div class="two"><label class="f"><span>Date</span><input id="tyDate" type="date" value="${t?.date || todayIso()}" max="${todayIso()}"></label><label class="f"><span>From</span><select id="tySrc">${SOURCES.map((s) => `<option ${s === (t?.source || "NHS App") ? "selected" : ""}>${s}</option>`).join("")}</select></label></div>
  <button class="btn primary" data-act="tySave" data-id="${t?.id || ""}">Save result</button>
  ${t ? `<button class="btn danger" data-act="testDelete" data-id="${t.id}">Delete this result</button>` : ""}`);
}
document.addEventListener("change", (e) => {
  if (e.target.id === "tyName") { const o = e.target.value === "__other"; $("#tyOther").hidden = !o; if (!o) $("#tyUnit").value = testDef(e.target.value).unit; }
});
function tySave(id) {
  let name = $("#tyName").value; if (name === "__other") name = $("#tyOther").value.trim();
  const raw = $("#tyVal").value.trim().replace(",", "."), sign = /^[<>]/.test(raw) ? raw[0] : "", v = parseFloat(raw.replace(/^[<>]/, ""));
  if (!name || isNaN(v)) { toast("Add the test and a number"); return; }
  let t = id && data.tests.find((x) => x.id === id); if (!t) { t = { id: uid() }; data.tests.push(t); }
  Object.assign(t, { name, value: v, sign, unit: $("#tyUnit").value.trim(), date: $("#tyDate").value || todayIso(), source: $("#tySrc").value });
  stamp(t); save("Saved"); closeSheet(); render();
}
function testDetail(name) {
  const pts = (testGroups().find(([n]) => n === name) || [, []])[1], def = testDef(name);
  openSheet(`${sheetHead(name, def.range ? "Usual range " + esc(def.range) + " " + esc(def.unit) : "")}
  <div>${spark(pts, def, 330, 90).replace('style="width:330px;height:90px"', 'style="width:100%;height:auto"')}</div>
  <div>${pts.slice().reverse().map((t) => `<div class="tr" data-testrow="${t.id}" style="grid-template-columns:1fr auto"><div><div class="name" style="color:${isBad(def, t.value) ? "var(--sev)" : "var(--fg)"}">${t.sign || ""}${t.value} ${esc(t.unit)}</div><div class="sub">${esc(fmtDate(t.date))}${t.source ? " · " + esc(t.source) : ""}</div></div><span class="sub">Edit ›</span></div>`).join("")}</div>`);
}

/* OCR: tesseract.js (served from this site) is loaded only when needed; the image never leaves the phone. */
let ocrLib = null;
function loadOcr() {
  if (ocrLib) return ocrLib;
  ocrLib = new Promise((res, rej) => { const s = document.createElement("script"); s.src = "vendor/ocr/tesseract.min.js"; s.onload = () => res(window.Tesseract); s.onerror = () => { ocrLib = null; rej(new Error("Couldn't load the text reader. Check your internet and try again.")); }; document.head.appendChild(s); });
  return ocrLib;
}
function photoEntry() {
  openSheet(`${sheetHead("From a screenshot or photo")}
  <div class="sub">Pick a screenshot of your results (e.g. from the NHS App). It's read on this phone and isn't uploaded or saved.</div>
  <label class="btn primary" style="display:block">Choose screenshot or photo<input id="ocrFile" type="file" accept="image/*" hidden></label>
  <div id="ocrStatus" class="sub"></div>`);
}
document.addEventListener("change", async (e) => {
  if (e.target.id !== "ocrFile" || !e.target.files[0]) return;
  const file = e.target.files[0], st = $("#ocrStatus");
  st.innerHTML = `<span class="spin"></span> Reading the image… (the first time takes a little longer)`;
  try {
    const T = await loadOcr();
    const base = new URL("vendor/ocr/", location.href).href;
    const w = await T.createWorker("eng", 1, { workerPath: base + "worker.min.js", corePath: base, langPath: base, gzip: true, workerBlobURL: false });
    const { data: r } = await w.recognize(file); w.terminate();
    const parsed = parseResults(r.text); if (!parsed.source) parsed.source = "NHS App";
    reviewSheet(parsed, "From a screenshot", `<details class="sub"><summary>Text found in the image</summary><div class="shot" style="white-space:pre-wrap">${esc(r.text.trim())}</div></details>`);
  } catch (err) { st.innerHTML = `<span class="warn" style="display:block">${esc(err.message || "Couldn't read that image.")}</span>`; }
});
