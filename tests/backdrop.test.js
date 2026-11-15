/**
 * @jest-environment jsdom
 */
import { Backdrop, BACKDROP_CLASS, REDRAW_MS, gradientCss, blobState, hueMix } from '../src/game/systems/Backdrop.js';
import {
    PALETTES, DEFAULT_PALETTE, BACKDROP_BASE_COLOR, MAX_LUMINANCE, MIN_LUMINANCE,
    worstCaseColours, relativeLuminance, contrastWithWhite, hexToRgb, shiftHue,
} from '../src/game/systems/BackdropPalettes.js';

function fakeContext() {
    const calls = [];
    const grad = { addColorStop: jest.fn() };
    return {
        calls, globalAlpha: 1, fillStyle: null,
        createLinearGradient: jest.fn(() => grad), createRadialGradient: jest.fn(() => grad),
        fillRect(...a) { calls.push({ op: 'fillRect', alpha: this.globalAlpha, a }); },
        drawImage(img, ...a) { calls.push({ op: 'drawImage', alpha: this.globalAlpha, a }); },
    };
}

let contexts;
beforeEach(() => {
    contexts = new Map();
    // jsdom has no 2D canvas: give every canvas a recording fake
    HTMLCanvasElement.prototype.getContext = function () {
        if (!contexts.has(this)) contexts.set(this, fakeContext());
        return contexts.get(this);
    };
});

function makeScene(width = 800, height = 600) {
    document.body.innerHTML = '<div id="game-container"><canvas id="game"></canvas></div>';
    const container = document.getElementById('game-container');
    Object.defineProperty(container, 'clientWidth', { value: width, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: height, configurable: true });
    const listeners = {};
    const hub = {
        once: jest.fn((e, fn) => { (listeners[e] = listeners[e] || []).push(fn); }),
        on: jest.fn((e, fn) => { (listeners[e] = listeners[e] || []).push(fn); }),
        off: jest.fn((e, fn) => { listeners[e] = (listeners[e] || []).filter((f) => f !== fn); }),
    };
    const scene = { game: { canvas: container.querySelector('#game') }, events: hub, scale: { width, height, on: hub.on, off: hub.off } };
    scene.emit = (e, ...args) => (listeners[e] || []).slice().forEach((f) => f(...args));
    scene.count = (e) => (listeners[e] || []).length;
    scene.setSize = (w, h) => {
        Object.defineProperty(container, 'clientWidth', { value: w, configurable: true });
        Object.defineProperty(container, 'clientHeight', { value: h, configurable: true });
        scene.emit('resize');
    };
    return { scene, container };
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


describe('Backdrop motion maths', () => {
    const palette = PALETTES[DEFAULT_PALETTE];

    test('breathing keeps every blob between 70% and 100% of its designed alpha, at any time', () => {
        palette.blobs.forEach((def, i) => {
            for (let t = 0; t < 400; t += 1.7) {
                const s = blobState(def, i, t);
                expect(s.alpha).toBeLessThanOrEqual(def.alpha + 1e-9);
                expect(s.alpha).toBeGreaterThanOrEqual(def.alpha * 0.7 - 1e-9);
                expect(s.scale).toBeGreaterThanOrEqual(1);
                expect(s.scale).toBeLessThanOrEqual(1.18 + 1e-9);
            }
        });
    });

    test('blobs drift slowly and never further than their designed range', () => {
        palette.blobs.forEach((def, i) => {
            for (let t = 0; t < 200; t += 0.9) {
                const a = blobState(def, i, t), b = blobState(def, i, t + REDRAW_MS / 1000);
                expect(Math.abs(a.x - def.x)).toBeLessThanOrEqual(Math.abs(def.dx) + 1e-9);
                expect(Math.abs(a.y - def.y)).toBeLessThanOrEqual(Math.abs(def.dy) + 1e-9);
                expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeLessThan(0.002); // under 0.2% of the screen per repaint
            }
        });
    });

    test('hue mix starts at 0 and stays within 0..1', () => {
        expect(hueMix(0)).toBe(0);
        for (let t = 0; t < 500; t += 3) {
            expect(hueMix(t)).toBeGreaterThanOrEqual(0);
            expect(hueMix(t)).toBeLessThanOrEqual(1);
        }
    });
});

describe('Backdrop behaviour', () => {
    test('is one small canvas behind the game canvas, stretched over the container, ignoring touches', () => {
        const { scene, container } = makeScene(1280, 800);
        const b = new Backdrop(scene, { reducedMotion: true }).create();
        expect(container.firstElementChild).toBe(b.root);
        expect(container.lastElementChild.id).toBe('game');
        expect(container.querySelectorAll('.' + BACKDROP_CLASS)).toHaveLength(1);
        expect(b.root.style.width).toBe('100%');
        expect(b.root.style.height).toBe('100%');
        expect(b.root.style.pointerEvents).toBe('none');
        expect(b.root.getAttribute('aria-hidden')).toBe('true');
        // tiny backing store with the container's shape
        expect(Math.max(b.root.width, b.root.height)).toBeLessThanOrEqual(256);
        expect(b.root.width / b.root.height).toBeCloseTo(1280 / 800, 1);
    });

    test('paints the opaque gradient over everything first, then every blob at its alpha', () => {
        const { scene } = makeScene();
        const b = new Backdrop(scene, { reducedMotion: true }).create();
        const calls = contexts.get(b.root).calls;
        expect(calls[0]).toMatchObject({ op: 'fillRect', alpha: 1, a: [0, 0, b.root.width, b.root.height] });
        const blobs = calls.filter((c) => c.op === 'drawImage');
        expect(blobs).toHaveLength(PALETTES[DEFAULT_PALETTE].blobs.length);
        blobs.forEach((c, i) => expect(c.alpha).toBeCloseTo(PALETTES[DEFAULT_PALETTE].blobs[i].alpha));
    });

    test('gradient CSS fallback lists every stop in order', () => {
        const cssText = gradientCss([[0, 0xff0000], [0.5, 0x00ff00], [1, 0x0000ff]]);
        expect(cssText).toBe('linear-gradient(165deg, rgb(255,0,0) 0%, rgb(0,255,0) 50%, rgb(0,0,255) 100%)');
    });

    test('repaints are throttled while animating and driven by scene updates (so a paused scene stops them)', () => {
        const { scene } = makeScene();
        const b = new Backdrop(scene, { reducedMotion: false }).create();
        const calls = contexts.get(b.root).calls;
        const paints = () => calls.filter((c) => c.op === 'fillRect' && c.alpha === 1).length;
        const before = paints();
        for (let i = 0; i < 4; i++) scene.emit('update', 0, 16); // 64 ms: not yet
        expect(paints()).toBe(before);
        scene.emit('update', 0, 20); // 84 ms
        expect(paints()).toBe(before + 1);
        expect(b.time).toBeCloseTo(0.084, 3);
    });

    test('reduced motion: painted once, no update listener', () => {
        const { scene } = makeScene();
        const b = new Backdrop(scene, { reducedMotion: true }).create();
        expect(scene.count('update')).toBe(0);
        expect(b.animating).toBe(false);
    });

    test('honours prefers-reduced-motion from the browser by default', () => {
        const original = window.matchMedia;
        window.matchMedia = jest.fn(() => ({ matches: true }));
        try {
            const { scene } = makeScene();
            new Backdrop(scene).create();
            expect(scene.count('update')).toBe(0);
        } finally {
            window.matchMedia = original;
        }
    });

    test('resize re-shapes the small canvas to the new screen and repaints', () => {
        const { scene } = makeScene(800, 600);
        const b = new Backdrop(scene, { reducedMotion: true }).create();
        scene.setSize(400, 900);
        expect(b.root.width / b.root.height).toBeCloseTo(400 / 900, 1);
        const calls = contexts.get(b.root).calls;
        expect(calls[calls.length - 1].op).toBe('drawImage');
    });

    test('destroy removes the canvas and drops every listener', () => {
        const { scene, container } = makeScene();
        const b = new Backdrop(scene, { reducedMotion: false }).create();
        b.destroy();
        expect(container.querySelector('.' + BACKDROP_CLASS)).toBeNull();
        expect(scene.count('update') + scene.count('resize') + scene.count('shutdown')).toBe(0);
        expect(() => { b.destroy(); b.resize(); }).not.toThrow();
    });

    test('creating twice (scene restart) leaves exactly one backdrop', () => {
        const { scene, container } = makeScene();
        new Backdrop(scene, { reducedMotion: true }).create();
        new Backdrop(scene, { reducedMotion: true }).create();
        expect(container.querySelectorAll('.' + BACKDROP_CLASS)).toHaveLength(1);
    });

    test('shuts down with the scene', () => {
        const { scene, container } = makeScene();
        new Backdrop(scene, { reducedMotion: true }).create();
        scene.emit('shutdown');
        expect(container.querySelector('.' + BACKDROP_CLASS)).toBeNull();
    });

    test('a scene with no container (unit-test scenes) is a safe no-op', () => {
        document.body.innerHTML = '';
        const b = new Backdrop({}, { reducedMotion: false });
        expect(() => { b.create(); b.resize(); b.destroy(); }).not.toThrow();
    });

    test('without a 2D canvas the CSS colour still shows and nothing throws', () => {
        HTMLCanvasElement.prototype.getContext = () => null;
        const { scene } = makeScene();
        const b = new Backdrop(scene, { reducedMotion: false }).create();
        expect(b.root.style.backgroundColor).toBe('rgb(16, 107, 120)');
        expect(scene.count('update')).toBe(0);
    });

    test('unknown palette falls back to the default', () => {
        const { scene } = makeScene();
        const b = new Backdrop(scene, { palette: 'nope', reducedMotion: true }).create();
        expect(b.root.dataset.palette).toBe(DEFAULT_PALETTE);
    });
});
