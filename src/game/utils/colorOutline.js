/**
 * Thin light outline for coloured numerals/letters so dark fills (pure blue,
 * purple...) stay readable on the black background without losing their hue.
 */

/** Fraction of the way from the fill colour to white used for the outline. */
export const OUTLINE_LIGHTEN = 0.45;

function parseHex(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** Outline colour (#rrggbb): the fill lightened toward white. Falls back to white. */
export function outlineColorFor(hex, amount = OUTLINE_LIGHTEN) {
    const c = parseHex(hex);
    if (!c) return '#ffffff';
    const mix = v => Math.round(v + (255 - v) * amount).toString(16).padStart(2, '0');
    return `#${mix(c.r)}${mix(c.g)}${mix(c.b)}`;
}

/** Stroke thickness in px for a font size (about 3px at 32px text, never below 2). */
export function outlineThicknessFor(fontSizePx) {
    const size = parseInt(fontSizePx, 10) || 32;
    return Math.max(2, Math.round(size * 0.09));
}
