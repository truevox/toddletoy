/**
 * Backdrop palettes and the colour maths that keeps them legible.
 *
 * Every gradient stop and every blob (composited at its maximum alpha, all
 * blobs stacked) must stay between MIN_LUMINANCE and MAX_LUMINANCE so white
 * captions keep >= 4.5:1 contrast and the screen is never near-black.
 */

export const MAX_LUMINANCE = 0.183; // white text: 1.05 / (0.183 + 0.05) = 4.5:1
export const MIN_LUMINANCE = 0.025; // clearly coloured, never near-black

export function hexToRgb(hex) {
    return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
}

export function rgbToHex([r, g, b]) {
    return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}

export function relativeLuminance(rgb) {
    const [r, g, b] = rgb.map((v) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastWithWhite(rgb) {
    return 1.05 / (relativeLuminance(rgb) + 0.05);
}

/** Rotate hue by `deg` degrees (HSL), keeping saturation and lightness. */
export function shiftHue(hex, deg) {
    const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
    const d = max - min;
    let h = 0, s = 0;
    if (d > 0) {
        s = d / (1 - Math.abs(2 * l - 1));
        if (max === r) h = ((g - b) / d) % 6;
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h *= 60;
    }
    h = (((h + deg) % 360) + 360) % 360;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    const [r1, g1, b1] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
        : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return rgbToHex([(r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255]);
}

function mix(a, b, t) {
    return a.map((v, i) => v + (b[i] - v) * t);
}

/** Every colour the backdrop can show, as the worst case: lightest/darkest composites. */
export function worstCaseColours(palette) {
    const out = [];
    const variants = [palette.stops.map((s) => s[1]), palette.stops.map((s) => shiftHue(s[1], palette.hueShift))];
    for (const stops of variants) {
        for (const hex of stops) {
            const name = hex.toString(16);
            out.push({ what: `stop #${name}`, rgb: hexToRgb(hex) });
            // all blobs stacked at max alpha over this stop
            let stacked = hexToRgb(hex);
            for (const blob of palette.blobs) stacked = mix(stacked, hexToRgb(blob.color), blob.alpha);
            out.push({ what: `stop #${name} + all blobs`, rgb: stacked });
            for (const blob of palette.blobs) {
                out.push({
                    what: `stop #${name} + blob #${blob.color.toString(16)}`,
                    rgb: mix(hexToRgb(hex), hexToRgb(blob.color), blob.alpha),
                });
            }
        }
    }
    return out;
}

const blob = (color, alpha, x, y, size, dx, dy, period) => ({ color, alpha, x, y, size, dx, dy, period });

export const PALETTES = {
    // Twilight: indigo sky sliding into plum and a warm mauve glow
    twilight: {
        name: 'twilight',
        stops: [[0, 0x2c3a8a], [0.5, 0x4a3a8c], [1, 0x6e3874]],
        hueShift: 24,
        base: 0x4a3a8c,
        blobs: [
            blob(0x4f6fd0, 0.34, 0.2, 0.15, 1.0, 0.12, 0.08, 52),
            blob(0xb05a9a, 0.30, 0.85, 0.3, 0.9, -0.1, 0.1, 61),
            blob(0x3f9fb8, 0.22, 0.5, 0.55, 0.85, 0.1, -0.12, 70),
            blob(0x8a5ad8, 0.30, 0.15, 0.8, 1.0, 0.14, -0.08, 57),
            blob(0xd0708a, 0.24, 0.8, 0.9, 0.95, -0.12, -0.1, 66),
            blob(0x5a7ae0, 0.22, 0.6, 0.05, 0.8, -0.1, 0.12, 48),
        ],
    },
    // Aquarium: deep teal water with sea-green and blue light
    aquarium: {
        name: 'aquarium',
        stops: [[0, 0x174682], [0.5, 0x095060], [1, 0x103f58]],
        hueShift: -8,
        base: 0x095060,
        blobs: [
            blob(0x3fa0a8, 0.24, 0.2, 0.2, 1.0, 0.12, 0.1, 54),
            blob(0x3a72d0, 0.20, 0.85, 0.25, 0.95, -0.12, 0.08, 63),
            blob(0x38b090, 0.14, 0.5, 0.6, 0.9, 0.1, -0.1, 72),
            blob(0x2a62b8, 0.26, 0.15, 0.85, 1.0, 0.12, -0.1, 58),
            blob(0x50b0c8, 0.13, 0.85, 0.85, 0.9, -0.14, -0.08, 67),
            blob(0x5a8ad8, 0.18, 0.55, 0.05, 0.8, -0.1, 0.12, 49),
        ],
    },
    // Dawn: soft rose and apricot haze over dusky violet
    dawn: {
        name: 'dawn',
        stops: [[0, 0x5f4a9a], [0.55, 0x8a4682], [1, 0x92444a]],
        hueShift: -20,
        base: 0x8a4682,
        blobs: [
            blob(0x7a6ad0, 0.26, 0.2, 0.15, 1.0, 0.12, 0.08, 53),
            blob(0xc05880, 0.22, 0.85, 0.35, 0.9, -0.1, 0.1, 62),
            blob(0xc07048, 0.16, 0.5, 0.9, 1.0, 0.12, -0.1, 69),
            blob(0x9a60d0, 0.24, 0.1, 0.65, 0.9, 0.14, -0.08, 57),
            blob(0xc06070, 0.22, 0.8, 0.95, 0.95, -0.12, -0.1, 65),
            blob(0x6a8ad0, 0.20, 0.6, 0.05, 0.8, -0.1, 0.12, 47),
        ],
    },
};

export const DEFAULT_PALETTE = 'aquarium';
/** Matches the middle of the default gradient: used for page body and Phaser backgroundColor. */
export const BACKDROP_BASE_COLOR = PALETTES[DEFAULT_PALETTE].base;
