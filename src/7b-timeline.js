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
  for (let y = Math.ceil(sc.y1) - 1; y >= Math.floor(sc.y0); y--) years.push(y);
  w.innerHTML = `${medZoom ? `<div class="jump" aria-label="Go to year">${years.map((y) => `<button type="button" data-jump="${y}">${y}</button>`).join("")}</div>` : ""}
    <div style="position:relative"><div class="wide" id="ganttBox">${chart}</div>${medGantt.names.map((n) => `<svg class="gname" style="top:${n.y}px" height="16" width="300"><text x="4" y="12" font-size="11" font-weight="600" fill="var(--fg)" paint-order="stroke" stroke="var(--surface)" stroke-width="4" stroke-linejoin="round">${n.label}</text></svg>`).join("")}</div>`;
}
/* scroll the chart so the year sits near the left edge; zoom in first if the whole history is showing */
function jumpTo(y, soft) {
  if (!medZoom || $("#tlBody")?.hidden) { if (soft) return; medZoom = 70; LS.set("gl.zoom", medZoom); for (const b of $$("#zoomSeg button")) b.setAttribute("aria-pressed", +b.dataset.zoom === medZoom); drawChart(); }
  const gb = $("#ganttBox"); if (!gb) return;
  gb.scrollTo({ left: Math.max(0, medGantt.sc.x(y) - 30), behavior: "smooth" });
  for (const b of $$("[data-jump]")) b.setAttribute("aria-pressed", +b.dataset.jump === y);
}
document.addEventListener("click", (e) => { const j = e.target.closest("[data-jump]"); if (j) jumpTo(+j.dataset.jump); });
