/* ---------- Toilet finder ----------
   In Great Britain it uses a copy of the OpenStreetMap toilets, pubs, cafés and fast food
   that is rebuilt every week and served with this app, so the lookup happens on the phone
   and the location goes nowhere. Elsewhere it asks the public map server. */
const NEAR_TOILET = 1300, NEAR_VENUE = 450;
const KINDS = ["toilet", "pub", "bar", "café", "fast food", "hotel", "department store", "shopping centre"];
function distM(a, b, c, d) {
  const R = 6371e3, r = Math.PI / 180, x = (c - a) * r, y = (d - b) * r;
  const h = Math.sin(x / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(y / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const fmtDist = (m) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`);
const walkMin = (m) => Math.max(1, Math.round(m / 80));
const mapsSearch = (lat, lon, what = "public toilets") => lat != null ? `https://maps.apple.com/?q=${encodeURIComponent(what)}&sll=${lat},${lon}` : `https://maps.apple.com/?q=${encodeURIComponent(what)}`;
const mapsWalk = (lat, lon, name) => `https://maps.apple.com/?daddr=${lat},${lon}&dirflg=w&q=${encodeURIComponent(name || "Toilet")}`;
const inGB = (lat, lon) => lat > 49.8 && lat < 61 && lon > -8.7 && lon < 2;

function toiletSheet(body) {
  openSheet(`${sheetHead("Toilets near you", "From OpenStreetMap. Check signs: details can be out of date.")}${body}`);
}
function findToilets() {
  toiletSheet(`<div class="ok-note"><span class="spin"></span> Finding where you are…</div>`);
  if (!navigator.geolocation) return toiletFail(null, "This phone can't share its location here.");
  navigator.geolocation.getCurrentPosition(
    (p) => loadToilets(p.coords.latitude, p.coords.longitude),
    (e) => toiletFail(null, e.code === 1 ? "Location is off for this app. Allow it in Settings, or use Maps below." : "Couldn't get your location."),
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
}
function toiletFail(lat, msg, lon) {
  if ($("#sheet").hidden) return;
  toiletSheet(`<div class="warn">${esc(msg)}</div><a class="btn primary" href="${mapsSearch(lat, lon)}" target="_blank" rel="noopener">Open in Maps</a>`);
}

/* places from the weekly copy: [lat, lon, kind, name, flags, hours] */
async function tilePlaces(lat, lon) {
  const ks = new Set();
  for (const dy of [-0.013, 0, 0.013]) for (const dx of [-0.02, 0, 0.02]) ks.add(`${Math.floor((lat + dy) * 10)}_${Math.floor((lon + dx) * 10)}`);
  const out = [];
  await Promise.all([...ks].map(async (k) => {
    try { const r = await fetch(`toilets/${k}.json`); if (r.ok) out.push(...(await r.json())); } catch {}
  }));
  return out.map(([la, lo, kind, name, fl = "", hours]) => ({ la, lo, kind, name, fl, hours }));
}
/* fallback outside Great Britain: the public Overpass server (often busy) */
async function livePlaces(lat, lon) {
  const box = (km) => { const a = km / 111, b = a / Math.cos(lat * Math.PI / 180); return [lat - a, lon - b, lat + a, lon + b].map((v) => v.toFixed(5)).join(","); };
  const q = `[out:json][timeout:25];(nwr["amenity"="toilets"](${box(1.3)});nwr["toilets"="yes"](${box(1.3)});node["amenity"~"^(pub|bar|cafe|fast_food)$"](${box(0.45)}););out center 300;`;
  let last = "";
  for (let i = 0; i < 2; i++) {
    try {
      const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 30000);
      const r = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: "data=" + encodeURIComponent(q), headers: { "Content-Type": "application/x-www-form-urlencoded" }, signal: ctl.signal, referrerPolicy: "origin" });
      clearTimeout(t);
      if (r.ok) {
        const j = await r.json(), K = { toilets: 0, pub: 1, bar: 2, cafe: 3, fast_food: 4 };
        return (j.elements || []).map((el) => { const t = el.tags || {}; return { la: el.lat ?? el.center?.lat, lo: el.lon ?? el.center?.lon, kind: K[t.amenity] ?? 3, name: t.name || "", fl: (t.fee === "no" ? "f" : t.fee === "yes" ? "p" : "") + (t.wheelchair === "yes" ? "a" : "") + (t.toilets === "yes" ? "y" : ""), hours: t.opening_hours, no: t.toilets === "no" }; }).filter((x) => x.la != null && !x.no);
      }
      last = String(r.status);
    } catch (e) { last = e.name === "AbortError" ? "slow" : "blocked"; }
    await new Promise((res) => setTimeout(res, 2500));
  }
  throw new Error(last);
}

async function loadToilets(lat, lon) {
  if ($("#sheet").hidden) return;
  toiletSheet(`<div class="ok-note"><span class="spin"></span> Looking for toilets…</div>`);
  let places;
  try { places = inGB(lat, lon) ? await tilePlaces(lat, lon) : await livePlaces(lat, lon); }
  catch (e) { return toiletFail(lat, `The toilet map server is busy (${e.message}). Try Maps instead.`, lon); }
  if ($("#sheet").hidden) return;
  const known = [], likely = [];
  for (const p of places) {
    const d = distM(lat, lon, p.la, p.lo), isToilet = p.kind === 0 || p.fl.includes("y");
    if (d > (isToilet ? NEAR_TOILET : NEAR_VENUE)) continue;
    const kind = KINDS[p.kind] || "place";
    const bits = [];
    if (p.kind !== 0 && p.name) bits.push(kind);
    if (p.fl.includes("f")) bits.push("free"); else if (p.fl.includes("p")) bits.push("paid");
    if (p.fl.includes("c")) bits.push("customers");
    if (p.fl.includes("a")) bits.push("accessible");
    if (p.fl.includes("r")) bits.push("RADAR key");
    if (p.hours) bits.push(p.hours === "24/7" ? "open 24/7" : p.hours);
    const name = p.name || (p.kind === 0 ? "Public toilet" : kind[0].toUpperCase() + kind.slice(1));
    (isToilet ? known : likely).push({ la: p.la, lo: p.lo, name, bits, d });
  }
  known.sort((a, b) => a.d - b.d); likely.sort((a, b) => a.d - b.d);
  const row = (x) => `<a class="tr" href="${mapsWalk(x.la, x.lo, x.name)}" target="_blank" rel="noopener" style="grid-template-columns:1fr auto;text-decoration:none;color:inherit"><div style="min-width:0"><div class="name">${esc(x.name)}</div><div class="sub">${esc(x.bits.join(" · ") || "no details")}</div></div><div style="text-align:right"><div class="name">${fmtDist(x.d)}</div><div class="sub">${walkMin(x.d)} min walk</div></div></a>`;
  toiletSheet(`${known.length ? `<div class="label">Toilets</div><div>${known.slice(0, 10).map(row).join("")}</div>` : `<div class="warn">No toilets on the map within 1.3 km.</div>`}
    ${likely.length ? `<div class="label" style="margin-top:6px">Pubs, cafés and more, close by</div><div class="sub">Most have a toilet, usually for customers. Asking politely often works.</div><div>${likely.slice(0, 8).map(row).join("")}</div>` : ""}
    <div class="sub">Tap one for walking directions.</div>
    <div class="two"><a class="btn" href="${mapsSearch(lat, lon, "pub")}" target="_blank" rel="noopener">Pubs in Maps</a><a class="btn" href="${mapsSearch(lat, lon, "cafe")}" target="_blank" rel="noopener">Cafés in Maps</a></div>`);
}
