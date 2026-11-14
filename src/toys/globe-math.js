/**
 * Pure spherical math for the globe toy (no DOM, no canvas).
 *
 * View space: x = right, y = up, z = towards the viewer. A point is on the
 * visible hemisphere when z >= 0. Everything is on the unit sphere; the
 * renderer multiplies by the pixel radius.
 */

export const RAD = Math.PI / 180;
export const DEG = 180 / Math.PI;
export const MAX_TILT = 60;

/** Wrap a longitude into [-180, 180). */
export function wrapLon(lon) {
  return ((((lon + 180) % 360) + 360) % 360) - 180;
}

/** Shortest signed longitude difference, in (-180, 180]; 360 multiples -> 0. */
export function wrapDelta(d) {
  d %= 360;
  if (d > 180) d -= 360;
  else if (d < -180) d += 360;
  return d + 0; // normalise -0
}

export function clampTilt(lat, max = MAX_TILT) {
  return Math.max(-max, Math.min(max, lat));
}

/** Precompute the rotation for a view centred on (lon0, lat0) degrees. */
export function makeView(lon0, lat0) {
  const l = lon0 * RAD, p = lat0 * RAD;
  return { lon0, lat0, cl: Math.cos(l), sl: Math.sin(l), cp: Math.cos(p), sp: Math.sin(p) };
}

/** lon/lat (deg) -> unit vector in object space. */
export function lonLatToVec(lon, lat) {
  const phi = lat * RAD, lam = lon * RAD, c = Math.cos(phi);
  return [c * Math.cos(lam), c * Math.sin(lam), Math.sin(phi)];
}

/** Rotate an object-space unit vector into view space. */
export function rotateVec(ux, uy, uz, v) {
  const a = ux * v.cl + uy * v.sl;
  const b = uy * v.cl - ux * v.sl;
  return { x: b, y: v.cp * uz - v.sp * a, z: v.sp * uz + v.cp * a };
}

/** Orthographic projection of lon/lat (deg) -> {x, y, z} on the unit disc. */
export function project(lon, lat, view) {
  const [ux, uy, uz] = lonLatToVec(lon, lat);
  return rotateVec(ux, uy, uz, view);
}

/** True if a view-space z puts the point on the visible hemisphere. */
export function isVisible(z) {
  return z >= 0;
}

/** Inverse of project() for a point on the disc; null outside the disc. */
export function unproject(x, y, view) {
  const r2 = x * x + y * y;
  if (r2 > 1) return null;
  const z = Math.sqrt(1 - r2);
  const s = Math.max(-1, Math.min(1, z * view.sp + y * view.cp));
  const lat = Math.asin(s) * DEG;
  const lon = view.lon0 + Math.atan2(x, z * view.cp - y * view.sp) * DEG;
  return { lon: wrapLon(lon), lat };
}

/** Angle (radians) between two lon/lat points (deg). */
export function angularDistance(lon1, lat1, lon2, lat2) {
  const a = lonLatToVec(lon1, lat1), b = lonLatToVec(lon2, lat2);
  const d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  return Math.acos(Math.max(-1, Math.min(1, d)));
}

// ── Rings & point-in-polygon ────────────────────────────────────────────────

/**
 * Unwrap a ring's longitudes into a continuous sequence (so a ring crossing
 * the antimeridian, e.g. 179 -> -179, becomes 179 -> 181).
 * Returns { unx, net, polar } where net is the total longitude travelled when
 * closing the ring and polar = round(net / 360) (non-zero for a ring that
 * encircles a pole, like Antarctica).
 */
export function unwrapRing(lons) {
  const n = lons.length;
  const unx = new Float64Array(n);
  if (n === 0) return { unx, net: 0, polar: 0 };
  unx[0] = lons[0];
  for (let i = 1; i < n; i++) unx[i] = unx[i - 1] + wrapDelta(lons[i] - lons[i - 1]);
  const net = unx[n - 1] + wrapDelta(lons[0] - lons[n - 1]) - unx[0];
  return { unx, net, polar: Math.round(net / 360) };
}

/**
 * Build a ring record usable by pointInRing from raw lon/lat arrays.
 * Optional `cap` etc. are attached by the data module.
 */
export function makeRing(lons, lats) {
  const { unx, net, polar } = unwrapRing(lons);
  const n = lons.length;
  let minX = Infinity, maxX = -Infinity, sumLat = 0;
  for (let i = 0; i < n; i++) {
    if (unx[i] < minX) minX = unx[i];
    if (unx[i] > maxX) maxX = unx[i];
    sumLat += lats[i];
  }
  if (polar) {
    const end = unx[0] + net;
    minX = Math.min(minX, end);
    maxX = Math.max(maxX, end);
  }
  return { n, unx, lat: lats, polar, net, minX, maxX, poleLat: sumLat / (n || 1) < 0 ? -90 : 90 };
}

function crossing(x1, y1, x2, y2, px, py) {
  // ray towards +x from (px, py); toggles on each edge crossed
  if ((y1 > py) === (y2 > py)) return false;
  return px < x1 + ((py - y1) * (x2 - x1)) / (y2 - y1);
}

function insideAt(ring, px, py) {
  const { unx, lat, n } = ring;
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    if (crossing(unx[j], lat[j], unx[i], lat[i], px, py)) inside = !inside;
  }
  if (ring.polar) {
    // The data ring does not include the pole: close it through the pole.
    const x0 = unx[0], xe = unx[0] + ring.net, pole = ring.poleLat;
    // Replace the wrapped closing edge (last -> first, zero longitude jump)
    // by last -> (xe, lat0) -> (xe, pole) -> (x0, pole) -> first.
    const lastX = unx[n - 1], lastY = lat[n - 1], firstY = lat[0];
    if (crossing(lastX, lastY, x0, firstY, px, py)) inside = !inside; // undo wrapped edge
    if (crossing(lastX, lastY, xe, firstY, px, py)) inside = !inside;
    if (crossing(xe, firstY, xe, pole, px, py)) inside = !inside;
    if (crossing(xe, pole, x0, pole, px, py)) inside = !inside;
    if (crossing(x0, pole, x0, firstY, px, py)) inside = !inside;
  }
  return inside;
}

/** Point (lon, lat in degrees) inside a ring record from makeRing()? */
export function pointInRing(lon, lat, ring) {
  if (!ring || ring.n < 3) return false;
  const kMin = Math.ceil((ring.minX - lon) / 360);
  const kMax = Math.floor((ring.maxX - lon) / 360);
  for (let k = kMin; k <= kMax; k++) {
    if (insideAt(ring, lon + 360 * k, lat)) return true;
  }
  return false;
}

/** Polygon = rings[0] exterior, rest holes. */
export function pointInPolygon(lon, lat, rings) {
  if (!rings.length || !pointInRing(lon, lat, rings[0])) return false;
  for (let i = 1; i < rings.length; i++) {
    if (pointInRing(lon, lat, rings[i])) return false;
  }
  return true;
}
