/**
 * Pure screen-layout decisions: portrait vs landscape, strip rows and the
 * free area (where the camera puts the system / the followed planet).
 */

export const BTN = 48;
export const GAP = 4;
export const TOP_H = 60;

export function layoutMode(w, h) {
  return w < h ? 'portrait' : 'landscape';
}

/** Per-row button counts for the strip: one row if it fits, else two. */
export function stripRows(availW, n = 9, btn = BTN, gap = GAP) {
  if (n * btn + (n - 1) * gap <= availW) return [n];
  const a = Math.ceil(n / 2);
  return [a, n - a];
}

export function stripHeight(rows) {
  return rows * BTN + (rows - 1) * GAP + 12;
}

export function sideWidth(w) {
  return Math.round(Math.min(340, Math.max(280, w * 0.34)));
}

/**
 * Free area. portrait: below the top bar, above the bottom stack.
 * landscape: left of the side panel, above the strip.
 */
export function freeRect(mode, w, h, m = {}) {
  const topH = m.topH ?? TOP_H;
  if (mode === 'portrait') {
    const bottomH = m.bottomH ?? 260;
    return { x: 0, y: topH, w, h: Math.max(80, h - topH - bottomH) };
  }
  const side = m.sideW ?? sideWidth(w);
  const stripH = m.stripH ?? stripHeight(1);
  return { x: 0, y: 0, w: Math.max(120, w - side), h: Math.max(80, h - stripH) };
}

/** Rough bottom-stack height before it can be measured. */
export function estimateBottomH(w, cardOpen, expanded) {
  const strip = stripHeight(stripRows(w - 16).length);
  return strip + 56 + (cardOpen ? (expanded ? 250 : 84) : 0);
}
