/**
 * Orientation labels for the globe (pure; no canvas). Produces a small,
 * non-overlapping, hard-culled list of labels for the current view:
 * continent + ocean names at low zoom, country names as you zoom in.
 */
import { lonLatToVec, pointInPolygon, RAD, DEG } from './globe-math.js';
import { metaFor } from './globe-meta.js';

export const MAX_COUNTRY_LABELS = 14;
const POOL = 48;

const FIXED = [
  ['North America', -100, 46, 'continent'], ['South America', -60, -14, 'continent'],
  ['Europe', 16, 52, 'continent'], ['Africa', 20, 6, 'continent'], ['Asia', 88, 46, 'continent'],
  ['Oceania', 140, -24, 'continent'], ['Antarctica', 20, -78, 'continent'],
  ['Pacific Ocean', -150, 2, 'ocean'], ['Pacific Ocean', 172, -4, 'ocean'],
  ['Atlantic Ocean', -38, 28, 'ocean'], ['Atlantic Ocean', -14, -26, 'ocean'],
  ['Indian Ocean', 80, -22, 'ocean'], ['Arctic Ocean', -10, 82, 'ocean'], ['Southern Ocean', 100, -62, 'ocean'],
].map(([text, lon, lat, kind]) => ({ text, kind, v: lonLatToVec(lon, lat) }));

export function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Approximate rendered text width (px); avoids measureText in the hot path. */
export function textWidth(text, size) { return text.length * size * 0.56; }

/**
 * Interior anchor (lon/lat + unit vector) for each country: the mean direction of its
 * largest polygon, or the nearest interior point when the mean falls outside (crescents,
 * L-shapes). Cached on the country as `anchor`; also caches `labelOrder`.
 */
export function computeAnchors(countries) {
  if (countries.labelOrder) return countries.labelOrder;
  for (const c of countries) {
    let poly = c.polys[0];
    for (const p of c.polys) if (p.rings[0].cap.radius > poly.rings[0].cap.radius) poly = p;
    const ring = poly.rings[0], k = ring.cap;
    let lon = Math.atan2(k.y, k.x) * DEG, lat = Math.asin(Math.max(-1, Math.min(1, k.z))) * DEG;
    if (!pointInPolygon(lon, lat, poly.rings)) {
      const lats = ring.lat;
      let minLat = 90, maxLat = -90;
      for (let i = 0; i < ring.n; i++) { if (lats[i] < minLat) minLat = lats[i]; if (lats[i] > maxLat) maxLat = lats[i]; }
      let best = null, bestD = Infinity;
      for (let i = 0; i <= 14; i++) {
        for (let j = 0; j <= 14; j++) {
          const la = minLat + ((maxLat - minLat) * i) / 14, lo = ring.minX + ((ring.maxX - ring.minX) * j) / 14;
          const [x, y, z] = lonLatToVec(lo, la);
          const d = Math.acos(Math.max(-1, Math.min(1, x * k.x + y * k.y + z * k.z)));
          if (d < bestD && pointInPolygon(lo, la, poly.rings)) { bestD = d; best = [lo, la]; }
        }
      }
      if (best) { lon = best[0]; lat = best[1]; }
    }
    const [x, y, z] = lonLatToVec(lon, lat);
    c.anchor = { lon, lat, x, y, z };
  }
  countries.labelOrder = [...countries].sort((a, b) => b.capRadiusDeg - a.capRadiusDeg);
  return countries.labelOrder;
}

const pool = Array.from({ length: POOL }, () => ({ text: '', x: 0, y: 0, alpha: 0, size: 12, kind: '', w: 0 }));

function overlaps(out, n, x, y, w, h) {
  for (let i = 0; i < n; i++) {
    const o = out[i];
    if (Math.abs(o.x - x) < (o.w + w) / 2 && Math.abs(o.y - y) < (o.size + h) / 2 + 2) return true;
  }
  return false;
}

/**
 * @param st {view, S, cx, cy, w, h, zoom, scale, countries}
 * @returns {{items: Array, n: number}}  items is a reused pool: read only the first n
 */
export function layoutLabels(st) {
  const { view, S, cx, cy, w, h, zoom, scale, countries } = st;
  const { cl, sl, cp, sp } = view;
  const contA = 1 - smoothstep(1.15, 1.9, zoom);
  const ctryA = smoothstep(1.35, 2.0, zoom);
  let n = 0;
  const margin = 14;

  const place = (text, ux, uy, uz, alpha, size, kind, minZ) => {
    const a = ux * cl + uy * sl;
    const z = sp * uz + cp * a;
    if (z < minZ) return false;
    const x = cx + S * (uy * cl - ux * sl), y = cy - S * (cp * uz - sp * a);
    const tw = textWidth(text, size);
    if (x - tw / 2 < 6 || x + tw / 2 > w - 6 || y < margin || y > h - margin) return false;
    if (overlaps(pool, n, x, y, tw, size)) return false;
    const o = pool[n++];
    o.text = text; o.x = x; o.y = y; o.size = size; o.kind = kind; o.w = tw;
    o.alpha = alpha * smoothstep(minZ, minZ + 0.3, z);
    return true;
  };

  if (contA > 0.02) {
    for (const f of FIXED) {
      if (n >= POOL) break;
      const size = (f.kind === 'continent' ? 15 : 12) * scale;
      place(f.text, f.v[0], f.v[1], f.v[2], contA * (f.kind === 'continent' ? 0.9 : 0.7), size, f.kind, 0.2);
    }
  }

  if (ctryA > 0.02 && countries) {
    const order = computeAnchors(countries);
    let count = 0;
    for (let i = 0; i < order.length && count < MAX_COUNTRY_LABELS && n < POOL; i++) {
      const c = order[i];
      const px = c.capRadiusDeg * RAD * S;
      if (px < 22) break; // sorted by size: nothing smaller can hold a label
      const size = Math.max(11, Math.min(18, px * 0.2)) * scale;
      const a = c.anchor;
      if (textWidth(c.name, size) > px * 1.5) continue;
      if (place(c.name, a.x, a.y, a.z, ctryA * 0.95, size, 'country', 0.4)) count++;
    }
  }
  return { items: pool, n };
}

/** Continent label for the card's second line (English). */
export function continentOf(country) {
  const m = metaFor(country);
  return m ? m.continent : '';
}
