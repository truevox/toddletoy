/**
 * @jest-environment jsdom
 */
// The bundled Cistercian font was removed (licence); numerals are now drawn procedurally.
// These tests used to assert the keyboard-string/font implementation. They now assert that
// RenderManager draws a glyph (no text object, no font) and that no trace of the font remains.
import fs from 'fs';
import path from 'path';
import { RenderManager } from '../src/game/systems/RenderManager.js';
import { sizesFor } from '../src/game/systems/DisplayScale.js';
import { FontManager } from '../src/game/systems/FontManager.js';

const root = path.resolve(__dirname, '..');

function makeScene() {
    const textObj = () => ({ setOrigin: jest.fn().mockReturnThis(), destroy: jest.fn(), width: 10, height: 10 });
    const scene = {
        scale: { width: 1200, height: 800 },
        add: { text: jest.fn(() => textObj()) }
    };
    scene.add.graphics = jest.fn((o) => {
        const graphics = {
            x: 0, y: 0, scaleX: 1, scaleY: 1,
            fillStyle: jest.fn(), fillPoints: jest.fn(), clear: jest.fn(), destroy: jest.fn(),
            setPosition: jest.fn(function (x, y) { this.x = x; this.y = y; return this; })
        };
        scene.lastGraphics = Object.assign(graphics, o);
        return scene.lastGraphics;
    });
    return scene;
}

describe('RenderManager.renderCistercianNumeral (procedural)', () => {
    let scene, rm;
    beforeEach(() => {
        scene = makeScene();
        rm = new RenderManager(scene);
        scene.add.text.mockClear();
    });

    test('draws a graphics object, never a text object with a Cistercian font', () => {
        const obj = rm.renderCistercianNumeral(1993, 400, 300);
        expect(obj).toBe(scene.lastGraphics);
        expect(scene.add.text).not.toHaveBeenCalled();
        expect(scene.add.graphics).toHaveBeenCalledWith({ x: 400, y: 300 });
    });

    test('has no keyboard-key mapping any more', () => {
        expect(rm.getCistercianKeyMapping).toBeUndefined();
    });

    test('returned object reports a height usable by the numeral stack layout', () => {
        const obj = rm.renderCistercianNumeral(8814, 0, 0);
        // outcome: the numeral is a secondary row, clearly smaller than the main glyph of the same screen
        const glyph = sizesFor(1200, 800).glyph;
        expect(obj.displayHeight).toBeGreaterThan(glyph * 0.3);
        expect(obj.displayHeight).toBeLessThan(glyph * 0.9);
    });

    test('handles zero, 9999 and numbers beyond one glyph', () => {
        [0, 9999, 12345, 100000].forEach(n => expect(rm.renderCistercianNumeral(n, 0, 0)).toBeTruthy());
        const wide = rm.renderCistercianNumeral(100000, 0, 0).width;
        const narrow = rm.renderCistercianNumeral(9999, 0, 0).width;
        expect(wide).toBeGreaterThan(narrow);
    });

    test('negative / non-finite input yields no numeral', () => {
        expect(rm.renderCistercianNumeral(-1, 0, 0)).toBeNull();
        expect(rm.renderCistercianNumeral(NaN, 0, 0)).toBeNull();
    });

    test('glyph shrinks on small screens like the other numeral rows', () => {
        const big = rm.renderCistercianNumeral(1234, 0, 0).height;
        scene.scale = { width: 393, height: 851 };
        const small = rm.renderCistercianNumeral(1234, 0, 0).height;
        expect(small).toBeLessThan(big);
    });
});

describe('Cistercian font removal', () => {
    test('FontManager no longer preloads or reports a Cistercian font', () => {
        const fm = new FontManager(makeScene());
        expect(fm.preloadCistercianFont).toBeUndefined();
        expect(fm.isCistercianLoaded).toBeUndefined();
        expect(Object.keys(fm.fontPreloaded)).toEqual(['kaktovik']);
    });

    test('font files, @font-face and the fonts.check gate are gone', () => {
        expect(fs.existsSync(path.join(root, 'fonts', 'cistercian-qwerty'))).toBe(false);
        expect(fs.readFileSync(path.join(root, 'index.html'), 'utf8')).not.toMatch(/Cistercian/i);
        // The font gate moved from game.js into SceneReadiness.js (scene.ready)
        const game = fs.readFileSync(path.join(root, 'src', 'game.js'), 'utf8');
        const ready = fs.readFileSync(path.join(root, 'src', 'game', 'systems', 'SceneReadiness.js'), 'utf8');
        expect(game + ready).not.toMatch(/Cistercian/);
        expect(ready).toMatch(/1em Kaktovik/);
        const rmSrc = fs.readFileSync(path.join(root, 'src', 'game', 'systems', 'RenderManager.js'), 'utf8');
        expect(rmSrc).not.toMatch(/fontFamily:\s*'Cistercian/);
        expect(rmSrc).not.toMatch(/getCistercianKeyMapping/);
    });
});
