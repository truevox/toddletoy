// Real InputManager against a mock scene: keyboard coverage, resize, gamepad centring, no debug listeners.
import { InputManager } from '../src/game/systems/InputManager.js';

function makeScene(width = 1280, height = 800) {
    const handlers = {};
    const events = { emit: jest.fn() };
    const scene = {
        scale: { width, height },
        events,
        game: { canvas: { addEventListener: jest.fn() } },
        time: { delayedCall: jest.fn(() => ({ remove: jest.fn() })) },
        input: {
            enabled: true,
            on: jest.fn(),
            off: jest.fn(),
            keyboard: {
                on: jest.fn((name, fn) => { handlers[name] = fn; }),
                off: jest.fn()
            }
        }
    };
    scene.handlers = handlers;
    return scene;
}

const key = (k, extra = {}) => ({ key: k, code: extra.code, preventDefault: jest.fn(), target: { tagName: 'CANVAS' }, ...extra });
const emitted = (scene, name) => scene.events.emit.mock.calls.filter(c => c[0] === `input:${name}`).map(c => c[1]);

describe('InputManager', () => {
    let logSpy;
    beforeEach(() => { logSpy = jest.spyOn(console, 'log').mockImplementation(() => {}); });
    afterEach(() => jest.restoreAllMocks());

    describe('debug noise removed (#8)', () => {
        test('no raw pointer debug listeners and no DOM canvas listeners', () => {
            const scene = makeScene();
            new InputManager(scene);
            const pointerEvents = scene.input.on.mock.calls.map(c => c[0]);
            expect(pointerEvents.sort()).toEqual(['pointerdown', 'pointermove', 'pointerup']);
            expect(scene.game.canvas.addEventListener).not.toHaveBeenCalled();
        });

        test('pointer events do not console.log', () => {
            const scene = makeScene();
            const im = new InputManager(scene);
            logSpy.mockClear();
            im.onPointerDown({ x: 1, y: 2 });
            im.onPointerMove({ x: 3, y: 4 });
            im.onPointerUp({ x: 3, y: 4 });
            expect(logSpy).not.toHaveBeenCalled();
        });
    });

    describe('QWEASDZXC 3x3 grid unchanged (#5)', () => {
        test('positions are exactly the original grid', () => {
            const scene = makeScene(1000, 500);
            const im = new InputManager(scene);
            // gridWidth = 800, start = 100; gridHeight = 400, start = 50
            expect(im.keyPositions.Q).toEqual({ x: 100, y: 50 });
            expect(im.keyPositions.S).toEqual({ x: 100 + 400, y: 50 + 200 });
            expect(im.keyPositions.C).toEqual({ x: 100 + 800, y: 50 + 400 });
        });

        test('pressing Q emits keyPress at the grid position; release emits keyRelease', () => {
            const scene = makeScene(1000, 500);
            const im = new InputManager(scene);
            im.onKeyDown(key('q'));
            expect(emitted(scene, 'keyPress')[0]).toEqual({ key: 'Q', position: { x: 100, y: 50 } });
            im.onKeyUp(key('q'));
            expect(emitted(scene, 'keyRelease')).toHaveLength(1);
        });
    });

    describe('every other printable key plays (#5)', () => {
        test.each(['L', '5', ' ', 'Enter', 'm', '?'])('key %p spawns at an on-screen position', (k) => {
            const scene = makeScene();
            const im = new InputManager(scene);
            const ev = key(k, { code: `Code_${k}` });
            im.onKeyDown(ev);
            const presses = emitted(scene, 'keyPress');
            expect(presses).toHaveLength(1);
            const { x, y } = presses[0].position;
            expect(x).toBeGreaterThan(0);
            expect(x).toBeLessThan(1280);
            expect(y).toBeGreaterThan(0);
            expect(y).toBeLessThan(800);
            expect(ev.preventDefault).toHaveBeenCalled();
            im.onKeyUp(key(k, { code: `Code_${k}` }));
            expect(emitted(scene, 'keyRelease')).toHaveLength(1);
        });

        test('random position is random', () => {
            const scene = makeScene();
            const im = new InputManager(scene);
            const seen = new Set();
            for (let i = 0; i < 12; i++) {
                im.onKeyDown(key('L', { code: 'KeyL' }));
                im.onKeyUp(key('L', { code: 'KeyL' }));
            }
            emitted(scene, 'keyPress').forEach(p => seen.add(`${p.position.x}|${p.position.y}`));
            expect(seen.size).toBeGreaterThan(1);
        });

        test('held-key semantics: second key interpolates, release only when all up', () => {
            const scene = makeScene();
            const im = new InputManager(scene);
            im.onKeyDown(key('L', { code: 'KeyL' }));
            im.onKeyDown(key('5', { code: 'Digit5' }));
            expect(emitted(scene, 'keyPress')).toHaveLength(1);
            expect(emitted(scene, 'keyInterpolate')).toHaveLength(1);
            im.onKeyUp(key('L', { code: 'KeyL' }));
            expect(emitted(scene, 'keyRelease')).toHaveLength(0);
            im.onKeyUp(key('5', { code: 'Digit5' }));
            expect(emitted(scene, 'keyRelease')).toHaveLength(1);
        });

        test('shift changing the key value between down and up does not strand a held key', () => {
            const scene = makeScene();
            const im = new InputManager(scene);
            im.onKeyDown(key('5', { code: 'Digit5' }));
            im.onKeyUp(key('%', { code: 'Digit5' }));
            expect(im.keysHeld.size).toBe(0);
            expect(emitted(scene, 'keyRelease')).toHaveLength(1);
        });

        test('auto-repeat keydown does not respawn', () => {
            const scene = makeScene();
            const im = new InputManager(scene);
            im.onKeyDown(key('L', { code: 'KeyL' }));
            im.onKeyDown(key('L', { code: 'KeyL', repeat: true }));
            expect(emitted(scene, 'keyPress')).toHaveLength(1);
            expect(emitted(scene, 'keyInterpolate')).toHaveLength(0);
        });
    });

    describe('keys that must never be intercepted (#5)', () => {
        test.each([
            ['Control', 'c', { ctrlKey: true }],
            ['Meta', 'r', { metaKey: true }],
            ['Alt', 'd', { altKey: true }],
            ['F5', 'F5', {}],
            ['F12', 'F12', {}],
            ['Tab', 'Tab', {}],
            ['Escape', 'Escape', {}],
            ['Shift', 'Shift', {}],
            ['Control', 'Control', {}],
            ['ArrowLeft', 'ArrowLeft', {}],
            ['Backspace', 'Backspace', {}]
        ])('%s (%s) is ignored', (_n, k, extra) => {
            const scene = makeScene();
            const im = new InputManager(scene);
            const ev = key(k, extra);
            im.onKeyDown(ev);
            expect(ev.preventDefault).not.toHaveBeenCalled();
            expect(scene.events.emit).not.toHaveBeenCalled();
        });

        test('Ctrl+Q does not hijack the grid key either', () => {
            const scene = makeScene();
            const im = new InputManager(scene);
            const ev = key('q', { ctrlKey: true });
            im.onKeyDown(ev);
            expect(ev.preventDefault).not.toHaveBeenCalled();
            expect(scene.events.emit).not.toHaveBeenCalled();
        });

        test('typing into a text field is ignored', () => {
            const scene = makeScene();
            const im = new InputManager(scene);
            const ev = key('l', { target: { tagName: 'INPUT' } });
            im.onKeyDown(ev);
            expect(scene.events.emit).not.toHaveBeenCalled();
        });

        test('Enter/Space on a focused button is left to the button', () => {
            const scene = makeScene();
            const im = new InputManager(scene);
            const ev = key('Enter', { target: { tagName: 'BUTTON' } });
            im.onKeyDown(ev);
            expect(ev.preventDefault).not.toHaveBeenCalled();
            expect(scene.events.emit).not.toHaveBeenCalled();
        });
    });

    describe('resize (#4)', () => {
        test('keyPositions are recomputed for the new size', () => {
            const scene = makeScene(1280, 800);
            const im = new InputManager(scene);
            const before = { ...im.keyPositions.C };
            scene.scale.width = 600;
            scene.scale.height = 900;
            im.handleResize({ width: 1280, height: 800 });
            expect(im.keyPositions.C).not.toEqual(before);
            expect(im.keyPositions.Q).toEqual({ x: 60, y: 90 });
            expect(im.keyPositions.C.x).toBeLessThanOrEqual(600);
        });

        test('gamepad position starts at the real centre and is rescaled on resize', () => {
            const scene = makeScene(1280, 800);
            const im = new InputManager(scene);
            expect(im.currentGamepadPosition).toEqual({ x: 640, y: 400 });
            scene.scale.width = 600;
            scene.scale.height = 900;
            im.handleResize({ width: 1280, height: 800 });
            expect(im.currentGamepadPosition).toEqual({ x: 300, y: 450 });
        });
    });
});
