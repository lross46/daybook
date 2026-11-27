/* ---------- Toilet finder (OpenStreetMap via Overpass) ---------- */
const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
const NEAR_M = 1300;
function distM(a, b, c, d) {
  const R = 6371e3, r = Math.PI / 180, x = (c - a) * r, y = (d - b) * r;
  const h = Math.sin(x / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(y / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const fmtDist = (m) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`);
const walkMin = (m) => Math.max(1, Math.round(m / 80));
const mapsSearch = (lat, lon) => lat != null ? `https://maps.apple.com/?q=${encodeURIComponent("public toilets")}&sll=${lat},${lon}` : `https://maps.apple.com/?q=${encodeURIComponent("public toilets")}`;
const mapsWalk = (lat, lon, name) => `https://maps.apple.com/?daddr=${lat},${lon}&dirflg=w&q=${encodeURIComponent(name || "Toilet")}`;

function toiletSheet(body) {
  openSheet(`${sheetHead("Toilets near you", "From OpenStreetMap. Your location is sent only to its map server, for this search.")}${body}`);
}
function findToilets() {
  toiletSheet(`<div class="ok-note"><span class="spin"></span> Finding where you are…</div>`);
  if (!navigator.geolocation) return toiletFail(null, "This phone can't share its location here.");
  navigator.geolocation.getCurrentPosition(
    (p) => loadToilets(p.coords.latitude, p.coords.longitude),
    (e) => toiletFail(null, e.code === 1 ? "Location is off for this app. Allow it in Settings, or use Maps below." : "Couldn't get your location."),
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
}
function toiletFail(lat, msg) {
  if ($("#sheet").hidden) return;
  toiletSheet(`<div class="warn">${esc(msg)}</div><a class="btn primary" href="${mapsSearch(lat, null)}" target="_blank" rel="noopener">Open in Maps</a>`);
}
async function loadToilets(lat, lon) {
  if ($("#sheet").hidden) return;
  toiletSheet(`<div class="ok-note"><span class="spin"></span> Looking for toilets…</div>`);
  /* a box search is much lighter for the servers than a radius search; distances are worked out here */
  const dLat = 1.3 / 111, dLon = 1.3 / (111 * Math.cos(lat * Math.PI / 180));
  const box = [lat - dLat, lon - dLon, lat + dLat, lon + dLon].map((v) => v.toFixed(5)).join(",");
  const q = `[out:json][timeout:12][bbox:${box}];(node["amenity"="toilets"];way["amenity"="toilets"];node["toilets"="yes"];way["toilets"="yes"];);out center 150;`;
  const why = [], ctls = [];
  /* ask all servers at once and take the first good answer */
  const ask = async (url) => {
    const ctl = new AbortController(); ctls.push(ctl);
    const t = setTimeout(() => ctl.abort(), 20000);
    try {
      const r = await fetch(url, { method: "POST", body: "data=" + encodeURIComponent(q), headers: { "Content-Type": "application/x-www-form-urlencoded" }, signal: ctl.signal, referrerPolicy: "origin" });
      if (!r.ok) { why.push(r.status); throw new Error(); }
      const res = await r.json(); if (res.remark && !(res.elements || []).length) { why.push("busy"); throw new Error(); }
      return res;
    } catch (e) { if (e.name === "AbortError") why.push("slow"); else if (e.message !== "") why.push("blocked"); throw e; }
    finally { clearTimeout(t); }
  };
  let j = null;
  try { j = await Promise.any(OVERPASS.map(ask)); } catch {}
  ctls.forEach((c) => c.abort());
  if ($("#sheet").hidden) return;
  if (!j) return toiletFail(lat, `The toilet map didn't answer (${why.join(", ")}). Try Maps instead.`);
  const seen = new Set(), list = [];
  for (const el of j.elements || []) {
    const la = el.lat ?? el.center?.lat, lo = el.lon ?? el.center?.lon; if (la == null) continue;
    const k = `${la.toFixed(4)},${lo.toFixed(4)}`; if (seen.has(k)) continue; seen.add(k);
    const t = el.tags || {}, pub = t.amenity === "toilets";
    const name = pub ? t.name || "Public toilet" : `${t.name || "Place"} (${t.amenity || t.shop || t.tourism || "venue"})`;
    const bits = [];
    if (t.fee === "no") bits.push("free"); else if (t.fee === "yes") bits.push("paid" + (t.charge ? " " + t.charge : ""));
    if (!pub) bits.push("ask staff / customers");
    if (t.access === "customers" || t["toilets:access"] === "customers") bits.push("customers");
    if (t.wheelchair === "yes" || t["toilets:wheelchair"] === "yes") bits.push("accessible");
    if (t.radar_key === "yes" || t["toilets:radar_key"] === "yes" || /radar/i.test(t.description || "")) bits.push("RADAR key");
    if (t.opening_hours) bits.push(t.opening_hours === "24/7" ? "open 24/7" : t.opening_hours);
    const dist = distM(lat, lon, la, lo); if (dist <= NEAR_M) list.push({ la, lo, name, bits, pub, d: dist });
  }
  list.sort((a, b) => (a.d + (a.pub ? 0 : 150)) - (b.d + (b.pub ? 0 : 150)));
  const top = list.slice(0, 15);
  toiletSheet(top.length ? `<div>${top.map((x) => `<a class="tr" href="${mapsWalk(x.la, x.lo, x.name)}" target="_blank" rel="noopener" style="grid-template-columns:1fr auto;text-decoration:none;color:inherit"><div style="min-width:0"><div class="name">${esc(x.name)}</div><div class="sub">${esc(x.bits.join(" · ") || "no details")}</div></div><div style="text-align:right"><div class="name">${fmtDist(x.d)}</div><div class="sub">${walkMin(x.d)} min walk</div></div></a>`).join("")}</div>
    <div class="sub">Tap one for walking directions.</div><a class="btn" href="${mapsSearch(lat, lon)}" target="_blank" rel="noopener">Search in Maps instead</a>`
    : `<div class="warn">No toilets on the map within 1.3 km.</div><a class="btn primary" href="${mapsSearch(lat, lon)}" target="_blank" rel="noopener">Open in Maps</a>`);
}
