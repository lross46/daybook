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
const NEEDS_CONFIRM = new Set(["medDelete", "testDelete", "momentDelete", "flareDelete", "clearDay", "wipe"]);
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
  medSave: (el) => medSave(el.dataset.id),
  medDelete: (el) => tomb(data.meds, el.dataset.id, "Medicine deleted"),
  medDose: (el) => medDose(el.dataset.id),
  medStop: (el) => medStop(el.dataset.id),
  medFix: (el) => medForm(byId(data.meds, el.dataset.id)),
  /* Tests */
  tPhoto: () => photoEntry(),
  tPaste: () => textEntry("paste"),
  tVoice: () => textEntry("voice"),
  tType: () => typeEntry(null),
  txtRead: () => { const t = $("#txtIn").value; if (!t.trim()) { toast("Nothing to read yet"); return; } reviewSheet(parseResults(t), "Check before saving"); },
  revSave: () => revSave(),
  tySave: (el) => tySave(el.dataset.id),
  testDelete: (el) => tomb(data.tests, el.dataset.id, "Result deleted"),
  /* History */
  profileEdit: () => profileEdit(),
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
  pdf: () => makePdf(),
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
  const med = e.target.closest("[data-med]"); if (med) { const m = byId(data.meds, med.dataset.med); if (m) medActions(m); return; }
  const tst = e.target.closest("[data-test]"); if (tst) { testDetail(tst.dataset.test); return; }
  const tr = e.target.closest("[data-testrow]"); if (tr) { const x = byId(data.tests, tr.dataset.testrow); if (x) typeEntry(x); return; }
  const mt = e.target.closest("[data-mt]"); if (mt) { const when = readRough("mWhen"), note = $("#mNoteIn")?.value || ""; momentForm(null, mt.dataset.mt); if (when) { const [y, m] = when.split("-"); const sel = $$('[data-rough="mWhen"] select'); if (sel[0]) sel[0].value = m || ""; if (sel[1]) sel[1].value = y; } $("#mNoteIn").value = note; return; }
  const mo = e.target.closest("[data-moment]"); if (mo) { const x = byId(data.moments, mo.dataset.moment); if (x) momentForm(x); return; }
  const fl = e.target.closest("[data-flare]"); if (fl) { const x = byId(data.flares, fl.dataset.flare); if (x) flareForm(x); return; }
  const qd = e.target.closest("[data-qdel]"); if (qd) { e.preventDefault(); const q = byId(data.questions, qd.dataset.qdel); if (q) { q.del = true; stamp(q); save(); renderDoctor(); } return; }
  const pr = e.target.closest("[data-period]"); if (pr) { period = +pr.dataset.period; LS.set("gl.period", period); renderDoctor(); return; }
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#sheet").hidden) closeSheet(); });

/* ---------- start ---------- */
render();
setSync(connected() ? (dirty ? "ok" : "ok") : "off");
if (connected()) sync();
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
