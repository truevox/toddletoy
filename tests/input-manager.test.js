// Real InputManager against a mock scene: keyboard wiring, resize, gamepad centring, no debug listeners.
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

    describe('baby keyboard is wired through the window (rules live in baby-keyboard.test.js)', () => {
        const down = (k, code, extra = {}) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, bubbles: true, cancelable: true, ...extra }));
        const up = (k, code) => window.dispatchEvent(new KeyboardEvent('keyup', { key: k, code, bubbles: true }));

        test('a key press reaches the scene as input:keyPress, release as input:keyRelease', () => {
            const scene = makeScene(1000, 500);
            const im = new InputManager(scene);
            down('q', 'KeyQ');
            const [press] = emitted(scene, 'keyPress');
            expect(press).toMatchObject({ code: 'KeyQ', kind: 'letter', value: 'Q' });
            expect(press.position.x).toBeGreaterThan(0);
            up('q', 'KeyQ');
            expect(emitted(scene, 'keyRelease')).toHaveLength(1);
            im.destroy();
        });

        test('no Phaser keyboard queue is used and destroy() stops listening', () => {
            const scene = makeScene();
            const im = new InputManager(scene);
            expect(scene.input.keyboard.on).not.toHaveBeenCalled();
            im.destroy();
            down('w', 'KeyW');
            expect(emitted(scene, 'keyPress')).toHaveLength(0);
        });

        test('the old multi-key interpolation is gone: two keys are two presses', () => {
            const scene = makeScene();
            const im = new InputManager(scene);
            down('l', 'KeyL');
            down('5', 'Digit5');
            expect(emitted(scene, 'keyPress')).toHaveLength(2);
            expect(emitted(scene, 'keyInterpolate')).toHaveLength(0);
            im.destroy();
        });

        test('clearHeldKeys forgets keys that never came up', () => {
            const scene = makeScene();
            const im = new InputManager(scene);
            down('l', 'KeyL');
            expect(im.keyboard.held.size).toBe(1);
            im.clearHeldKeys();
            expect(im.keyboard.held.size).toBe(0);
            im.destroy();
        });
    });

    describe('resize (#4)', () => {
        test('a connected pad starts at the real centre area and its cursor is rescaled on resize', () => {
            const scene = makeScene(1280, 800);
            const im = new InputManager(scene);
            window.dispatchEvent(Object.assign(new Event('gamepadconnected'), { gamepad: { index: 1 } }));
            const before = im.gamepad.cursor(1);
            expect(before.y).toBeCloseTo(400, 0);
            scene.scale.width = 640;
            scene.scale.height = 400;
            im.handleResize({ width: 1280, height: 800 });
            const after = im.gamepad.cursor(1);
            expect(after.x).toBeCloseTo(before.x / 2, 0);
            expect(after.y).toBeCloseTo(200, 0);
            im.destroy();
        });

        test('no pad connected: update() does not ask the browser for pads', () => {
            const scene = makeScene();
            const im = new InputManager(scene);
            const spy = jest.fn(() => []);
            const had = Object.getOwnPropertyDescriptor(navigator, 'getGamepads');
            Object.defineProperty(navigator, 'getGamepads', { value: spy, configurable: true });
            try {
                im.update(); im.update();
                expect(spy).not.toHaveBeenCalled();
            } finally {
                if (had) Object.defineProperty(navigator, 'getGamepads', had); else delete navigator.getGamepads;
                im.destroy();
            }
        });
    });
});
