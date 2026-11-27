/* ---------- Timeline: medicines, flares, colonoscopies and hospital stays together ---------- */
function renderTimeline() {
  if (!medGantt(360, 0)) { $("#main").innerHTML = `<div class="card"><div class="label">Nothing to show yet</div><p class="sub" style="margin:0;font-size:14px">Add medicines in Meds and flares, colonoscopies or hospital stays in History, and they appear here on one timeline.</p></div>`; return; }
  $("#main").innerHTML = `<div data-fscope style="display:contents">
  <div class="card">${findBox("Search medicines, flares, tests")}${findChips()}</div>
  <div class="card"><div class="seg" id="zoomSeg" style="grid-template-columns:repeat(3,1fr)">${ZOOMS.map(([l, v]) => `<button data-zoom="${v}" aria-pressed="${v === medZoom}">${l}</button>`).join("")}</div>
    <div id="chartWrap"></div>
    <div class="legend"><span><i style="background:var(--mod);opacity:.35"></i>Flare</span><span>◆ Colonoscopy</span><span><b style="color:var(--sev)">✚</b> Hospital / surgery</span></div>
    <div class="sub">Tap a bar or mark to open it.</div></div>
  <div class="card"><div class="row"><div class="label">Everything, newest first</div><span class="sub">tap one to open it</span></div>${eventList(timelineItems())}</div></div>`;
  drawChart(); const gb = $("#ganttBox"); if (gb) gb.scrollLeft = gb.scrollWidth;
}
function drawChart() {
  const w = $("#chartWrap"); if (!w) return;
  const chart = medGantt(360, medZoom), sc = medGantt.sc, years = [];
  for (let y = Math.ceil(sc.y1) - 1; y >= Math.floor(sc.y0); y--) years.push(y);
  w.innerHTML = `<div class="jump" aria-label="Go to year">${years.map((y) => `<button type="button" data-jump="${y}">${y}</button>`).join("")}</div>
    <div style="position:relative"><div class="wide" id="ganttBox">${chart}</div>${medGantt.names.map((n) => `<svg class="gname" style="top:${n.y}px" height="16" width="300"><text x="4" y="12" font-size="11" font-weight="600" fill="var(--fg)" paint-order="stroke" stroke="var(--surface)" stroke-width="4" stroke-linejoin="round">${n.label}</text></svg>`).join("")}</div>`;
}
/* scroll the chart so the year sits near the left edge; zoom in first if the whole history is showing */
function jumpTo(y, soft) {
  if (!medZoom) { if (soft) return; medZoom = 70; LS.set("gl.zoom", medZoom); for (const b of $$("#zoomSeg button")) b.setAttribute("aria-pressed", +b.dataset.zoom === medZoom); drawChart(); }
  const gb = $("#ganttBox"); if (!gb) return;
  gb.scrollTo({ left: Math.max(0, medGantt.sc.x(y) - 30), behavior: "smooth" });
  for (const b of $$("[data-jump]")) b.setAttribute("aria-pressed", +b.dataset.jump === y);
}
document.addEventListener("click", (e) => { const j = e.target.closest("[data-jump]"); if (j) jumpTo(+j.dataset.jump); });
