/**
 * MotionGhosts - short-lived pop-out animations for removed objects.
 * A removed object's display objects are handed over here, animated
 * (swell, shrink, float up, fade) and destroyed. clear() destroys at once.
 */
import { newPose, ghostPose, GHOST_MS, GHOST_REDUCED_MS } from './MotionMath.js';

function snapshot(item) {
    return {
        go: item,
        x: item.x, y: item.y,
        sx: item.scaleX ?? 1, sy: item.scaleY ?? 1,
        a: item.alpha ?? 1,
        // centre offset from x (Text captions are left-origin)
        cxOff: item.width && item.originX !== undefined ? (0.5 - item.originX) * item.width : 0
    };
}

export class MotionGhosts {
    constructor() {
        this.ghosts = [];
        this.pose = newPose();
    }

    get count() { return this.ghosts.length; }

    /** @param {Array} items display objects; items[0] is the glyph. */
    add(items, size, reduced) {
        const snaps = [];
        for (const it of items) {
            if (!it) continue;
            if (typeof it.setActive === 'function') it.setActive(false);
            if (typeof it.disableInteractive === 'function') it.disableInteractive();
            snaps.push(snapshot(it));
        }
        if (snaps.length === 0) return;
        this.ghosts.push({ items: snaps, t: 0, size: size || 60, reduced, dur: reduced ? GHOST_REDUCED_MS : GHOST_MS });
    }

    update(dtMs) {
        for (let i = this.ghosts.length - 1; i >= 0; i--) {
            const g = this.ghosts[i];
            g.t += dtMs;
            if (g.t >= g.dur) {
                this.destroyGhost(g);
                this.ghosts.splice(i, 1);
                continue;
            }
            ghostPose(g.t / g.dur, g.reduced, this.pose);
            const p = this.pose;
            for (const s of g.items) {
                const go = s.go;
                if (go.active === undefined && !go.setPosition && !go.destroy) continue;
                go.scaleX = s.sx * p.sx;
                go.scaleY = s.sy * p.sy;
                const centreX = s.x + s.cxOff * s.sx;
                go.x = centreX - s.cxOff * go.scaleX;
                go.y = s.y - p.lift * g.size;
                go.alpha = s.a * p.alpha;
            }
        }
    }

    destroyGhost(g) {
        for (const s of g.items) {
            try { if (s.go && s.go.destroy) s.go.destroy(); } catch (e) { /* already gone */ }
        }
    }

    clear() {
        this.ghosts.forEach(g => this.destroyGhost(g));
        this.ghosts.length = 0;
    }
}
