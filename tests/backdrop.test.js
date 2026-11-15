import { Backdrop, BACKDROP_DEPTH } from '../src/game/systems/Backdrop.js';
import {
    PALETTES, DEFAULT_PALETTE, BACKDROP_BASE_COLOR, MAX_LUMINANCE, MIN_LUMINANCE,
    worstCaseColours, relativeLuminance, contrastWithWhite, hexToRgb, shiftHue,
} from '../src/game/systems/BackdropPalettes.js';

function makeImage(key) {
    const img = {
        key, x: 0, y: 0, alpha: 1, depth: 0, destroyed: false, displayWidth: 0, displayHeight: 0, originX: 0.5, originY: 0.5,
        setDepth(d) { this.depth = d; return this; },
        setScrollFactor() { return this; },
        setTint(t) { this.tint = t; return this; },
        setAlpha(a) { this.alpha = a; return this; },
        setOrigin(x, y) { this.originX = x; this.originY = y; return this; },
        setPosition(x, y) { this.x = x; this.y = y; return this; },
        setDisplaySize(w, h) { this.displayWidth = w; this.displayHeight = h; return this; },
        destroy() { this.destroyed = true; },
    };
    return img;
}

function makeScene(width = 800, height = 600) {
    const textures = new Map();
    const listeners = {};
    const scene = {
        images: [],
        tweenList: [],
        scale: {
            width, height,
            on: jest.fn((e, fn) => { (listeners[e] = listeners[e] || []).push(fn); }),
            off: jest.fn((e, fn) => { listeners[e] = (listeners[e] || []).filter((f) => f !== fn); }),
        },
        events: { once: jest.fn(), off: jest.fn() },
        textures: {
            exists: (k) => textures.has(k),
            remove: (k) => textures.delete(k),
            createCanvas: jest.fn((k) => {
                if (textures.has(k)) throw new Error(`Texture key already in use: ${k}`);
                textures.set(k, true);
                const grad = { addColorStop: jest.fn() };
                return {
                    refresh: jest.fn(),
                    getContext: () => ({
                        createLinearGradient: () => grad, createRadialGradient: () => grad,
                        fillRect: jest.fn(),
                    }),
                };
            }),
        },
        add: { image: jest.fn((x, y, key) => { const i = makeImage(key); scene.images.push(i); return i; }) },
        tweens: {
            add: jest.fn((cfg) => { const t = { cfg, removed: false, remove() { this.removed = true; } }; scene.tweenList.push(t); return t; }),
        },
    };
    scene.textureKeys = () => [...textures.keys()];
    scene.emitResize = (w, h) => { scene.scale.width = w; scene.scale.height = h; (listeners.resize || []).forEach((f) => f({ width: w, height: h })); };
    return scene;
}

describe('Backdrop palettes', () => {
    test.each(Object.keys(PALETTES))('%s keeps every colour inside the luminance bounds', (name) => {
        const colours = worstCaseColours(PALETTES[name]);
        expect(colours.length).toBeGreaterThan(10);
        for (const { what, rgb } of colours) {
            const L = relativeLuminance(rgb);
            expect({ what, ok: L <= MAX_LUMINANCE }).toEqual({ what, ok: true });
            expect({ what, ok: L >= MIN_LUMINANCE }).toEqual({ what, ok: true });
            expect(contrastWithWhite(rgb)).toBeGreaterThanOrEqual(4.5);
        }
    });

    test.each(Object.keys(PALETTES))('%s has 5-8 blobs and sorted gradient stops', (name) => {
        const p = PALETTES[name];
        expect(p.blobs.length).toBeGreaterThanOrEqual(5);
        expect(p.blobs.length).toBeLessThanOrEqual(8);
        expect(p.stops.length).toBeGreaterThanOrEqual(3);
        expect(p.stops.map((s) => s[0])).toEqual([...p.stops.map((s) => s[0])].sort((a, b) => a - b));
    });

    test('base colour is the default gradient middle (no flash before the scene draws)', () => {
        expect(BACKDROP_BASE_COLOR).toBe(PALETTES[DEFAULT_PALETTE].base);
        expect(PALETTES[DEFAULT_PALETTE].stops.map((s) => s[1])).toContain(BACKDROP_BASE_COLOR);
    });

    test('shiftHue keeps white/grey and rotates hue', () => {
        expect(shiftHue(0x808080, 90)).toBe(0x808080);
        expect(hexToRgb(shiftHue(0xff0000, 120))).toEqual([0, 255, 0]);
    });
});

describe('Backdrop behaviour', () => {
    test('creates under everything and covers the whole canvas', () => {
        const scene = makeScene(800, 600);
        const b = new Backdrop(scene, { reducedMotion: false }).create();
        const [grad, alt] = scene.images;
        expect(Math.max(...scene.images.map((i) => i.depth))).toBeLessThan(-9000);
        expect(grad.depth).toBe(BACKDROP_DEPTH);
        for (const g of [grad, alt]) {
            expect([g.x, g.y, g.displayWidth, g.displayHeight]).toEqual([0, 0, 800, 600]);
        }
        b.destroy();
    });

    test.each([[390, 844], [844, 390], [1920, 1080], [3440, 1440]])('resize to %ix%i covers the screen again', (w, h) => {
        const scene = makeScene(800, 600);
        const b = new Backdrop(scene, { reducedMotion: false }).create();
        scene.emitResize(w, h);
        const [grad, alt] = scene.images;
        for (const g of [grad, alt]) expect([g.displayWidth, g.displayHeight]).toEqual([w, h]);
        // blobs are huge relative to the screen and centred inside it
        for (const img of scene.images.slice(2)) {
            expect(img.displayWidth).toBeGreaterThan(Math.max(w, h) * 0.8);
            expect(img.x).toBeGreaterThan(-w * 0.5);
            expect(img.x).toBeLessThan(w * 1.5);
        }
        b.resize(w, h);
        b.destroy();
    });

    test('resize replaces running tweens instead of stacking them', () => {
        const scene = makeScene();
        new Backdrop(scene, { reducedMotion: false }).create();
        const before = scene.tweenList.length;
        scene.emitResize(500, 900);
        const alive = scene.tweenList.filter((t) => !t.removed).length;
        expect(alive).toBe(before);
    });

    test('reduced motion creates no tweens', () => {
        const scene = makeScene();
        const b = new Backdrop(scene, { reducedMotion: true }).create();
        expect(scene.tweens.add).not.toHaveBeenCalled();
        scene.emitResize(400, 700);
        expect(scene.tweens.add).not.toHaveBeenCalled();
        expect(scene.images.length).toBe(2 + PALETTES[DEFAULT_PALETTE].blobs.length);
        b.destroy();
    });

    test('honours prefers-reduced-motion from the browser by default', () => {
        const original = window.matchMedia;
        window.matchMedia = jest.fn(() => ({ matches: true }));
        try {
            const scene = makeScene();
            new Backdrop(scene).create();
            expect(scene.tweens.add).not.toHaveBeenCalled();
        } finally {
            window.matchMedia = original;
        }
    });

    test('destroy releases images, tweens, textures and listeners', () => {
        const scene = makeScene();
        const b = new Backdrop(scene, { reducedMotion: false }).create();
        expect(scene.textureKeys().length).toBe(3);
        expect(scene.tweenList.length).toBeGreaterThan(0);
        b.destroy();
        expect(scene.images.every((i) => i.destroyed)).toBe(true);
        expect(scene.tweenList.every((t) => t.removed)).toBe(true);
        expect(scene.textureKeys()).toEqual([]);
        expect(scene.scale.off).toHaveBeenCalledWith('resize', b.onResize);
        b.destroy(); // idempotent
        scene.emitResize(100, 100); // no listener left, must not throw
    });

    test('creating twice (scene restart) does not collide on texture keys', () => {
        const scene = makeScene();
        const first = new Backdrop(scene).create();
        expect(() => new Backdrop(scene).create()).not.toThrow();
        first.destroy();
        expect(scene.textureKeys().length).toBe(3);
    });

    test('shuts down with the scene', () => {
        const scene = makeScene();
        const b = new Backdrop(scene).create();
        expect(scene.events.once).toHaveBeenCalledWith('shutdown', b.onShutdown);
        b.onShutdown();
        expect(scene.textureKeys()).toEqual([]);
    });

    test('unknown palette falls back to the default', () => {
        expect(new Backdrop(makeScene(), { palette: 'nope' }).palette.name).toBe(DEFAULT_PALETTE);
        expect(new Backdrop(makeScene(), { palette: 'dawn' }).palette.name).toBe('dawn');
    });
});
