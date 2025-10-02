/**
 * Tests for Locked Toy Mode
 * Once user enters /toy, they are locked in and can only escape by:
 * - Manually typing /admin or / in URL bar
 * - Manually typing any other registered route
 *
 * Blocked escapes:
 * - Browser back/forward buttons (popstate)
 * - Page refresh
 * - Typing unknown/non-existent routes
 */

import { Router } from '../../src/routes/Router.js';

// Mock localStorage
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => { store[key] = value.toString(); },
        removeItem: (key) => { delete store[key]; },
        clear: () => { store = {}; }
    };
})();

describe('Locked Toy Mode', () => {
    let router;
    let mockLocation;
    let mockHistory;
    let popstateListeners;

    beforeEach(() => {
        // Reset localStorage
        localStorageMock.clear();

        // Setup mocks
        mockLocation = { pathname: '/' };
        mockHistory = {
            pushState: jest.fn(),
            replaceState: jest.fn()
        };
        popstateListeners = [];

        Object.defineProperty(global, 'window', {
            writable: true,
            configurable: true,
            value: {
                location: mockLocation,
                history: mockHistory,
                addEventListener: jest.fn((event, handler) => {
                    if (event === 'popstate') {
                        popstateListeners.push(handler);
                    }
                }),
                removeEventListener: jest.fn()
            }
        });

        Object.defineProperty(global, 'localStorage', {
            writable: true,
            configurable: true,
            value: localStorageMock
        });
    });

    describe('Entering Locked Mode', () => {
        test('should lock toy mode when entering /toy route', () => {
            router = new Router();
            router.addRoute('/toy', jest.fn());

            // Grant access and navigate to toy
            router.allowToyAccess();
            router.navigate('/toy');

            // Should now be locked
            expect(router.isToyLocked()).toBe(true);
            expect(router.getCurrentRoute()).toBe('/toy');
        });

        test('should NOT lock when on other routes', () => {
            router = new Router();
            router.addRoute('/', jest.fn());

            router.navigate('/');

            expect(router.isToyLocked()).toBe(false);
        });
    });

    describe('Blocked Navigation (Popstate)', () => {
        test('should block back button navigation from /toy', () => {
            router = new Router();
            router.addRoute('/', jest.fn());
            router.addRoute('/toy', jest.fn());

            // Navigate to config, then toy
            router.navigate('/');
            router.allowToyAccess();
            router.navigate('/toy');

            expect(router.isToyLocked()).toBe(true);
            mockHistory.replaceState.mockClear();

            // Simulate back button (popstate)
            mockLocation.pathname = '/';
            popstateListeners.forEach(handler => handler({ state: null }));

            // Should be blocked and redirected back to /toy
            expect(mockHistory.replaceState).toHaveBeenCalledWith({}, '', '/toy');
            expect(router.getCurrentRoute()).toBe('/toy');
            expect(router.isToyLocked()).toBe(true); // Still locked
        });

        test('should block forward button navigation from /toy', () => {
            router = new Router();
            router.addRoute('/', jest.fn());
            router.addRoute('/toy', jest.fn());

            router.allowToyAccess();
            router.navigate('/toy');

            mockHistory.replaceState.mockClear();

            // Simulate forward button (popstate)
            mockLocation.pathname = '/some-future-route';
            popstateListeners.forEach(handler => handler({ state: null }));

            // Should stay in /toy
            expect(mockHistory.replaceState).toHaveBeenCalledWith({}, '', '/toy');
            expect(router.isToyLocked()).toBe(true);
        });
    });

    describe('Blocked Navigation (Unknown Routes)', () => {
        test('should block manual navigation to unknown routes', () => {
            router = new Router();
            router.addRoute('/toy', jest.fn());

            router.allowToyAccess();
            router.navigate('/toy');

            mockHistory.replaceState.mockClear();

            // Try to manually navigate to unknown route
            router.navigate('/asdfasdf');

            // Should be blocked and stay in /toy
            expect(mockHistory.replaceState).toHaveBeenCalledWith({}, '', '/toy');
            expect(router.getCurrentRoute()).toBe('/toy');
            expect(router.isToyLocked()).toBe(true);
        });

        test('should block manual navigation to non-existent routes', () => {
            router = new Router();
            router.addRoute('/toy', jest.fn());

            router.allowToyAccess();
            router.navigate('/toy');

            mockHistory.replaceState.mockClear();

            // Try various garbage URLs
            router.navigate('/random123');
            expect(router.getCurrentRoute()).toBe('/toy');

            router.navigate('/notaroute');
            expect(router.getCurrentRoute()).toBe('/toy');

            expect(router.isToyLocked()).toBe(true);
        });
    });

    describe('Allowed Navigation (Manual URL Entry)', () => {
        test('should allow manual navigation to / and unlock', () => {
            const configHandler = jest.fn();
            router = new Router();
            router.addRoute('/', configHandler);
            router.addRoute('/toy', jest.fn());

            router.allowToyAccess();
            router.navigate('/toy');
            expect(router.isToyLocked()).toBe(true);

            // Manually navigate to / (simulate typing in URL bar)
            router.navigate('/');

            // Should unlock and navigate
            expect(router.isToyLocked()).toBe(false);
            expect(router.getCurrentRoute()).toBe('/');
            expect(configHandler).toHaveBeenCalled();
        });

        test('should allow manual navigation to /admin and unlock', () => {
            const adminHandler = jest.fn();
            router = new Router();
            router.addRoute('/admin', adminHandler);
            router.addRoute('/toy', jest.fn());

            router.allowToyAccess();
            router.navigate('/toy');
            expect(router.isToyLocked()).toBe(true);

            // Manually navigate to /admin
            router.navigate('/admin');

            // Should unlock and navigate
            expect(router.isToyLocked()).toBe(false);
            expect(router.getCurrentRoute()).toBe('/admin');
            expect(adminHandler).toHaveBeenCalled();
        });

        test('should allow manual navigation to any registered route and unlock', () => {
            const settingsHandler = jest.fn();
            router = new Router();
            router.addRoute('/settings', settingsHandler); // Future route
            router.addRoute('/toy', jest.fn());

            router.allowToyAccess();
            router.navigate('/toy');
            expect(router.isToyLocked()).toBe(true);

            // Manually navigate to /settings (a registered route)
            router.navigate('/settings');

            // Should unlock and navigate
            expect(router.isToyLocked()).toBe(false);
            expect(router.getCurrentRoute()).toBe('/settings');
            expect(settingsHandler).toHaveBeenCalled();
        });
    });

    describe('Refresh Behavior', () => {
        test('should stay locked on refresh while in /toy', () => {
            // Setup: user was on /toy with saved state
            localStorage.setItem('toddleToyConfig', JSON.stringify({ test: 'config' }));
            localStorage.setItem('toddleToyGameState', JSON.stringify({ objects: [] }));
            mockLocation.pathname = '/toy';

            router = new Router();
            router.addRoute('/toy', jest.fn());

            // Init should detect refresh and preserve lock
            router.init();

            // Should be locked and on /toy
            expect(router.getCurrentRoute()).toBe('/toy');
            expect(router.isToyLocked()).toBe(true);
        });

        test('should block popstate after refresh (simulated back button)', () => {
            localStorage.setItem('toddleToyConfig', JSON.stringify({ test: 'config' }));
            localStorage.setItem('toddleToyGameState', JSON.stringify({ objects: [] }));
            mockLocation.pathname = '/toy';

            router = new Router();
            router.addRoute('/', jest.fn());
            router.addRoute('/toy', jest.fn());
            router.init();

            mockHistory.replaceState.mockClear();

            // Try to go back via popstate
            mockLocation.pathname = '/';
            popstateListeners.forEach(handler => handler({ state: null }));

            // Should stay locked in /toy
            expect(mockHistory.replaceState).toHaveBeenCalledWith({}, '', '/toy');
            expect(router.isToyLocked()).toBe(true);
        });
    });

    describe('Lock State Transitions', () => {
        test('should unlock when leaving /toy via manual navigation', () => {
            router = new Router();
            router.addRoute('/', jest.fn());
            router.addRoute('/toy', jest.fn());

            router.allowToyAccess();
            router.navigate('/toy');
            expect(router.isToyLocked()).toBe(true);

            // Manually leave
            router.navigate('/');

            expect(router.isToyLocked()).toBe(false);
        });

        test('should re-lock when entering /toy again', () => {
            router = new Router();
            router.addRoute('/', jest.fn());
            router.addRoute('/toy', jest.fn());

            // First visit
            router.allowToyAccess();
            router.navigate('/toy');
            expect(router.isToyLocked()).toBe(true);

            // Leave
            router.navigate('/');
            expect(router.isToyLocked()).toBe(false);

            // Visit again
            router.allowToyAccess();
            router.navigate('/toy');
            expect(router.isToyLocked()).toBe(true);
        });
    });

    describe('Edge Cases', () => {
        test('should not break normal navigation when not locked', () => {
            router = new Router();
            router.addRoute('/', jest.fn());
            router.addRoute('/admin', jest.fn());

            // Normal navigation without toy
            router.navigate('/');
            expect(router.getCurrentRoute()).toBe('/');

            router.navigate('/admin');
            expect(router.getCurrentRoute()).toBe('/admin');

            expect(router.isToyLocked()).toBe(false);
        });

        test('should handle popstate when not locked normally', () => {
            router = new Router();
            router.addRoute('/', jest.fn());
            router.addRoute('/admin', jest.fn());

            router.navigate('/');
            router.navigate('/admin');

            // Popstate back when NOT locked should work normally
            mockLocation.pathname = '/';
            popstateListeners.forEach(handler => handler({ state: null }));

            expect(router.getCurrentRoute()).toBe('/');
            expect(router.isToyLocked()).toBe(false);
        });
    });
});
