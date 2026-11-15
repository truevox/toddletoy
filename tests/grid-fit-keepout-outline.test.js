/**
 * @jest-environment jsdom
 */
jest.mock('phaser', () => ({ __esModule: true, default: {} }));
import {
    computeFitScale, computeCenteringShift, cellPaddingFor, fitObjectToCell, scaleComposite
} from '../src/game/systems/GridFit.js';
import { GridModeController } from '../src/game/systems/GridModeController.js';
import GridManager from '../src/game/systems/GridManager.js';
import {
    clampPositionToBounds, defaultKeepOutRects, EXIT_BUTTON_KEEP_OUT
} from '../src/positioning/BoundsClamp.js';
import { outlineColorFor, outlineThicknessFor } from '../src/game/utils/colorOutline.js';
import { ObjectFactory } from '../src/game/objects/ObjectFactory.js';

// Minimal Phaser-like game object with a centre origin and scale
function box(x, y, w, h, originX = 0.5, originY = 0.5) {
    const o = {
        x, y, width: w, height: h, scaleX: 1, scaleY: 1, active: true, visible: true,
        setPosition(nx, ny) { o.x = nx; o.y = ny; return o; },
        setScale(sx, sy = sx) { o.scaleX = sx; o.scaleY = sy; return o; },
        getBounds() {
            const bw = o.width * o.scaleX, bh = o.height * o.scaleY;
            return { x: o.x - bw * originX, y: o.y - bh * originY, width: bw, height: bh };
        }
    };
    return o;
}

// A "number" composite: main glyph, a row above, a label below
function composite(x, y) {
    const obj = box(x, y, 40, 40);
    const above = box(x, y - 60, 150, 40);
    const word = box(x - 70, y + 60, 140, 24, 0, 0.5);
    obj.componentLayout = {
        numberModes: [{ type: 'cistercian', object: above, offsetX: 0, offsetY: -60 }],
        allLanguageWords: [{ languageCode: 'en', words: [{ offsetX: 0, offsetY: 60 }] }],
        englishWords: [{ offsetX: 0, offsetY: 60 }],
        spanishWords: []
    };
    obj.allLanguageWords = [{ languageCode: 'en', words: [word] }];
    obj.englishWords = [word];
    obj.spanishWords = [];
    return { obj, above, word };
}

const extentsOf = (obj, parts) => {
    const all = [obj, ...parts].map(p => p.getBounds());
    return {
        left: Math.min(...all.map(b => b.x)), right: Math.max(...all.map(b => b.x + b.width)),
        top: Math.min(...all.map(b => b.y)), bottom: Math.max(...all.map(b => b.y + b.height))
    };
};

describe('grid fit computation', () => {
    test('never scales up', () => {
        expect(computeFitScale({ width: 20, height: 20 }, { width: 200, height: 200 })).toBe(1);
    });

    test('scales so the larger overflow fits cell minus padding', () => {
        const cell = { width: 100, height: 300 };
        const pad = cellPaddingFor(100, 300);
        const s = computeFitScale({ width: 200, height: 100 }, cell);
        expect(s).toBeCloseTo((100 - 2 * pad) / 200);
        const s2 = computeFitScale({ width: 50, height: 600 }, cell);
        expect(s2).toBeCloseTo((300 - 2 * pad) / 600);
    });

    test('degenerate sizes are left alone', () => {
        expect(computeFitScale({ width: 0, height: 0 }, { width: 10, height: 10 })).toBe(1);
    });

    test('centering shift moves the extents centre onto the cell centre', () => {
        const { dx, dy } = computeCenteringShift({ x: 100, y: 100 }, { left: -10, right: 30, top: -70, bottom: 10 }, { x: 100, y: 100 });
        expect(dx).toBe(-10);
        expect(dy).toBe(30);
    });

    test('fitObjectToCell scales a big composite into the cell and centres it', () => {
        const { obj, above, word } = composite(500, 500);
        const scene = { movementManager: { setObjectPosition: (o, x, y) => {
            const dx = x - o.x, dy = y - o.y;
            o.setPosition(x, y); above.setPosition(above.x + dx, above.y + dy); word.setPosition(word.x + dx, word.y + dy);
        } } };
        const cell = { width: 120, height: 160 };
        const center = { x: 60, y: 80 };
        const s = fitObjectToCell(scene, obj, center, cell);
        const pad = cellPaddingFor(cell.width, cell.height);
        expect(s).toBeLessThan(1);
        const e = extentsOf(obj, [above, word]);
        expect(e.right - e.left).toBeLessThanOrEqual(cell.width - 2 * pad + 0.01);
        expect(e.bottom - e.top).toBeLessThanOrEqual(cell.height - 2 * pad + 0.01);
        expect((e.left + e.right) / 2).toBeCloseTo(center.x);
        expect((e.top + e.bottom) / 2).toBeCloseTo(center.y);
        expect(obj.scaleX).toBeCloseTo(s);
        expect(above.scaleX).toBeCloseTo(s);
        expect(word.scaleX).toBeCloseTo(s);
    });

    test('a composite that already fits is only centred, not scaled', () => {
        const obj = box(10, 10, 30, 30);
        const scene = { movementManager: { setObjectPosition: (o, x, y) => o.setPosition(x, y) } };
        const s = fitObjectToCell(scene, obj, { x: 200, y: 200 }, { width: 300, height: 300 });
        expect(s).toBe(1);
        expect(obj.x).toBeCloseTo(200);
        expect(obj.y).toBeCloseTo(200);
    });

    test('stored layout offsets are scaled so later moves keep the arrangement', () => {
        const { obj, word } = composite(100, 100);
        scaleComposite(obj, 0.5);
        expect(obj.componentLayout.numberModes[0].offsetY).toBeCloseTo(-30);
        // word left edge = x + offsetX - width/2 with unscaled width
        const l = obj.componentLayout.allLanguageWords[0].words[0];
        expect(100 + l.offsetX - word.width / 2).toBeCloseTo(word.x);
    });
});

describe('grid resize rebuild', () => {
    function makeScene(width, height) {
        const gm = { enabled: true, gridManager: new GridManager(3, 3, width, height, 0), gridOverlay: {}, occupiedCells: new Map(), cellHighlights: new Map() };
        const scene = {
            scale: { width, height },
            sys: { game: { config: { width: 1200, height: 800 } } },
            gridMode: gm,
            movementManager: { setObjectPosition: (o, x, y) => o.setPosition(x, y) },
            createGridOverlay: jest.fn(),
            removeObject: jest.fn(),
            restoreObject: jest.fn(async (d) => Object.assign(box(d.x, d.y, 30, 30), { id: d.id, type: d.type, itemData: d.itemData }))
        };
        return scene;
    }

    test('grid uses the real canvas size, not the initial game config', () => {
        const scene = makeScene(1280, 800);
        scene.configManager = { getConfig: () => ({ gridMode: { rows: 4, cols: 4, cellPadding: 0, showGrid: false, autoPopulate: false } }) };
        scene.objects = [];
        const ctrl = new GridModeController(scene);
        ctrl.enableGridMode();
        const gm = scene.gridMode.gridManager;
        expect(gm.actualGridWidth).toBe(1280);
        expect(gm.offsetX).toBe(0);
    });

    test('resize refits the grid and puts each object back in the same cell', async () => {
        const scene = makeScene(1000, 800);
        const ctrl = new GridModeController(scene);
        const objs = {};
        for (const [r, c] of [[0, 0], [1, 2], [2, 1]]) {
            const o = box(0, 0, 30, 30);
            Object.assign(o, { id: `o${r}${c}`, type: 'emoji', itemData: { emoji: 'x' } });
            scene.gridMode.occupiedCells.set(`${r},${c}`, o);
            objs[`${r},${c}`] = o;
        }
        scene.scale.width = 600; scene.scale.height = 900;
        await ctrl.handleResize();

        const gmr = scene.gridMode.gridManager;
        expect(gmr.screenWidth).toBe(600);
        expect(gmr.cellWidth).toBeCloseTo(200);
        expect(scene.createGridOverlay).toHaveBeenCalled();
        expect(scene.gridMode.occupiedCells.size).toBe(3);
        for (const [key, old] of Object.entries(objs)) {
            expect(scene.removeObject).toHaveBeenCalledWith(old);
            const fresh = scene.gridMode.occupiedCells.get(key);
            const [r, c] = key.split(',').map(Number);
            const centre = gmr.getCellPosition(r, c);
            expect(fresh).not.toBe(old);
            expect(fresh.gridCell).toEqual({ row: r, col: c });
            expect(fresh.x).toBeCloseTo(centre.x);
            expect(fresh.y).toBeCloseTo(centre.y);
        }
    });

    test('resize does nothing when grid mode is off', async () => {
        const scene = makeScene(500, 500);
        scene.gridMode.enabled = false;
        await new GridModeController(scene).handleResize();
        expect(scene.createGridOverlay).not.toHaveBeenCalled();
    });
});

describe('exit-button keep-out in BoundsClamp', () => {
    const bounds = { width: 1000, height: 700 };
    const keepOut = defaultKeepOutRects(bounds);
    // composite 100x60 centred on the anchor
    const obj = () => box(0, 0, 100, 60);

    test('default keep-out is the 60x60 top-right square', () => {
        expect(EXIT_BUTTON_KEEP_OUT).toBe(60);
        expect(keepOut).toEqual([{ x: 940, y: 0, width: 60, height: 60 }]);
    });

    test('an object pushed into the top-right corner is moved clear of the button', () => {
        const o = obj();
        const p = clampPositionToBounds(o, 9999, -9999, bounds, 8, keepOut);
        const rect = { left: p.x - 50, right: p.x + 50, top: p.y - 30, bottom: p.y + 30 };
        const overlaps = rect.right > 940 && rect.left < 1000 && rect.bottom > 0 && rect.top < 60;
        expect(overlaps).toBe(false);
        // still inside the screen
        expect(rect.left).toBeGreaterThanOrEqual(8);
        expect(rect.right).toBeLessThanOrEqual(992);
        expect(rect.top).toBeGreaterThanOrEqual(8);
    });

    test('chooses the smaller move (left vs down)', () => {
        const flat = box(0, 0, 100, 20);
        // right edge 990 (left move 50), top 30 (down move 30): down is smaller
        const d = clampPositionToBounds(flat, 940, 40, bounds, 8, keepOut);
        expect(d.x).toBe(940);
        expect(d.y - 10).toBeCloseTo(60);
        // right edge 960 (left move 20), top 30 (down move 30): left is smaller
        const l = clampPositionToBounds(flat, 910, 40, bounds, 8, keepOut);
        expect(l.y).toBe(40);
        expect(l.x + 50).toBeCloseTo(940);
    });

    test('falls back to the move that stays on screen', () => {
        // too wide to move left clear of the button: must go down
        const wide = box(0, 0, 970, 20);
        const p = clampPositionToBounds(wide, 9999, -9999, bounds, 8, keepOut);
        expect(p.y - 10).toBeGreaterThanOrEqual(60 - 1e-6);
        expect(p.x + 485).toBeCloseTo(992);
        // too tall to move down clear of the button: must go left
        const tall = box(0, 0, 20, 690);
        const q = clampPositionToBounds(tall, 9999, -9999, bounds, 8, keepOut);
        expect(q.x + 10).toBeLessThanOrEqual(940 + 1e-6);
    });

    test('objects elsewhere are untouched, and no rects means old behaviour', () => {
        const o = obj();
        expect(clampPositionToBounds(o, 300, 300, bounds, 8, keepOut)).toEqual({ x: 300, y: 300 });
        const corner = clampPositionToBounds(o, 9999, -9999, bounds, 8);
        expect(corner).toEqual({ x: 942, y: 38 });
    });

    test('clear of the rect but near it is not moved', () => {
        const o = obj();
        const p = clampPositionToBounds(o, 880, 40, bounds, 8, keepOut);   // right edge at 930 < 940
        expect(p).toEqual({ x: 880, y: 40 });
    });
});

describe('colour outline for numerals and letters', () => {
    test('lightens the fill toward white', () => {
        expect(outlineColorFor('#0000ff')).toBe('#7373ff');
        expect(outlineColorFor('#000000')).toBe('#737373');
        expect(outlineColorFor('#ffffff')).toBe('#ffffff');
        expect(outlineColorFor('not-a-colour')).toBe('#ffffff');
    });

    test('about 3px at 32px text, never thinner than 2px', () => {
        expect(outlineThicknessFor('32px')).toBe(3);
        expect(outlineThicknessFor('8px')).toBe(2);
    });

    test('numbers and letters get the stroke, emoji do not', () => {
        const added = [];
        const text = { setOrigin: jest.fn().mockReturnThis(), setInteractive: jest.fn().mockReturnThis() };
        const scene = {
            textStyle: { fontSize: '32px', fill: '#fff' }, emojiStyle: { fontSize: '64px', fill: '#fff' },
            add: { text: jest.fn((x, y, t, style) => { added.push(style); return text; }) }
        };
        const f = new ObjectFactory(scene);
        f.createPrimaryDisplayObject('number', { color: { hex: '#0000ff' } }, '1', 0, 0);
        f.createPrimaryDisplayObject('letter', { color: { hex: '#800080' } }, 'A', 0, 0);
        f.createPrimaryDisplayObject('emoji', { emoji: 'x' }, 'x', 0, 0);
        expect(added[0]).toMatchObject({ fill: '#0000ff', stroke: '#7373ff' });
        expect(added[0].strokeThickness).toBe(outlineThicknessFor(added[0].fontSize)); // thickness follows the (screen-relative) font size
        expect(added[1].stroke).toBe(outlineColorFor('#800080'));
        expect(added[2].stroke).toBeUndefined();
    });
});
