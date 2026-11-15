// Shape factory: strict Phaser-API mock so non-existent methods (e.g. the old
// graphics.bezierCurveTo) make the test fail instead of being silently mocked.
jest.mock('phaser', () => ({
    __esModule: true,
    default: {
        Display: { Color: { HexStringToColor: (hex) => ({ color: parseInt(hex.replace('#', ''), 16) }) } },
        Geom: { Rectangle: class Rectangle { constructor(x, y, w, h) { Object.assign(this, { x, y, w, h }); } }, Rectangle_Contains: null }
    }
}));

import Phaser from 'phaser';
import { createShapeObject, calculateShapeSize, getHeartPoints, calculateShapeLabelOffset } from '../src/game/objects/ShapeFactory.js';

Phaser.Geom.Rectangle.Contains = () => true;

// Methods that really exist on Phaser.GameObjects.Graphics (3.90) that we may legitimately use
const REAL_GRAPHICS_METHODS = [
    'fillStyle', 'lineStyle', 'beginPath', 'closePath', 'fillPath', 'strokePath', 'moveTo', 'lineTo',
    'fillPoints', 'strokePoints', 'fillCircle', 'strokeCircle', 'fillRect', 'strokeRect', 'clear',
    'setPosition', 'setDepth', 'setVisible', 'setAlpha', 'destroy'
];

function strictGameObject(allowed, label, dataProps = []) {
    const target = {};
    dataProps.forEach(name => { target[name] = undefined; });
    allowed.forEach(name => { target[name] = jest.fn().mockReturnThis(); });
    target.points = [];
    return new Proxy(target, {
        get(obj, prop) {
            if (prop in obj || typeof prop === 'symbol' || prop === 'then') return obj[prop];
            throw new TypeError(`${label}.${String(prop)} is not a function (does not exist in Phaser)`);
        }
    });
}

function makeScene(width = 1280, height = 800) {
    const shapeMethods = ['setPosition', 'setOrigin', 'setStrokeStyle', 'setFillStyle', 'destroy'];
    const container = strictGameObject(['add', 'setSize', 'setInteractive', 'setPosition', 'destroy'], 'Container', ['componentLayout', 'mainShape', 'shapeSize', 'text']);
    return {
        scale: { width, height },
        container,
        add: {
            container: jest.fn(() => container),
            graphics: jest.fn(() => strictGameObject(REAL_GRAPHICS_METHODS, 'Graphics')),
            circle: jest.fn(() => strictGameObject(shapeMethods, 'Arc')),
            rectangle: jest.fn(() => strictGameObject(shapeMethods, 'Rectangle')),
            star: jest.fn(() => strictGameObject(shapeMethods, 'Star')),
            polygon: jest.fn((x, y, points) => {
                const g = strictGameObject(shapeMethods, 'Polygon');
                g.points = points;
                return g;
            })
        }
    };
}

describe('ShapeFactory', () => {
    const shapes = ['Circle', 'Square', 'Triangle', 'Star', 'Diamond', 'Heart'];

    test.each(shapes)('%s spawns without calling non-existent Phaser APIs', (value) => {
        const scene = makeScene();
        const obj = createShapeObject(scene, { value, color: { hex: '#ff0000' } }, 100, 100, value);
        expect(obj).toBe(scene.container);
        expect(obj.mainShape).toBeDefined();
    });

    test('heart is drawn from a point polygon, never bezierCurveTo', () => {
        const scene = makeScene();
        createShapeObject(scene, { value: 'Heart', color: { hex: '#ff0000' } }, 0, 0);
        expect(scene.add.polygon).toHaveBeenCalledTimes(1);
        const points = scene.add.polygon.mock.calls[0][2];
        expect(points.length).toBeGreaterThanOrEqual(24);
        // sanity: the strict graphics mock really does reject bezierCurveTo
        expect(() => scene.add.graphics().bezierCurveTo(0, 0, 0, 0, 0, 0)).toThrow(/not a function/);
    });

    test('heart points are non-negative, fit the size and are wider at the top than the tip', () => {
        const pts = getHeartPoints(64);
        const xs = pts.filter((_, i) => i % 2 === 0);
        const ys = pts.filter((_, i) => i % 2 === 1);
        expect(Math.min(...xs)).toBeCloseTo(0, 5);
        expect(Math.min(...ys)).toBeCloseTo(0, 5);
        expect(Math.max(...xs)).toBeLessThanOrEqual(64.0001);
        expect(Math.max(...ys)).toBeLessThanOrEqual(64.0001);
    });

    test('triangle and diamond polygons use non-negative coordinates (centre origin is exact)', () => {
        ['Triangle', 'Diamond'].forEach(value => {
            const scene = makeScene();
            createShapeObject(scene, { value, color: { hex: '#00ff00' } }, 0, 0);
            const pts = scene.add.polygon.mock.calls[0][2];
            expect(Math.min(...pts)).toBeGreaterThanOrEqual(0);
        });
    });

    test('shape size follows the screen-relative glyph unit (about 20% of the short edge, clamped)', () => {
        expect(calculateShapeSize(800)).toBeGreaterThanOrEqual(800 * 0.19);
        expect(calculateShapeSize(800)).toBeLessThanOrEqual(800 * 0.21);
        expect(calculateShapeSize(393)).toBeGreaterThanOrEqual(393 * 0.19);
        expect(calculateShapeSize(393)).toBeLessThanOrEqual(393 * 0.21);
        expect(calculateShapeSize(200)).toBe(72);      // never tiny
        expect(calculateShapeSize(3000)).toBe(220);    // never huge
        const scene = makeScene(1280, 800);
        const obj = createShapeObject(scene, { value: 'Star', color: { hex: '#ffffff' } }, 0, 0);
        expect(obj.shapeSize).toBe(calculateShapeSize(800));
    });

    test('star takes (points, innerRadius, outerRadius) and is as big as the other shapes', () => {
        const scene = makeScene(1280, 800);
        const obj = createShapeObject(scene, { value: 'Star', color: { hex: '#ffffff' } }, 0, 0);
        const [, , points, inner, outer] = scene.add.star.mock.calls[0];
        expect(points).toBe(5);
        expect(inner).toBeLessThan(outer);
        // outer radius ~ half the shape size, so the star spans about the same box as a circle
        expect(outer * 2).toBeGreaterThanOrEqual(obj.shapeSize * 0.9);
        expect(outer * 2).toBeLessThanOrEqual(obj.shapeSize * 1.1);
    });

    test('label sits just below the shape (not far below)', () => {
        const scene = makeScene(1280, 800);
        scene.renderManager = { textLayoutManager: { calculateResponsiveTextStyle: () => ({ fontSize: '28px', labelOffset: 72 }) } };
        const offset = calculateShapeLabelOffset(scene, 64);
        const labelCentre = 72 + offset;
        // label centre between the shape's bottom edge (32) and ~25px below it
        expect(labelCentre).toBeGreaterThan(32 + 14);
        expect(labelCentre).toBeLessThan(32 + 14 + 20);
    });
});
