/**
 * Separation - pure maths for nudging overlapping object bodies apart, plus an
 * allocation-free clamp that mirrors BoundsClamp (screen margin + keep-out).
 *
 * A body is { x, y, l, t, r, b, mob, fixed, seq, vx, vy, moved } where l/t/r/b are
 * the composite's extents relative to its anchor (x, y). Nothing here allocates.
 */
export const PAIR_GAP = 8;        // bodies are pushed until this far apart
export const ENGAGE_GAP = 4;      // ... but only start pushing when closer than this
export const EASE_K = 12;         // 1/s: ease-out rate (exponential approach, never overshoots)
export const MAX_PUSH_SPEED = 500; // px/s
export const MIN_PUSH_SPEED = 30;  // px/s floor so the tail finishes
export const EDGE_MARGIN = 8;
const MAX_BIAS = 80;

const out = { x: 0, y: 0 };
let lastStep = 0; // step requested by the latest pushAxis (to tell 'blocked' from 'nearly done')

function clampAxis(v, emin, emax, size, margin) {
    const lo = margin - emin, hi = size - margin - emax;
    if (lo > hi) return (lo + hi) / 2;
    return v < lo ? lo : v > hi ? hi : v;
}

/** Clamp anchor (x, y) for body `s` into ctx; result in the shared `out` (valid until next call). */
export function clampBody(ctx, s, x, y) {
    const m = ctx.margin;
    let px = clampAxis(x, s.l, s.r, ctx.width, m);
    let py = clampAxis(y, s.t, s.b, ctx.height, m);
    const k = ctx.keepOut;
    if (k) {
        const l = px + s.l, r = px + s.r, t = py + s.t, b = py + s.b;
        if (Math.min(r, k.x + k.width) - Math.max(l, k.x) > 0 && Math.min(b, k.y + k.height) - Math.max(t, k.y) > 0) {
            const left = r - k.x, down = k.y + k.height - t;
            const canLeft = l - left >= m, canDown = b + down <= ctx.height - m;
            const goLeft = canLeft && canDown ? left <= down : canLeft ? true : canDown ? false : left <= down;
            if (goLeft) px -= left; else py += down;
        }
    }
    out.x = px; out.y = py;
    return out;
}

/** Move a body along one axis by `delta` (clamped). Returns the signed distance actually moved on that axis. */
function moveAxis(ctx, s, horizontal, delta) {
    if (delta === 0) return 0;
    const c = horizontal ? clampBody(ctx, s, s.x + delta, s.y) : clampBody(ctx, s, s.x, s.y + delta);
    const dx = c.x - s.x, dy = c.y - s.y;
    if (dx !== 0 || dy !== 0) { s.x = c.x; s.y = c.y; s.moved = true; }
    const d = horizontal ? dx : dy;
    if (horizontal) { s.absX += Math.abs(d); s.netX += d; } else { s.absY += Math.abs(d); s.netY += d; }
    return d;
}

/** Raw penetration on each axis (positive = overlapping). */
export function penetration(a, b, horizontal) {
    return horizontal
        ? Math.min(a.x + a.r, b.x + b.r) - Math.max(a.x + a.l, b.x + b.l)
        : Math.min(a.y + a.b, b.y + b.b) - Math.max(a.y + a.t, b.y + b.t);
}

function pushAxis(ctx, a, b, horizontal, pen, dt) {
    const ca = horizontal ? a.x + (a.l + a.r) / 2 : a.y + (a.t + a.b) / 2;
    const cb = horizontal ? b.x + (b.l + b.r) / 2 : b.y + (b.t + b.b) / 2;
    const dir = cb > ca ? 1 : cb < ca ? -1 : (a.seq < b.seq ? 1 : -1);
    const total = pen + PAIR_GAP;
    const ease = total * (1 - Math.exp(-ctx.k * dt));
    let step = Math.min(Math.max(ease, Math.min(total, MIN_PUSH_SPEED * dt)), ctx.maxSpeed * dt);
    if (total <= 0.25) step = total;
    lastStep = step;
    const wa = a.fixed ? 0 : a.mob, wb = b.fixed ? 0 : b.mob;
    if (wa + wb <= 0) return 0;
    const da = -dir * moveAxis(ctx, a, horizontal, -dir * step * wa / (wa + wb)); // magnitude along push
    const db = dir * moveAxis(ctx, b, horizontal, dir * Math.max(0, step - da));
    // a body shoved into a neighbour loses its speed in that direction (calm: no ricochet)
    if (db > 0) { if (horizontal ? a.vx * dir > 0 : a.vy * dir > 0) { a.vx *= 0.5; a.vy *= 0.5; } }
    if (da > 0) { if (horizontal ? b.vx * dir < 0 : b.vy * dir < 0) { b.vx *= 0.5; b.vy *= 0.5; } }
    return da + db;
}

/**
 * Call once per tick after all pairs. A body shoved back and forth on one axis
 * (a crowded row against a wall) builds a bias against that axis, so its pairs
 * fan out along the other one. Biases decay when the fighting stops.
 */
export function endBody(s) {
    const fx = s.absX - Math.abs(s.netX), fy = s.absY - Math.abs(s.netY);
    s.biasX = Math.min(MAX_BIAS, s.biasX * 0.97 + fx * 3);
    s.biasY = Math.min(MAX_BIAS, s.biasY * 0.97 + fy * 3);
    if (s.biasX < 0.01) s.biasX = 0;
    if (s.biasY < 0.01) s.biasY = 0;
    s.absX = s.absY = s.netX = s.netY = 0;
}

export function endTick(bodies, n) {
    for (let i = 0; i < n; i++) if (bodies[i]) endBody(bodies[i]);
}

/**
 * Resolve one pair for this tick. Returns the total distance moved (0 when they are
 * clear, or both are fixed). Uses the axis of least penetration, falling back to the
 * other axis when walls block the first.
 */
export function resolvePair(ctx, a, b, dt) {
    const ox = penetration(a, b, true), oy = penetration(a, b, false);
    if (ox <= -ENGAGE_GAP || oy <= -ENGAGE_GAP) return 0;
    const first = ox + a.biasX + b.biasX <= oy + a.biasY + b.biasY;
    const p1 = first ? ox : oy, p2 = first ? oy : ox;
    let moved = pushAxis(ctx, a, b, first, p1, dt);
    if (lastStep > 0.2 && moved < 0.3 * lastStep) {
        moved += pushAxis(ctx, a, b, !first, p2, dt);
    }
    return moved;
}

/** Hard overlap test with no gap (what the debug snapshot counts). */
export function overlaps(a, b) {
    return penetration(a, b, true) > 0 && penetration(a, b, false) > 0;
}
