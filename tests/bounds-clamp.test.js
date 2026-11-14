import {
    getObjectExtents,
    clampPositionToBounds,
    remapPosition
} from '../src/positioning/BoundsClamp.js';
import { MovementManager } from '../src/game/systems/MovementManager.js';

// Fake game object whose bounds follow its position, like Phaser objects do
function fakeGo(x, y, w, h, originX = 0.5, originY = 0.5) {
    const go = {
        x, y, active: true, visible: true, width: w, height: h,
        getBounds: () => ({ x: go.x - w * originX, y: go.y - h * originY, width: w, height: h }),
        setPosition: jest.fn((nx, ny) => { go.x = nx; go.y = ny; return go; })
    };
    return go;
}

// Composite: 64px main glyph, one label row below, hearts row above, counting rows far below
function makeComposite(x, y, { counting = 0 } = {}) {
    const main = fakeGo(x, y, 64, 64);
    const word = fakeGo(x - 50, y + 60, 100, 28, 0, 0.5);
    main.allLanguageWords = [{ languageCode: 'en', words: [word] }];
    const hearts = fakeGo(x, y - 40, 120, 20);
    const numberModes = [{ type: 'binary', object: hearts, offsetX: 0, offsetY: -40 }];
    if (counting) {
        const bar = fakeGo(x, y + 100, 200, counting);
        numberModes.push({ type: 'objectCounting', object: bar, offsetX: 0, offsetY: 100 });
    }
    main.componentLayout = {
        allLanguageWords: [{ languageCode: 'en', words: [{ offsetX: 0, offsetY: 60 }] }],
        numberModes
    };
    return main;
}

describe('BoundsClamp', () => {
    const bounds = { width: 1280, height: 800 };

    test('extents cover main glyph, labels and number-mode rows', () => {
        const obj = makeComposite(400, 400, { counting: 100 });
        const ext = getObjectExtents(obj);
        expect(ext.top).toBeCloseTo(-50); // hearts: -40 - 10
        expect(ext.left).toBeCloseTo(-100); // counting bar half-width 100
        expect(ext.bottom).toBeCloseTo(100 + 50); // counting bar centre 100 + half height 50
    });

    test('tap near the right edge keeps the whole composite inside the margin', () => {
        const obj = makeComposite(1275, 400);
        const { x } = clampPositionToBounds(obj, 1275, 400, bounds, 8);
        const ext = getObjectExtents(obj);
        expect(x + ext.right).toBeLessThanOrEqual(1280 - 8 + 1e-6);
    });

    test('tap near the bottom keeps labels inside', () => {
        const obj = makeComposite(640, 790);
        const { y } = clampPositionToBounds(obj, 640, 790, bounds, 8);
        const ext = getObjectExtents(obj);
        expect(y + ext.bottom).toBeLessThanOrEqual(800 - 8 + 1e-6);
        expect(y + ext.top).toBeGreaterThanOrEqual(8);
    });

    test('large number tapped low: counting rows stay on screen', () => {
        const obj = makeComposite(640, 780, { counting: 150 });
        const { y } = clampPositionToBounds(obj, 640, 780, bounds, 8);
        const ext = getObjectExtents(obj);
        expect(y + ext.bottom).toBeLessThanOrEqual(800 - 8 + 1e-6);
    });

    test('top-left tap is pushed in from both edges', () => {
        const obj = makeComposite(2, 2);
        const { x, y } = clampPositionToBounds(obj, 2, 2, bounds, 8);
        const ext = getObjectExtents(obj);
        expect(x + ext.left).toBeGreaterThanOrEqual(8 - 1e-6);
        expect(y + ext.top).toBeGreaterThanOrEqual(8 - 1e-6);
    });

    test('in-bounds positions are unchanged', () => {
        const obj = makeComposite(640, 400);
        expect(clampPositionToBounds(obj, 640, 400, bounds, 8)).toEqual({ x: 640, y: 400 });
    });

    test('composite larger than the screen is centred instead of throwing', () => {
        const obj = makeComposite(100, 100, { counting: 2000 });
        const { y } = clampPositionToBounds(obj, 100, 100, { width: 1280, height: 800 }, 8);
        expect(Number.isFinite(y)).toBe(true);
    });

    test('objects without getBounds (mocks) are returned unchanged', () => {
        expect(clampPositionToBounds({ x: 1, y: 2 }, 5, 6, bounds, 8)).toEqual({ x: 5, y: 6 });
    });

    test('invisible/inactive/destroyed components are ignored', () => {
        const obj = makeComposite(640, 400, { counting: 100 });
        obj.componentLayout.numberModes[1].object.visible = false;
        expect(getObjectExtents(obj).bottom).toBeLessThan(100);
    });

    test('container children: only visible children count (ResourceBar pooled sprites)', () => {
        const main = fakeGo(300, 300, 64, 64);
        const visibleChild = fakeGo(300, 380, 32, 32);
        const hiddenChild = fakeGo(300, 3000, 32, 32);
        hiddenChild.visible = false;
        const bar = { x: 0, y: 0, active: true, visible: true, list: [visibleChild, hiddenChild], getBounds: () => ({ x: 0, y: 0, width: 9999, height: 9999 }) };
        main.componentLayout = { numberModes: [{ object: bar, offsetX: 0, offsetY: 0 }] };
        expect(getObjectExtents(main).bottom).toBeCloseTo(380 + 16 - 300);
    });

    test('remapPosition scales proportionally', () => {
        expect(remapPosition(640, 400, { width: 1280, height: 800 }, { width: 600, height: 900 }))
            .toEqual({ x: 300, y: 450 });
    });
});

describe('MovementManager clamps moves into the visible area', () => {
    test('immediate move (end of a drag) is clamped', () => {
        const scene = { scale: { width: 1280, height: 800 } };
        const mm = new MovementManager(scene);
        jest.spyOn(console, 'log').mockImplementation(() => {});
        const obj = makeComposite(640, 400);
        obj.id = 'o1';
        obj.setPosition = jest.fn((nx, ny) => { obj.x = nx; obj.y = ny; return obj; });
        mm.moveObjectTo(obj, 1279, 799, false);
        const ext = getObjectExtents(obj);
        expect(obj.x + ext.right).toBeLessThanOrEqual(1280 - 8 + 1e-6);
        expect(obj.y + ext.bottom).toBeLessThanOrEqual(800 - 8 + 1e-6);
    });

    test('smooth move target is clamped', () => {
        const scene = { scale: { width: 1280, height: 800 } };
        const mm = new MovementManager(scene);
        const obj = makeComposite(640, 400);
        obj.id = 'o2';
        mm.moveObjectTo(obj, 1279, 400, true);
        const move = mm.getMovementInfo('o2');
        const ext = getObjectExtents(obj);
        expect(move.targetX + ext.right).toBeLessThanOrEqual(1280 - 8 + 1e-6);
    });
});
