/**
 * Size comparison layout: planets in a row at TRUE relative diameters next to
 * a slice of the Sun's limb. Pure maths; `e` = pixels per Earth diameter.
 */
import { BODIES } from './orrery-data.js';

export const MIN_CENTER_GAP = 48;   // keeps tiny neighbours separate and tappable
export const MIN_HIT = 26;          // invisible hit radius floor (px)
export const RING_BELOW = 11;       // planets smaller than this radius get a ring marker
export const SUN_MARGIN = 70;       // px of Sun slice visible at the left of the world

/** World layout at scale e. Planet i (1..8) in order from the Sun. */
export function compareLayout(e, cy = 0) {
  const sunR = (BODIES[0].trueDiameter / 2) * e;
  const sun = { cx: SUN_MARGIN - sunR, cy, r: sunR };
  const items = [];
  let x = SUN_MARGIN + 50;
  for (let i = 1; i <= 8; i++) {
    const r = (BODIES[i].trueDiameter / 2) * e;
    const ext = i === 6 ? r * 2.3 : r; // Saturn's rings reach well beyond the disc
    if (i > 1) {
      const prev = items[items.length - 1];
      const pext = prev.i === 6 ? prev.r * 2.3 : prev.r;
      x = Math.max(prev.cx + pext + ext + 14, prev.cx + MIN_CENTER_GAP);
    } else x += r;
    items.push({
      i, cx: x, cy, r,
      hitR: Math.max(MIN_HIT, r + 6),
      ring: r < RING_BELOW,
      labelRow: (i - 1) % 2, // alternate above/below so names never collide
    });
  }
  const last = items[items.length - 1];
  return { sun, items, worldWidth: last.cx + last.r + 50 };
}

/** Scale e that fits the row in the free width (min 10), limited by height. */
export function fitCompareScale(freeW, freeH) {
  // Gaps are partly fixed px, so scan down from a height-based limit.
  const maxE = Math.min(40, (freeH * 0.55) / BODIES[5].trueDiameter);
  let e = maxE;
  while (e > 10 && compareLayout(e).worldWidth > freeW) e -= 0.5;
  return Math.max(10, e);
}

/** Hit test in world coordinates; nearest item whose hit radius contains the point. */
export function pickCompare(layout, wx, wy) {
  let best = -1, bd = Infinity;
  for (const it of layout.items) {
    const d = Math.hypot(wx - it.cx, wy - it.cy);
    if (d <= it.hitR && d < bd) { bd = d; best = it.i; }
  }
  if (best < 0) {
    const s = layout.sun;
    if (Math.hypot(wx - s.cx, wy - s.cy) <= s.r) return 0;
  }
  return best;
}

export function clampScroll(scrollX, worldWidth, freeW) {
  return Math.min(0, Math.max(freeW - worldWidth, scrollX));
}
