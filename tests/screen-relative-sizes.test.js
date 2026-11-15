jest.mock('phaser', () => ({ __esModule: true, default: { Display: { Color: {} }, Geom: {} } }));

import { TextLayoutManager } from '../src/game/systems/TextLayoutManager.js';
import { ObjectFactory } from '../src/game/objects/ObjectFactory.js';
import { fitCompositeToView } from '../src/game/systems/CompositeFit.js';
import { sizesFor, fitTextWidth, calibrateTextHeight } from '../src/game/systems/DisplayScale.js';

const SCREENS = [[360, 640], [393, 727], [1024, 768], [1280, 800], [2560, 1440]];

/** Text mock whose box scales with its font size like a real Phaser Text (height 1.2x font, width 0.6x per char). */
function fakeText(content, style) {
    const t = {
        text: content, style: { ...style },
        get height() { return parseFloat(this.style.fontSize) * 1.2; },
        get width() { return parseFloat(this.style.fontSize) * 0.6 * this.text.length; },
        setFontSize(px) { this.style.fontSize = `${px}px`; return this; },
        setOrigin() { return this; }, setInteractive() { return this; }
    };
    return t;
}

describe('screen-relative captions', () => {
    test.each(SCREENS)('caption on %ix%i is secondary to the glyph and at least 15px', (w, h) => {
        const style = new TextLayoutManager({ scale: { width: w, height: h } }).calculateResponsiveTextStyle();
        const font = parseInt(style.fontSize, 10);
        const glyph = sizesFor(w, h).glyph;
        expect(font).toBeGreaterThanOrEqual(15);
        expect(font / glyph).toBeLessThan(0.35);
        // the first caption line starts below the glyph's lower edge
        expect(style.labelOffset).toBeGreaterThan(glyph / 2);
        expect(style.lineSpacing).toBeGreaterThan(font);
    });
});

describe('main glyph sizing in the object factory', () => {
    function factoryAt(w, h) {
        const made = [];
        const scene = {
            scale: { width: w, height: h },
            textStyle: { fontSize: '32px', fill: '#fff', fontFamily: 'Arial' },
            emojiStyle: { fontSize: '64px', fill: '#fff', fontFamily: 'Arial' },
            add: { text: (x, y, t, style) => { const o = fakeText(t, style); made.push(o); return o; } }
        };
        return { factory: new ObjectFactory(scene), made };
    }

    test.each(SCREENS)('emoji, letter and numeral boxes are ~20%% of the short edge on %ix%i', (w, h) => {
        const { factory } = factoryAt(w, h);
        const glyph = sizesFor(w, h).glyph;
        for (const [type, text] of [['emoji', 'x'], ['letter', 'A'], ['number', '7']]) {
            const o = factory.createPrimaryDisplayObject(type, { color: { hex: '#ff0000' } }, text, 0, 0);
            expect(Math.abs(o.height - glyph) / glyph).toBeLessThan(0.05);
        }
    });

    test('a long number shrinks to at most 45% of the screen width', () => {
        const { factory } = factoryAt(393, 727);
        const o = factory.createPrimaryDisplayObject('number', { color: { hex: '#00f' } }, '12345678', 0, 0);
        expect(o.width).toBeLessThanOrEqual(393 * 0.45 + 1);
        // a short number keeps the full glyph height
        const short = factory.createPrimaryDisplayObject('number', { color: { hex: '#00f' } }, '7', 0, 0);
        expect(short.height).toBeGreaterThan(o.height);
    });

    test('helpers only ever shrink for width and ignore objects without a measurable font', () => {
        const t = fakeText('abc', { fontSize: '20px' });
        expect(fitTextWidth(t, 1000).style.fontSize).toBe('20px');
        expect(() => fitTextWidth({}, 10)).not.toThrow();
        expect(() => calibrateTextHeight({}, 10)).not.toThrow();
    });
});

describe('fitCompositeToView', () => {
    function composite(w, h, width = 360, height = 640) {
        const scene = { scale: { width, height } };
        const obj = {
            x: 180, y: 320, active: true, visible: true, scaleX: 1, scaleY: 1,
            getBounds() { return { x: this.x - w / 2, y: this.y - h / 2, width: w * this.scaleX, height: h * this.scaleY }; },
            setScale(sx, sy) { this.scaleX = sx; this.scaleY = sy ?? sx; return this; },
            setPosition(x, y) { this.x = x; this.y = y; return this; },
            componentLayout: {}
        };
        return { scene, obj };
    }

    test('leaves an object that fits alone', () => {
        const { scene, obj } = composite(200, 400);
        expect(fitCompositeToView(scene, obj)).toBe(1);
        expect(obj.baseScale).toBeUndefined();
    });

    test('shrinks an oversized composite to fit inside the margins and remembers the factor', () => {
        const { scene, obj } = composite(300, 800);
        const s = fitCompositeToView(scene, obj);
        expect(s).toBeLessThan(1);
        expect(obj.getBounds().height).toBeLessThanOrEqual(640 - 16 + 0.5);
        expect(obj.getBounds().width).toBeLessThanOrEqual(360 - 16 + 0.5);
        expect(obj.baseScale).toBeCloseTo(s);
    });
});
