/**
 * Regression tests for leaving the sandbox: every object must be removed
 * (the reset loop used to skip every other one), short-lived effects must be
 * destroyed, and held keys must be forgotten.
 */
import { GameStateStore } from '../src/game/systems/GameStateStore.js';
import { InputManager } from '../src/game/systems/InputManager.js';
import { audioManagerMock } from './helpers/mock-audio-manager.js';

function makeScene(count) {
    const scene = {
        objects: Array.from({ length: count }, (_, i) => ({ id: `o${i}` })),
        audioManager: audioManagerMock(),
        speechManager: { cancelSpeech: jest.fn() },
        movementManager: { clearAllMovements: jest.fn() },
        particleManager: { clearTransientEffects: jest.fn() },
        inputManager: { clearHeldKeys: jest.fn() },
        removed: [],
    };
    // Mirrors ObjectLifecycle.removeObject: it splices the live array
    scene.removeObject = (obj) => {
        scene.removed.push(obj.id);
        const i = scene.objects.indexOf(obj);
        if (i !== -1) scene.objects.splice(i, 1);
    };
    return scene;
}

describe('resetToyState', () => {
    test('removes every object even though removeObject mutates the list', () => {
        const scene = makeScene(5);
        new GameStateStore(scene).resetToyState();
        expect(scene.removed).toEqual(['o0', 'o1', 'o2', 'o3', 'o4']);
        expect(scene.objects).toEqual([]);
    });

    test('clears transient effects and held keys', () => {
        const scene = makeScene(1);
        new GameStateStore(scene).resetToyState();
        expect(scene.particleManager.clearTransientEffects).toHaveBeenCalled();
        expect(scene.inputManager.clearHeldKeys).toHaveBeenCalled();
    });
});

describe('InputManager.clearHeldKeys', () => {
    test('forgets held keys so the next press counts as the first', () => {
        const im = Object.create(InputManager.prototype);
        im.keysHeld = new Set(['Q', 'W']);
        im.randomKeyPositions = new Map([['KeyM', { x: 1, y: 2 }]]);
        im.keyPositions = {};
        im.averageKeyPosition = { x: 5, y: 5 };
        im.clearHeldKeys();
        expect(im.keysHeld.size).toBe(0);
        expect(im.randomKeyPositions.size).toBe(0);
        expect(im.averageKeyPosition).toEqual({ x: 0, y: 0 });
    });
});
