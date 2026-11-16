/**
 * @jest-environment jsdom
 *
 * Regression: dragging used `scene.scene.tweens` (Phaser's ScenePlugin has no
 * `tweens`), so every drag threw, the trail never started and drag state was
 * never cleared. The tween manager lives on the scene itself: `scene.tweens`.
 */
import { SceneInputHandler } from '../src/game/systems/SceneInputHandler.js';
import { installPointerState } from '../src/game/input/pointerState.js';

function makePhaserLikeScene() {
    return installPointerState({
        // Phaser.Scene#scene is the ScenePlugin - it has NO tweens manager
        scene: { pause: jest.fn(), resume: jest.fn() },
        tweens: { add: jest.fn() },
        particleManager: { startDragTrail: jest.fn(), stopDragTrail: jest.fn() }
    })
}

describe('Drag scale feedback', () => {
    let scene, handler, obj;

    beforeEach(() => {
        jest.spyOn(console, 'log').mockImplementation(() => {});
        scene = makePhaserLikeScene();
        handler = new SceneInputHandler(scene);
        obj = { id: 'obj-1', active: true };
    });

    afterEach(() => jest.restoreAllMocks());

    // Changed with Stage 2 motion: the 1.15x lift is now a factor ObjectMotion applies while
    // scene.draggedObject is set (tests/object-motion.test.js); nobody tweens glyph scale directly.
    test('startDragging marks the object dragged (no scale tween) and starts the trail', () => {
        expect(() => handler.startDragging(obj, 10, 20)).not.toThrow();

        expect(scene.tweens.add).not.toHaveBeenCalled();
        expect(scene.particleManager.startDragTrail).toHaveBeenCalledWith(obj);
        expect(scene.isDragging).toBe(true);
        expect(scene.draggedObject).toBe(obj);
    });

    test('stopDragging stops the trail and clears drag state (motion eases the scale back)', () => {
        handler.startDragging(obj, 10, 20);

        expect(() => handler.stopDragging()).not.toThrow();

        expect(scene.tweens.add).not.toHaveBeenCalled();
        expect(scene.particleManager.stopDragTrail).toHaveBeenCalledWith(obj);
        expect(scene.isDragging).toBe(false);
        expect(scene.draggedObject).toBeNull();
    });
});

describe('drag end persists the new position', () => {
    test('stopDragging saves game state', () => {
        const { SceneInputHandler } = require('../src/game/systems/SceneInputHandler.js');
        const scene = installPointerState({
            tweens: { add: jest.fn() },
            particleManager: { stopDragTrail: jest.fn() },
            saveGameState: jest.fn()
        });
        scene.draggedObject = { id: 1, active: true };
        new SceneInputHandler(scene).stopDragging();
        expect(scene.saveGameState).toHaveBeenCalledTimes(1);
        expect(scene.isDragging).toBe(false);
    });
});
