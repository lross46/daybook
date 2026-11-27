
/* ---------- Trends ---------- */
let calMonth = todayIso().slice(0, 7);
function ring(p, c, big, small) {
  const r = 30, C = 2 * Math.PI * r;
  return `<div class="ring">${S("0 0 76 76", `<circle cx="38" cy="38" r="${r}" fill="none" stroke="var(--sunk)" stroke-width="9"/><circle cx="38" cy="38" r="${r}" fill="none" stroke="${c}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${C * Math.max(0, Math.min(1, p))} ${C}" transform="rotate(-90 38 38)"/><text x="38" y="43" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="700" font-size="15" fill="var(--fg)">${big}</text>`)}<span>${small}</span></div>`;
}
function lastNDays(n, end = todayIso()) { const out = []; for (let i = n - 1; i >= 0; i--) out.push(addDays(end, -i)); return out; }
function barChart(keys, opts = {}) {
  const W = 360, H = opts.h || 200, L = 22, R = 6, T = 24, B = 22, n = keys.length, bw = (W - L - R) / n;
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
    if (d.blood && bw > 5) s += `<path transform="translate(${x + w / 2 - 4} ${y(0) - h - 13}) scale(.25)" d="${dropPath}" fill="var(--blood)"/>`;
  });
  const lab = [[keys[0], 0, "start"], [keys[Math.floor(n / 2)], Math.floor(n / 2), "middle"], [keys[n - 1], n - 1, "end"]];
  lab.forEach(([k, i, a]) => s += `<text x="${L + i * bw + bw / 2}" y="${H - 6}" font-size="10" text-anchor="${a}" fill="var(--muted)">${k === todayIso() ? "Today" : parseIso(k).getDate() + " " + MONTHS[parseIso(k).getMonth()]}</text>`);
  return S(`0 0 ${W} ${H}`, s, `class="chart" role="img" aria-label="Stools per day, coloured by colitis score"`);
}
function triggers() {
  const keys = Object.keys(data.days).filter(dayLogged).sort();
  if (keys.length < 10) return null;
  const mean = keys.reduce((a, k) => a + data.days[k].stools, 0) / keys.length;
  const out = [];
  for (const [t, l] of TAGS) {
    const next = keys.filter((k) => (data.days[k].tags || []).includes(t)).map((k) => addDays(k, 1)).filter(dayLogged);
    if (next.length < 3) continue;
    const m = next.reduce((a, k) => a + data.days[k].stools, 0) / next.length;
    out.push([t, l, m - mean, next.length]);
  }
  return out.sort((a, b) => b[2] - a[2]).slice(0, 6);
}
function renderTrends() {
  const keys = lastNDays(30), logged = keys.filter(dayLogged);
  if (Object.keys(data.days).filter(dayLogged).length === 0) {
    $("#main").innerHTML = `<div class="card"><div class="label">Nothing to show yet</div><p class="sub" style="margin:0;font-size:14px">Log a few days on Today and your charts appear here: stools per day, blood, flares, a calendar and what tends to come before bad days.</p><button class="btn primary" data-tab="today">Log today</button></div>`;
    return;
  }
  const calm = logged.filter((k) => lvl(sccai(data.days[k])) === 0).length;
  const blood = logged.filter((k) => data.days[k].blood > 0).length;
  const nights = logged.filter((k) => data.days[k].night > 0).length;
  const n = logged.length || 1;
  const trig = triggers();
  $("#main").innerHTML = `
  <div class="rings">${ring(calm / n, "var(--ok)", calm, `calm days of ${logged.length}`)}${ring(blood / n, "var(--blood)", blood, "days with blood")}${ring(nights / n, "var(--med2)", nights, "nights woken")}</div>
  <div class="card"><div class="label">Last 30 days</div>${barChart(keys)}<div class="legend"><span><i class="s0"></i>Remission</span><span><i class="s1"></i>Mild</span><span><i class="s2"></i>Moderate</span><span><i class="s3"></i>Severe</span><span><i style="background:var(--blood)"></i>Blood</span></div><div class="sub">Bar height = stools. Colour = colitis score (SCCAI) worked out from your log.</div></div>
  <div class="card"><div class="row"><div class="daynav"><button data-act="calPrev" aria-label="Previous month">‹</button><div class="name">${MONTHS_L[+calMonth.slice(5) - 1]} ${calMonth.slice(0, 4)}</div><button data-act="calNext" aria-label="Next month" ${calMonth >= todayIso().slice(0, 7) ? "disabled" : ""}>›</button></div></div>${calendar(calMonth)}<div class="sub">Tap a day to open it.</div></div>
  <div class="card"><div class="label">What comes before bad days</div>${trig === null ? `<div class="sub">Needs at least 10 logged days, and a tag used 3 or more times.</div>` : trig.length === 0 ? `<div class="sub">No tag used often enough yet (3 times or more).</div>` : `<div style="display:flex;flex-direction:column;gap:10px">${trig.map(([k, l, v, c]) => `<div class="trig">${ico(k)}<span>${l}</span><div class="bar"><i style="width:${Math.max(2, Math.min(100, v / 2 * 100))}%;background:${v >= 1 ? "var(--sev)" : v >= .5 ? "var(--mod)" : v > 0 ? "var(--mild)" : "var(--ok)"}"></i></div><b>${v >= 0 ? "+" : ""}${v.toFixed(1)}</b></div>`).join("")}</div><div class="sub">Extra stools the next day, compared with your average. Patterns, not proof.</div>`}</div>`;
}
function calendar(ym) {
  const [y, m] = ym.split("-").map(Number), first = new Date(y, m - 1, 1), dim = new Date(y, m, 0).getDate();
  const off = (first.getDay() + 6) % 7, t = todayIso();
  let h = ["M", "T", "W", "T", "F", "S", "S"].map((d) => `<div class="hd">${d}</div>`).join("") + "<div></div>".repeat(off);
  for (let d = 1; d <= dim; d++) {
    const k = `${ym}-${pad(d)}`, day = getDay(k);
    if (k > t) { h += `<div style="color:var(--line)">${d}</div>`; continue; }
    h += day ? `<div class="s${lvl(sccai(day))}" data-day="${k}" style="cursor:pointer">${d}${day.blood ? S("0 0 40 40", `<path d="${dropPath}" fill="#fff"/>`, 'class="dr"') : ""}</div>` : `<div class="empty" data-day="${k}" style="cursor:pointer">${d}</div>`;
  }
  return `<div class="cal">${h}</div>`;
}
