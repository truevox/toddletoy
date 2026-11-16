/** Colour helpers for particle effects (0xRRGGBB numbers). */

export const DEFAULT_COLORS = [0xff7a59, 0xffc233, 0xff6fa5, 0x5ad1a0, 0x7b8cff, 0xb77bff];
let nextDefault = 0;

/** A pleasant colour from a small rotating warm/bright set. */
export function defaultColor() {
    const c = DEFAULT_COLORS[nextDefault % DEFAULT_COLORS.length];
    nextDefault += 1;
    return c;
}

/** Parse "#rrggbb" or a number to 0xRRGGBB, or null. */
export function toColorInt(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return value & 0xffffff;
    if (typeof value === 'string' && /^#?[0-9a-f]{6}$/i.test(value)) return parseInt(value.replace('#', ''), 16);
    return null;
}

/** Mix a colour towards white by t (0..1). */
export function lighten(color, t) {
    const r = (color >> 16) & 255, g = (color >> 8) & 255, b = color & 255;
    const m = (v) => Math.round(v + (255 - v) * t);
    return (m(r) << 16) | (m(g) << 8) | m(b);
}

/** Rotate hue by deg degrees, keeping saturation/lightness. */
export function hueShift(color, deg) {
    const r = ((color >> 16) & 255) / 255, g = ((color >> 8) & 255) / 255, b = (color & 255) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
    let h = 0, s = 0;
    if (d > 0) {
        s = d / (1 - Math.abs(2 * l - 1));
        if (max === r) h = ((g - b) / d) % 6; else if (max === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
        h *= 60;
    }
    h = (h + deg + 360) % 360;
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), mm = l - c / 2;
    const [rr, gg, bb] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    const f = (v) => Math.round((v + mm) * 255);
    return (f(rr) << 16) | (f(gg) << 8) | f(bb);
}

/** The base colour plus a lighter tint and a lighter neighbour hue. */
export function palette(color) {
    return [color, lighten(color, 0.45), lighten(hueShift(color, 35), 0.3)];
}
