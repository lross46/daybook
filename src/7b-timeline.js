/* ---------- Timeline: medicines, flares, colonoscopies and hospital stays together ---------- */
const LAYERS = [["meds", "Medicines", `<i style="background:var(--med1);height:6px;border-radius:3px;width:14px"></i>`], ["flares", "Flares", `<i style="background:var(--mod);opacity:.45"></i>`], ["scope", "Colonoscopy", "◆"], ["hosp", "Hospital / surgery", `<b style="color:var(--sev)">✚</b>`]];
let chartShow = Object.assign({ meds: true, flares: true, scope: true, hosp: true }, LS.get("gl.show", {}));
function timelineCard() {
  return `<div class="card"><button class="about fold" data-act="listToggle" data-fold="tlBody" aria-expanded="false"><span class="grow"><b>Timeline</b><span class="sub">Medicines, flares, colonoscopies and hospital stays on one chart</span></span><span class="chev" aria-hidden="true">›</span></button>
    <div id="tlBody" hidden style="display:flex;flex-direction:column;gap:10px">
    <div class="seg" id="zoomSeg" style="grid-template-columns:repeat(6,1fr)">${TL_ZOOMS.map(([l], i) => `<button data-tlz="${i}" aria-pressed="${i === tlZ}">${l}</button>`).join("")}</div>
    <div class="row" id="tlNav"><button class="navbtn" data-tlstep="-1" aria-label="Earlier">‹</button><b id="tlLbl" class="tllbl"></b><button class="navbtn" data-tlstep="1" aria-label="Later">›</button></div>
    <div class="chips layers" role="group" aria-label="Show on the chart">${LAYERS.map(([k, l, sw]) => `<button type="button" data-layer="${k}" aria-pressed="${chartShow[k]}">${sw} ${l}</button>`).join("")}</div>
    <div id="chartWrap"></div>
    <div class="sub">Tap a bar or mark to open it. Tap the buttons above to show or hide things.</div></div></div>`;
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-layer]"); if (!b) return;
  chartShow[b.dataset.layer] = !chartShow[b.dataset.layer]; LS.set("gl.show", chartShow);
  b.setAttribute("aria-pressed", chartShow[b.dataset.layer]);
  drawChart();
});
/* zoom windows: how many years each step shows (0 = everything) */
const TL_ZOOMS = [["All", 0], ["5 yrs", 5], ["1 yr", 1], ["6 mo", .5], ["3 mo", .25], ["1 mo", 1 / 12]];
let tlZ = LS.get("gl.tlz", 0), tlEnd = null;
const monthEnd = () => Math.ceil(roughYear(todayIso(), "start") * 12 + .001) / 12;
function tlWindow() {
  const span = TL_ZOOMS[tlZ][1]; if (!span) return null;
  if (tlEnd == null) tlEnd = monthEnd();
  medGantt(360); if (!medGantt.full) return null; const [f0] = medGantt.full, top = monthEnd();
  tlEnd = Math.min(Math.max(tlEnd, f0 + span), top); tlEnd = Math.round(tlEnd * 12) / 12;
  return [tlEnd - span, tlEnd];
}
const fmtM = (t) => { const m = Math.round(t * 12); return MONTHS[m % 12] + " " + Math.floor(m / 12); };
function drawChart() {
  const w = $("#chartWrap"); if (!w) return;
  const win = tlWindow(), chart = medGantt(360, 0, chartShow, win);
  if (!medGantt.full) { w.innerHTML = `<div class="sub">Add medicines or events to see them here.</div>`; return; }
  const [f0, f1] = medGantt.full;
  const lbl = $("#tlLbl"), span = TL_ZOOMS[tlZ][1];
  if (lbl) lbl.textContent = !win ? `${Math.floor(f0)} to now` : span >= 5 ? `${Math.round(win[0])} – ${Math.round(win[1]) - 1}` : span <= 1 / 12 ? fmtM(win[0]) : `${fmtM(win[0])} – ${fmtM(win[1] - 1 / 12)}`;
  for (const b of $$("[data-tlstep]")) { b.disabled = !win || (+b.dataset.tlstep < 0 ? win[0] <= f0 + .001 : win[1] >= monthEnd() - .001); }
  /* mini-map: the whole history as a thin strip; the box shows where the window is */
  const mw = 360, mx = (t) => 4 + (t - f0) / (f1 - f0) * (mw - 8);
  let m = "";
  if (chartShow.flares) for (const f of live(data.flares).filter((x) => x.start)) { const a = roughYear(f.start, "start"), b = f.end ? roughYear(f.end, "end") : roughYear(todayIso()); m += `<rect x="${mx(a)}" y="3" width="${Math.max(1.5, mx(b) - mx(a))}" height="24" fill="var(--mod)" opacity=".3"/>`; }
  const nm = [...new Set(live(data.meds).filter((x) => x.start).sort((a, b) => (roughSort(a.start) < roughSort(b.start) ? -1 : 1)).map((x) => x.name))];
  if (chartShow.meds) nm.forEach((n, i) => { for (const md of live(data.meds).filter((q) => q.name === n && q.start)) { const a = roughYear(md.start, "start"), b = md.stopDay ? roughYear(md.stopDay, "end") : md.stop ? roughYear(md.stop, "end") : roughYear(todayIso()); m += `<rect x="${mx(a)}" y="${4 + (i % 6) * 4}" width="${Math.max(1.5, mx(b) - mx(a))}" height="3" fill="${medColor(md)}"/>`; } });
  const step = f1 - f0 > 12 ? 2 : 1;
  for (let y = Math.ceil(f0); y < f1; y += step) m += `<text x="${mx(y)}" y="40" font-size="9" text-anchor="middle" fill="var(--muted)" font-family="ui-monospace,Menlo,monospace">'${String(y).slice(2)}</text>`;
  if (win) m += `<rect x="${mx(win[0])}" y="1" width="${Math.max(6, mx(win[1]) - mx(win[0]))}" height="28" rx="4" fill="var(--accent)" fill-opacity=".14" stroke="var(--accent)" stroke-width="2"/>`;
  w.innerHTML = `<div id="ganttBox">${chart.replace("min-width:340px;", "")}</div><div class="tlmini" id="tlMini" role="button" aria-label="Whole history: tap to jump there">${S(`0 0 ${mw} 44`, m, 'style="width:100%;height:auto;display:block"')}</div>`;
}
/* show the window that holds year y (used by search) */
function jumpTo(y, soft) {
  if ($("#tlBody")?.hidden) return;
  if (!TL_ZOOMS[tlZ][1]) { if (soft) return; tlZ = 2; LS.set("gl.tlz", tlZ); for (const b of $$("[data-tlz]")) b.setAttribute("aria-pressed", +b.dataset.tlz === tlZ); }
  tlEnd = Math.floor(y) + 1; drawChart();
}
document.addEventListener("click", (e) => {
  const z = e.target.closest("[data-tlz]");
  if (z) { tlZ = +z.dataset.tlz; LS.set("gl.tlz", tlZ); for (const b of $$("[data-tlz]")) b.setAttribute("aria-pressed", b === z); drawChart(); return; }
  const st = e.target.closest("[data-tlstep]");
  if (st) { tlEnd += +st.dataset.tlstep * TL_ZOOMS[tlZ][1]; drawChart(); return; }
  const mm = e.target.closest("#tlMini");
  if (mm && TL_ZOOMS[tlZ][1]) { const r = mm.getBoundingClientRect(), [f0, f1] = medGantt.full, t = f0 + ((e.clientX - r.left) / r.width * 360 - 4) / 352 * (f1 - f0); tlEnd = t + TL_ZOOMS[tlZ][1] / 2; drawChart(); }
});
document.addEventListener("click", (e) => { const j = e.target.closest("[data-jump]"); if (j) jumpTo(+j.dataset.jump); });
