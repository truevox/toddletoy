/**
 * @jest-environment jsdom
 */
const mockScene = { scene: { pause: jest.fn(), resume: jest.fn(), isPaused: jest.fn(() => true) }, resetToyState: jest.fn() };
jest.mock('../src/game.js', () => ({
    // Mirrors the real ResponsiveGameManager shape (gameInstance is the Phaser.Game)
    ToddlerToyGame: jest.fn().mockImplementation(() => ({ gameInstance: { scene: { getScene: () => mockScene } } }))
}));
jest.mock('../src/config/ConfigScreen.js', () => ({
    ConfigScreen: jest.fn().mockImplementation(() => ({ show: jest.fn(), hide: jest.fn() }))
}));
jest.mock('../src/toys/OrreryToy.js', () => ({
    OrreryToy: jest.fn().mockImplementation(() => ({ show: jest.fn(), hide: jest.fn() }))
}));
jest.mock('../src/toys/GlobeToy.js', () => ({
    GlobeToy: jest.fn().mockImplementation(() => ({ show: jest.fn(), hide: jest.fn() }))
}));

import { AppRoutes } from '../src/routes/routes.js';
import { Router } from '../src/routes/Router.js';

const holdExit = () => {
    const btn = document.querySelector('.parent-exit-btn');
    const e = new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 });
    Object.defineProperty(e, 'pointerId', { value: 1 });
    Object.defineProperty(e, 'pointerType', { value: 'touch' });
    btn.dispatchEvent(e);
    jest.advanceTimersByTime(2000);
};
const visible = () => {
    const btn = document.querySelector('.parent-exit-btn');
    return !!btn && btn.style.display !== 'none';
};

describe('Parent exit wiring in AppRoutes / Router', () => {
    let app;

    beforeEach(() => {
        jest.useFakeTimers();
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        document.body.innerHTML = '';
        document.head.innerHTML = '';
        localStorage.clear();
        localStorage.setItem('toddleToyConfig', JSON.stringify({}));
        mockScene.resetToyState.mockClear();
        window.history.replaceState({}, '', '/config');
        app = new AppRoutes();
    });
    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    const enterToy = () => {
        app.router.allowToyAccess();
        app.router.navigate('/toy');
    };

    test('exit button exists only while the sandbox toy is the current screen', () => {
        expect(visible()).toBe(false);          // config
        enterToy();
        expect(app.currentScreen).toBe('toy');
        expect(visible()).toBe(true);
        app.router.navigate('/orrery');
        expect(visible()).toBe(false);          // orrery
        app.router.navigate('/');
        expect(visible()).toBe(false);          // selector
    });

    test('holding the button leaves the toy for the selector and unlocks the router', () => {
        enterToy();
        expect(app.router.isToyLocked()).toBe(true);
        holdExit();
        expect(window.location.pathname).toBe('/');
        expect(app.currentScreen).toBe('selector');
        expect(app.router.isToyLocked()).toBe(false);
        expect(mockScene.resetToyState).toHaveBeenCalled();
        expect(visible()).toBe(false);
    });

    test('the sandbox can be entered again after exiting', () => {
        enterToy();
        holdExit();
        enterToy();
        expect(app.currentScreen).toBe('toy');
        expect(visible()).toBe(true);
    });

    test('browser back (popstate) is still blocked while locked in the toy', () => {
        enterToy();
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
        expect(window.location.pathname).toBe('/toy');
        expect(app.router.isToyLocked()).toBe(true);
        expect(app.currentScreen).toBe('toy');
    });

    test('Router: programmatic navigation to a registered route unlocks, unknown routes stay locked', () => {
        const router = new Router();
        router.addRoute('/toy', jest.fn());
        router.addRoute('/', jest.fn());
        router.navigate('/toy');
        expect(router.isToyLocked()).toBe(true);
        router.navigate('/nowhere');
        expect(router.isToyLocked()).toBe(true);
        expect(window.location.pathname).toBe('/toy');
        router.navigate('/');
        expect(router.isToyLocked()).toBe(false);
    });
});
