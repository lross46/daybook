
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
  const list = live(data.meds).filter((m) => isSteroid(m.name));
  const cutoff = addDays(todayIso(), -365).slice(0, 7);
  const recent = list.filter((m) => !m.stop || roughSort(m.stop) >= roughSort(cutoff) || roughSort(m.start) >= roughSort(cutoff));
  return { all: list, recent };
}
function medGantt(w = 360) {
  const meds = live(data.meds).filter((m) => m.start);
  if (!meds.length) return "";
  const names = [...new Set(meds.sort((a, b) => roughSort(a.start) < roughSort(b.start) ? -1 : 1).map((m) => m.name))];
  const flares = live(data.flares).filter((f) => f.start), moms = live(data.moments).filter((m) => m.when && ["colonoscopy", "hospital", "surgery"].includes(m.type));
  const nowY = roughYear(todayIso()), y0 = Math.floor(Math.min(...meds.map((m) => roughYear(m.start)), ...flares.map((f) => roughYear(f.start)), ...moms.map((m) => roughYear(m.when)), data.profile.diagYear ? +data.profile.diagYear : 9999)), y1 = Math.ceil(nowY + .01);
  const top = flares.length || moms.length ? 24 : 0;
  const L = 8, R = 8, x = (v) => L + (v - y0) / (y1 - y0) * (w - L - R), rowH = 29, H = top + names.length * rowH + 30;
  let s = "";
  /* flares as orange bands behind every medicine, colonoscopies and hospital stays as marks on top */
  for (const f of flares) { const a = roughYear(f.start), b = f.end ? roughYear(f.end) : nowY; s += `<rect x="${x(a)}" y="2" width="${Math.max(3, x(b) - x(a))}" height="${H - 24}" fill="var(--mod)" opacity=".2"/>`; }
  for (const m of moms) {
    const cx = x(roughYear(m.when));
    if (m.type === "colonoscopy") s += `<path d="M${cx} 5l6 7-6 7-6-7z" fill="var(--fg)"/>`;
    else s += `<g transform="translate(${cx - 8} 3)">${S("0 0 24 24", I[m.type === "hospital" ? "hospital" : "cut"], 'width="16" height="16" fill="none" stroke="var(--sev)" stroke-width="2.4"')}</g>`;
  }
  const step = y1 - y0 > 12 ? 2 : 1;
  for (let yr = y0; yr <= y1; yr += step) s += `<line x1="${x(yr)}" x2="${x(yr)}" y1="4" y2="${H - 22}" stroke="var(--line)"/><text x="${x(yr)}" y="${H - 6}" font-size="9.5" text-anchor="${yr === y0 ? "start" : yr + step > y1 ? "end" : "middle"}" fill="var(--muted)" font-family="ui-monospace,Menlo,monospace">${String(yr).slice(2)}</text>`;
  names.forEach((n, i) => {
    const yy = top + 8 + i * rowH, ms = meds.filter((m) => m.name === n), st = isSteroid(n);
    const why = ms.filter((m) => m.stop && m.why && m.why !== "Course finished").map((m) => m.why.toLowerCase()).slice(-1)[0];
    s += `<text x="${L}" y="${yy + 8}" font-size="11" font-weight="600" fill="var(--fg)">${esc(n)}${st ? ' <tspan fill="var(--muted)" font-weight="400">· steroid</tspan>' : ""}${why ? ` <tspan fill="var(--muted)" font-weight="400">· ${esc(why)}</tspan>` : ""}</text>`;
    ms.forEach((m) => { const a = roughYear(m.start), b = m.stop ? roughYear(m.stop) : nowY; s += `<rect x="${x(a)}" y="${yy + 12}" width="${Math.max(4, x(b) - x(a))}" height="10" rx="5" fill="${medColor(m)}"/>`; });
  });
  return S(`0 0 ${w} ${H}`, s, `style="width:100%;min-width:340px;height:auto"`);
}
function renderMeds() {
  const cur = currentMeds(), past = pastMeds(), st = steroidCourses();
  const yrs = st.all.map((m) => (m.start || "").slice(0, 4)).filter(Boolean);
  $("#main").innerHTML = `
  <div class="card"><div class="row"><div class="label">Taking now</div>${cur.length ? `<span class="sub">Tap one to change or stop it</span>` : ""}</div>
    ${cur.length ? cur.map((m) => `<button class="medtap" data-med="${m.id}">${medIcon(m, medColor(m))}<div class="grow"><div class="row"><span class="name">${esc(m.name)}</span><span class="sub">since ${esc(fmtRough(m.start))} ›</span></div><div class="sub">${esc(doseText(m))}${m.form ? " · " + esc(m.form.toLowerCase()) : ""}</div></div></button>`).join("") : `<div class="empty-note">No medicines added yet.</div>`}
  </div>
  <button class="btn primary" data-act="medAdd">+ Add medicine</button>
  ${live(data.meds).length ? `<div class="card"><div class="label">Every medicine${data.profile.diagYear ? " since " + esc(data.profile.diagYear) : ""}</div><div class="wide">${medGantt()}</div>${live(data.flares).length || live(data.moments).length ? `<div class="legend"><span><i style="background:var(--mod);opacity:.35"></i>Flare</span><span>◆ Colonoscopy</span><span><b style="color:var(--sev)">✚</b> Hospital stay / surgery</span></div>` : ""}
    ${past.length ? `<div class="row" style="margin-top:4px"><div class="label">Tried before</div><span class="sub">Tap one to edit</span></div><div>${past.map((m) => `<div class="tr" data-med="${m.id}"><span class="dot" style="background:${medColor(m)}"></span><div style="min-width:0"><div class="row"><span class="name">${esc(m.name)}</span><span class="sub">${esc(fmtRough(m.start))} to ${esc(fmtRough(m.stop))}</span></div><div class="sub">${esc(doseText(m))}</div><div class="sub" style="color:var(--fg)">${esc([m.why, m.note].filter(Boolean).join(": ") || "Reason not set")}${isSteroid(m.name) ? " · steroid" : ""}</div></div></div>`).join("")}</div>` : ""}</div>` : ""}
  <div class="card"><div class="row"><div class="label">Steroid courses</div><span class="sub">counted automatically</span></div>
    <div class="row" style="justify-content:flex-start"><div class="count" style="color:var(--mild)">${st.recent.length}</div><div class="grow sub">in the last 12 months · ${st.all.length} ever${yrs.length ? " (" + yrs.join(", ") + ")" : ""}. Prednisolone, budesonide, hydrocortisone and similar are recognised as steroids.</div></div></div>`;
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
