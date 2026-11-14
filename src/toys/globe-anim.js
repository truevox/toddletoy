/**
 * Pure animation + gesture math for the globe toy: easing, shortest-path
 * fly-to tweens, zoom clamping, pinch maths, drag sensitivity.
 */
import { wrapDelta, wrapLon, clampTilt, DEG } from './globe-math.js';

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 5;

export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
export function clampZoom(z) { return clamp(isFinite(z) ? z : 1, ZOOM_MIN, ZOOM_MAX); }

export function easeInOutCubic(t) {
  t = clamp(t, 0, 1);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
export function easeOutCubic(t) { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); }

/** Shortest signed longitude change from a to b, in (-180, 180]. */
export function shortestLonDelta(a, b) { return wrapDelta(b - a); }

/**
 * Create a fly-to tween. `extraSpin` (deg, signed by direction) adds whole-turn
 * flourish on top of the shortest path.
 */
export function createFly(from, to, start, dur, extraSpin = 0) {
  const dLon = shortestLonDelta(from.lon, to.lon);
  const spin = extraSpin ? Math.sign(dLon || 1) * Math.abs(extraSpin) : 0;
  return {
    start, dur: Math.max(1, dur),
    lon0: from.lon, dLon: dLon + spin,
    lat0: from.lat, lat1: clampTilt(to.lat),
    z0: from.zoom, z1: clampZoom(to.zoom),
  };
}

/** Sample a fly at time `now` into `out` {lon, lat, zoom}; returns true when finished. */
export function sampleFly(fly, now, out) {
  const t = clamp((now - fly.start) / fly.dur, 0, 1);
  const e = easeInOutCubic(t);
  out.lon = wrapLon(fly.lon0 + fly.dLon * e);
  out.lat = fly.lat0 + (fly.lat1 - fly.lat0) * e;
  out.zoom = fly.z0 + (fly.z1 - fly.z0) * e;
  return t >= 1;
}

/** Wheel / trackpad delta -> new zoom (exponential, so it feels even). */
export function zoomFromWheel(zoom, deltaY, ctrlKey = false) {
  const k = ctrlKey ? 0.01 : 0.0015;
  return clampZoom(zoom * Math.exp(-deltaY * k));
}

/** Pinch: scale the zoom by the change in finger distance. */
export function pinchZoom(zoom, prevDist, dist) {
  if (!(prevDist > 0) || !(dist > 0)) return clampZoom(zoom);
  return clampZoom(zoom * (dist / prevDist));
}

/** Button zoom step (multiplicative), clamped. */
export function stepZoom(zoom, dir) { return clampZoom(zoom * (dir > 0 ? 1.6 : 1 / 1.6)); }

/** Drag pixels -> lon/lat degrees so the surface tracks the finger at any zoom. */
export function dragToDegrees(dx, dy, R, zoom, lat) {
  const S = R * zoom;
  const cosLat = Math.max(0.5, Math.cos(lat / DEG));
  return { dLon: -(dx / S) * DEG / cosLat, dLat: (dy / S) * DEG };
}

/** Distance and midpoint of two points. */
export function pinchGeometry(ax, ay, bx, by) {
  return { dist: Math.hypot(bx - ax, by - ay), mx: (ax + bx) / 2, my: (ay + by) / 2 };
}
