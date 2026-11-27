
/* ---------- Doctor tab ---------- */
const PERIODS = [["1 month", 1], ["3 months", 3], ["6 months", 6], ["1 year", 12]];
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
  <div class="card"><div class="row"><div class="label">My details for the PDF</div><button class="btn small" data-act="meEdit">Edit</button></div>
    <div class="kv mini"><div><span class="sub">Name</span><span>${esc(me.name || "Not set")}</span></div><div><span class="sub">Date of birth</span><span>${me.dob ? esc(fmtDate(me.dob)) : "Not set"}</span></div><div><span class="sub">NHS number</span><span>${esc(me.nhs || "Not set")}</span></div></div>
    <div class="sub">Kept only inside your locked data. Printed on the PDF, never sent anywhere else.</div></div>
  <div class="card"><div class="row"><div class="label">Questions for next visit</div><span class="sub">${qs.filter((q) => !q.done).length} to ask</span></div>
    <div class="f" id="qs">${qs.map((q) => `<label class="qrow"><input type="checkbox" data-q="${q.id}" ${q.done ? "checked" : ""}><span style="${q.done ? "text-decoration:line-through;color:var(--muted)" : ""}">${esc(q.text)}</span><button class="x" data-qdel="${q.id}" aria-label="Delete question">×</button></label>`).join("")}</div>
    <form id="qForm" class="row" style="gap:8px"><input id="qIn" class="in" placeholder="Type a question"><button class="btn small" style="padding:10px 14px">Add</button></form>
    ${qs.some((q) => q.done) ? `<button class="linkbtn" data-act="qClear">Remove ticked questions</button>` : ""}</div>
  <div class="label" style="margin-top:6px">Report for my IBD team</div>
  <div class="seg" id="period">${PERIODS.map(([l, m]) => `<button data-period="${m}" aria-pressed="${m === period}">${l}</button>`).join("")}</div>
  <div class="card rep">
    <div class="sub">The PDF comes out in this order:</div>
    <div class="sec"><span class="num">1</span><div class="grow"><div class="name">Full history <span class="sub">· always complete</span></div><div class="sub">About my colitis, at a glance, key moments, every medicine</div></div></div>
    <div class="sec"><span class="num">2</span><div class="grow"><div class="name">Summary for the period</div><div class="sub">${r.label} · ${r.len}</div></div></div>
    ${st.logged ? `<div class="row"><div class="grow"><div class="label">Colitis activity (SCCAI)</div><div class="sub">Worked out from your daily log${st.latestDay !== todayIso() ? ", last logged " + fmtDay(st.latestDay) : ""}.</div></div><div style="text-align:right"><div class="count" style="color:${SC[lvl(st.latest)]}">${st.latest}</div><div class="sub">${STATE[lvl(st.latest)].toLowerCase()}</div></div></div>
    ${sccaiBars(r.keys)}
    <div class="kpis">${kpi("toilet", st.avgStools.toFixed(1), "stools a day", "var(--stool)")}${kpi("drop", st.blood, "days with blood", "var(--blood)")}${kpi("bolt", st.urg, "days with urgency", "var(--mod)")}${kpi("moon", st.nights, "nights woken", "var(--med2)")}${kpi("flag", st.flares.length, st.flares.length === 1 ? "flare" : "flares", "var(--mod)")}${kpi("pill", currentMeds().length, "current medicines", "var(--accent)")}</div>
    <div class="sub">${st.logged} of ${r.keys.length} days logged. Plus current medicines, steroids, latest tests and your questions.</div>` : `<div class="empty-note">No days logged in this period yet.</div>`}
    <div class="sec"><span class="num">3</span><div class="grow"><div class="name">Day by day</div><div class="sub">Every logged day in the period, newest first</div></div></div>
  </div>
  <div class="btns"><button class="btn primary" data-act="pdf">Save PDF</button><button class="btn primary" data-act="excel">Save Excel</button></div>
  <div class="sub" style="text-align:center">Save PDF opens your phone's print screen: choose Share or Save to Files. Excel has all your data, for your own charts.</div>
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
  openSheet(`${sheetHead("My details for the PDF", "Stored only inside your locked data")}<label class="f"><span>Name</span><input id="meName" autocomplete="off" value="${esc(me.name || "")}"></label><label class="f"><span>Date of birth</span><input id="meDob" type="date" value="${esc(me.dob || "")}"></label><label class="f"><span>NHS number</span><input id="meNhs" inputmode="numeric" autocomplete="off" value="${esc(me.nhs || "")}" placeholder="10 digits"></label><button class="btn primary" data-act="meSave">Save</button>`);
}

/* ---------- PDF (via the phone's print screen) ---------- */
function reportHtml() {
  const r = periodRange(), st = periodStats(r), me = data.me || {}, p = data.profile;
  const pr = (rows) => `<table>${rows.map(([a, b]) => `<tr><td class="muted" style="width:32%">${a}</td><td>${esc(b)}</td></tr>`).join("")}</table>`;
  const cs = colonoscopies(), fm = failedMeds(), stc = steroidCourses();
  const allMeds = live(data.meds).sort((a, b) => (roughSort(a.start) < roughSort(b.start) ? 1 : -1));
  const strip = lifeStrip(680).replace(/var\(--ok\)/g, SC_HEX[0]).replace(/var\(--mild\)/g, SC_HEX[1]).replace(/var\(--mod\)/g, SC_HEX[2]).replace(/var\(--sev\)/g, SC_HEX[3]).replace(/var\(--fg\)/g, "#152120").replace(/var\(--muted\)/g, "#6b7a77").replace(/min-width:340px;/, "");
  const gantt = medGantt(680).replace(/var\(--med(\d)\)/g, (m, i) => MED_HEX[i - 1]).replace(/var\(--(ok|mild|mod|sev)\)/g, (m, k) => SC_HEX[["ok", "mild", "mod", "sev"].indexOf(k)]).replace(/var\(--fg\)/g, "#152120").replace(/var\(--muted\)/g, "#6b7a77").replace(/var\(--line\)/g, "#dde5e3").replace(/min-width:340px;/, "");
  const moments = timelineItems().filter((x) => !x.auto);
  const tg = testGroups();
  const days = r.keys.filter(dayLogged).reverse();
  const tagName = (k) => (TAGS.find((t) => t[0] === k) || [k, k])[1];
  const exName = (k) => (EXTRA.find((t) => t[0] === k) || [k, k])[1];
  return `
  <div class="top"><div><h1>Ulcerative colitis report</h1><div class="muted">Full history, then summary for ${esc(r.label)} · made on ${esc(fmtDate(todayIso()))}</div></div>
  <div class="pt"><div><span class="muted">Name</span><span>${esc(me.name || "")}</span></div><div><span class="muted">Date of birth</span><span>${me.dob ? esc(fmtDate(me.dob)) : ""}</span></div><div><span class="muted">NHS number</span><span>${esc(me.nhs || "")}</span></div><div><span class="muted">Diagnosed</span><span>${esc([p.diagYear, p.extentNow && p.extentNow.toLowerCase()].filter(Boolean).join(" · "))}</span></div></div></div>
  <h2>About my colitis</h2>
  ${pr([["Diagnosed", p.diagYear || "Not recorded"], ["Extent", p.extentNow || p.extentMax ? `${p.extentNow || "?"} now · furthest ever: ${(p.extentMax || "?").toLowerCase()}` : "Not recorded"],
    ["Colonoscopies", cs.length ? `${cs.length}: ` + cs.map((c) => `${fmtRough(c.when)} (${[c.details?.result, c.details?.polyps === "None" ? "no polyps" : c.details?.polyps, c.details?.biopsy && "biopsy: " + c.details.biopsy].filter(Boolean).join(", ") || "no details"})`).join("; ") + (cs[cs.length - 1].details?.nextDue ? `. Next due ${cs[cs.length - 1].details.nextDue}.` : "") : "None recorded"],
    ["Medicines that failed", fm.length ? fm.map((m) => `${m.name}: ${m.why.toLowerCase()}${m.note ? ", " + m.note : ""} (${fmtRough(m.stop)})`).join(". ") : "None recorded"],
    ["Steroid courses ever", stc.all.length ? `${stc.all.length} (${stc.all.map((m) => m.name.toLowerCase() + " " + (m.start || "").slice(0, 4)).join(", ")}) · ${stc.recent.length} in the last 12 months` : "None recorded"],
    ["Other symptoms ever", (p.symptomsEver || []).join(", ") || "None recorded"]])}
  ${strip ? `<h2>At a glance</h2>${strip}<div class="legend"><span><i style="background:${SC_HEX[0]};opacity:.55"></i>Calm</span><span><i style="background:${SC_HEX[1]}"></i>Mild flare</span><span><i style="background:${SC_HEX[2]}"></i>Flare</span><span><i style="background:${SC_HEX[3]}"></i>Severe</span><span>◆ Colonoscopy</span></div>` : ""}
  ${gantt ? `<h2>Medicines over time</h2>${gantt}` : ""}
  <div class="two"><div><h2>Key moments</h2>${moments.length ? `<table>${moments.map((m) => `<tr><td style="white-space:nowrap">${esc(m.when)}</td><td>${esc(m.title)}${m.desc ? ": " + esc(m.desc) : ""}</td></tr>`).join("")}</table>` : `<div class="muted">None recorded</div>`}</div>
  <div><h2>Every medicine</h2>${allMeds.length ? `<table><tr><th>Medicine</th><th>Dose</th><th>Dates</th><th>Outcome</th></tr>${allMeds.map((m) => `<tr><td>${esc(m.name)}${isSteroid(m.name) ? " (steroid)" : ""}</td><td>${esc([m.dose, m.freq].filter(Boolean).join(", "))}${(m.changes || []).map((c) => `<br>→ ${esc([c.dose, c.freq].filter(Boolean).join(", "))} from ${esc(fmtRough(c.from))}`).join("")}</td><td>${esc(fmtRough(m.start))} to ${m.stop ? esc(fmtRough(m.stop)) : "now"}</td><td>${m.stop ? esc([m.why, m.note].filter(Boolean).join(": ") || "Stopped") : "Taking"}</td></tr>`).join("")}</table>` : `<div class="muted">None recorded</div>`}</div></div>

  <div class="pb"></div>
  <h1>Summary for the period</h1><div class="muted" style="font-size:11pt;margin-bottom:4px">${esc(r.label)} · ${esc(r.len)} · ${st.logged} days logged</div>
  <h2>Colitis activity</h2>
  ${st.logged ? `<div class="score"><div class="n" style="color:${SC_HEX[lvl(st.latest)]}">${st.latest}</div><div><b>${STATE[lvl(st.latest)]}</b> · SCCAI on ${esc(fmtDay(st.latestDay))}, worked out from the daily log<br><span class="muted">Remission 0-2 · Mild 3-5 · Moderate 6-11 · Severe 12+</span></div></div>${sccaiBars(r.keys, 680, 110, true)}<div class="legend">${STATE.map((l, i) => `<span><i style="background:${SC_HEX[i]}"></i>${l}</span>`).join("")}</div>` : `<div class="muted">No days logged in this period.</div>`}
  <h2>Period at a glance</h2>
  <div class="grid">${[["Stools a day (avg)", st.avgStools.toFixed(1)], ["Days with blood", `${st.blood} of ${st.logged}`], ["Days with urgency", st.urg], ["Nights woken", st.nights], ["Average pain (0-10)", st.pain.toFixed(1)], ["Flares", st.flares.length ? st.flares.map((f) => `from ${fmtRough(f.start)}${f.end ? " to " + fmtRough(f.end) : ", ongoing"}`).join("; ") : "None"]].map(([t, v]) => `<div class="k"><b>${esc(v)}</b><span>${t}</span></div>`).join("")}</div>
  <div class="two"><div><h2>Current medicines</h2>${currentMeds().length ? `<table><tr><th>Medicine</th><th>Dose</th><th>Since</th></tr>${currentMeds().map((m) => `<tr><td>${esc(m.name)}${m.form && m.form !== "Tablet" ? " (" + esc(m.form.toLowerCase()) + ")" : ""}</td><td>${esc(doseText(m))}</td><td>${esc(fmtRough(m.start))}</td></tr>`).join("")}</table>` : `<div class="muted">None recorded</div>`}
    <div class="muted" style="margin-top:4px">Changes in this period: ${(() => { const ch = []; for (const m of live(data.meds)) { if (roughLo(m.start) >= r.start) ch.push(`started ${m.name}`); for (const c of m.changes || []) if (roughLo(c.from) >= r.start) ch.push(`${m.name} to ${c.dose}`); if (m.stop && roughSort(m.stop) >= r.start) ch.push(`stopped ${m.name}`); } return esc(ch.join(", ") || "none"); })()}.</div>
    <h2>Steroids</h2><div>${stc.recent.length} course${stc.recent.length === 1 ? "" : "s"} in the last 12 months · ${stc.all.length} ever</div></div>
  <div><h2>Latest tests</h2>${tg.length ? `<table><tr><th>Test</th><th>Latest</th><th>Usual</th><th>Trend</th></tr>${tg.map(([n, pts]) => { const d = testDef(n), l = pts[pts.length - 1]; return `<tr><td>${esc(n)}<div class="muted" style="font-size:7.5pt">${esc(fmtDate(l.date))}${l.source ? " · " + esc(l.source) : ""}</div></td><td class="${isBad(d, l.value) ? "hi" : ""}">${l.sign || ""}${l.value} ${esc(l.unit)}</td><td class="muted">${esc(d.range || "")}</td><td>${spark(pts, d, 110, 26).replace(/var\(--accent\)/g, "#1f7a6d").replace(/var\(--sev\)/g, "#c4353f")}</td></tr>`; }).join("")}</table>` : `<div class="muted">None recorded</div>`}</div></div>
  ${live(data.questions).filter((q) => !q.done).length ? `<h2>Questions for this visit</h2><ul>${live(data.questions).filter((q) => !q.done).map((q) => `<li>${esc(q.text)}</li>`).join("")}</ul>` : ""}

  ${days.length ? `<div class="pb"></div><h2>Day by day</h2><div class="muted" style="margin-bottom:4px">Newest first. Shaded rows = flare. Score = SCCAI. Type = Bristol stool scale (1 hard to 7 watery).</div>
  <table class="days"><tr><th>Day</th><th>Score</th><th>Stools</th><th>Night</th><th>Blood</th><th>Urgency</th><th>Type</th><th>Pain</th><th>Feeling</th><th>Other symptoms, tags and notes</th></tr>
  ${days.map((k) => { const d = data.days[k], v = sccai(d); return `<tr class="${inFlare(k) ? "fl" : ""}"><td style="white-space:nowrap">${esc(fmtDay(k))}</td><td><span class="dot" style="background:${SC_HEX[lvl(v)]}"></span>${v}</td><td>${d.stools}</td><td>${d.night || 0}</td><td>${BLOOD[d.blood || 0]}</td><td>${URG[d.urg || 0]}</td><td>${d.bristol || ""}</td><td>${d.pain || 0}</td><td>${WELL[d.well || 0]}</td><td>${esc([(d.extra || []).map(exName).join(", "), d.noteExtra, (d.tags || []).map(tagName).join(", "), d.noteTags].filter(Boolean).join(" · "))}</td></tr>`; }).join("")}</table>` : ""}
  <div class="foot">Personal symptom log kept by the patient. Not a medical record. SCCAI = Simple Clinical Colitis Activity Index, calculated automatically from daily entries.</div>`;
}
function makePdf() {
  $("#print").innerHTML = reportHtml();
  const r = periodRange(), old = document.title;
  document.title = `Report ${r.end}`;
  setTimeout(() => { window.print(); setTimeout(() => { document.title = old; }, 1000); }, 50);
}

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
  const tests = live(data.tests).sort((a, b) => (a.date < b.date ? -1 : 1)).map((t) => ({ Date: t.date, Test: t.name, Value: t.value, Sign: t.sign || "", Unit: t.unit, Source: t.source || "" }));
  const hist = timelineItems().filter((x) => !x.auto).map((m) => ({ When: m.when, What: m.title, Details: m.desc }));
  const p = data.profile, ab = [{ Field: "Diagnosed", Value: p.diagYear || "" }, { Field: "Extent now", Value: p.extentNow || "" }, { Field: "Furthest extent", Value: p.extentMax || "" }, { Field: "Other symptoms ever", Value: (p.symptomsEver || []).join(", ") }];
  const wb = XLSX.utils.book_new();
  for (const [n, rows] of [["Days", days], ["Medicines", meds], ["Tests", tests], ["History", hist], ["About", ab]]) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length ? rows : [{ "(empty)": "" }]), n);
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  shareOrDownload(new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `daybook-${todayIso()}.xlsx`);
}
