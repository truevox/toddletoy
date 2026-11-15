import {
    deviceDpr, dpr, viewWidth, viewHeight, toLogical, syncCamera, textResolution,
    installTextResolution, sizesFor, sizes, MIN_GLYPH, MAX_GLYPH
} from '../src/game/systems/DisplayScale.js';

function sceneAt(css, canvas) {
    return {
        game: { displayInfo: { cssW: css.w, cssH: css.h } },
        scale: { width: canvas.w, height: canvas.h }
    };
}

describe('DisplayScale: logical size and pixel ratio', () => {
    test('mock scenes (no game) behave like dpr 1', () => {
        const scene = { scale: { width: 800, height: 600 } };
        expect(dpr(scene)).toBe(1);
        expect(viewWidth(scene)).toBe(800);
        expect(viewHeight(scene)).toBe(600);
        expect(toLogical(scene, { x: 10, y: 20 })).toEqual({ x: 10, y: 20 });
    });

    test('a 2.75x canvas reports CSS size and converts pointers back to CSS px', () => {
        const scene = sceneAt({ w: 393, h: 727 }, { w: 1081, h: 2000 });
        expect(viewWidth(scene)).toBe(393);
        expect(viewHeight(scene)).toBe(727);
        expect(dpr(scene)).toBeCloseTo(2.75, 2);
        const p = toLogical(scene, { x: 1081 / 2, y: 1000 });
        expect(p.x).toBeCloseTo(196.5, 1);
        expect(p.y).toBeCloseTo(363.6, 0);
    });

    test('deviceDpr is capped at 2 and floored at 1', () => {
        expect(deviceDpr({ devicePixelRatio: 4 })).toBe(2);
        expect(deviceDpr({ devicePixelRatio: 0.5 })).toBe(1);
        expect(deviceDpr({ devicePixelRatio: 2.75 })).toBe(2);
        expect(deviceDpr({ devicePixelRatio: 1.5 })).toBe(1.5);
        expect(deviceDpr({})).toBe(1);
    });

    test('camera zoom maps world (0,0) to the canvas corner', () => {
        const cam = {
            width: 1000, height: 2000, zoom: 1, scrollX: 0, scrollY: 0,
            setZoom(z) { this.zoom = z; }, setScroll(x, y) { this.scrollX = x; this.scrollY = y; }
        };
        const scene = { ...sceneAt({ w: 400, h: 800 }, { w: 1000, h: 2000 }), cameras: { main: cam } };
        syncCamera(scene);
        expect(cam.zoom).toBeCloseTo(2.5);
        // Phaser: screen = centre + zoom * (world - scroll - centre)
        const screen = (w, s, size) => size / 2 + cam.zoom * (w - s - size / 2);
        expect(screen(0, cam.scrollX, cam.width)).toBeCloseTo(0);
        expect(screen(400, cam.scrollX, cam.width)).toBeCloseTo(1000);
        expect(screen(0, cam.scrollY, cam.height)).toBeCloseTo(0);
        expect(screen(800, cam.scrollY, cam.height)).toBeCloseTo(2000);
    });
});

describe('DisplayScale: text resolution', () => {
    test('uses the device ratio, but at most 2 for huge fonts', () => {
        const scene = sceneAt({ w: 400, h: 800 }, { w: 1200, h: 2400 });
        expect(textResolution(scene, 40)).toBe(3);
        expect(textResolution(scene, 260)).toBe(2);
    });

    test('installTextResolution gives every Text a resolution without overriding an explicit one', () => {
        const created = [];
        const scene = sceneAt({ w: 400, h: 800 }, { w: 1100, h: 2200 });
        scene.add = { text: (x, y, t, style) => { created.push(style); return {}; } };
        installTextResolution(scene);
        scene.add.text(0, 0, 'a', { fontSize: '32px' });
        scene.add.text(0, 0, 'b');
        scene.add.text(0, 0, 'c', { fontSize: '32px', resolution: 1 });
        expect(created[0].resolution).toBeCloseTo(2.75);
        expect(created[1].resolution).toBeCloseTo(2.75);
        expect(created[2].resolution).toBe(1);
        installTextResolution(scene); // idempotent
        scene.add.text(0, 0, 'd', {});
        expect(created).toHaveLength(4);
    });
});

describe('DisplayScale: screen-relative sizes', () => {
    test('glyph is 20% of the short edge, clamped', () => {
        expect(sizesFor(1280, 800).glyph).toBe(160);
        expect(sizesFor(393, 727).glyph).toBe(79);
        expect(sizesFor(300, 500).glyph).toBe(MIN_GLYPH);
        expect(sizesFor(3000, 2000).glyph).toBe(MAX_GLYPH);
    });

    test('captions are secondary: under 35% of the glyph, never below 15px', () => {
        for (const [w, h] of [[360, 640], [393, 727], [1024, 768], [1280, 800], [2560, 1440]]) {
            const s = sizesFor(w, h);
            expect(s.captionFont).toBeGreaterThanOrEqual(15);
            expect(s.captionFont / s.glyph).toBeLessThan(0.35);
        }
    });

    test('numerals may use at most 45% of the width', () => {
        expect(sizesFor(400, 800).numberMaxWidth).toBe(180);
    });

    test('sizes(scene) uses the logical view, not the canvas backing store', () => {
        const scene = sceneAt({ w: 393, h: 727 }, { w: 1081, h: 2000 });
        expect(sizes(scene).glyph).toBe(79);
    });
});
