import { buildSnapshot, unionBox, boxesIntersect, countOverlaps } from '../src/game/systems/DebugSnapshot.js';

const box = (x, y, w, h) => ({ x, y, w, h });
const fake = (x, y, w, h) => ({ x, y, width: w, height: h, active: true,
    getBounds: () => ({ x, y, width: w, height: h }) });

describe('geometry helpers', () => {
    test('unionBox covers all boxes', () => {
        expect(unionBox([box(0, 0, 10, 10), box(20, 5, 10, 10)])).toEqual(box(0, 0, 30, 15));
    });
    test('boxesIntersect: overlap yes, touching edges no', () => {
        expect(boxesIntersect(box(0, 0, 10, 10), box(5, 5, 10, 10))).toBe(true);
        expect(boxesIntersect(box(0, 0, 10, 10), box(10, 0, 10, 10))).toBe(false);
        expect(boxesIntersect(box(0, 0, 10, 10), box(50, 50, 1, 1))).toBe(false);
    });
    test('countOverlaps counts intersecting pairs once', () => {
        const b = [box(0, 0, 10, 10), box(5, 5, 10, 10), box(100, 100, 5, 5), box(8, 8, 10, 10)];
        expect(countOverlaps(b)).toBe(3);
    });
});

describe('buildSnapshot', () => {
    const scene = (objects) => ({ scale: { width: 800, height: 600 }, game: { canvas: { width: 1600, height: 1200 } }, objects });

    test('reports sizes, objects, glyph and union bounds', () => {
        const obj = Object.assign(fake(100, 100, 60, 60), { id: 7, type: 'emoji', componentLayout: {
            numberModes: [{ type: 'binary', object: fake(100, 60, 40, 30) }] } });
        obj.allLanguageWords = [{ words: [fake(90, 170, 80, 20)] }];
        const snap = buildSnapshot(scene([obj]));
        expect(snap.width).toBe(800);
        expect(snap.height).toBe(600);
        expect(snap.dpr).toBe(window.devicePixelRatio);
        expect(snap.canvas).toEqual({ width: 1600, height: 1200 });
        expect(snap.objects).toHaveLength(1);
        const o = snap.objects[0];
        expect(o).toMatchObject({ id: 7, type: 'emoji', x: 100, y: 100 });
        expect(o.glyph).toEqual(box(100, 100, 60, 60));
        expect(o.bounds).toEqual(box(90, 60, 80, 130));
        expect(snap.overlaps).toBe(0);
        expect(() => JSON.stringify(snap)).not.toThrow();
    });

    test('overlap counts pairs by union bounds, not just glyphs', () => {
        const a = Object.assign(fake(100, 100, 50, 50), { id: 1, type: 'emoji' });
        a.allLanguageWords = [{ words: [fake(100, 150, 200, 20)] }];
        const b = Object.assign(fake(250, 140, 50, 50), { id: 2, type: 'emoji' });
        expect(buildSnapshot(scene([a, b])).overlaps).toBe(1);
    });

    test('skips inactive objects and tolerates an empty scene', () => {
        expect(buildSnapshot(scene([])).objects).toEqual([]);
        const dead = Object.assign(fake(0, 0, 1, 1), { id: 1, type: 'x', active: false });
        expect(buildSnapshot(scene([dead])).objects).toEqual([]);
    });
});
