// Baby keyboard: what each physical key means (content) and where it sits (position), from event.code.
import { classifyKey, keyPlace, scrollsPage } from '../src/game/input/KeyMap.js';

const ev = (key, code, extra = {}) => ({ key, code, ...extra });

describe('classifyKey: content', () => {
    test.each([['a', 'KeyA', 'A'], ['B', 'KeyB', 'B'], ['z', 'KeyZ', 'Z']])('letter key %s -> letter %s', (k, c, v) => {
        expect(classifyKey(ev(k, c))).toEqual({ kind: 'letter', value: v });
    });
    test('a letter is what the key says (AZERTY: physical KeyQ says "a")', () => {
        expect(classifyKey(ev('a', 'KeyQ'))).toEqual({ kind: 'letter', value: 'A' });
    });
    test('a non-Latin layout falls back to the physical letter', () => {
        expect(classifyKey(ev('ы', 'KeyS'))).toEqual({ kind: 'letter', value: 'S' });
    });
    test.each([0, 1, 7, 9])('top-row digit %i is the number %i, shifted or not', (n) => {
        expect(classifyKey(ev(String(n), `Digit${n}`))).toEqual({ kind: 'digit', value: n });
        expect(classifyKey(ev('!', `Digit${n}`, { shiftKey: true }))).toEqual({ kind: 'digit', value: n });
    });
    test('number pad digit keys are digits, with NumLock on or off (the printed label wins)', () => {
        expect(classifyKey(ev('4', 'Numpad4'))).toEqual({ kind: 'digit', value: 4 });
        expect(classifyKey(ev('ArrowLeft', 'Numpad4'))).toEqual({ kind: 'digit', value: 4 });
        expect(classifyKey(ev('+', 'NumpadAdd'))).toEqual({ kind: 'other', value: null });
    });
    test.each([[' ', 'Space'], ['Enter', 'Enter'], ['.', 'Period'], ['ArrowUp', 'ArrowUp'], ['Backspace', 'Backspace'],
        ['MediaPlayPause', 'MediaPlayPause'], ['CapsLock', 'CapsLock'], ['Home', 'Home']])('%p (%s) is an "other" key', (k, c) => {
        expect(classifyKey(ev(k, c))).toEqual({ kind: 'other', value: null });
    });
    test.each([['Tab', 'Tab'], ['Escape', 'Escape'], ['F5', 'F5'], ['F12', 'F12'], ['Shift', 'ShiftLeft'], ['Control', 'ControlRight'],
        ['Alt', 'AltLeft'], ['Meta', 'MetaLeft'], ['Unidentified', ''], ['Dead', 'Quote'], ['ContextMenu', 'ContextMenu']])('%p (%s) is never ours', (k, c) => {
        expect(classifyKey(ev(k, c))).toBeNull();
    });
    test('IME composition is left alone', () => {
        expect(classifyKey(ev('a', 'KeyA', { isComposing: true }))).toBeNull();
        expect(classifyKey(ev('Process', 'KeyA', { keyCode: 229 }))).toBeNull();
    });
});

describe('keyPlace: position on a standard keyboard', () => {
    test('left keys are left of right keys, top row above bottom row', () => {
        const q = keyPlace('KeyQ'), p = keyPlace('KeyP'), z = keyPlace('KeyZ'), d7 = keyPlace('Digit7'), sp = keyPlace('Space');
        expect(q.nx).toBeLessThan(p.nx);
        expect(q.ny).toBeLessThan(z.ny);
        expect(d7.ny).toBeLessThan(q.ny);
        expect(sp.ny).toBeGreaterThan(z.ny);
        expect(sp.nx).toBeGreaterThan(0.4);
        expect(sp.nx).toBeLessThan(0.6);
    });
    test('the old QWEASDZXC grid is generalised in the same arrangement', () => {
        const rows = [['KeyQ', 'KeyW', 'KeyE'], ['KeyA', 'KeyS', 'KeyD'], ['KeyZ', 'KeyX', 'KeyC']];
        rows.forEach((row, r) => row.forEach((c, i) => {
            if (i) expect(keyPlace(c).nx).toBeGreaterThan(keyPlace(row[i - 1]).nx);
            if (r) expect(keyPlace(c).ny).toBeGreaterThan(keyPlace(rows[r - 1][i]).ny);
        }));
    });
    test('every place is inside 0..1', () => {
        ['Backquote', 'Backspace', 'Enter', 'ArrowRight', 'Numpad0', 'NumpadEnter', 'NumLock', 'KeyM'].forEach((c) => {
            const p = keyPlace(c);
            expect(p.nx).toBeGreaterThanOrEqual(0); expect(p.nx).toBeLessThanOrEqual(1);
            expect(p.ny).toBeGreaterThanOrEqual(0); expect(p.ny).toBeLessThanOrEqual(1);
        });
    });
    test('unknown keys have no place', () => {
        expect(keyPlace('MediaPlayPause')).toBeNull();
        expect(keyPlace('')).toBeNull();
    });
    test('the number pad sits on the right', () => {
        expect(keyPlace('Numpad5').nx).toBeGreaterThan(keyPlace('KeyG').nx);
    });
});

describe('scrollsPage', () => {
    test.each(['Space', 'ArrowDown', 'PageDown', 'End'])('%s scrolls', (c) => expect(scrollsPage(c)).toBe(true));
    test.each(['KeyA', 'Enter', 'Backspace', 'Digit1'])('%s does not', (c) => expect(scrollsPage(c)).toBe(false));
});
