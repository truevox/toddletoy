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
import { MovementManager } from '../src/game/systems/MovementManager.js';

jest.unmock('../src/game/systems/MovementManager.js');

function fakeGo(x, y, w, h) {
    const go = {
        x, y, active: true, visible: true,
        getBounds: () => ({ x: go.x - w / 2, y: go.y - h / 2, width: w, height: h }),
        setPosition: jest.fn((nx, ny) => { go.x = nx; go.y = ny; return go; })
    };
    return go;
}

describe('GameScene viewport handling', () => {
    function makeGame(width, height) {
        const game = {
            scale: { width, height },
            lastKnownSize: { width: 1280, height: 800 },
            objects: [],
            saveGameState: jest.fn(),
            inputManager: { handleResize: jest.fn() }
        };
        game.movementManager = new MovementManager(game);
        game.keepObjectInBounds = GameScene.prototype.keepObjectInBounds.bind(game);
        return game;
    }

    beforeEach(() => jest.spyOn(console, 'log').mockImplementation(() => {}));
    afterEach(() => jest.restoreAllMocks());

    test('resize 1280x800 -> 600x900 brings every object inside the new bounds', () => {
        const game = makeGame(600, 900);
        [[200, 200], [1000, 300], [1100, 700], [600, 500]].forEach(([x, y], i) => {
            const o = fakeGo(x, y, 80, 80);
            o.id = `o${i}`;
            game.objects.push(o);
        });

        GameScene.prototype.handleScaleResize.call(game);

        game.objects.forEach(o => {
            const b = o.getBounds();
            expect(b.x).toBeGreaterThanOrEqual(0);
            expect(b.y).toBeGreaterThanOrEqual(0);
            expect(b.x + b.width).toBeLessThanOrEqual(600);
            expect(b.y + b.height).toBeLessThanOrEqual(900);
        });
        expect(game.inputManager.handleResize).toHaveBeenCalledWith({ width: 1280, height: 800 });
        expect(game.lastKnownSize).toEqual({ width: 600, height: 900 });
    });

    test('keepObjectInBounds moves an edge spawn inside and leaves a good spawn alone', () => {
        const game = makeGame(1280, 800);
        const edge = fakeGo(1275, 790, 80, 80);
        const fine = fakeGo(640, 400, 80, 80);
        expect(game.keepObjectInBounds(edge)).toBe(true);
        expect(edge.getBounds().x + 80).toBeLessThanOrEqual(1280);
        expect(edge.getBounds().y + 80).toBeLessThanOrEqual(800);
        expect(game.keepObjectInBounds(fine)).toBe(false);
    });
});
