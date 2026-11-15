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
        setScale(x, y) { this.scaleX = x; this.scaleY = y; return this; },
        resize(w, h) { this.rtWidth = w; this.rtHeight = h; return this; },
        beginDraw() { this.draws = (this.draws || 0) + 1; },
        batchDraw(entries) { this.lastEntries = entries; },
        endDraw() {},
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
        events: {
            once: jest.fn(),
            on: jest.fn((e, fn) => { (listeners['ev:' + e] = listeners['ev:' + e] || []).push(fn); }),
            off: jest.fn((e, fn) => { listeners['ev:' + e] = (listeners['ev:' + e] || []).filter((f) => f !== fn); }),
        },
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
        add: { renderTexture: jest.fn((x, y, w, h) => { const i = makeImage('rt'); i.rtWidth = w; i.rtHeight = h; scene.layers.push(i); return i; }) },
        make: { image: jest.fn(({ key }) => { const i = makeImage(key); scene.images.push(i); return i; }) },
        layers: [],
        tweens: {
            add: jest.fn((cfg) => { const t = { cfg, removed: false, remove() { this.removed = true; } }; scene.tweenList.push(t); return t; }),
        },
    };
    scene.textureKeys = () => [...textures.keys()];
    scene.emitUpdate = (delta) => (listeners['ev:update'] || []).forEach((f) => f(0, delta));
    scene.updateListeners = () => (listeners['ev:update'] || []).length;
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
    const blobCount = PALETTES[DEFAULT_PALETTE].blobs.length;

    test('is one layer far below everything, stretched over the whole canvas', () => {
        const scene = makeScene(800, 600);
        const b = new Backdrop(scene, { reducedMotion: false }).create();
        const layer = scene.layers[0];
        expect(scene.layers.length).toBe(1);
        expect(layer.depth).toBe(BACKDROP_DEPTH);
        expect([layer.originX, layer.originY]).toEqual([0, 0]);
        // covers the canvas (a few px of overscan on each side is fine)
        expect(layer.x).toBeLessThanOrEqual(0);
        expect(layer.y).toBeLessThanOrEqual(0);
        expect(layer.x + layer.rtWidth * layer.scaleX).toBeGreaterThanOrEqual(800);
        expect(layer.y + layer.rtHeight * layer.scaleY).toBeGreaterThanOrEqual(600);
        // the layer is a fraction of the screen so the GPU fills the screen once
        expect(layer.rtWidth * layer.rtHeight).toBeLessThan(800 * 600 / 8);
        b.destroy();
    });

    test('draws the gradient first (opaque cover), then crossfade partner, then every blob', () => {
        const scene = makeScene();
        new Backdrop(scene, { reducedMotion: true }).create();
        const entries = scene.layers[0].lastEntries;
        expect(entries.length).toBe(2 + blobCount);
        expect(entries[0].key).toMatch(/grad$/);
        expect([entries[0].x, entries[0].y]).toEqual([0, 0]);
        expect(entries[0].displayWidth).toBe(scene.layers[0].rtWidth);
        expect(entries[0].displayHeight).toBe(scene.layers[0].rtHeight);
        expect(entries[1].alpha).toBe(0);
    });

    test.each([[390, 844], [844, 390], [1920, 1080], [3440, 1440]])('resize to %ix%i covers the screen again', (w, h) => {
        const scene = makeScene(800, 600);
        const b = new Backdrop(scene, { reducedMotion: false }).create();
        scene.emitResize(w, h);
        const layer = scene.layers[0];
        expect(layer.x).toBeLessThanOrEqual(0);
        expect(layer.y).toBeLessThanOrEqual(0);
        expect(layer.x + layer.rtWidth * layer.scaleX).toBeGreaterThanOrEqual(w);
        expect(layer.y + layer.rtHeight * layer.scaleY).toBeGreaterThanOrEqual(h);
        expect(scene.layers.length).toBe(1);
        const [grad] = layer.lastEntries;
        expect([grad.displayWidth, grad.displayHeight]).toEqual([layer.rtWidth, layer.rtHeight]);
        // blobs are huge relative to the layer and centred near it
        for (const img of scene.images.slice(2)) {
            expect(img.displayWidth).toBeGreaterThan(Math.max(layer.rtWidth, layer.rtHeight) * 0.8);
            expect(img.x).toBeGreaterThan(-layer.rtWidth * 0.5);
            expect(img.x).toBeLessThan(layer.rtWidth * 1.5);
        }
        b.resize(w, h);
        b.destroy();
    });

    test('resize replaces running tweens and update listeners instead of stacking them', () => {
        const scene = makeScene();
        new Backdrop(scene, { reducedMotion: false }).create();
        const before = scene.tweenList.length;
        scene.emitResize(500, 900);
        scene.emitResize(900, 500);
        expect(scene.tweenList.filter((t) => !t.removed).length).toBe(before);
        expect(scene.updateListeners()).toBe(1);
    });

    test('redraws are throttled while animating', () => {
        const scene = makeScene();
        new Backdrop(scene, { reducedMotion: false }).create();
        const layer = scene.layers[0];
        const start = layer.draws;
        for (let i = 0; i < 10; i++) scene.emitUpdate(16); // 160 ms
        expect(layer.draws - start).toBeGreaterThanOrEqual(2);
        expect(layer.draws - start).toBeLessThanOrEqual(4);
    });

    test('reduced motion: drawn once, no tweens, no update listener', () => {
        const scene = makeScene();
        const b = new Backdrop(scene, { reducedMotion: true }).create();
        expect(scene.tweens.add).not.toHaveBeenCalled();
        expect(scene.updateListeners()).toBe(0);
        expect(scene.layers[0].draws).toBe(1);
        scene.emitResize(400, 700);
        expect(scene.tweens.add).not.toHaveBeenCalled();
        expect(scene.updateListeners()).toBe(0);
        expect(scene.images.length).toBe(2 + blobCount);
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

    test('destroy releases images, layer, tweens, textures and listeners', () => {
        const scene = makeScene();
        const b = new Backdrop(scene, { reducedMotion: false }).create();
        expect(scene.textureKeys().length).toBe(3);
        expect(scene.tweenList.length).toBeGreaterThan(0);
        b.destroy();
        expect(scene.images.every((i) => i.destroyed)).toBe(true);
        expect(scene.layers.every((i) => i.destroyed)).toBe(true);
        expect(scene.tweenList.every((t) => t.removed)).toBe(true);
        expect(scene.textureKeys()).toEqual([]);
        expect(scene.updateListeners()).toBe(0);
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
