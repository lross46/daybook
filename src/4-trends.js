
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
    /* mucus blob sits above the drop (or on the bar when there's no blood) */
    if (d.mucus) { const up = d.blood ? dw + 2 : 0; s += `<path transform="translate(${x + w / 2 - dw / 2} ${y(0) - h - dw - 3 - up}) scale(${ds})" d="${mucusPath}" fill="var(--mucus)"/>`; }
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
  return `<div class="card">${foldHead("trigBody", "What comes before bad days", sum)}<div id="trigBody" ${isOpen("trigBody") ? "" : "hidden"} style="display:flex;flex-direction:column;gap:8px">
    <div class="seg" style="grid-template-columns:repeat(3,1fr)">${[2, 3, 4].map((n) => `<button data-bdwin="${n}" aria-pressed="${n === bdWin}">${n} days after</button>`).join("")}</div>
    ${r === null ? `<div class="sub">Keep logging. It needs at least 10 days outside flares in the period picked above.</div>` : !r.length ? `<div class="sub">No tags used in this period yet. Add them on Today under "Anything that might matter?".</div>` :
    r.map((x) => { const [vl, vc, vb] = VERDICT[x.verdict]; return `<details class="bd"><summary>${ico(x.t)}<span class="grow"><b>${esc(x.l)}</b><span class="sub">${x.n < 5 ? `used ${x.n} time${x.n > 1 ? "s" : ""}, needs 5` : `worse in the next ${bdWin} days ${x.worse} of ${x.n} times`}</span></span><span class="vd" style="color:${vc};background:${vb}">${vl}</span></summary>
      <div class="bdd">${x.days.map((k) => `<button data-day="${k}">${esc(fmtDay(k))}</button>`).join("")}</div></details>`; }).join("")}
    <div class="sub">Compares the days after a tag with the days after days without it, using the day score. Flare days are left out. A pattern, not proof. Tap a tag to see its days.</div></div></div>`;
}
/* period: the same buttons, arrows and sliding as the History timeline; the window ends on trEnd (today unless you go back) */
const TR_P = [["1 mo", 1], ["3 mo", 3], ["6 mo", 6], ["1 yr", 12]];
let tPeriod = LS.get("gl.tperiod", 1), trEnd = null, trDrag = null, trSwallow = 0;
function trRange() {
  const t = todayIso(); if (!trEnd || trEnd > t) trEnd = t;
  const d = parseIso(trEnd); d.setMonth(d.getMonth() - tPeriod); d.setDate(d.getDate() + 1);
  const start = iso(d), keys = []; for (let k = start; k <= trEnd; k = addDays(k, 1)) keys.push(k);
  const [a, b] = [parseIso(start), parseIso(trEnd)], f = (x, y) => x.getDate() + " " + MONTHS[x.getMonth()] + (y ? " " + x.getFullYear() : "");
  return { keys, label: a.getFullYear() === b.getFullYear() ? `${f(a)} – ${f(b, 1)}` : `${f(a, 1)} – ${f(b, 1)}` };
}
/* whole-history strip under the chart: one mark per week coloured by its worst day score, a box where you are */
function trMini(keys) {
  const all = Object.keys(data.days).filter(dayLogged).sort(); if (!all.length) return "";
  const t = todayIso(), first = all[0] < keys[0] ? all[0] : keys[0], total = daysBetween(first, t) + 1, mw = 360, mx = (k) => 4 + daysBetween(first, k) / total * (mw - 8);
  let s = "";
  for (let k = first; k <= t; k = addDays(k, 7)) { let worst = -1; for (let i = 0; i < 7; i++) { const d = getDay(addDays(k, i)); if (d) worst = Math.max(worst, lvl(sccai(d))); }
    if (worst >= 0) s += `<rect x="${mx(k)}" y="6" width="${Math.max(1.5, (mw - 8) * 7 / total - .5)}" height="18" fill="${SC[worst]}" opacity=".75"/>`; }
  for (const f of live(data.flares).filter((x) => x.start && (x.end || t) >= first)) { const lo = (r) => (r.length === 4 ? r + "-01-01" : r.length === 7 ? r + "-01" : r), hi = (r) => (r.length === 4 ? r + "-12-31" : r.length === 7 ? r + "-28" : r);
    const a = lo(f.start) < first ? first : lo(f.start), b = f.end ? hi(f.end) : t; if (b < first) continue; s += `<rect x="${mx(a)}" y="2" width="${Math.max(1.5, mx(b) - mx(a))}" height="3" fill="var(--mod)"/>`; }
  const y0 = +first.slice(0, 4), y1 = +t.slice(0, 4);
  for (let y = y0 + 1; y <= y1; y++) s += `<line x1="${mx(y + "-01-01")}" x2="${mx(y + "-01-01")}" y1="2" y2="28" stroke="var(--line)"/><text x="${mx(y + "-01-01")}" y="40" font-size="9" text-anchor="middle" fill="var(--muted)" font-family="ui-monospace,Menlo,monospace">${y}</text>`;
  if (y0 === y1) s += `<text x="4" y="40" font-size="9" fill="var(--muted)" font-family="ui-monospace,Menlo,monospace">${y0}</text>`;
  s += `<rect x="${mx(keys[0])}" y="1" width="${Math.max(6, mx(keys[keys.length - 1]) - mx(keys[0]))}" height="28" rx="4" fill="var(--accent)" fill-opacity=".14" stroke="var(--accent)" stroke-width="2"/>`;
  trMini.span = [first, total];
  return `<div class="tlmini" id="trMini" role="button" aria-label="Whole log: tap to jump there">${S(`0 0 ${mw} 44`, s, 'style="width:100%;height:auto;display:block"')}</div>`;
}
const trShift = (months) => { const d = parseIso(trEnd || todayIso()); d.setMonth(d.getMonth() + months); trEnd = iso(d); };
document.addEventListener("click", (e) => {
  if (tab !== "trends") return;
  const b = e.target.closest("[data-tperiod]"); if (b) { tPeriod = +b.dataset.tperiod; LS.set("gl.tperiod", tPeriod); renderTrends(); return; }
  const s = e.target.closest("[data-trstep]"); if (s) { trShift(+s.dataset.trstep * tPeriod); renderTrends(); return; }
  const m = e.target.closest("#trMini"); if (m && trMini.span) { const r = m.getBoundingClientRect(), [first, total] = trMini.span, k = addDays(first, Math.round(((e.clientX - r.left) / r.width * 360 - 4) / 352 * total)); trEnd = addDays(k, Math.round(trRange().keys.length / 2)); renderTrends(); }
});
/* slide the chart with a finger: right = earlier */
document.addEventListener("pointerdown", (e) => { if (tab !== "trends") return; const c = e.target.closest("#trChart, #trMini"); if (!c) return; trDrag = { x: e.clientX, end: trEnd || todayIso(), w: c.getBoundingClientRect().width, mini: c.id === "trMini", moved: false }; });
document.addEventListener("pointermove", (e) => {
  if (!trDrag) return; const dx = e.clientX - trDrag.x; if (!trDrag.moved && Math.abs(dx) < 8) return;
  if (!trDrag.moved) try { $("#main").setPointerCapture(e.pointerId); } catch {}
  trDrag.moved = true; e.preventDefault();
  const days = trDrag.mini ? Math.round(dx / trDrag.w * (trMini.span ? trMini.span[1] : 0)) : Math.round(-dx / trDrag.w * trRange().keys.length); trEnd = addDays(trDrag.end, days);
  if (!trDrag.raf) trDrag.raf = requestAnimationFrame(() => { if (trDrag) trDrag.raf = 0; renderTrends(); });
}, { passive: false });
const trDragEnd = () => { if (!trDrag) return; const m = trDrag.moved; trDrag = null; if (m) { trSwallow = Date.now(); renderTrends(); } };
document.addEventListener("pointerup", trDragEnd); document.addEventListener("pointercancel", trDragEnd);
document.addEventListener("click", (e) => { if (Date.now() - trSwallow < 300 && e.target.closest("#trChart, #trMini")) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
function renderTrends() {
  const tr = trRange(), keys = tr.keys, logged = keys.filter(dayLogged), atToday = trEnd >= todayIso();
  if (Object.keys(data.days).filter(dayLogged).length === 0) {
    $("#main").innerHTML = `<div class="card"><div class="label">Nothing to show yet</div><p class="sub" style="margin:0;font-size:14px">Log a few days on Today and your charts appear here: stools per day, blood, mucus, flares, a calendar and what tends to come before bad days.</p><button class="btn primary" data-tab="today">Log today</button></div>`;
    return;
  }
  const calm = logged.filter((k) => lvl(sccai(data.days[k])) === 0).length;
  const blood = logged.filter((k) => data.days[k].blood > 0).length;
  const nights = logged.filter((k) => data.days[k].night > 0).length;
  const mucus = logged.filter((k) => data.days[k].mucus > 0).length;
  const n = logged.length || 1;
  $("#main").innerHTML = `
  ${heroHtml()}
  <div class="card"><div class="seg" id="tperiod">${TR_P.map(([l, m]) => `<button data-tperiod="${m}" aria-pressed="${m === tPeriod}">${l}</button>`).join("")}</div>
  <div class="row" id="trNav"><button class="navbtn" data-trstep="-1" aria-label="Earlier">‹</button><b class="tllbl">${tr.label}</b><button class="navbtn" data-trstep="1" aria-label="Later" ${atToday ? "disabled" : ""}>›</button></div>
  <div class="tsum"><span><b style="color:var(--ok)">${calm}</b> calm days</span><span><b style="color:var(--blood)">${blood}</b> with blood</span><span><b style="color:var(--mucus)">${mucus}</b> with mucus</span><span><b style="color:var(--med2)">${nights}</b> nights woken</span></div><div class="sub" style="margin-top:-6px">${logged.length} of ${keys.length} days logged</div><div id="trChart">${barChart(keys)}</div>${trMini(keys)}<div class="legend"><span><b>Day score:</b></span><span><i class="s0"></i>Calm</span><span><i class="s1"></i>Mild</span><span><i class="s2"></i>Moderate</span><span><i class="s3"></i>Severe</span></div><div class="legend"><span><i style="background:var(--flare);border:1px solid var(--mod)"></i>Flare</span><span><svg viewBox="0 0 40 40" width="9" height="11" aria-hidden="true" style="display:inline-block;vertical-align:-1px;margin-right:4px"><path d="${dropPath}" fill="var(--blood)"/></svg>Blood</span><span><svg viewBox="0 0 40 40" width="10" height="10" aria-hidden="true" style="display:inline-block;vertical-align:-1px;margin-right:4px"><path d="${mucusPath}" fill="var(--mucus)"/></svg>Mucus</span><span><svg viewBox="0 0 24 24" width="11" height="11" aria-hidden="true" style="display:inline-block;vertical-align:-1px;margin-right:4px"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="var(--med2)"/></svg>Woke at night</span></div><div class="sub">Bar height = stools that day. Drop on top = blood, blob on top = mucus, moon underneath = woke at night. Colour = how bad the day was, worked out from your log (not the flare grade).</div></div>
  <div class="card">${foldHead("calBody", "Calendar", `${MONTHS_L[+calMonth.slice(5) - 1]} ${calMonth.slice(0, 4)} · tap a day to open it`)}<div id="calBody" ${isOpen("calBody") ? "" : "hidden"} style="display:flex;flex-direction:column;gap:12px"><div class="row"><div class="daynav"><button data-act="calPrev" aria-label="Previous month">‹</button><div class="name">${MONTHS_L[+calMonth.slice(5) - 1]} ${calMonth.slice(0, 4)}</div><button data-act="calNext" aria-label="Next month" ${calMonth >= todayIso().slice(0, 7) ? "disabled" : ""}>›</button></div></div>${calendar(calMonth)}</div></div>
  ${badDaysCard(keys)}`;
}
function calendar(ym) {
  const [y, m] = ym.split("-").map(Number), first = new Date(y, m - 1, 1), dim = new Date(y, m, 0).getDate();
  const off = (first.getDay() + 6) % 7, t = todayIso();
  let h = ["M", "T", "W", "T", "F", "S", "S"].map((d) => `<div class="hd">${d}</div>`).join("") + "<div></div>".repeat(off);
  for (let d = 1; d <= dim; d++) {
    const k = `${ym}-${pad(d)}`, day = getDay(k);
    if (k > t) { h += `<div style="color:var(--line)">${d}</div>`; continue; }
    h += day ? `<div class="s${lvl(sccai(day))}" data-day="${k}" style="cursor:pointer">${d}${day.blood ? S("0 0 40 40", `<path d="${dropPath}" fill="#fff"/>`, 'class="dr"') : ""}${day.mucus ? S("0 0 40 40", `<path d="${mucusPath}" fill="#fff"/>`, 'class="mu"') : ""}${day.night > 0 ? S("0 0 24 24", `<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="#fff"/>`, 'class="mn"') : ""}</div>` : `<div class="empty" data-day="${k}" style="cursor:pointer">${d}</div>`;
  }
  return `<div class="cal">${h}</div>`;
}
