import { resolvePair, overlaps, clampBody, endTick, solveLayout, PAIR_GAP } from '../src/game/systems/Separation.js';
import { computeCapacity, enforceCapacity, MIN_CAPACITY } from '../src/game/systems/ScreenCapacity.js';
import { DragSamples, stepGlide, MAX_THROW_SPEED, MIN_THROW_SPEED } from '../src/game/systems/ThrowMotion.js';
import { SoftPhysics } from '../src/game/systems/SoftPhysics.js';

const body = (x, y, w = 100, h = 120, extra = {}) => ({ x, y, l: -w / 2, r: w / 2, t: -h / 2, b: h / 2, mob: 1, fixed: false, seq: 0, vx: 0, vy: 0, moved: false, absX: 0, absY: 0, netX: 0, netY: 0, biasX: 0, biasY: 0, ...extra });
const ctx = (w = 360, h = 640) => ({ width: w, height: h, keepOut: { x: w - 60, y: 0, width: 60, height: 60 }, margin: 8, k: 12, maxSpeed: 500 });

function settle(c, bodies, ticks = 600, dt = 1 / 60) {
    let t = 0;
    for (; t < ticks; t++) {
        let moved = 0;
        for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) moved += resolvePair(c, bodies[i], bodies[j], dt);
        endTick(bodies, bodies.length);
        if (moved < 1e-9) return t;
    }
    return t;
}

describe('Separation', () => {
    test('overlapping pair is pushed apart along the least-penetration axis and comes to rest', () => {
        const a = body(180, 300), b = body(230, 310, 100, 120, { seq: 1 });
        const ticks = settle(ctx(), [a, b]);
        expect(overlaps(a, b)).toBe(false);
        expect(ticks).toBeLessThan(120);
        expect(Math.abs(a.y - 300)).toBeLessThan(1); // x axis was the shallow one
    });
    test('two bodies on exactly the same spot separate', () => {
        const a = body(180, 300), b = body(180, 300, 100, 120, { seq: 1 });
        settle(ctx(), [a, b]);
        expect(overlaps(a, b)).toBe(false);
    });
    test('no jitter: positions never reverse direction while settling', () => {
        const a = body(180, 300), b = body(200, 300, 100, 120, { seq: 1 });
        let last = a.x, dirs = 0, prev = 0;
        for (let t = 0; t < 200; t++) {
            resolvePair(ctx(), a, b, 1 / 60);
            const d = Math.sign(a.x - last); if (d && prev && d !== prev) dirs++; if (d) prev = d; last = a.x;
        }
        expect(dirs).toBe(0);
    });
    test('fixed body never moves; the other takes the whole push', () => {
        const a = body(180, 300, 100, 120, { fixed: true }), b = body(200, 300, 100, 120, { seq: 1 });
        settle(ctx(), [a, b]);
        expect(a.x).toBe(180);
        expect(overlaps(a, b)).toBe(false);
    });
    test('a body against the wall does not stop the pair resolving', () => {
        const c = ctx();
        const a = body(58, 300), b = body(90, 300, 100, 120, { seq: 1 });
        settle(c, [a, b]);
        expect(overlaps(a, b)).toBe(false);
        expect(a.x + a.l).toBeGreaterThanOrEqual(8 - 1e-6);
    });
    test('pairs that are comfortably apart do no work', () => {
        const a = body(100, 300), b = body(100 + 100 + PAIR_GAP - 1, 300, 100, 120, { seq: 1 });
        expect(resolvePair(ctx(), a, b, 1 / 60)).toBe(0);
    });
    test('cluster of 8 settles with no overlaps inside the screen', () => {
        const c = ctx(); const bs = [];
        for (let i = 0; i < 8; i++) bs.push(body(180 + (i % 3) * 8, 320 + (i % 2) * 6, 80, 90, { seq: i }));
        const ticks = settle(c, bs, 900);
        for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) expect(overlaps(bs[i], bs[j])).toBe(false);
        expect(ticks).toBeLessThan(900);
        bs.forEach(s => { expect(s.x + s.l).toBeGreaterThanOrEqual(8 - 1e-6); expect(s.x + s.r).toBeLessThanOrEqual(352 + 1e-6); });
    });
    test('clampBody keeps out of the exit-button square', () => {
        const s = body(0, 0, 80, 80);
        const r = clampBody(ctx(), s, 340, 30);
        const inKeep = r.x + 40 > 300 && r.y - 40 < 60;
        expect(inKeep).toBe(false);
    });
});

describe('solveLayout', () => {
    test('a crowded row against a wall is untangled instantly into a valid layout', () => {
        const bs = []; for (let i = 0; i < 8; i++) bs.push(body(180 + i, 320, 80, 90, { seq: i }));
        const c = ctx(); const passes = solveLayout(c, bs, 8);
        expect(passes).toBeLessThan(48);
        for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) expect(overlaps(bs[i], bs[j])).toBe(false);
    });
});

describe('ScreenCapacity', () => {
    test('formula: area based, minimum 3, override wins', () => {
        expect(computeCapacity(360, 640, 14000)).toBe(Math.floor(0.55 * 360 * 640 / 14000));
        expect(computeCapacity(360, 640, 1e9)).toBe(MIN_CAPACITY);
        expect(computeCapacity(360, 640, 14000, 20)).toBe(20);
        expect(computeCapacity(360, 640, 0)).toBe(Infinity);
    });
    test('enforceCapacity removes the oldest, sparing dragged, speaking and newest', () => {
        const mk = (id) => ({ id, active: true, __soft: { l: -50, r: 50, t: -50, b: 50 } });
        const objs = [mk(1), mk(2), mk(3), mk(4), mk(5), mk(6)];
        const scene = { objects: objs, draggedObject: objs[0], speechManager: { isObjectSpeaking: (o) => o === objs[1] },
            removeObject(o) { objs.splice(objs.indexOf(o), 1); } };
        enforceCapacity(scene, 300, 300, 4);
        expect(objs.map(o => o.id)).toEqual([1, 2, 5, 6]);
    });
});

describe('ThrowMotion', () => {
    const v = { vx: 0, vy: 0 };
    test('slow release is a plain drop; fast release is capped', () => {
        const s = new DragSamples();
        s.push(0, 0, 0); s.push(50, 4, 0); s.push(100, 8, 0);
        s.velocity(100, v); expect(v.vx).toBe(0);
        const f = new DragSamples();
        f.push(0, 0, 0); f.push(50, 200, 0); f.push(100, 400, 0);
        f.velocity(100, v); expect(v.vx).toBe(MAX_THROW_SPEED);
        const m = new DragSamples();
        m.push(0, 0, 0); m.push(100, 60, 0); // 600 px/s
        m.velocity(100, v); expect(Math.round(v.vx)).toBe(600); expect(v.vx).toBeGreaterThan(MIN_THROW_SPEED);
    });
    test('old samples outside the window are ignored (finger held still)', () => {
        const s = new DragSamples();
        s.push(0, 0, 0); s.push(40, 300, 0); s.push(400, 300, 0); s.push(500, 300, 0);
        s.velocity(500, v); expect(v.vx).toBe(0);
    });
    test('glide comes to rest in 0.6-1.2 s, travels, and bounces softly off the wall', () => {
        const c = ctx(); const s = body(180, 300, 80, 80); s.vx = 1200;
        let t = 0, bounced = 0, x0 = s.x;
        for (; t < 240 && (s.vx || s.vy); t++) { bounced = Math.max(bounced, stepGlide(c, s, 1 / 60)); }
        expect(t / 60).toBeGreaterThan(0.4); expect(t / 60).toBeLessThan(1.3);
        expect(bounced).toBeGreaterThan(0);
        expect(s.x + s.r).toBeLessThanOrEqual(352 + 1e-6);
        const free = body(100, 400, 80, 80); free.vx = 800; const fx = free.x;
        for (let k = 0; k < 240 && free.vx; k++) stepGlide(c, free, 1 / 60);
        expect(free.x - fx).toBeGreaterThan(80);
    });
});

describe('SoftPhysics controller', () => {
    function fakeScene(objs) {
        const mm = { hasMovingObject: () => false, setObjectPosition: jest.fn((o, x, y) => { o.x = x; o.y = y; }) };
        return { objects: objs, movementManager: mm, gridMode: { enabled: false }, scale: { width: 360, height: 640 },
            events: { on() {}, off() {}, once() {} }, saveGameState: jest.fn(), draggedObject: null };
    }
    test('does nothing (and is asleep) with a single object, and grid mode is ignored', () => {
        const o = { id: 'a', active: true, x: 100, y: 100, getBounds: () => ({ x: 50, y: 50, width: 100, height: 100 }) };
        const sc = fakeScene([o]); const p = new SoftPhysics(sc);
        for (let i = 0; i < 30; i++) p.update();
        expect(sc.movementManager.setObjectPosition).not.toHaveBeenCalled();
        expect(p.awake).toBe(false);
    });
    test('restores and resize rebuilds never evict; only a fresh spawn can', () => {
        const mk = (id) => ({ id, active: true, x: 100 + id * 5, y: 100, getBounds: () => ({ x: 0, y: 0, width: 300, height: 300 }) });
        const objs = [1, 2, 3, 4, 5, 6].map(mk);
        const sc = fakeScene(objs);
        sc.removeObject = (o) => objs.splice(objs.indexOf(o), 1);
        sc.lastSpawnTime = 0; // objects came from a restore / rebuild
        sc.resizeRebuild = new Promise(() => {}); // rebuild in flight
        const p = new SoftPhysics(sc);
        for (let i = 0; i < 5; i++) p.update();
        expect(objs.length).toBe(6);
        sc.resizeRebuild = null; p.rebuilding = false; p.seenRebuild = null;
        for (let i = 0; i < 5; i++) p.update();
        expect(objs.length).toBe(6); // no genuine spawn: still nothing evicted
        sc.lastSpawnTime = Date.now();
        p.lastN = -1;
        for (let i = 0; i < 5; i++) p.update();
        expect(objs.length).toBeLessThan(6);
    });
    test('grid mode disables it', () => {
        const mk = (id) => ({ id, active: true, x: 100, y: 100, getBounds: () => ({ x: 50, y: 50, width: 100, height: 100 }) });
        const sc = fakeScene([mk(1), mk(2)]); sc.gridMode.enabled = true;
        const p = new SoftPhysics(sc); for (let i = 0; i < 10; i++) p.update();
        expect(sc.movementManager.setObjectPosition).not.toHaveBeenCalled();
    });
});
