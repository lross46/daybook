
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
  if (q && first && first.dataset.y && scope.querySelector("#chartWrap")) jumpTo(+first.dataset.y, true);
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
    const a = roughYear(f.start, "start"), b = f.end ? roughYear(f.end, "end") : nowY;
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
const isOpen = (id) => !!foldOpen[tab + "." + id];
const foldHead = (id, title, sub) => `<button class="about fold" data-act="listToggle" data-fold="${id}" aria-expanded="${!!foldOpen[tab + "." + id]}"><span class="grow"><b>${esc(title)}</b><span class="sub">${esc(sub)}</span></span><span class="chev" aria-hidden="true"${foldOpen[id] ? ' style="transform:rotate(90deg)"' : ""}>›</span></button>`;
/* open or close a folded section: the button names its section with data-fold (default: the list) */
function listToggle(el, open) {
  const id = el?.dataset.fold || "evList", l = $("#" + id); if (!l) return;
  l.hidden = open === undefined ? !l.hidden : !open; foldOpen[tab + "." + id] = !l.hidden;
  const b = el || $(`[data-act="listToggle"][data-fold="${id}"]`) || $('[data-act="listToggle"]:not([data-fold])');
  if (b) { b.setAttribute("aria-expanded", !l.hidden); const c = b.querySelector(".chev"); if (c) c.style.transform = l.hidden ? "" : "rotate(90deg)"; }
  if (id === "tlBody" && !l.hidden) drawChart();
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
  save("Saved"); doneEdit();
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
  save(id ? "Saved" : "Added to your history"); doneEdit();
}
function flareForm(f) {
  momentForm({ id: f.id, type: "flare", when: f.start, details: { end: f.end, sev: f.sev }, note: f.note }, "flare");
  const b = $('#sheet [data-act="momentDelete"]'); if (b) { b.dataset.act = "flareDelete"; b.textContent = "Delete this flare"; }
}

/* ---------- tap an item: see it first, edit only from the Edit button ---------- */
const kvRows = (rows) => `<div class="kv mini view">${rows.filter(([, v]) => v).map(([k, v]) => `<div><span class="sub">${k}</span><span>${esc(v)}</span></div>`).join("")}</div>`;
const yrsBetween = (a, b) => { const d = roughYear(b, "end") - roughYear(a, "start"); return d < 0.1 ? `${Math.max(1, Math.round(d * 52))} weeks` : d < 1 ? `${Math.round(d * 12)} months` : `${d < 2 ? Math.round(d * 10) / 10 : Math.round(d)} years`; };
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
