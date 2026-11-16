/**
 * MotionMath - pure curves for object motion. Nothing here touches Phaser.
 * Every function writes into a caller-owned `out` pose (no per-frame
 * allocation): { sx, sy, angle (deg), lift (fraction of glyph size), alpha }.
 */

export const POP_IN_MS = 400;
export const REACT_MS = 500;
export const BUMP_MS = 260;
export const GHOST_MS = 300;
export const GHOST_REDUCED_MS = 120;
export const CAPTION_DELAY_MS = 120;
export const CAPTION_FADE_MS = 200;
export const DRAG_LIFT = 0.15;
export const IDLE_BREATH = 0.03;
export const IDLE_BOB = 0.03;

const TAU = Math.PI * 2;
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export function newPose() {
    return { sx: 1, sy: 1, angle: 0, lift: 0, alpha: 1 };
}

export function resetPose(out) {
    out.sx = 1; out.sy = 1; out.angle = 0; out.lift = 0; out.alpha = 1;
    return out;
}

/** Spring-like scale from 0.3 with an overshoot, squashing wide as it overshoots. Returns true when finished. */
export function popInPose(ms, reduced, out) {
    resetPose(out);
    const T = reduced ? 160 : POP_IN_MS;
    if (ms >= T) return true;
    const u = Math.max(0, ms) / T;
    if (reduced) {
        out.sx = out.sy = 0.85 + 0.15 * u;
        out.alpha = u;
        return false;
    }
    const t = Math.max(0, ms) / 1000;
    let p = 1 - 0.7 * Math.exp(-9 * t) * Math.cos(TAU * 2.2 * t);
    p = 1 + (p - 1) * (1 - smooth(0.7, 1, u)); // deviation fades out so the end is exactly 1
    const sq = clamp(0.35 * (p - 1), -0.15, 0.15);
    out.sx = p * (1 + sq);
    out.sy = p * (1 - sq);
    out.alpha = Math.min(1, u * 6);
    return false;
}

/** Caption/number-row alpha: fades in after a short delay. */
export function captionAlpha(ms) {
    return smooth(CAPTION_DELAY_MS, CAPTION_DELAY_MS + CAPTION_FADE_MS, ms);
}

/** Idle breathing and bobbing; `weight` eases it in and out. */
export function idlePose(seconds, phase, period, weight, out) {
    const w = TAU * seconds / period + phase;
    const breath = Math.sin(w);
    out.sx = out.sy = 1 + IDLE_BREATH * breath * weight;
    out.lift = IDLE_BOB * Math.sin(w * 0.77 + 1.3) * weight;
    return out;
}

export function reactKind(type) {
    return type === 'letter' || type === 'number' || type === 'shape' ? type : 'emoji';
}

/** Tap reaction at progress u in 0..1; returns false past the end. */
export function reactPose(kind, u, reduced, out) {
    resetPose(out);
    if (u >= 1) return false;
    if (u < 0) u = 0;
    const fade = 1 - u;
    if (reduced) { // a simple pulse, no spin or hop
        out.sx = out.sy = 1 + 0.1 * Math.sin(Math.PI * u);
        return true;
    }
    switch (kind) {
        case 'letter': // wiggle side to side
            out.angle = 16 * Math.sin(TAU * 3 * u) * fade;
            out.sx = out.sy = 1 + 0.08 * Math.sin(Math.PI * u);
            break;
        case 'number': { // two bounces, squashing on each landing
            const s = Math.abs(Math.sin(TAU * u));
            out.lift = 0.32 * s * (1 - 0.4 * u);
            const squash = 0.14 * Math.pow(1 - s, 6) * smooth(0, 0.08, u) * (1 - smooth(0.93, 1, u));
            out.sx = 1 + squash; out.sy = 1 - squash;
            break;
        }
        case 'shape': { // one full spin
            const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
            out.angle = 360 * e;
            out.sx = out.sy = 1 + 0.12 * Math.sin(Math.PI * u);
            break;
        }
        default: { // emoji: jump with a little spin-wobble and a soft landing
            out.lift = 0.36 * 4 * u * (1 - u);
            out.angle = 14 * Math.sin(TAU * 2 * u) * fade;
            const land = Math.exp(-Math.pow((u - 0.92) / 0.05, 2));
            out.sy = 1 + 0.1 * Math.sin(Math.PI * u) - 0.16 * land;
            out.sx = 1 + 0.12 * land;
        }
    }
    return true;
}

/** A quick squash for edge/neighbour hits. Returns false past the end. */
export function bumpPose(u, strength, out) {
    resetPose(out);
    if (u >= 1) return false;
    const k = 0.22 * clamp(strength, 0, 1) * Math.sin(Math.PI * u) * (1 - 0.5 * u);
    out.sx = 1 + k; out.sy = 1 - k;
    return true;
}

/** Pop-out ghost: a small swell, then shrink, float up and fade. */
export function ghostPose(u, reduced, out) {
    resetPose(out);
    const e = clamp(u, 0, 1);
    if (reduced) { out.alpha = 1 - e; return out; }
    const swell = 0.08 * Math.sin(Math.PI * Math.min(1, e * 3)) * (e < 0.33 ? 1 : 0);
    const shrink = e * e;
    out.sx = out.sy = (1 + swell) * (1 - 0.7 * shrink);
    out.lift = 0.4 * (1 - Math.pow(1 - e, 2));
    out.alpha = 1 - smooth(0.25, 1, e);
    return out;
}

/** Drag tilt target (deg) from horizontal speed (px/s). */
export function dragTilt(vx) {
    return clamp(vx * 0.008, -10, 10);
}
