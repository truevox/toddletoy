/**
 * FreeSpot - for a body the pairwise pushes cannot untangle (a crowded row against
 * a wall), find the nearest anchor position where it clears every other body.
 * Coarse grid scan; runs rarely and allocates nothing (result goes into `out`).
 */
import { clampBody, PAIR_GAP } from './Separation.js';

const STEP = 12;

/** Returns true and fills out.x/out.y when a free spot exists. `bodies[i].__soft`-style bodies via getBody(i). */
export function findFreeSpot(ctx, self, others, nOthers, out) {
    const gap = PAIR_GAP * 0.75;
    let best = Infinity, found = false;
    const x0 = ctx.margin - self.l, x1 = ctx.width - ctx.margin - self.r;
    const y0 = ctx.margin - self.t, y1 = ctx.height - ctx.margin - self.b;
    if (x1 < x0 || y1 < y0) return false;
    for (let y = y0; y <= y1 + 0.001; y += STEP) {
        for (let x = x0; x <= x1 + 0.001; x += STEP) {
            const d = (x - self.x) * (x - self.x) + (y - self.y) * (y - self.y);
            if (d >= best) continue;
            const c = clampBody(ctx, self, x, y);
            if (Math.abs(c.x - x) > 0.5 || Math.abs(c.y - y) > 0.5) continue;
            let free = true;
            for (let i = 0; i < nOthers && free; i++) {
                const o = others[i];
                if (o === self) continue;
                if (x + self.l < o.x + o.r + gap && o.x + o.l < x + self.r + gap &&
                    y + self.t < o.y + o.b + gap && o.y + o.t < y + self.b + gap) free = false;
            }
            if (free) { best = d; out.x = x; out.y = y; found = true; }
        }
    }
    return found;
}
