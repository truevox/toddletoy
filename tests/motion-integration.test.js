/**
 * @jest-environment jsdom
 */
import { ObjectLifecycle } from '../src/game/objects/ObjectLifecycle.js';
import { SceneInputHandler } from '../src/game/systems/SceneInputHandler.js';
import { GameStateStore } from '../src/game/systems/GameStateStore.js';
import { audioManagerMock } from './helpers/mock-audio-manager.js';

function glyph(extra = {}) {
    return { id: 'o1', x: 100, y: 100, width: 80, height: 80, active: true, type: 'emoji', scaleX: 1, scaleY: 1,
        getBounds: () => ({ contains: (x, y) => Math.abs(x - 100) < 40 && Math.abs(y - 100) < 40 }),
        destroy: jest.fn(), ...extra };
}

function lifecycleScene(obj) {
    const scene = {
        objects: [obj],
        audioManager: audioManagerMock(),
        particleManager: { cleanupParticles: jest.fn(), stopDragTrail: jest.fn(), cleanupWordSparkles: jest.fn(), createSpawnBurst: jest.fn() },
        speechManager: { speakText: jest.fn() },
        movementManager: { clearMovement: jest.fn() },
        gridMode: { occupiedCells: new Map() },
        saveGameState: jest.fn(),
        objectMotion: { releaseToGhost: jest.fn(() => true), popIn: jest.fn() }
    };
    return scene;
}

describe('removeObject pops out through a ghost', () => {
    test('leaves scene.objects at once, hands visuals to the ghost, does not destroy synchronously', () => {
        const w = glyph({ id: 'w' });
        const obj = glyph({ allLanguageWords: [{ words: [w] }], componentLayout: { numberModes: [] } });
        const scene = lifecycleScene(obj);
        new ObjectLifecycle(scene).removeObject(obj);
        expect(scene.objects).toHaveLength(0);
        expect(scene.objectMotion.releaseToGhost).toHaveBeenCalledWith(obj);
        expect(obj.destroy).not.toHaveBeenCalled();
        expect(w.destroy).not.toHaveBeenCalled();
        expect(scene.movementManager.clearMovement).toHaveBeenCalledWith('o1');
        expect(scene.saveGameState).toHaveBeenCalled();
    });

    test('without a motion system it still destroys immediately', () => {
        const obj = glyph();
        const scene = lifecycleScene(obj); delete scene.objectMotion;
        new ObjectLifecycle(scene).removeObject(obj);
        expect(obj.destroy).toHaveBeenCalled();
    });

    test('announceObject passes the object colour and kind to the burst', () => {
        const obj = glyph({ type: 'letter', itemData: { color: { hex: '#ff8000' } } });
        const scene = lifecycleScene(obj);
        new ObjectLifecycle(scene).announceObject(obj, 5, 6);
        expect(scene.particleManager.createSpawnBurst).toHaveBeenCalledWith(5, 6, { color: 0xff8000, kind: 'letter' });
    });
});

describe('resetToyState clears ghosts', () => {
    test('calls clearGhosts after removing objects', () => {
        const scene = {
            objects: [], objectMotion: { clearGhosts: jest.fn() },
            audioManager: audioManagerMock(), speechManager: { cancelSpeech: jest.fn() },
            movementManager: { clearAllMovements: jest.fn() },
            removeObject: jest.fn()
        };
        new GameStateStore(scene).resetToyState();
        expect(scene.objectMotion.clearGhosts).toHaveBeenCalled();
    });
});

describe('tap versus drag', () => {
    let scene, handler, obj, now;
    beforeEach(() => {
        now = 1000;
        jest.spyOn(Date, 'now').mockImplementation(() => now);
        obj = glyph();
        scene = {
            objects: [obj], isFullyInitialized: true, isDragging: false, draggedObject: null,
            gridMode: { enabled: false },
            speechManager: { getIsSpeaking: () => false, speakText: jest.fn(), getCurrentSpeakingObject: () => null },
            autoCleanupManager: { updateObjectTouchTime: jest.fn() },
            particleManager: { startDragTrail: jest.fn(), stopDragTrail: jest.fn(), updateDragTrail: jest.fn() },
            audioManager: audioManagerMock(),
            objectMotion: { react: jest.fn() },
            canSpawnAfterMovement: () => true, canMoveAfterSpawn: () => true,
            getObjectUnderPointer: (x, y) => handler.getObjectUnderPointer(x, y),
            spawnAndAnnounce: jest.fn(), saveGameState: jest.fn(),
            moveObjectTo: jest.fn(),
            startDragging: (o, x, y) => handler.startDragging(o, x, y),
            stopDragging: () => handler.stopDragging()
        };
        handler = new SceneInputHandler(scene);
    });
    afterEach(() => jest.restoreAllMocks());

    test('quick press and release re-speaks and reacts without spawning or moving', async () => {
        await handler.onInputPointerDown({ x: 105, y: 100 });
        handler.onInputPointerMove({ x: 108, y: 102 });
        now += 120;
        handler.onInputPointerUp({ x: 108, y: 102 });
        expect(scene.objectMotion.react).toHaveBeenCalledWith(obj);
        expect(scene.speechManager.speakText).toHaveBeenCalledTimes(1);
        expect(scene.speechManager.speakText).toHaveBeenCalledWith(obj, 'both');
        expect(scene.spawnAndAnnounce).not.toHaveBeenCalled();
        expect(scene.moveObjectTo).not.toHaveBeenCalled();
    });

    test('a tap while speech is running speaks once, not twice', async () => {
        scene.speechManager.getIsSpeaking = () => true;
        await handler.onInputPointerDown({ x: 100, y: 100 });
        now += 100;
        handler.onInputPointerUp({ x: 100, y: 100 });
        expect(scene.speechManager.speakText).toHaveBeenCalledTimes(1);
        expect(scene.objectMotion.react).toHaveBeenCalledTimes(1);
    });

    test('a drag moves the object and does not react', async () => {
        await handler.onInputPointerDown({ x: 100, y: 100 });
        handler.onInputPointerMove({ x: 140, y: 100 });
        now += 150;
        handler.onInputPointerUp({ x: 140, y: 100 });
        expect(scene.moveObjectTo).toHaveBeenCalledWith(obj, 140, 100, false);
        expect(scene.objectMotion.react).not.toHaveBeenCalled();
        expect(scene.speechManager.speakText).not.toHaveBeenCalled();
    });

    test('a long press does not react', async () => {
        await handler.onInputPointerDown({ x: 100, y: 100 });
        now += 600;
        handler.onInputPointerUp({ x: 100, y: 100 });
        expect(scene.objectMotion.react).not.toHaveBeenCalled();
    });

    test('a small wobble inside the slop does not shove the object, but a long hold still drags', async () => {
        await handler.onInputPointerDown({ x: 100, y: 100 });
        now += 500;
        handler.onInputPointerMove({ x: 104, y: 100 });
        expect(scene.moveObjectTo).toHaveBeenCalledWith(obj, 104, 100, false);
    });
});
