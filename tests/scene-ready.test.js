/**
 * @jest-environment jsdom
 */
import { createSceneReady, waitForFonts } from '../src/game/systems/SceneReadiness.js';
import { GameStateStore } from '../src/game/systems/GameStateStore.js';

const STATE_KEY = 'toddleToyGameState';

function setFonts(fonts) {
    Object.defineProperty(document, 'fonts', { value: fonts, configurable: true });
}

afterEach(() => {
    delete document.fonts;
    jest.useRealTimers();
    jest.restoreAllMocks();
    localStorage.clear();
});

describe('waitForFonts', () => {
    test('resolves true when the font loads', async () => {
        setFonts({ load: jest.fn().mockResolvedValue([]), ready: Promise.resolve(), check: () => true });
        await expect(waitForFonts(3000)).resolves.toBe(true);
    });

    test('resolves false (never blocks) when the font never loads', async () => {
        jest.useFakeTimers();
        setFonts({ load: () => new Promise(() => {}), ready: new Promise(() => {}), check: () => false });
        const p = waitForFonts(3000);
        jest.advanceTimersByTime(3001);
        await expect(p).resolves.toBe(false);
    });

    test('resolves true when the Font Loading API is absent', async () => {
        await expect(waitForFonts(3000)).resolves.toBe(true);
    });

    test('a rejected load does not throw', async () => {
        setFonts({ load: jest.fn().mockRejectedValue(new Error('x')), ready: Promise.resolve(), check: () => false });
        await expect(waitForFonts(3000)).resolves.toBe(false);
    });
});

describe('createSceneReady', () => {
    test('resolves once data and fonts are available and marks the scene initialised', async () => {
        setFonts({ load: jest.fn().mockResolvedValue([]), ready: Promise.resolve(), check: () => true });
        const scene = { configManager: {}, preloadGameData: jest.fn().mockResolvedValue(undefined) };
        await createSceneReady(scene);
        expect(scene.preloadGameData).toHaveBeenCalledTimes(1);
        expect(scene.dataLoaded).toBe(true);
        expect(scene.fontsLoaded).toBe(true);
        expect(scene.isFullyInitialized).toBe(true);
    });

    test('a missing font still resolves after the timeout', async () => {
        jest.useFakeTimers();
        setFonts({ load: () => new Promise(() => {}), ready: new Promise(() => {}), check: () => false });
        const scene = { configManager: {}, preloadGameData: jest.fn().mockResolvedValue(undefined) };
        const p = createSceneReady(scene, { fontTimeoutMs: 1000 });
        await jest.advanceTimersByTimeAsync(1001);
        await p;
        expect(scene.isFullyInitialized).toBe(true);
        expect(scene.fontsLoaded).toBe(false);
    });
});

describe('restoreGameState waits on scene.ready instead of polling', () => {
    test('restores exactly once, after ready resolves, with no timers', async () => {
        jest.spyOn(console, 'log').mockImplementation(() => {});
        const timeoutSpy = jest.spyOn(global, 'setTimeout');
        localStorage.setItem(STATE_KEY, JSON.stringify({ objects: [{ id: 1 }], timestamp: Date.now() }));
        let release;
        const scene = {
            isFullyInitialized: false,
            objects: [],
            restoreObject: jest.fn().mockResolvedValue(undefined),
            ready: new Promise((r) => { release = () => { scene.isFullyInitialized = true; r(); }; })
        };
        const p = new GameStateStore(scene).restoreGameState();
        await Promise.resolve();
        expect(scene.restoreObject).not.toHaveBeenCalled();
        release();
        await p;
        expect(scene.restoreObject).toHaveBeenCalledTimes(1);
        expect(timeoutSpy).not.toHaveBeenCalled();
    });
});
