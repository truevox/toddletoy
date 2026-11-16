/**
 * @jest-environment jsdom
 *
 * Several fingers at once: SceneInputHandler (per-finger tap/drag/spawn) and PointerInput (palm, cancel).
 */
import { SceneInputHandler } from '../src/game/systems/SceneInputHandler.js';
import { PointerInput } from '../src/game/input/PointerInput.js';
import { installPointerState } from '../src/game/input/pointerState.js';

const glyph = (id, x, y) => ({ id, active: true, x, y, getBounds: () => ({ x: x - 30, y: y - 30, width: 60, height: 60, contains: (px, py) => Math.abs(px - x) < 30 && Math.abs(py - y) < 30 }) });

function makeScene(objs) {
    let handler;
    const scene = {
        objects: objs, isFullyInitialized: true, gridMode: { enabled: false },
        speechManager: { getIsSpeaking: () => false, speakText: jest.fn() },
        autoCleanupManager: { updateObjectTouchTime: jest.fn() },
        particleManager: { startDragTrail: jest.fn(), stopDragTrail: jest.fn(), updateDragTrail: jest.fn() },
        audioManager: { playPickup: jest.fn(), playDragStep: jest.fn(), playTap: jest.fn() },
        objectMotion: { react: jest.fn() },
        canSpawnAfterMovement: () => true,
        getObjectUnderPointer: (x, y) => handler.getObjectUnderPointer(x, y),
        spawnAndAnnounce: jest.fn(async (x, y) => { scene.objects.push(glyph('n' + scene.objects.length, x, y)); }),
        saveGameState: jest.fn(),
        moveObjectTo: jest.fn((o, x, y) => { o.x = x; o.y = y; }),
        startDragging: (o, x, y, id) => handler.startDragging(o, x, y, id),
        stopDragging: (id, opts) => handler.stopDragging(id, opts)
    };
    installPointerState(scene);
    handler = new SceneInputHandler(scene);
    return { scene, handler };
}

describe('SceneInputHandler with several fingers', () => {
    let now;
    beforeEach(() => { now = 1000; jest.spyOn(Date, 'now').mockImplementation(() => now); });
    afterEach(() => jest.restoreAllMocks());

    test('fingers on empty space each spawn, even at the same moment', async () => {
        const { scene, handler } = makeScene([]);
        await Promise.all([1, 2, 3].map(id => handler.onInputPointerDown({ id, x: id * 100, y: 50, touch: true })));
        expect(scene.spawnAndAnnounce).toHaveBeenCalledTimes(3);
    });

    test('two fingers drag two objects at once, each to its own end point', async () => {
        const a = glyph('a', 100, 100), b = glyph('b', 300, 300);
        const { scene, handler } = makeScene([a, b]);
        await handler.onInputPointerDown({ id: 1, x: 100, y: 100, touch: true });
        await handler.onInputPointerDown({ id: 2, x: 300, y: 300, touch: true });
        expect(scene.getDraggedObjects()).toEqual([a, b]);
        handler.onInputPointerMove({ id: 1, x: 150, y: 120 });
        handler.onInputPointerMove({ id: 2, x: 260, y: 340 });
        expect([a.x, a.y, b.x, b.y]).toEqual([150, 120, 260, 340]);
        handler.onInputPointerUp({ id: 1, x: 150, y: 120 });
        expect(scene.getDraggedObjects()).toEqual([b]);
        expect(scene.isDragging).toBe(true);
        handler.onInputPointerUp({ id: 2, x: 260, y: 340 });
        expect(scene.isDragging).toBe(false);
        expect(scene.draggedObject).toBeNull();
    });

    test('a second finger on an already-dragged object does nothing', async () => {
        const a = glyph('a', 100, 100);
        const { scene, handler } = makeScene([a]);
        await handler.onInputPointerDown({ id: 1, x: 100, y: 100, touch: true });
        await handler.onInputPointerDown({ id: 2, x: 105, y: 100, touch: true });
        handler.onInputPointerMove({ id: 2, x: 200, y: 200 });
        expect(scene.spawnAndAnnounce).not.toHaveBeenCalled();
        expect(a.x).toBe(100);
        handler.onInputPointerUp({ id: 2, x: 200, y: 200 });
        expect(scene.getDraggedObjects()).toEqual([a]); // finger 1 still holds it
    });

    test('a finger landing just beside a dragged (lifted) object does not spawn under it', async () => {
        const a = glyph('a', 100, 100);
        const { scene, handler } = makeScene([a]);
        await handler.onInputPointerDown({ id: 1, x: 100, y: 100, touch: true });
        await handler.onInputPointerDown({ id: 2, x: 100, y: 100 + 40, touch: true }); // outside the box, inside its lift margin
        expect(scene.spawnAndAnnounce).not.toHaveBeenCalled();
        await handler.onInputPointerDown({ id: 3, x: 100, y: 100 + 120, touch: true }); // clearly apart
        expect(scene.spawnAndAnnounce).toHaveBeenCalledTimes(1);
    });

    test('one finger dragging does not stop another spawning; its own spawn lock is its own', async () => {
        const a = glyph('a', 100, 100);
        const { scene, handler } = makeScene([a]);
        await handler.onInputPointerDown({ id: 1, x: 100, y: 100, touch: true });
        now += 50;
        handler.onInputPointerMove({ id: 1, x: 160, y: 100 });
        await handler.onInputPointerDown({ id: 2, x: 400, y: 400, touch: true });
        expect(scene.spawnAndAnnounce).toHaveBeenCalledTimes(1);
        // finger 2 cannot grab what it just made...
        const made = scene.objects[scene.objects.length - 1];
        handler.onInputPointerUp({ id: 2, x: 400, y: 400 });
        await handler.onInputPointerDown({ id: 2, x: 400, y: 400, touch: true });
        expect(scene.isObjectDragged(made)).toBe(false);
        // ...but finger 3 can
        await handler.onInputPointerDown({ id: 3, x: 400, y: 400, touch: true });
        expect(scene.isObjectDragged(made)).toBe(true);
    });

    test('each finger decides tap versus drag on its own', async () => {
        const a = glyph('a', 100, 100), b = glyph('b', 300, 300);
        const { scene, handler } = makeScene([a, b]);
        await handler.onInputPointerDown({ id: 1, x: 100, y: 100, touch: true });
        await handler.onInputPointerDown({ id: 2, x: 300, y: 300, touch: true });
        handler.onInputPointerMove({ id: 1, x: 100, y: 100 + 80 });
        now += 100;
        handler.onInputPointerUp({ id: 1, x: 100, y: 180 });
        handler.onInputPointerUp({ id: 2, x: 301, y: 300 });
        expect(scene.objectMotion.react).toHaveBeenCalledTimes(1);
        expect(scene.objectMotion.react).toHaveBeenCalledWith(b);
    });

    test('a cancelled pointer drops its drag without a tap and is remembered as cancelled', async () => {
        const a = glyph('a', 100, 100);
        const { scene, handler } = makeScene([a]);
        await handler.onInputPointerDown({ id: 1, x: 100, y: 100, touch: true });
        handler.onInputPointerUp({ id: 1, x: 100, y: 100, canceled: true });
        expect(scene.isDragging).toBe(false);
        expect(scene.objectMotion.react).not.toHaveBeenCalled();
        expect(scene.pointerRegistry.wasCancelled(a)).toBe(true);
        expect(scene.particleManager.stopDragTrail).toHaveBeenCalledWith(a);
    });

    test('a palm spawns once on empty space and only pats an object', async () => {
        const a = glyph('a', 100, 100);
        const { scene, handler } = makeScene([a]);
        await handler.onInputPointerDown({ id: 1, x: 500, y: 500, touch: true, palm: true });
        handler.onInputPointerUp({ id: 1, x: 500, y: 500, touch: true, palm: true });
        expect(scene.spawnAndAnnounce).toHaveBeenCalledTimes(1);
        await handler.onInputPointerDown({ id: 2, x: 100, y: 100, touch: true, palm: true });
        expect(scene.objectMotion.react).toHaveBeenCalledWith(a);
        expect(scene.isDragging).toBe(false);
        expect(scene.pointerRegistry.size).toBe(0);
    });

    test('an object that vanishes under a finger is forgotten, not stuck', async () => {
        const a = glyph('a', 100, 100);
        const { scene, handler } = makeScene([a]);
        await handler.onInputPointerDown({ id: 1, x: 100, y: 100, touch: true });
        a.active = false;
        handler.onInputPointerMove({ id: 1, x: 150, y: 100 });
        expect(scene.isDragging).toBe(false);
    });
});

describe('PointerInput', () => {
    let events, scene, pi;
    const touch = (id, x, y, extra = {}) => ({ id, x, y, wasTouch: true, ...extra });
    beforeEach(() => {
        jest.useFakeTimers();
        events = [];
        scene = { events: { emit: jest.fn((n, d) => events.push([n, d])) }, scale: { width: 800, height: 600 }, input: { manager: { pointers: [] } } };
        pi = new PointerInput({ scene, emit: (n, d) => events.push([n, d]), pointerIsDown: false });
    });
    afterEach(() => { pi.destroy(); jest.useRealTimers(); });
    const names = () => events.map(e => e[0]);

    test('the mouse goes through at once with its id', () => {
        pi.onDown({ id: 0, x: 10, y: 20 });
        expect(events).toEqual([['pointerDown', { x: 10, y: 20, id: 0, touch: false }]]);
        pi.onMove({ id: 0, x: 15, y: 20 });
        pi.onUp({ id: 0, x: 15, y: 20 });
        expect(names()).toEqual(['pointerDown', 'pointerMove', 'pointerUp']);
    });

    test('spread-out fingers each land after the short window', () => {
        [touch(1, 50, 50), touch(2, 600, 100), touch(3, 300, 500)].forEach(p => pi.onDown(p));
        expect(events).toHaveLength(0);
        jest.advanceTimersByTime(60);
        expect(events.filter(e => e[0] === 'pointerDown').map(e => e[1].id)).toEqual([1, 2, 3]);
    });

    test('a five-contact palm is one soft touch at its centre, and its members stay silent', () => {
        [touch(1, 300, 300), touch(2, 340, 310), touch(3, 320, 350), touch(4, 360, 340), touch(5, 330, 320)].forEach(p => pi.onDown(p));
        jest.advanceTimersByTime(60);
        const downs = events.filter(e => e[0] === 'pointerDown');
        expect(downs).toHaveLength(1);
        expect(downs[0][1]).toMatchObject({ palm: true, x: 330, y: 324 });
        const before = events.length;
        pi.onMove(touch(2, 345, 315));
        [1, 2, 3, 4, 5].forEach(id => pi.onUp(touch(id, 330, 330)));
        expect(events.slice(before).filter(e => e[0] !== 'pointerUp' || !e[1].palm)).toHaveLength(0);
        expect(pi.anyDown).toBe(false);
    });

    test('a finger that moves inside the window lands where it went down, then follows', () => {
        pi.onDown(touch(1, 100, 100));
        pi.onMove(touch(1, 140, 120));
        jest.advanceTimersByTime(60);
        expect(events).toEqual([
            ['pointerDown', { x: 100, y: 100, id: 1, touch: true }],
            ['pointerMove', { x: 140, y: 120, id: 1, touch: true }]
        ]);
    });

    test('a finger that lifts before the window closes still lands, then lifts', () => {
        pi.onDown(touch(1, 50, 50));
        pi.onUp(touch(1, 50, 50));
        expect(names()).toEqual(['pointerDown', 'pointerUp']);
    });

    test('a cancelled touch is released as cancelled', () => {
        pi.onDown(touch(1, 50, 50));
        jest.advanceTimersByTime(60);
        pi.onUp(touch(1, 50, 50, { wasCanceled: true }));
        expect(events[events.length - 1][1]).toMatchObject({ id: 1, canceled: true });
    });

    test('a pointer Phaser says is up but never reported is released on the next event', () => {
        pi.onDown(touch(1, 50, 50));
        jest.advanceTimersByTime(60);
        scene.input.manager.pointers = [{ id: 1, isDown: false }, { id: 2, isDown: true }];
        pi.onDown(touch(2, 400, 400));
        expect(events.some(e => e[0] === 'pointerUp' && e[1].id === 1 && e[1].canceled)).toBe(true);
    });

    test('cancelAll (app switch) releases everything', () => {
        pi.onDown({ id: 0, x: 1, y: 1 });
        pi.onDown(touch(3, 400, 400));
        jest.advanceTimersByTime(60);
        events.length = 0;
        pi.cancelAll();
        expect(events.filter(e => e[0] === 'pointerUp').map(e => e[1].id).sort()).toEqual([0, 3]);
        expect(pi.anyDown).toBe(false);
    });

    test('presses on the exit control are ignored, however many fingers', () => {
        const canvas = {};
        scene.game = { canvas };
        pi.onDown({ id: 0, x: 400, y: 300, downElement: { tagName: 'BUTTON' } }); // started on a DOM control
        pi.onDown(touch(1, 770, 30, { downElement: { tagName: 'BUTTON' } }));
        jest.advanceTimersByTime(60);
        expect(events).toHaveLength(0);
        pi.onDown({ id: 0, x: 400, y: 300, downElement: canvas });
        expect(events).toHaveLength(1);
    });

    test('a mouse press echoing a touch is not a second finger', () => {
        pi.onDown(touch(1, 100, 100));
        jest.advanceTimersByTime(60);
        events.length = 0;
        pi.onUp(touch(1, 100, 100));
        pi.onDown({ id: 0, x: 101, y: 100, wasTouch: false });
        expect(events.filter(e => e[0] === 'pointerDown')).toHaveLength(0);
    });
});
