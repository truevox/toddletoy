import { sizes } from './DisplayScale.js';
import { defaultColor, toColorInt, lighten, palette } from './EffectColors.js';

/**
 * BurstPool - pooled, allocation-free-per-frame particle bursts.
 *
 * Pieces are reusable Images sharing a few small textures (made once). A
 * burst takes pieces from the pool and the pool's update() moves them; when
 * the burst ends they go back. The number of live pieces never exceeds
 * MAX_PIECES: the oldest burst is dropped to make room.
 */
export const MAX_PIECES = 120;
const MAX_RINGS = 12;
const TEX = 64;
const RING_TEX = 128;
const SPAWN_MS = 560;
const POP_MS = 440;
const REDUCED_MS = 400;
const G = 130;            // gravity, px/s^2 per unit k

function reducedMotion() {
    try {
        return Boolean(typeof window !== 'undefined' && window.matchMedia
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) { return false; }
}

const rand = (a, b) => a + Math.random() * (b - a);

export class BurstPool {
    constructor(scene) {
        this.scene = scene;
        this.free = { dot: [], star: [], diamond: [], ring: [] };
        this.all = new Set();
        this.bursts = [];
        this.pieceCount = 0;
        this.ringCount = 0;
        this.onUpdate = (time, delta) => this.update(time, delta);
        if (scene.events && scene.events.on) scene.events.on('update', this.onUpdate);
    }

    ensureTextures() {
        const { scene } = this;
        const make = (key, size, draw) => {
            if (scene.textures.exists(key)) return;
            const g = scene.add.graphics();
            draw(g);
            g.generateTexture(key, size, size);
            g.destroy();
        };
        make('particle', TEX, (g) => { g.fillStyle(0xffffff); g.fillCircle(TEX / 2, TEX / 2, TEX / 2); });
        make('fx-star', TEX, (g) => {
            g.fillStyle(0xffffff);
            const pts = [];
            for (let i = 0; i < 10; i++) {
                const r = (i % 2 ? 0.42 : 1) * TEX / 2, a = -Math.PI / 2 + i * Math.PI / 5;
                pts.push({ x: TEX / 2 + Math.cos(a) * r, y: TEX / 2 + Math.sin(a) * r });
            }
            g.fillPoints(pts, true);
        });
        make('fx-diamond', TEX, (g) => {
            g.fillStyle(0xffffff);
            g.fillPoints([{ x: TEX / 2, y: 2 }, { x: TEX - 2, y: TEX / 2 }, { x: TEX / 2, y: TEX - 2 }, { x: 2, y: TEX / 2 }], true);
        });
        make('fx-ring', RING_TEX, (g) => { g.lineStyle(4, 0xffffff, 1); g.strokeCircle(RING_TEX / 2, RING_TEX / 2, RING_TEX / 2 - 4); });
    }

    take(kind) {
        const list = this.free[kind];
        let img = list.pop();
        if (!img) {
            this.ensureTextures();
            const key = kind === 'dot' ? 'particle' : `fx-${kind}`;
            img = this.scene.add.image(0, 0, key);
            img.fx = { vx: 0, vy: 0, spin: 0, size: 0, a: 1 };
            img.kind = kind;
            this.all.add(img);
        }
        img.setVisible(true).setActive(true);
        return img;
    }

    give(img) {
        img.setVisible(false).setActive(false);
        this.free[img.kind].push(img);
    }

    dropOldest() {
        const b = this.bursts.shift();
        if (b) this.endBurst(b);
        return Boolean(b);
    }

    endBurst(b) {
        b.pieces.forEach((p) => this.give(p));
        if (b.ring) this.give(b.ring);
        this.pieceCount -= b.pieces.length;
        if (b.ring) this.ringCount -= 1;
    }

    liveCount() { return this.pieceCount + this.ringCount; }

    begin(x, y, opts, type, count) {
        if (!this.scene.add || !this.scene.add.image) return null;
        while (this.liveCount() + count + 1 > MAX_PIECES && this.dropOldest());
        while (this.ringCount + 1 > MAX_RINGS && this.dropOldest());
        const o = opts || {};
        const color = toColorInt(o.color) ?? defaultColor();
        return { type, x, y, age: 0, kind: o.kind, color, pal: palette(color), pieces: [], ring: null, k: sizes(this.scene).k };
    }

    addRing(b, tint) {
        b.ring = this.take('ring');
        b.ring.setTint(tint);
        this.ringCount += 1;
    }

    spawn(x, y, opts) {
        try {
            if (reducedMotion()) return this.reduced(x, y, opts, 'spawn');
            const n = 10 + Math.floor(Math.random() * 5);
            const b = this.begin(x, y, opts, 'spawn', n);
            if (!b) return;
            b.dur = SPAWN_MS;
            this.addRing(b, b.pal[1]);
            const shape = b.kind === 'shape';
            const rot = Math.random() * Math.PI * 2;
            for (let i = 0; i < n; i++) {
                const kind = shape ? (i % 2 ? 'star' : 'diamond') : 'dot';
                const p = this.take(kind);
                const a = rot + (i / n) * Math.PI * 2 + rand(-0.2, 0.2);
                Object.assign(p.fx, {
                    dx: Math.cos(a), dy: Math.sin(a), dist: rand(40, 78) * b.k,
                    spin: rand(-6, 6), size: (shape ? rand(7, 10) : rand(4.5, 7)) * b.k * 2,
                });
                p.setTint(b.pal[i % 3]);
                b.pieces.push(p);
            }
            this.pieceCount += n;
            this.bursts.push(b);
            this.step(b);
        } catch (e) { console.warn('Error creating spawn burst:', e); }
    }

    pop(x, y, opts) {
        try {
            if (reducedMotion()) return this.reduced(x, y, opts, 'pop');
            const n = 8 + Math.floor(Math.random() * 2);
            const b = this.begin(x, y, opts, 'pop', n);
            if (!b) return;
            b.dur = POP_MS;
            this.addRing(b, lighten(b.color, 0.75));
            const rot = Math.random() * Math.PI * 2;
            for (let i = 0; i < n; i++) {
                const p = this.take(i % 3 === 2 ? 'diamond' : 'dot');
                const a = rot + (i / n) * Math.PI * 2;
                Object.assign(p.fx, { dx: Math.cos(a), dy: Math.sin(a), dist: rand(26, 44) * b.k, spin: 0, size: rand(4, 6.5) * b.k * 2 });
                p.setTint(i % 2 ? lighten(b.color, 0.7) : b.color);
                b.pieces.push(p);
            }
            this.pieceCount += n;
            this.bursts.push(b);
            this.step(b);
        } catch (e) { console.warn('Error creating pop effect:', e); }
    }

    reduced(x, y, opts, type) {
        const b = this.begin(x, y, opts, type, 0);
        if (!b) return;
        b.dur = REDUCED_MS;
        b.reduced = true;
        this.addRing(b, b.pal[1]);
        this.bursts.push(b);
        this.step(b);
    }

    /** Place every piece of burst b for its current age. */
    step(b) {
        const u = Math.min(1, b.age / b.dur), t = b.age / 1000, k = b.k;
        const glyph = k * 64;
        if (b.ring) {
            let r, a;
            if (b.reduced) { r = glyph * 0.85; a = 0.7 * (1 - u); }
            else if (b.type === 'spawn') { const e = 1 - Math.pow(1 - u, 2.5); r = glyph * (0.55 + 0.8 * e); a = 0.65 * (1 - u); }
            else { const e = 1 - Math.pow(1 - Math.min(1, u / 0.5), 3); r = glyph * (0.45 + 0.7 * e); a = u < 0.3 ? 1 : Math.max(0, 1 - (u - 0.3) / 0.4); }
            b.ring.setPosition(b.x, b.y).setScale((2 * r) / RING_TEX).setAlpha(Math.max(0, a));
        }
        const r0 = glyph * (b.type === 'spawn' ? 0.62 : 0.55);
        const pop = b.type === 'pop';
        for (let i = 0; i < b.pieces.length; i++) {
            const p = b.pieces[i], f = p.fx;
            const e = 1 - Math.pow(1 - u, pop ? 3.5 : 2.2);
            const d = r0 + f.dist * e;
            const fall = pop ? 0 : 0.5 * G * k * t * t;
            const size = f.size * (pop ? 1 - u : 1 - Math.pow(u, 1.6));
            p.setPosition(b.x + f.dx * d, b.y + f.dy * d + fall)
                .setScale(Math.max(0.01, size / TEX))
                .setRotation(f.spin * t)
                .setAlpha(u < 0.45 ? 1 : Math.max(0, 1 - (u - 0.45) / 0.55));
        }
    }

    update(_time, delta) {
        if (!this.bursts.length) return;
        for (let i = this.bursts.length - 1; i >= 0; i--) {
            const b = this.bursts[i];
            b.age += delta;
            if (b.age >= b.dur) { this.bursts.splice(i, 1); this.endBurst(b); } else this.step(b);
        }
    }

    /** Destroy every image now; the pool refills lazily on the next burst. */
    clear() {
        this.all.forEach((img) => { try { img.destroy(); } catch (e) { /* gone */ } });
        this.all.clear();
        Object.values(this.free).forEach((l) => { l.length = 0; });
        this.bursts.length = 0;
        this.pieceCount = 0;
        this.ringCount = 0;
    }

    destroy() {
        this.clear();
        if (this.scene.events && this.scene.events.off) this.scene.events.off('update', this.onUpdate);
    }
}
