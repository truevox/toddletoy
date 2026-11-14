/**
 * Responsive layout for the globe toy (pure). All numbers are CSS pixels.
 * Portrait: globe on top, info card below it, play buttons along the bottom,
 * zoom controls top-right. Landscape: globe centred; info card in the left
 * gutter, play buttons in a column in the right gutter, zoom controls top-right.
 */
export const BTN_PLAY = 60;
export const BTN_ZOOM = 48;
const PAD = 12;

export function computeLayout(w, h, insets = {}) {
  const it = insets.top || 0, ib = insets.bottom || 0, il = insets.left || 0, ir = insets.right || 0;
  const landscape = w >= h * 1.15;
  const phone = Math.min(w, h) < 520;
  const out = {
    landscape, phone, w, h,
    back: { left: PAD + il, top: PAD + it },
    zoom: { right: PAD + ir, top: PAD + it, horizontal: landscape },
    labelScale: phone ? 0.82 : 1,
  };

  if (landscape) {
    const R = Math.max(60, Math.min(0.46 * h - it / 2, 0.32 * w));
    const cx = w / 2, cy = h / 2;
    const gutter = Math.max(0, cx - R);
    const cardW = Math.max(150, Math.min(300, gutter - 2 * PAD - il));
    Object.assign(out, { cx, cy, R });
    out.card = { left: PAD + il, bottom: PAD + ib, width: cardW, maxH: h - (PAD + ib) - (PAD + it + 56) };
    const colX = cx + R + Math.max(0, (w - ir - (cx + R) - BTN_PLAY) / 2);
    out.play = { vertical: true, left: Math.min(colX, w - ir - PAD - BTN_PLAY), top: (h - (3 * BTN_PLAY + 24)) / 2 };
    return out;
  }

  const buttonsTop = h - ib - PAD - BTN_PLAY;
  const cardCollapsed = 104;
  const availTop = PAD + it + 48 + 4;
  const availBottom = buttonsTop - 8 - cardCollapsed - 8;
  const avail = Math.max(120, availBottom - availTop);
  const R = Math.max(60, Math.min(0.465 * w, avail / 2));
  const cy = availTop + R + 0.5 * Math.max(0, avail - 2 * R);
  Object.assign(out, { cx: w / 2, cy, R });
  out.play = { vertical: false, left: 0, top: buttonsTop, width: w };
  out.card = {
    left: PAD + il, right: PAD + ir, bottom: h - buttonsTop + 8, width: Math.min(w - 2 * PAD - il - ir, 520),
    maxH: Math.max(cardCollapsed, buttonsTop - 8 - (cy + 0.5 * R)),
  };
  return out;
}
