
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
    /* a moon under the bar = woke at night */
    if (d.night > 0) { const ms = Math.min(.42, Math.max(.2, bw / 24)); s += `<path transform="translate(${x + w / 2 - 12 * ms} ${y(0) + 4}) scale(${ms})" d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="var(--med2)"/>`; }
  });
  const lab = [[keys[0], 0, "start"], [keys[Math.floor(n / 2)], Math.floor(n / 2), "middle"], [keys[n - 1], n - 1, "end"]];
  lab.forEach(([k, i, a]) => s += `<text x="${L + i * bw + bw / 2}" y="${H - 6}" font-size="10" text-anchor="${a}" fill="var(--muted)">${k === todayIso() ? "Today" : parseIso(k).getDate() + " " + MONTHS[parseIso(k).getMonth()]}</text>`);
  return S(`0 0 ${W} ${H}`, s, `class="chart" role="img" aria-label="Stools per day, coloured by colitis score"`);
}
/* What comes before bad days: for each tag, compare the 2 days after tagged days with the 2 days after untagged days.
   Uses the day score (stools, night, blood, urgency...), leaves out flare days, and only judges a tag used 5+ times. */
function badDays(keys) {
  const ok = (k) => dayLogged(k) && !inFlare(k);
  const after = (k) => { const w = [addDays(k, 1), addDays(k, 2)].filter(ok); return w.length ? w.reduce((a, x) => a + sccai(data.days[x]), 0) / w.length : null; };
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
  return `<div class="card">${foldHead("trigBody", "What comes before bad days", sum)}<div id="trigBody" ${foldOpen.trigBody ? "" : "hidden"} style="display:flex;flex-direction:column;gap:8px">
    ${r === null ? `<div class="sub">Keep logging. It needs at least 10 days outside flares in the period picked above.</div>` : !r.length ? `<div class="sub">No tags used in this period yet. Add them on Today under "Anything that might matter?".</div>` :
    r.map((x) => { const [vl, vc, vb] = VERDICT[x.verdict]; return `<details class="bd"><summary>${ico(x.t)}<span class="grow"><b>${esc(x.l)}</b><span class="sub">${x.n < 5 ? `used ${x.n} time${x.n > 1 ? "s" : ""}, needs 5` : `worse in the next 2 days ${x.worse} of ${x.n} times`}</span></span><span class="vd" style="color:${vc};background:${vb}">${vl}</span></summary>
      <div class="bdd">${x.days.map((k) => `<button data-day="${k}">${esc(fmtDay(k))}</button>`).join("")}</div></details>`; }).join("")}
    <div class="sub">Compares the 2 days after a tag with the 2 days after days without it, using the day score. Flare days are left out. A pattern, not proof. Tap a tag to see its days.</div></div></div>`;
}
let tPeriod = LS.get("gl.tperiod", 1);
document.addEventListener("click", (e) => { const b = e.target.closest("[data-tperiod]"); if (!b) return; tPeriod = +b.dataset.tperiod; LS.set("gl.tperiod", tPeriod); renderTrends(); });
function renderTrends() {
  const keys = periodRange(tPeriod).keys, logged = keys.filter(dayLogged);
  if (Object.keys(data.days).filter(dayLogged).length === 0) {
    $("#main").innerHTML = `<div class="card"><div class="label">Nothing to show yet</div><p class="sub" style="margin:0;font-size:14px">Log a few days on Today and your charts appear here: stools per day, blood, flares, a calendar and what tends to come before bad days.</p><button class="btn primary" data-tab="today">Log today</button></div>`;
    return;
  }
  const calm = logged.filter((k) => lvl(sccai(data.days[k])) === 0).length;
  const blood = logged.filter((k) => data.days[k].blood > 0).length;
  const nights = logged.filter((k) => data.days[k].night > 0).length;
  const n = logged.length || 1;
  $("#main").innerHTML = `
  ${heroHtml()}
  <div class="seg" id="tperiod">${PERIODS.map(([l, m]) => `<button data-tperiod="${m}" aria-pressed="${m === tPeriod}">${l}</button>`).join("")}</div>
  <div class="card"><div class="tsum"><span><b style="color:var(--ok)">${calm}</b> calm days</span><span><b style="color:var(--blood)">${blood}</b> with blood</span><span><b style="color:var(--med2)">${nights}</b> nights woken</span></div><div class="sub" style="margin-top:-6px">${logged.length} of ${keys.length} days logged</div>${barChart(keys)}<div class="legend"><span><b>Day score:</b></span><span><i class="s0"></i>Calm</span><span><i class="s1"></i>Mild</span><span><i class="s2"></i>Moderate</span><span><i class="s3"></i>Severe</span></div><div class="legend"><span><i style="background:var(--flare);border:1px solid var(--mod)"></i>Flare</span><span><svg viewBox="0 0 40 40" width="9" height="11" aria-hidden="true" style="display:inline-block;vertical-align:-1px;margin-right:4px"><path d="${dropPath}" fill="var(--blood)"/></svg>Blood</span><span><svg viewBox="0 0 24 24" width="11" height="11" aria-hidden="true" style="display:inline-block;vertical-align:-1px;margin-right:4px"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="var(--med2)"/></svg>Woke at night</span></div><div class="sub">Bar height = stools that day. Drop on top = blood, moon underneath = woke at night. Colour = how bad the day was, worked out from your log (not the flare grade).</div></div>
  <div class="card">${foldHead("calBody", "Calendar", `${MONTHS_L[+calMonth.slice(5) - 1]} ${calMonth.slice(0, 4)} · tap a day to open it`)}<div id="calBody" ${foldOpen.calBody ? "" : "hidden"} style="display:flex;flex-direction:column;gap:12px"><div class="row"><div class="daynav"><button data-act="calPrev" aria-label="Previous month">‹</button><div class="name">${MONTHS_L[+calMonth.slice(5) - 1]} ${calMonth.slice(0, 4)}</div><button data-act="calNext" aria-label="Next month" ${calMonth >= todayIso().slice(0, 7) ? "disabled" : ""}>›</button></div></div>${calendar(calMonth)}</div></div>
  ${badDaysCard(keys)}`;
}
function calendar(ym) {
  const [y, m] = ym.split("-").map(Number), first = new Date(y, m - 1, 1), dim = new Date(y, m, 0).getDate();
  const off = (first.getDay() + 6) % 7, t = todayIso();
  let h = ["M", "T", "W", "T", "F", "S", "S"].map((d) => `<div class="hd">${d}</div>`).join("") + "<div></div>".repeat(off);
  for (let d = 1; d <= dim; d++) {
    const k = `${ym}-${pad(d)}`, day = getDay(k);
    if (k > t) { h += `<div style="color:var(--line)">${d}</div>`; continue; }
    h += day ? `<div class="s${lvl(sccai(day))}" data-day="${k}" style="cursor:pointer">${d}${day.blood ? S("0 0 40 40", `<path d="${dropPath}" fill="#fff"/>`, 'class="dr"') : ""}${day.night > 0 ? S("0 0 24 24", `<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="#fff"/>`, 'class="mn"') : ""}</div>` : `<div class="empty" data-day="${k}" style="cursor:pointer">${d}</div>`;
  }
  return `<div class="cal">${h}</div>`;
}
