// Mock Phaser and all game dependencies before importing GameScene
jest.mock('phaser', () => ({
    __esModule: true,
    default: {
        Scene: class Scene {
            constructor() {}
        },
        GameObjects: {
            Container: class Container {}
        }
    },
    Scene: class Scene {
        constructor() {}
    }
}));

jest.mock('../src/config/ConfigManager.js', () => ({
    ConfigManager: jest.fn()
}));
jest.mock('../src/positioning/PositioningSystem.js', () => ({
    PositioningSystem: jest.fn()
}));
jest.mock('../src/game/systems/AudioManager.js', () => ({
    AudioManager: jest.fn()
}));
jest.mock('../src/game/systems/InputManager.js', () => ({
    InputManager: jest.fn()
}));
jest.mock('../src/game/systems/ParticleManager.js', () => ({
    ParticleManager: jest.fn()
}));
jest.mock('../src/game/systems/RenderManager.js', () => ({
    RenderManager: jest.fn()
}));
jest.mock('../src/game/systems/SpeechManager.js', () => ({
    SpeechManager: jest.fn()
}));
jest.mock('../src/game/objects/ObjectManager.js', () => ({
    ObjectManager: jest.fn()
}));
jest.mock('../src/game/systems/ObjectCountingRenderer.js', () => ({
    ObjectCountingRenderer: jest.fn()
}));
jest.mock('../src/ui/ResourceBar.js', () => ({
    ResourceBar: jest.fn()
}));
jest.mock('../src/game/systems/MovementManager.js', () => ({
    MovementManager: jest.fn()
}));
jest.mock('../src/game/systems/AutoCleanupManager.js', () => ({
    AutoCleanupManager: jest.fn()
}));
jest.mock('../src/game/systems/GridManager.js', () => ({
    __esModule: true,
    default: jest.fn()
}));

import { GameScene } from '../src/game.js';

// startDragging/stopDragging used `this.scene.tweens` (ScenePlugin has no tweens) and threw
// TypeError, which broke drag state. Scene tweens live on `this.tweens`.
describe('GameScene drag tweens', () => {
    function makeGame() {
        return {
            isDragging: false,
            draggedObject: null,
            tweens: { add: jest.fn() },
            scene: {}, // like Phaser's ScenePlugin: no tweens/add here
            particleManager: { startDragTrail: jest.fn(), stopDragTrail: jest.fn() }
        };
    }

    test('startDragging scales up via scene tweens without throwing', () => {
        const game = makeGame();
        const obj = { active: true, id: 'o1' };
        expect(() => GameScene.prototype.startDragging.call(game, obj, 10, 10)).not.toThrow();
        expect(game.isDragging).toBe(true);
        expect(game.tweens.add).toHaveBeenCalledWith(expect.objectContaining({ targets: obj, scaleX: 1.15 }));
    });

    test('stopDragging clears drag state and scales back down', () => {
        const game = makeGame();
        const obj = { active: true, id: 'o1' };
        game.isDragging = true;
        game.draggedObject = obj;
        expect(() => GameScene.prototype.stopDragging.call(game)).not.toThrow();
        expect(game.isDragging).toBe(false);
        expect(game.draggedObject).toBeNull();
        expect(game.tweens.add).toHaveBeenCalledWith(expect.objectContaining({ targets: obj, scaleX: 1.0 }));
    });
});
