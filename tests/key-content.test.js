// ContentSelector.resolveKeyContent: a specific letter or number, honouring the parent's settings.
import { ContentSelector } from '../src/game/systems/ContentSelector.js';

function selectorWith(content) {
    const scene = {
        configManager: {
            getConfig: () => ({ content }),
            getSmallNumberRange: () => ({ min: content.smallNumbers.min, max: content.smallNumbers.max }),
            getLargeNumberRange: () => ({ min: content.largeNumbers.min, max: content.largeNumbers.max })
        },
        getNumberRangeForType(t) { return sel.getNumberRangeForType(t); },
        getRandomColor: async () => ({ value: 'Red', hex: '#ff0000' })
    };
    const sel = new ContentSelector(scene);
    return sel;
}
const on = (extra = {}) => ({ enabled: true, weight: 10, ...extra });
const off = () => ({ enabled: false, weight: 10 });
const base = () => ({
    shapes: on(), smallNumbers: on({ min: 0, max: 20 }), largeNumbers: on({ min: 21, max: 9999 }),
    uppercaseLetters: on(), lowercaseLetters: off(), emojis: on()
});

describe('resolveKeyContent letters', () => {
    test('uppercase when enabled', async () => {
        const r = await selectorWith(base()).resolveKeyContent('letter', 'B');
        expect(r.type).toBe('uppercaseLetters');
        expect(r.item).toMatchObject({ value: 'B', type: 'letter', case: 'upper' });
    });
    test('uppercase is preferred when both are enabled', async () => {
        const c = base(); c.lowercaseLetters = on();
        expect((await selectorWith(c).resolveKeyContent('letter', 'B')).item.value).toBe('B');
    });
    test('lowercase when only lowercase is enabled', async () => {
        const c = base(); c.uppercaseLetters = off(); c.lowercaseLetters = on();
        const r = await selectorWith(c).resolveKeyContent('letter', 'B');
        expect(r.type).toBe('lowercaseLetters');
        expect(r.item).toMatchObject({ value: 'b', case: 'lower' });
    });
    test('null (random fallback) when letters are off, or have no weight', async () => {
        const c = base(); c.uppercaseLetters = off();
        expect(await selectorWith(c).resolveKeyContent('letter', 'B')).toBeNull();
        const d = base(); d.uppercaseLetters = { enabled: true, weight: 0 };
        expect(await selectorWith(d).resolveKeyContent('letter', 'B')).toBeNull();
    });
});

describe('resolveKeyContent digits', () => {
    test('small numbers carry the value and a colour', async () => {
        const r = await selectorWith(base()).resolveKeyContent('digit', 7);
        expect(r.type).toBe('smallNumbers');
        expect(r.item).toMatchObject({ value: 7, type: 'number' });
        expect(r.item.color.hex).toBe('#ff0000');
    });
    test('falls to large numbers when only they cover the digit', async () => {
        const c = base(); c.smallNumbers = off(); c.largeNumbers = on({ min: 0, max: 9999 });
        expect((await selectorWith(c).resolveKeyContent('digit', 3)).type).toBe('largeNumbers');
    });
    test('null when numbers are off, or the digit is outside every enabled range', async () => {
        const c = base(); c.smallNumbers = off(); c.largeNumbers = off();
        expect(await selectorWith(c).resolveKeyContent('digit', 3)).toBeNull();
        const d = base(); d.smallNumbers = on({ min: 5, max: 10 }); d.largeNumbers = off();
        expect(await selectorWith(d).resolveKeyContent('digit', 3)).toBeNull();
        expect((await selectorWith(d).resolveKeyContent('digit', 6)).item.value).toBe(6);
    });
});

describe('resolveKeyContent other', () => {
    test('other keys and unknown kinds are random', async () => {
        expect(await selectorWith(base()).resolveKeyContent('other', null)).toBeNull();
        expect(await selectorWith(base()).resolveKeyContent('banana', 1)).toBeNull();
    });
    test('no config means random', async () => {
        const sel = new ContentSelector({ configManager: null });
        expect(await sel.resolveKeyContent('letter', 'A')).toBeNull();
    });
});
