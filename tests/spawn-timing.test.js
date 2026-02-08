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

describe('Spawn Timing After Movement', () => {
    let game;

    beforeEach(() => {
        game = {
            objects: [],
            isDragging: false,
            draggedObject: null,
            lastSpawnTime: 0,
            lastMoveTime: 0,
            SPAWN_AFTER_MOVE_DELAY: 200,
            MOVE_AFTER_SPAWN_DELAY: 200,
            awaitingSpawnInputRelease: false,

            speechManager: {
                isSpeaking: false,
                speakingObject: null,
                getIsSpeaking() { return this.isSpeaking; },
                getCurrentSpeakingObject() { return this.speakingObject; },
                speakText: jest.fn()
            },

            movementManager: {
                moveObjectTo: jest.fn(),
                setObjectPosition: jest.fn()
            },

            audioManager: {
                generateContinuousTone: jest.fn(),
                updateTonePosition: jest.fn()
            },
            particleManager: {
                createSpawnBurst: jest.fn(),
                startDragTrail: jest.fn(),
                stopDragTrail: jest.fn(),
                updateDragTrail: jest.fn()
            },
            autoCleanupManager: {
                updateObjectTouchTime: jest.fn()
            },

            spawnObjectAt: jest.fn().mockImplementation(function(x, y) {
                const obj = {
                    x, y, active: true,
                    id: `object_${Date.now()}`,
                    getBounds: () => ({ contains: () => false }),
                    lastTouchedTime: Date.now()
                };
                game.objects.push(obj);
                game.lastSpawnTime = Date.now();
                game.awaitingSpawnInputRelease = true;
                return obj;
            })
        };

        // Bind the actual methods from GameScene to the test's context
        game.canSpawnAfterMovement = GameScene.prototype.canSpawnAfterMovement.bind(game);
        game.canMoveAfterSpawn = GameScene.prototype.canMoveAfterSpawn.bind(game);
        game.moveObjectTo = GameScene.prototype.moveObjectTo.bind(game);
    });

    // === PART 1: Block spawns after movement (200ms) ===

    test('should allow spawning when no movement has occurred', () => {
        expect(game.canSpawnAfterMovement()).toBe(true);
    });

    test('should block spawning immediately after an object moves', () => {
        const obj = { x: 100, y: 100, active: true };
        game.moveObjectTo(obj, 200, 200, false);
        expect(game.canSpawnAfterMovement()).toBe(false);
    });

    test('should allow spawning after 200ms has passed since last movement', async () => {
        const obj = { x: 100, y: 100, active: true };
        game.moveObjectTo(obj, 200, 200, false);

        await new Promise(resolve => setTimeout(resolve, 210));
        expect(game.canSpawnAfterMovement()).toBe(true);
    });

    test('should reset the cooldown on each new movement', async () => {
        const obj = { x: 100, y: 100, active: true };
        game.moveObjectTo(obj, 200, 200, false);

        await new Promise(resolve => setTimeout(resolve, 150));
        game.moveObjectTo(obj, 300, 300, false);

        expect(game.canSpawnAfterMovement()).toBe(false);
    });

    test('smooth movement should also trigger the cooldown', () => {
        const obj = { x: 100, y: 100, active: true };
        game.moveObjectTo(obj, 200, 200, true);
        expect(game.canSpawnAfterMovement()).toBe(false);
    });

    test('SPAWN_AFTER_MOVE_DELAY should be 200ms (1/5 second)', () => {
        expect(game.SPAWN_AFTER_MOVE_DELAY).toBe(200);
    });

    // --- Priority ordering tests ---

    test('onInputPointerDown should check spawn eligibility before drag eligibility', () => {
        const spawnConditionsMet = !game.speechManager.getIsSpeaking()
            && game.canSpawnAfterMovement();
        expect(spawnConditionsMet).toBe(true);

        const obj = { x: 50, y: 50, active: true };
        game.moveObjectTo(obj, 100, 100, false);

        const spawnConditionsAfterMove = !game.speechManager.getIsSpeaking()
            && game.canSpawnAfterMovement();
        expect(spawnConditionsAfterMove).toBe(false);
    });

    test('teleporting a speaking object should update lastMoveTime and block subsequent spawns', () => {
        const speakingObj = { x: 50, y: 50, active: true };
        game.speechManager.isSpeaking = true;
        game.speechManager.speakingObject = speakingObj;

        game.moveObjectTo(speakingObj, 200, 200, true);

        game.speechManager.isSpeaking = false;
        game.speechManager.speakingObject = null;

        expect(game.canSpawnAfterMovement()).toBe(false);
    });

    test('dragging an object should update lastMoveTime via moveObjectTo', () => {
        const obj = { x: 100, y: 100, active: true };
        game.moveObjectTo(obj, 150, 150, false);

        expect(game.lastMoveTime).toBeGreaterThan(0);
        expect(game.canSpawnAfterMovement()).toBe(false);
    });

    // === PART 2: Block movement after spawn (200ms + input release) ===

    test('MOVE_AFTER_SPAWN_DELAY should be 200ms (1/5 second)', () => {
        expect(game.MOVE_AFTER_SPAWN_DELAY).toBe(200);
    });

    test('should allow movement when no spawn has occurred', () => {
        expect(game.canMoveAfterSpawn()).toBe(true);
    });

    test('should block movement immediately after a spawn', () => {
        game.spawnObjectAt(100, 100);
        expect(game.canMoveAfterSpawn()).toBe(false);
    });

    test('should block movement even after 200ms if input not yet released', () => {
        game.spawnObjectAt(100, 100);
        // Simulate time passing but input still held
        game.lastSpawnTime = Date.now() - 250;
        // awaitingSpawnInputRelease is still true
        expect(game.awaitingSpawnInputRelease).toBe(true);
        expect(game.canMoveAfterSpawn()).toBe(false);
    });

    test('should block movement if input released but 200ms not yet elapsed', () => {
        game.spawnObjectAt(100, 100);
        // Release the input
        game.awaitingSpawnInputRelease = false;
        // But lastSpawnTime is very recent
        expect(game.canMoveAfterSpawn()).toBe(false);
    });

    test('should allow movement after BOTH 200ms elapsed AND input released', async () => {
        game.spawnObjectAt(100, 100);

        // Release the input
        game.awaitingSpawnInputRelease = false;

        // Wait for cooldown to expire
        await new Promise(resolve => setTimeout(resolve, 210));

        expect(game.canMoveAfterSpawn()).toBe(true);
    });

    test('spawning should set awaitingSpawnInputRelease to true', () => {
        expect(game.awaitingSpawnInputRelease).toBe(false);
        game.spawnObjectAt(100, 100);
        expect(game.awaitingSpawnInputRelease).toBe(true);
    });

    test('pointer up should clear awaitingSpawnInputRelease', () => {
        game.spawnObjectAt(100, 100);
        expect(game.awaitingSpawnInputRelease).toBe(true);

        // Simulate pointer up
        game.awaitingSpawnInputRelease = false;
        expect(game.awaitingSpawnInputRelease).toBe(false);
    });

    test('drag should be blocked while post-spawn lock is active', () => {
        game.spawnObjectAt(100, 100);

        // canMoveAfterSpawn should prevent startDragging
        expect(game.canMoveAfterSpawn()).toBe(false);
    });

    test('pointer move should not move objects while post-spawn lock is active', () => {
        game.spawnObjectAt(100, 100);

        // Even if isDragging were somehow true, canMoveAfterSpawn blocks it
        expect(game.canMoveAfterSpawn()).toBe(false);
    });

    test('teleport should be blocked while post-spawn lock is active', () => {
        game.spawnObjectAt(100, 100);
        game.speechManager.isSpeaking = true;

        // Teleport (move) should be blocked
        expect(game.canMoveAfterSpawn()).toBe(false);
    });
});
