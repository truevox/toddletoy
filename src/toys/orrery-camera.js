/**
 * Pure camera maths: world (Sun at 0,0) <-> screen, follow/zoom targets and
 * easing. view = { cx, cy, base } (free-area centre + fit scale),
 * cam = { fx, fy, z, tx, ty, tz }.
 */
import { MAX_ORBIT_WORLD } from './orrery-data.js';

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;
export const MAX_FOLLOW_ZOOM = 10;
export const EASE_TAU_MS = 150; // ~700ms to settle

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function createCamera() {
  return { fx: 0, fy: 0, z: 1, tx: 0, ty: 0, tz: 1, follow: -1 };
}

/** Scale so the outermost orbit fits the free area with a margin. */
export function fitScale(freeW, freeH, pad = 26) {
  return Math.max(0.2, (Math.min(freeW, freeH) / 2 - pad) / MAX_ORBIT_WORLD);
}

export const scaleOf = (view, cam) => view.base * cam.z;

export function worldToScreen(view, cam, wx, wy, out) {
  const s = view.base * cam.z;
  out.x = view.cx + (wx - cam.fx) * s;
  out.y = view.cy + (wy - cam.fy) * s;
  return out;
}

export function screenToWorld(view, cam, sx, sy, out) {
  const s = view.base * cam.z;
  out.x = cam.fx + (sx - view.cx) / s;
  out.y = cam.fy + (sy - view.cy) / s;
  return out;
}

/** Zoom that makes a body of world radius r appear about targetPx on screen. */
export function followZoom(rWorld, base, freeW, freeH) {
  const targetPx = clamp(0.17 * Math.min(freeW, freeH), 34, 72);
  return clamp(targetPx / (rWorld * base), 1.8, MAX_FOLLOW_ZOOM);
}

/** Keep the view inside the solar system; at 1x it is locked to the Sun. */
export function clampFocus(fx, fy, z) {
  const lim = MAX_ORBIT_WORLD * (1 - 1 / Math.max(1, z)) * 1.05;
  const d = Math.hypot(fx, fy);
  if (d <= lim || d === 0) return { x: fx, y: fy };
  return { x: (fx / d) * lim, y: (fy / d) * lim };
}

/** Set camera targets for zooming by `factor` about screen point (sx, sy). */
export function zoomAbout(view, cam, sx, sy, factor, maxZ = MAX_ZOOM) {
  const nz = clamp(cam.tz * factor, MIN_ZOOM, maxZ);
  const s0 = view.base * cam.tz, s1 = view.base * nz;
  const wx = cam.tx + (sx - view.cx) / s0;
  const wy = cam.ty + (sy - view.cy) / s0;
  const f = clampFocus(wx - (sx - view.cx) / s1, wy - (sy - view.cy) / s1, nz);
  cam.tz = nz; cam.tx = f.x; cam.ty = f.y;
  return cam;
}

export function panBy(view, cam, dxPx, dyPx) {
  const s = view.base * cam.tz;
  const f = clampFocus(cam.tx - dxPx / s, cam.ty - dyPx / s, cam.tz);
  cam.tx = f.x; cam.ty = f.y;
}

export function goHome(cam) {
  cam.follow = -1; cam.tx = 0; cam.ty = 0; cam.tz = 1;
}

/** Exponential approach: fraction of the remaining gap closed this frame. */
export function easeFactor(dtMs, tau = EASE_TAU_MS) {
  return 1 - Math.exp(-Math.max(0, dtMs) / tau);
}

export function stepCamera(cam, dtMs, reduced = false) {
  const k = reduced ? 1 : easeFactor(dtMs);
  cam.fx += (cam.tx - cam.fx) * k;
  cam.fy += (cam.ty - cam.fy) * k;
  cam.z += (cam.tz - cam.z) * k;
  return cam;
}

/** Smoothly move the free-area centre/scale (card open/close, resize). */
export function stepView(view, target, dtMs, reduced = false) {
  const k = reduced || view.base === 0 ? 1 : easeFactor(dtMs, 110);
  view.cx += (target.cx - view.cx) * k;
  view.cy += (target.cy - view.cy) * k;
  view.base += (target.base - view.base) * k;
}

/** On-screen radius of a body (px): world size scaled, never below its floor. */
export function bodyRadiusPx(body, scale) {
  return Math.max(body.minPx, body.r * scale);
}
