/**
 * Hit-testing on the sphere: inverse-project a tap to lon/lat and run
 * point-in-polygon; if that misses, snap to the nearest small country
 * (islands, micro-states) within a finger-sized pixel tolerance.
 */
import { unproject, lonLatToVec, pointInPolygon } from './globe-math.js';

/**
 * @param countries decoded countries (see globe-data.js)
 * @param view      makeView() result
 * @param nx, ny    tap in unit-disc coordinates: nx = (px - cx) / R, ny = (cy - py) / R
 * @param R         globe radius in px (to convert the pixel tolerance)
 * @param tolPx     forgiveness radius in px for small countries
 * @returns {{country, exact:boolean}|null}  null for ocean / outside the disc
 */
export function pickCountry(countries, view, nx, ny, R, tolPx = 26) {
  const ll = unproject(nx, ny, view);
  if (!ll) return null;
  const [tx, ty, tz] = lonLatToVec(ll.lon, ll.lat);

  // 1. exact polygon containment
  for (const c of countries) {
    for (const p of c.polys) {
      const k = p.rings[0].cap;
      if (tx * k.x + ty * k.y + tz * k.z < Math.cos(k.radius)) continue;
      if (pointInPolygon(ll.lon, ll.lat, p.rings)) return { country: c, exact: true };
    }
  }

  // 2. nearest small country by on-screen distance to its outline
  const tolSq = (tolPx / R) * (tolPx / R);
  const { cl, sl, cp, sp } = view;
  let best = null, bestD = tolSq;
  for (const c of countries) {
    if (!c.small) continue;
    for (const ring of c.rings) {
      const k = ring.cap;
      if (tx * k.x + ty * k.y + tz * k.z < Math.cos(Math.min(Math.PI, k.radius + 0.6))) continue;
      const v = ring.vec;
      for (let i = 0; i < ring.n; i++) {
        const ux = v[3 * i], uy = v[3 * i + 1], uz = v[3 * i + 2];
        const a = ux * cl + uy * sl;
        if (sp * uz + cp * a < 0) continue; // far side
        const dx = uy * cl - ux * sl - nx, dy = cp * uz - sp * a - ny;
        const d = dx * dx + dy * dy;
        if (d < bestD) { bestD = d; best = c; }
      }
    }
  }
  return best ? { country: best, exact: false } : null;
}
