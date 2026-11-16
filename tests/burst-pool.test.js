/**
 * @jest-environment jsdom
 */
import { BurstPool, MAX_PIECES } from '../src/game/systems/BurstPool.js';
import { EffectRenderer } from '../src/game/systems/EffectRenderer.js';
import { ParticleManager } from '../src/game/systems/ParticleManager.js';

function makeImage() {
    const img = {
        tint: null, visible: false, destroyed: false, x: 0, y: 0, alpha: 1,
        setTint(c) { this.tint = c; return this; },
        setPosition(x, y) { this.x = x; this.y = y; return this; },
        setScale() { return this; }, setRotation() { return this; },
        setAlpha(a) { this.alpha = a; return this; },
        setVisible(v) { this.visible = v; return this; },
        setActive() { return this; }, setDepth() { return this; },
        destroy() { this.destroyed = true; },
    };
    return img;
}

function makeScene() {
    const images = [];
    const handlers = {};
    const tex = new Set();
    return {
        images, handlers,
        scale: { width: 800, height: 600 },
        textures: { exists: (k) => tex.has(k) },
        add: {
            image: jest.fn(() => { const i = makeImage(); images.push(i); return i; }),
            graphics: () => ({
                fillStyle() {}, fillCircle() {}, fillStar() {}, fillPoints() {}, lineStyle() {},
                strokeCircle() {}, beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, fillPath() {},
                generateTexture: (k) => tex.add(k), destroy() {},
            }),
            particles: jest.fn(),
        },
        events: { on: (e, f) => { handlers[e] = f; }, off: jest.fn() },
        tweens: { add: jest.fn() },
        time: { addEvent: jest.fn(), delayedCall: jest.fn() },
    };
}

const live = (scene) => scene.images.filter((i) => i.visible && !i.destroyed).length;

describe('BurstPool', () => {
    beforeEach(() => { window.matchMedia = undefined; });

    test('spawn burst uses the given colour (and lighter tints) for its pieces', () => {
        const scene = makeScene();
        const pool = new BurstPool(scene);
        pool.spawn(100, 100, { color: 0x123456, kind: 'shape' });
        const tints = new Set(scene.images.filter((i) => i.visible).map((i) => i.tint));
        expect(tints.has(0x123456)).toBe(true);
        expect(tints.size).toBeGreaterThan(1);
        expect(pool.liveCount()).toBeGreaterThanOrEqual(10);
        expect(pool.liveCount()).toBeLessThanOrEqual(15);
    });

    test('works with no opts', () => {
        const pool = new BurstPool(makeScene());
        expect(() => { pool.spawn(1, 2); pool.pop(1, 2); }).not.toThrow();
    });

    test('pop has 8-10 pieces and ends within 500 ms', () => {
        const scene = makeScene();
        const pool = new BurstPool(scene);
        pool.pop(50, 50, { color: 0xff0000 });
        expect(pool.liveCount()).toBeGreaterThanOrEqual(8);
        expect(pool.liveCount()).toBeLessThanOrEqual(11); // pieces + ring
        pool.update(0, 250);
        expect(pool.liveCount()).toBeGreaterThan(0);
        pool.update(0, 260);
        expect(pool.liveCount()).toBe(0);
    });

    test('spawn burst is over within 600 ms and pieces return to the pool', () => {
        const scene = makeScene();
        const pool = new BurstPool(scene);
        pool.spawn(0, 0);
        pool.update(0, 300);
        expect(pool.liveCount()).toBeGreaterThan(0);
        pool.update(0, 301);
        expect(pool.liveCount()).toBe(0);
        const created = scene.images.length;
        pool.spawn(0, 0);
        expect(scene.images.length).toBeLessThanOrEqual(created + 4); // reused, at most a few extra
    });

    test('piece cap holds under 30 rapid bursts, dropping the oldest', () => {
        const scene = makeScene();
        const pool = new BurstPool(scene);
        for (let i = 0; i < 30; i++) {
            pool.spawn(i, i);
            expect(pool.liveCount()).toBeLessThanOrEqual(MAX_PIECES);
            if (i % 2) pool.pop(i, i);
        }
        expect(scene.images.length).toBeLessThanOrEqual(MAX_PIECES + 16);
        expect(live(scene)).toBeLessThanOrEqual(MAX_PIECES);
    });

    test('clear() leaves zero live pieces and destroys the images', () => {
        const scene = makeScene();
        const pool = new BurstPool(scene);
        pool.spawn(0, 0); pool.pop(5, 5);
        pool.clear();
        expect(pool.liveCount()).toBe(0);
        expect(live(scene)).toBe(0);
        expect(scene.images.every((i) => i.destroyed)).toBe(true);
        pool.spawn(0, 0); // still usable afterwards
        expect(pool.liveCount()).toBeGreaterThan(0);
    });

    test('reduced motion draws a single fading ring', () => {
        window.matchMedia = jest.fn(() => ({ matches: true }));
        const scene = makeScene();
        const pool = new BurstPool(scene);
        pool.spawn(0, 0, { color: 0x00ff00 });
        expect(pool.liveCount()).toBe(1);
        pool.pop(0, 0);
        expect(pool.liveCount()).toBe(2);
    });
});

describe('EffectRenderer / ParticleManager compatibility', () => {
    beforeEach(() => { window.matchMedia = undefined; });

    test('positional signatures still work, opts are optional and forwarded', () => {
        const scene = makeScene();
        const er = new EffectRenderer(scene);
        er.createSpawnBurst(10, 10);
        er.createSpawnBurst(10, 10, { color: 0xabcdef, kind: 'letter' });
        expect(scene.images.some((i) => i.visible && i.tint === 0xabcdef)).toBe(true);
        er.createCleanupParticleEffect(10, 10);
        er.clear();
        er.createCleanupParticleEffect(10, 10, { color: 0xabcdef });
        expect(scene.images.some((i) => i.visible && !i.destroyed && i.tint === 0xabcdef)).toBe(true);
        er.destroy();
    });

    test('ParticleManager.clearTransientEffects and destroy remove everything', () => {
        const scene = makeScene();
        const pm = new ParticleManager(scene);
        pm.createSpawnBurst(1, 1, { color: 0x112233 });
        pm.createCleanupParticleEffect(2, 2, { color: 0x112233 });
        expect(live(scene)).toBeGreaterThan(0);
        pm.clearTransientEffects();
        expect(live(scene)).toBe(0);
        expect(pm.effectRenderer.pool.liveCount()).toBe(0);
        pm.createSpawnBurst(1, 1);
        pm.destroy();
        expect(live(scene)).toBe(0);
        expect(scene.events.off).toHaveBeenCalled();
    });
});
