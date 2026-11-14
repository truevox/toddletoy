/**
 * @jest-environment jsdom
 *
 * Regression: dragging used `scene.scene.tweens` (Phaser's ScenePlugin has no
 * `tweens`), so every drag threw, the trail never started and drag state was
 * never cleared. The tween manager lives on the scene itself: `scene.tweens`.
 */
import { SceneInputHandler } from '../src/game/systems/SceneInputHandler.js';

function makePhaserLikeScene() {
    return {
        // Phaser.Scene#scene is the ScenePlugin - it has NO tweens manager
        scene: { pause: jest.fn(), resume: jest.fn() },
        tweens: { add: jest.fn() },
        particleManager: { startDragTrail: jest.fn(), stopDragTrail: jest.fn() },
        isDragging: false,
        draggedObject: null
    };
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

    test('startDragging scales the object up via the scene tween manager and starts the trail', () => {
        expect(() => handler.startDragging(obj, 10, 20)).not.toThrow();

        expect(scene.tweens.add).toHaveBeenCalledWith(
            expect.objectContaining({ targets: obj, scaleX: 1.15, scaleY: 1.15 })
        );
        expect(scene.particleManager.startDragTrail).toHaveBeenCalledWith(obj);
        expect(scene.isDragging).toBe(true);
        expect(scene.draggedObject).toBe(obj);
    });

    test('stopDragging scales back, stops the trail and clears drag state', () => {
        handler.startDragging(obj, 10, 20);
        scene.tweens.add.mockClear();

        expect(() => handler.stopDragging()).not.toThrow();

        expect(scene.tweens.add).toHaveBeenCalledWith(
            expect.objectContaining({ targets: obj, scaleX: 1.0, scaleY: 1.0 })
        );
        expect(scene.particleManager.stopDragTrail).toHaveBeenCalledWith(obj);
        expect(scene.isDragging).toBe(false);
        expect(scene.draggedObject).toBeNull();
    });
});

describe('drag end persists the new position', () => {
    test('stopDragging saves game state', () => {
        const { SceneInputHandler } = require('../src/game/systems/SceneInputHandler.js');
        const scene = {
            draggedObject: { id: 1, active: true },
            isDragging: true,
            tweens: { add: jest.fn() },
            particleManager: { stopDragTrail: jest.fn() },
            saveGameState: jest.fn()
        };
        new SceneInputHandler(scene).stopDragging();
        expect(scene.saveGameState).toHaveBeenCalledTimes(1);
        expect(scene.isDragging).toBe(false);
    });
});
