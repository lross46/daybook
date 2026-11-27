#!/usr/bin/env python3
"""Turns an OpenStreetMap GeoJSON-seq export into small map tiles for the toilet finder.

Each tile covers 0.1 x 0.1 degrees and is a JSON list of places:
  [lat, lon, kind, name, flags, opening_hours]
kind: 0 toilet, 1 pub, 2 bar, 3 cafe, 4 fast food, 5 hotel, 6 department store, 7 shopping centre
flags: f free, p paid, a accessible, r RADAR key, c customers only, y has toilets
Usage: toilet-tiles.py places.geojsonseq out_dir
"""
import json, math, os, sys
from collections import defaultdict

KIND = {("amenity", "toilets"): 0, ("amenity", "pub"): 1, ("amenity", "bar"): 2, ("amenity", "cafe"): 3,
        ("amenity", "fast_food"): 4, ("tourism", "hotel"): 5, ("shop", "department_store"): 6, ("shop", "mall"): 7}


def centre(geom):
    pts = []
    def walk(c):
        if isinstance(c[0], (int, float)):
            pts.append(c)
        else:
            for x in c:
                walk(x)
    walk(geom["coordinates"])
    if not pts:
        return None
    return sum(p[1] for p in pts) / len(pts), sum(p[0] for p in pts) / len(pts)


def main(src, out):
    tiles = defaultdict(list)
    seen = set()
    n = 0
    with open(src, encoding="utf-8") as f:
        for line in f:
            line = line.strip().lstrip("\x1e")
            if not line:
                continue
            feat = json.loads(line)
            t = feat.get("properties") or {}
            if t.get("toilets") == "no" or t.get("access") in ("private", "no"):
                continue
            kind = next((k for (key, val), k in KIND.items() if t.get(key) == val), None)
            if kind is None:
                if t.get("toilets") != "yes":
                    continue
                kind = 3
            c = centre(feat["geometry"])
            if not c:
                continue
            lat, lon = round(c[0], 5), round(c[1], 5)
            key = (round(lat, 4), round(lon, 4), kind)
            if key in seen:
                continue
            seen.add(key)
            fl = ""
            fee = t.get("toilets:fee") or t.get("fee")
            if fee == "no": fl += "f"
            elif fee == "yes": fl += "p"
            if "yes" in (t.get("wheelchair"), t.get("toilets:wheelchair")): fl += "a"
            if "yes" in (t.get("radar_key"), t.get("toilets:radar_key")) or "radar" in (t.get("description") or "").lower(): fl += "r"
            if "customers" in (t.get("access"), t.get("toilets:access")): fl += "c"
            if t.get("toilets") == "yes": fl += "y"
            row = [lat, lon, kind, (t.get("name") or "")[:60], fl]
            if t.get("opening_hours"):
                row.append(t["opening_hours"][:60])
            tiles[(math.floor(lat * 10), math.floor(lon * 10))].append(row)
            n += 1
    os.makedirs(out, exist_ok=True)
    for (a, b), rows in tiles.items():
        with open(os.path.join(out, f"{a}_{b}.json"), "w", encoding="utf-8") as f:
            json.dump(rows, f, ensure_ascii=False, separators=(",", ":"))
    with open(os.path.join(out, "index.json"), "w") as f:
        json.dump({"places": n, "tiles": len(tiles)}, f)
    print(f"{n} places in {len(tiles)} tiles")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
