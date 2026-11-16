/**
 * ThrowMotion - release-velocity estimate and glide/bounce integration (pure, no allocation).
 */
import { clampBody } from './Separation.js';

export const MIN_THROW_SPEED = 150;   // px/s: slower releases are plain drops
export const MAX_THROW_SPEED = 1600;  // px/s launch cap
export const FRICTION = 5.5;          // 1/s exponential decay
export const REST_SPEED = 25;         // px/s: below this the glide ends
export const RESTITUTION = 0.5;
export const VELOCITY_WINDOW_MS = 100;
export const SAMPLES = 24;

/** Ring buffer of (t ms, x, y) drag samples. */
export class DragSamples {
    constructor() { this.buf = new Float64Array(SAMPLES * 3); this.n = 0; this.head = 0; }
    clear() { this.n = 0; this.head = 0; }
    push(t, x, y) {
        const i = this.head * 3;
        this.buf[i] = t; this.buf[i + 1] = x; this.buf[i + 2] = y;
        this.head = (this.head + 1) % SAMPLES;
        if (this.n < SAMPLES) this.n++;
    }
    /** Writes {vx, vy} (px/s, capped) into `out`: movement over the last ~100 ms ending at `now`. */
    velocity(now, out) {
        out.vx = 0; out.vy = 0;
        if (this.n < 2) return out;
        const last = (this.head - 1 + SAMPLES) % SAMPLES;
        let first = last;
        for (let k = 1; k < this.n; k++) {
            const j = (last - k + SAMPLES) % SAMPLES;
            if (now - this.buf[j * 3] > VELOCITY_WINDOW_MS) break;
            first = j;
        }
        if (first === last) return out;
        const dt = (now - this.buf[first * 3]) / 1000;
        if (dt < 0.008) return out;
        let vx = (this.buf[last * 3 + 1] - this.buf[first * 3 + 1]) / dt;
        let vy = (this.buf[last * 3 + 2] - this.buf[first * 3 + 2]) / dt;
        const sp = Math.hypot(vx, vy);
        if (sp < MIN_THROW_SPEED) return out;
        if (sp > MAX_THROW_SPEED) { vx *= MAX_THROW_SPEED / sp; vy *= MAX_THROW_SPEED / sp; }
        out.vx = vx; out.vy = vy;
        return out;
    }
}

/**
 * Advance a gliding body by dt seconds: friction, move, bounce off the clamp.
 * Returns the bounce speed (px/s) if it hit an edge this step, else 0.
 */
export function stepGlide(ctx, s, dt) {
    if (s.vx === 0 && s.vy === 0) return 0;
    const dx = s.vx * dt, dy = s.vy * dt;
    const nx = s.x + dx, ny = s.y + dy;
    const c = clampBody(ctx, s, nx, ny);
    let hit = 0;
    if (Math.abs(c.x - nx) > 0.01 && s.vx * (c.x - nx) < 0) { hit = Math.max(hit, Math.abs(s.vx)); s.vx = -s.vx * RESTITUTION; }
    if (Math.abs(c.y - ny) > 0.01 && s.vy * (c.y - ny) < 0) { hit = Math.max(hit, Math.abs(s.vy)); s.vy = -s.vy * RESTITUTION; }
    if (c.x !== s.x || c.y !== s.y) s.moved = true;
    s.x = c.x; s.y = c.y;
    const f = Math.exp(-FRICTION * dt);
    s.vx *= f; s.vy *= f;
    if (Math.hypot(s.vx, s.vy) < REST_SPEED) { s.vx = 0; s.vy = 0; }
    return hit;
}
