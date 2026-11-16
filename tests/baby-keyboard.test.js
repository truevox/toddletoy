// KeyboardInput: content/position per key, auto-repeat and per-key guard, shortcut and screen pass-through.
import { KeyboardInput, KEY_GUARD_MS } from '../src/game/input/KeyboardInput.js';

const instances = [];
afterEach(() => { instances.splice(0).forEach(k => k.destroy()); document.body.innerHTML = ''; });

function setup({ width = 1000, height = 800, active = true } = {}) {
    const target = window;
    const scene = { scale: { width, height }, sys: { isActive: () => active } };
    const events = [];
    let t = 1000;
    const kb = new KeyboardInput(scene, (name, data) => events.push({ name, data }), { now: () => t, target });
    instances.push(kb);
    const press = (props = {}, el = document.body) => {
        const e = new KeyboardEvent('keydown', { key: 'a', code: 'KeyA', bubbles: true, cancelable: true, ...props });
        el.dispatchEvent(e);
        return e;
    };
    const release = (props = {}, el = document.body) => el.dispatchEvent(new KeyboardEvent('keyup', { key: 'a', code: 'KeyA', bubbles: true, ...props }));
    return { kb, scene, target, events, press, release, advance: (ms) => { t += ms; }, presses: () => events.filter(e => e.name === 'keyPress').map(e => e.data) };
}

describe('content and position per key', () => {
    test('a letter key emits that letter at its place on the keyboard', () => {
        const s = setup();
        s.press({ key: 'b', code: 'KeyB' });
        const [p] = s.presses();
        expect(p).toMatchObject({ code: 'KeyB', kind: 'letter', value: 'B' });
        expect(p.position.x).toBeGreaterThan(100);
        expect(p.position.x).toBeLessThan(900);
        expect(p.position.y).toBeGreaterThan(80);
        expect(p.position.y).toBeLessThan(720);
    });
    test('Q is left of P and both are above Z', () => {
        const s = setup();
        s.press({ key: 'q', code: 'KeyQ' }); s.press({ key: 'p', code: 'KeyP' }); s.press({ key: 'z', code: 'KeyZ' });
        const [q, p, z] = s.presses().map(e => e.position);
        expect(q.x).toBeLessThan(p.x);
        expect(q.y).toBeCloseTo(p.y, 5);
        expect(z.y).toBeGreaterThan(q.y);
        expect(q.y).toBeLessThan(400);
    });
    test('positions follow the view size (resize)', () => {
        const s = setup({ width: 1000, height: 800 });
        s.press({ key: 'q', code: 'KeyQ' }); s.release({ code: 'KeyQ' });
        s.scene.scale.width = 500; s.scene.scale.height = 400;
        s.advance(1000);
        s.press({ key: 'q', code: 'KeyQ' });
        const [a, b] = s.presses().map(e => e.position);
        expect(b.x).toBeCloseTo(a.x / 2, 5);
        expect(b.y).toBeCloseTo(a.y / 2, 5);
    });
    test('positions always stay inside the screen, for every known code', () => {
        const s = setup();
        ['Backquote', 'Backspace', 'Enter', 'ArrowRight', 'Space', 'Numpad9', 'NumpadAdd', 'Slash'].forEach((code, i) => {
            s.advance(1000);
            s.press({ key: 'x', code }); s.release({ code });
        });
        s.presses().forEach(p => {
            expect(p.position.x).toBeGreaterThanOrEqual(100); expect(p.position.x).toBeLessThanOrEqual(900);
            expect(p.position.y).toBeGreaterThanOrEqual(80); expect(p.position.y).toBeLessThanOrEqual(720);
        });
    });
    test('a key with no known place gets a random on-screen position', () => {
        const s = setup();
        const seen = new Set();
        for (let i = 0; i < 8; i++) { s.advance(1000); s.press({ key: 'MediaTrackNext', code: 'MediaTrackNext' }); s.release({ code: 'MediaTrackNext' }); }
        s.presses().forEach(p => {
            expect(p.kind).toBe('other');
            expect(p.position.x).toBeGreaterThanOrEqual(100); expect(p.position.x).toBeLessThanOrEqual(900);
            seen.add(Math.round(p.position.x));
        });
        expect(seen.size).toBeGreaterThan(1);
    });
    test('digit and other keys carry their kind', () => {
        const s = setup();
        s.press({ key: '7', code: 'Digit7' }); s.press({ key: ' ', code: 'Space' }); s.press({ key: 'Enter', code: 'Enter' });
        expect(s.presses().map(p => [p.kind, p.value])).toEqual([['digit', 7], ['other', null], ['other', null]]);
    });
});

describe('auto-repeat and the per-key guard', () => {
    test('auto-repeat is ignored', () => {
        const s = setup();
        s.press(); s.press({ repeat: true }); s.press({ repeat: true });
        expect(s.presses()).toHaveLength(1);
    });
    test('a held key without a repeat flag is still one press', () => {
        const s = setup();
        s.press(); s.advance(500); s.press(); s.advance(500); s.press();
        expect(s.presses()).toHaveLength(1);
    });
    test('releasing and pressing again responds, unless it is faster than the guard', () => {
        const s = setup();
        s.press(); s.release();
        s.advance(KEY_GUARD_MS - 20); s.press(); s.release();
        expect(s.presses()).toHaveLength(1);
        s.advance(KEY_GUARD_MS + 20); s.press();
        expect(s.presses()).toHaveLength(2);
    });
    test('different keys never guard each other', () => {
        const s = setup();
        'ABCDEFGHIJKLMNOP'.split('').forEach(c => s.press({ key: c, code: `Key${c}` }));
        expect(s.presses()).toHaveLength(16);
    });
    test('losing window focus forgets held keys', () => {
        const s = setup();
        s.press(); window.dispatchEvent(new Event('blur')); s.advance(500); s.press();
        expect(s.presses()).toHaveLength(2);
    });
    test('keyRelease fires when the last key comes up', () => {
        const s = setup();
        s.press({ key: 'a', code: 'KeyA' }); s.press({ key: 'b', code: 'KeyB' });
        s.release({ code: 'KeyA' });
        expect(s.events.filter(e => e.name === 'keyRelease')).toHaveLength(0);
        s.release({ code: 'KeyB' });
        expect(s.events.filter(e => e.name === 'keyRelease')).toHaveLength(1);
    });
});

describe('shortcuts and other screens pass through', () => {
    test.each([['ctrlKey'], ['metaKey'], ['altKey']])('%s combos are not touched', (mod) => {
        const s = setup();
        const e = s.press({ key: 'r', code: 'KeyR', [mod]: true });
        expect(e.defaultPrevented).toBe(false);
        expect(s.events).toHaveLength(0);
    });
    test.each(['Tab', 'Escape', 'F5', 'F12', 'Shift', 'Control', 'ContextMenu'])('%s is left alone', (k) => {
        const s = setup();
        const e = s.press({ key: k, code: k });
        expect(e.defaultPrevented).toBe(false);
        expect(s.events).toHaveLength(0);
    });
    test('only page-scrolling keys are prevented', () => {
        const s = setup();
        expect(s.press({ key: ' ', code: 'Space' }).defaultPrevented).toBe(true);
        s.advance(500);
        expect(s.press({ key: 'ArrowDown', code: 'ArrowDown' }).defaultPrevented).toBe(true);
        s.advance(500);
        expect(s.press({ key: 'a', code: 'KeyA' }).defaultPrevented).toBe(false);
        expect(s.press({ key: 'Enter', code: 'Enter' }).defaultPrevented).toBe(false);
        expect(s.press({ key: 'Backspace', code: 'Backspace' }).defaultPrevented).toBe(false);
        expect(s.presses()).toHaveLength(5);
    });
    test('Space held down keeps being kept from scrolling, but spawns once', () => {
        const s = setup();
        s.press({ key: ' ', code: 'Space' });
        const e = s.press({ key: ' ', code: 'Space', repeat: true });
        expect(e.defaultPrevented).toBe(true);
        expect(s.presses()).toHaveLength(1);
    });
    test('nothing happens while the toy is not the visible screen', () => {
        const s = setup({ active: false });
        const e = s.press({ key: ' ', code: 'Space' });
        expect(e.defaultPrevented).toBe(false);
        expect(s.events).toHaveLength(0);
    });
    test('typing in a field is left alone', () => {
        const s = setup();
        const input = document.createElement('input');
        document.body.appendChild(input);
        const e = s.press({ key: 'a', code: 'KeyA' }, input);
        expect(e.defaultPrevented).toBe(false);
        expect(s.events).toHaveLength(0);
        const area = document.createElement('textarea');
        document.body.appendChild(area);
        s.press({ key: ' ', code: 'Space' }, area);
        expect(s.events).toHaveLength(0);
    });
    test('Space/Enter on a focused button belong to the button, other keys still play', () => {
        const s = setup();
        const btn = document.createElement('button');
        document.body.appendChild(btn);
        expect(s.press({ key: ' ', code: 'Space' }, btn).defaultPrevented).toBe(false);
        s.press({ key: 'Enter', code: 'Enter' }, btn);
        expect(s.events).toHaveLength(0);
        s.press({ key: 'b', code: 'KeyB' }, btn);
        expect(s.presses()).toHaveLength(1);
    });
    test('destroy removes the listeners', () => {
        const s = setup();
        s.kb.destroy();
        s.press();
        expect(s.events).toHaveLength(0);
    });
});

describe('setPaused', () => {
    test('a covered toy ignores keys immediately and forgets held ones; resuming works again', () => {
        const s = setup();
        s.press();
        s.kb.setPaused(true);
        const e = s.press({ key: ' ', code: 'Space' });
        expect(e.defaultPrevented).toBe(false);
        expect(s.presses()).toHaveLength(1);
        s.kb.setPaused(false);
        s.advance(500);
        s.press();
        expect(s.presses()).toHaveLength(2);
    });
});
