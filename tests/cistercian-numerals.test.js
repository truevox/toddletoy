/**
 * @jest-environment jsdom
 */
// Drawing layer for Cistercian numerals (replaces the old mock-only expectations).
import {
    createCistercianNumeral, capsulePoints, strokeWidthFor, drawCistercianFigure, CELL_SIZE
} from '../src/game/systems/CistercianNumeral.js';
import { layoutNumber, numberSegments } from '../src/game/systems/CistercianGlyph.js';

function makeGraphics() {
    const g = {
        x: 0, y: 0, scaleX: 1, scaleY: 1, active: true, visible: true, alpha: 1,
        fillStyle: jest.fn(),
        fillPoints: jest.fn(),
        clear: jest.fn(),
        setPosition: jest.fn(function (x, y) { this.x = x; this.y = y; return this; }),
        destroy: jest.fn()
    };
    return g;
}

function makeScene() {
    const graphics = makeGraphics();
    return { graphics, add: { graphics: jest.fn((opts) => { Object.assign(graphics, opts); return graphics; }) } };
}

describe('Cistercian numeral drawing layer', () => {
    test('is a Graphics object centred on the requested position, not a text object', () => {
        const scene = makeScene();
        scene.add.text = jest.fn();
        const g = createCistercianNumeral(scene, 100, 50, 1993);
        expect(scene.add.graphics).toHaveBeenCalledWith({ x: 100, y: 50 });
        expect(scene.add.text).not.toHaveBeenCalled();
        expect(g).toBe(scene.graphics);
    });

    test('draws one filled round-capped capsule per segment in solid white', () => {
        const scene = makeScene();
        createCistercianNumeral(scene, 0, 0, 1993);
        expect(scene.graphics.fillStyle).toHaveBeenCalledWith(0xffffff, 1);
        expect(scene.graphics.fillPoints).toHaveBeenCalledTimes(numberSegments(1993).length);
        scene.graphics.fillPoints.mock.calls.forEach(([pts]) => expect(pts.length).toBeGreaterThan(8));
    });

    test('zero draws just the stave', () => {
        const scene = makeScene();
        createCistercianNumeral(scene, 0, 0, 0);
        expect(scene.graphics.fillPoints).toHaveBeenCalledTimes(1);
    });

    test('exposes width/height/displayHeight/getBounds for layout and clamping', () => {
        const scene = makeScene();
        const cell = 10;
        const g = createCistercianNumeral(scene, 200, 100, 1234, { cell });
        const stroke = strokeWidthFor(cell);
        expect(g.width).toBeCloseTo(2 * cell + stroke);
        expect(g.height).toBeCloseTo(3 * cell + stroke);
        expect(g.displayHeight).toBeCloseTo(g.height);
        const b = g.getBounds();
        expect(b.x).toBeCloseTo(200 - g.width / 2);
        expect(b.y).toBeCloseTo(100 - g.height / 2);
        expect(b.width).toBeCloseTo(g.width);
        expect(b.height).toBeCloseTo(g.height);
    });

    test('bounds follow the object when it moves (drag) and when it is scaled', () => {
        const scene = makeScene();
        const g = createCistercianNumeral(scene, 0, 0, 55, { cell: 10 });
        g.setPosition(300, 400);
        expect(g.getBounds().x + g.getBounds().width / 2).toBeCloseTo(300);
        expect(g.getBounds().y + g.getBounds().height / 2).toBeCloseTo(400);
        g.scaleX = g.scaleY = 0.5;
        expect(g.getBounds().height).toBeCloseTo(g.height * 0.5);
    });

    test('multi-glyph numbers are wider by one glyph plus a gap', () => {
        const scene = makeScene();
        const one = createCistercianNumeral(scene, 0, 0, 1234, { cell: 10 });
        const w1 = one.width;
        const two = createCistercianNumeral(scene, 0, 0, 12345, { cell: 10 });
        expect(two.width).toBeCloseTo(w1 + 3 * 10);
        expect(two.height).toBeCloseTo(one.height);
    });

    test('every drawn point stays inside the reported bounds', () => {
        const scene = makeScene();
        const cell = 13;
        const g = createCistercianNumeral(scene, 0, 0, 98765, { cell });
        scene.graphics.fillPoints.mock.calls.forEach(([pts]) => {
            pts.forEach(p => {
                expect(Math.abs(p.x)).toBeLessThanOrEqual(g.width / 2 + 1e-6);
                expect(Math.abs(p.y)).toBeLessThanOrEqual(g.height / 2 + 1e-6);
            });
        });
    });

    test('destroy is the standard Graphics destroy (cleanup on removal)', () => {
        const scene = makeScene();
        const g = createCistercianNumeral(scene, 0, 0, 7);
        g.destroy();
        expect(scene.graphics.destroy).toHaveBeenCalled();
    });

    test('colour is configurable, default white', () => {
        const scene = makeScene();
        createCistercianNumeral(scene, 0, 0, 7, { color: 0xff0000 });
        expect(scene.graphics.fillStyle).toHaveBeenCalledWith(0xff0000, 1);
    });

    test('default cell gives a ~39px stave, comfortable beside 32px text', () => {
        expect(CELL_SIZE * 3).toBeGreaterThanOrEqual(32);
        expect(CELL_SIZE * 3).toBeLessThanOrEqual(48);
        expect(strokeWidthFor(CELL_SIZE)).toBeGreaterThanOrEqual(2);
        expect(strokeWidthFor(CELL_SIZE)).toBeLessThan(CELL_SIZE / 2);
    });

    test('capsule polygon wraps both endpoints at the given radius', () => {
        const pts = capsulePoints(0, 0, 10, 0, 2, 4);
        expect(pts).toHaveLength(10);
        pts.forEach(p => {
            const d = Math.min(Math.hypot(p.x, p.y), Math.hypot(p.x - 10, p.y));
            expect(d).toBeCloseTo(2);
        });
        expect(Math.max(...pts.map(p => p.x))).toBeCloseTo(12);
        expect(Math.min(...pts.map(p => p.x))).toBeCloseTo(-2);
    });

    test('drawCistercianFigure clears before redrawing', () => {
        const g = makeGraphics();
        drawCistercianFigure(g, layoutNumber(5), 10);
        expect(g.clear).toHaveBeenCalledTimes(1);
        expect(g.fillPoints).toHaveBeenCalledTimes(3); // stave + top + diagonal
    });
});
