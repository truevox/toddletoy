/**
 * @jest-environment jsdom
 */
const mockScene = {
    scene: { pause: jest.fn(), resume: jest.fn(), isPaused: jest.fn(() => false) },
    resetToyState: jest.fn(),
    autoCleanupManager: { updateAutoCleanupConfig: jest.fn() }
};
jest.mock('../src/game.js', () => ({
    ToddlerToyGame: jest.fn().mockImplementation(() => ({ gameInstance: { scene: { getScene: () => mockScene } } }))
}));
jest.mock('../src/config/ConfigScreen.js', () => ({
    ConfigScreen: jest.fn().mockImplementation(() => ({ show: jest.fn(), hide: jest.fn() }))
}));
jest.mock('../src/toys/OrreryToy.js', () => ({ OrreryToy: jest.fn().mockImplementation(() => ({ show: jest.fn(), hide: jest.fn() })) }));
jest.mock('../src/toys/GlobeToy.js', () => ({ GlobeToy: jest.fn().mockImplementation(() => ({ show: jest.fn(), hide: jest.fn() })) }));

import { AppRoutes } from '../src/routes/routes.js';

describe('re-entering the sandbox after a settings change', () => {
    beforeEach(() => {
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        document.body.innerHTML = '';
        localStorage.clear();
        localStorage.setItem('toddleToyConfig', JSON.stringify({}));
        window.history.replaceState({}, '', '/config');
    });
    afterEach(() => jest.restoreAllMocks());

    test('auto-cleanup re-reads the current config', async () => {
        const app = new AppRoutes();
        app.router.allowToyAccess();
        app.router.navigate('/toy');
        await app.loadGameModule();
        await Promise.resolve();
        expect(app.game).toBeTruthy();
        mockScene.autoCleanupManager.updateAutoCleanupConfig.mockClear();

        app.showToyScreen(); // re-entry with the game already created
        expect(mockScene.resetToyState).toHaveBeenCalled();
        expect(mockScene.autoCleanupManager.updateAutoCleanupConfig).toHaveBeenCalledTimes(1);
    });
});
