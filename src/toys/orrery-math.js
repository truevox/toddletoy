/**
 * Pure layout + hit-testing helpers for the orrery toy.
 */

/** Largest orbit radius / planet radius in the catalogue's own units. */
export const MAX_ORBIT_UNITS = 340;
export const MAX_PLANET_R = 22;

/**
 * Layout so the outermost orbit (plus its planet and a margin) always fits
 * the viewport, in portrait or landscape.
 */
export function orreryLayout(w, h, maxOrbitUnits = MAX_ORBIT_UNITS) {
  const edgePad = 14 + 12; // margin + Neptune's drawn radius
  const maxR = Math.max(40, Math.min(w, h) / 2 - edgePad);
  const scale = maxR / maxOrbitUnits;
  return { cx: w / 2, cy: h / 2, scale, maxR, sunR: Math.max(12, 28 * Math.min(1.1, scale)) };
}

/** Drawn radius of a planet at a given layout scale (shrinks a little on phones). */
export function planetDrawRadius(baseRadius, scale) {
  return Math.max(4, baseRadius * Math.min(1, Math.max(0.65, scale)));
}

/** Position of a planet at time tSec. */
export function planetPosition(p, tSec, layout) {
  const angle = (p.startDeg * Math.PI) / 180 + ((Math.PI * 2) / p.periodS) * tSec;
  return {
    x: layout.cx + Math.cos(angle) * p.orbitR * layout.scale,
    y: layout.cy + Math.sin(angle) * p.orbitR * layout.scale,
  };
}

/**
 * Toddler-friendly picking: the nearest item within max(minTol, r + 10) px.
 * items: [{ x, y, r }]. Returns the index, or -1 when nothing is close enough.
 */
export function pickNearest(items, x, y, minTol = 28) {
  let best = -1, bestD = Infinity;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const d = Math.hypot(x - it.x, y - it.y);
    const tol = Math.max(minTol, (it.r || 0) + 10);
    if (d <= tol && d < bestD) { bestD = d; best = i; }
  }
  return best;
}

/** Is (x, y) on the Sun (generous finger-sized target)? */
export function hitSun(layout, x, y, minTol = 36) {
  return Math.hypot(x - layout.cx, y - layout.cy) <= Math.max(minTol, layout.sunR * 1.5);
}
