/**
 * Canvas textures for the Backdrop. Each is generated once; the backdrop then
 * only moves, scales and fades images made from them.
 */
import { hexToRgb, shiftHue } from './BackdropPalettes.js';

const GRADIENT_SIZE = 256;
const BLOB_SIZE = 256;

/** +-1 level of noise so smooth 8-bit gradients do not show banding. */
function dither(ctx, size, channels) {
    if (!ctx.getImageData || !ctx.putImageData) return;
    const img = ctx.getImageData(0, 0, size, size);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
        for (const c of channels) d[i + c] = Math.max(0, Math.min(255, d[i + c] + (Math.random() * 3 - 1) | 0));
    }
    ctx.putImageData(img, 0, 0);
}

function rgbCss(hex) {
    const [r, g, b] = hexToRgb(hex);
    return `rgb(${r},${g},${b})`;
}

function makeCanvas(scene, key, size) {
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const tex = scene.textures.createCanvas(key, size, size);
    return { tex, ctx: tex ? tex.getContext() : null };
}

/** Soft diagonal multi-stop gradient. `hueShift` makes the crossfade partner. */
export function createGradientTexture(scene, key, stops, hueShift = 0) {
    const { tex, ctx } = makeCanvas(scene, key, GRADIENT_SIZE);
    if (!ctx) return;
    const g = ctx.createLinearGradient(GRADIENT_SIZE * 0.3, 0, GRADIENT_SIZE * 0.7, GRADIENT_SIZE);
    for (const [pos, hex] of stops) g.addColorStop(pos, rgbCss(hueShift ? shiftHue(hex, hueShift) : hex));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, GRADIENT_SIZE, GRADIENT_SIZE);
    dither(ctx, GRADIENT_SIZE, [0, 1, 2]);
    tex.refresh();
}

/** White radial blob whose alpha falls off smoothly (gaussian bell) to zero at the rim. */
export function createBlobTexture(scene, key) {
    const { tex, ctx } = makeCanvas(scene, key, BLOB_SIZE);
    if (!ctx) return;
    const r = BLOB_SIZE / 2;
    const g = ctx.createRadialGradient(r, r, 0, r, r, r);
    const steps = 24;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const alpha = Math.exp(-4.5 * t * t) * (1 - t * t); // gaussian bell, exactly 0 at the rim
        g.addColorStop(t, `rgba(255,255,255,${alpha.toFixed(4)})`);
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, BLOB_SIZE, BLOB_SIZE);
    dither(ctx, BLOB_SIZE, [3]);
    tex.refresh();
}
