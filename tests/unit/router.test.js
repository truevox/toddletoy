/**
 * Unit tests for Router class
 * Following the 9 test scenarios from Custom Client-Side Routing Specification
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

// Mock window.location
const createMockLocation = (pathname = '/') => ({
    pathname,
    href: `http://localhost${pathname}`,
    search: '',
    hash: ''
});

// Mock window.history
const createMockHistory = () => {
    const history = {
        pushState: jest.fn(),
        replaceState: jest.fn(),
        back: jest.fn(),
        forward: jest.fn(),
        state: null
    };
    return history;
};

describe('Router', () => {
    let router;
    let mockLocation;
    let mockHistory;
    let popstateListeners;
    let originalWindow;

    beforeEach(() => {
        // Save original window
        originalWindow = global.window;

        // Reset localStorage
        localStorageMock.clear();

        // Setup window mocks
        mockLocation = createMockLocation('/');
        mockHistory = createMockHistory();
        popstateListeners = [];

        // Create a mock window object with all necessary properties
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

    afterEach(() => {
        popstateListeners = [];
        // Restore original window
        global.window = originalWindow;
    });

    // Test Scenario 1: Default Route Initialization
    describe('1. Default Route Initialization', () => {
        test('should initialize at base URL "/" and call default route handler', () => {
            const mockHandler = jest.fn();
            router = new Router();
            router.addRoute('/', mockHandler);

            router.init();

            expect(router.getCurrentRoute()).toBe('/');
            expect(mockHandler).toHaveBeenCalledTimes(1);
        });
    });

    // Test Scenario 2: Route Registration and Navigation
    describe('2. Route Registration and Navigation', () => {
        test('should register route and call handler on navigate', () => {
            const mockHandler = jest.fn();
            router = new Router();
            router.addRoute('/test', mockHandler);

            router.navigate('/test');

            expect(mockHandler).toHaveBeenCalledTimes(1);
            expect(router.getCurrentRoute()).toBe('/test');
            expect(mockHistory.pushState).toHaveBeenCalledWith({}, '', '/test');
        });

        test('should not navigate if already on the same route', () => {
            const mockHandler = jest.fn();
            router = new Router();
            router.addRoute('/test', mockHandler);

            router.navigate('/test');
            router.navigate('/test'); // Try again

            expect(mockHandler).toHaveBeenCalledTimes(1); // Should only be called once
            expect(mockHistory.pushState).toHaveBeenCalledTimes(1);
        });
    });

    // Test Scenario 3: Replace State Navigation
    describe('3. Replace State Navigation', () => {
        test('should use replaceState and call handler', () => {
            const mockHandler = jest.fn();
            router = new Router();
            router.addRoute('/replace-test', mockHandler);

            router.replace('/replace-test');

            expect(mockHandler).toHaveBeenCalledTimes(1);
            expect(router.getCurrentRoute()).toBe('/replace-test');
            expect(mockHistory.replaceState).toHaveBeenCalledWith({}, '', '/replace-test');
        });
    });

    // Test Scenario 4: Prevent Direct Toy Access (Guard)
    describe('4. Prevent Direct Toy Access', () => {
        test('should redirect to "/" when accessing /toy without permission', () => {
            // The toy handler WILL be called, but should check permission and redirect
            const toyHandler = jest.fn(() => {
                // Simulating the actual route handler guard logic
                if (!router.isToyAccessAllowed()) {
                    router.replace('/');
                    return;
                }
            });
            const defaultHandler = jest.fn();

            router = new Router();
            router.addRoute('/', defaultHandler);
            router.addRoute('/toy', toyHandler);

            // Simulate direct navigation to /toy
            mockLocation.pathname = '/toy';
            router.init();

            // Handler IS called (to perform the guard check)
            expect(toyHandler).toHaveBeenCalled();
            // But toy access should be denied
            expect(router.isToyAccessAllowed()).toBe(false);
            // Should redirect to default
            expect(mockHistory.replaceState).toHaveBeenCalledWith({}, '', '/');
            expect(router.getCurrentRoute()).toBe('/');
        });

        test('should block direct access even via handleRouteChange', () => {
            const toyHandler = jest.fn(() => {
                // Simulate the guard check in the actual route handler
                if (!router.isToyAccessAllowed()) {
                    router.replace('/');
                    return;
                }
            });
            const defaultHandler = jest.fn();

            router = new Router();
            router.addRoute('/', defaultHandler);
            router.addRoute('/toy', toyHandler);

            router.handleRouteChange('/toy');

            expect(toyHandler).toHaveBeenCalled();
            expect(router.isToyAccessAllowed()).toBe(false);
            expect(mockHistory.replaceState).toHaveBeenCalledWith({}, '', '/');
        });
    });

    // Test Scenario 5: Allow Toy Access via Config Flow
    describe('5. Allow Toy Access via Config Flow', () => {
        test('should allow /toy access after allowToyAccess() is called', () => {
            const toyHandler = jest.fn(() => {
                if (!router.isToyAccessAllowed()) {
                    router.replace('/');
                    return;
                }
                // Toy access allowed, render toy screen
            });

            router = new Router();
            router.addRoute('/toy', toyHandler);

            // Simulate config flow - grant access
            router.allowToyAccess();
            expect(router.isToyAccessAllowed()).toBe(true);

            router.navigate('/toy');

            expect(toyHandler).toHaveBeenCalled();
            expect(router.getCurrentRoute()).toBe('/toy');
            expect(mockHistory.replaceState).not.toHaveBeenCalled(); // No redirect
        });
    });

    // Test Scenario 6: Toy Access Reset on Leaving
    describe('6. Toy Access Reset on Leaving', () => {
        test('should reset toy access when navigating away from /toy', () => {
            const toyHandler = jest.fn();
            const configHandler = jest.fn();

            router = new Router();
            router.addRoute('/', configHandler);
            router.addRoute('/toy', toyHandler);

            // Grant access and navigate to toy
            router.allowToyAccess();
            router.navigate('/toy');
            expect(router.isToyAccessAllowed()).toBe(true);

            // Navigate away
            router.navigate('/');

            expect(router.isToyAccessAllowed()).toBe(false);
            expect(router.getCurrentRoute()).toBe('/');
        });

        test('should revoke access on popstate navigation away from toy', () => {
            const toyHandler = jest.fn();
            const configHandler = jest.fn();

            router = new Router();
            router.addRoute('/', configHandler);
            router.addRoute('/toy', toyHandler);

            // Grant access and navigate to toy
            router.allowToyAccess();
            router.navigate('/toy');
            expect(router.isToyAccessAllowed()).toBe(true);

            // Simulate browser back button (popstate)
            mockLocation.pathname = '/';
            popstateListeners.forEach(handler => handler({ state: null }));

            expect(router.isToyAccessAllowed()).toBe(false);
        });
    });

    // Test Scenario 7: Refresh on Toy Route (State Preservation)
    describe('7. Refresh on Toy Route (State Preservation)', () => {
        test('should preserve toy access on refresh with saved state', () => {
            // Setup: simulate user was on toy with saved state
            localStorage.setItem('toddleToyConfig', JSON.stringify({ test: 'config' }));
            localStorage.setItem('toddleToyGameState', JSON.stringify({ objects: [] }));
            mockLocation.pathname = '/toy';

            const toyHandler = jest.fn(() => {
                if (!router.isToyAccessAllowed()) {
                    router.replace('/');
                    return;
                }
                // Access allowed, show toy
            });

            router = new Router();
            router.addRoute('/toy', toyHandler);

            // Init should detect refresh and allow access
            router.init();

            expect(router.isToyAccessAllowed()).toBe(true);
            expect(router.getCurrentRoute()).toBe('/toy');
            expect(toyHandler).toHaveBeenCalled();
            expect(mockHistory.replaceState).not.toHaveBeenCalled(); // No redirect
        });

        test('should NOT preserve access on /toy without saved state', () => {
            // No saved state in localStorage
            mockLocation.pathname = '/toy';

            const toyHandler = jest.fn(() => {
                if (!router.isToyAccessAllowed()) {
                    router.replace('/');
                    return;
                }
            });
            const defaultHandler = jest.fn();

            router = new Router();
            router.addRoute('/', defaultHandler);
            router.addRoute('/toy', toyHandler);

            router.init();

            // Should redirect because no saved state
            expect(router.isToyAccessAllowed()).toBe(false);
            expect(mockHistory.replaceState).toHaveBeenCalledWith({}, '', '/');
        });
    });

    // Test Scenario 8: Skip Config Setting - CRITICAL BUG TEST
    describe('8. Skip Config Setting', () => {
        test('should redirect to /toy when skip config is enabled', () => {
            // This test documents the expected behavior
            // The actual implementation in routes.js should call router.allowToyAccess()
            // before navigating to /toy to prevent redirect loop

            const toyHandler = jest.fn(() => {
                if (!router.isToyAccessAllowed()) {
                    router.replace('/');
                    return;
                }
            });

            router = new Router();
            router.addRoute('/toy', toyHandler);

            // Simulate the correct skip config flow
            router.allowToyAccess(); // MUST be called before navigate
            router.replace('/toy');

            expect(router.getCurrentRoute()).toBe('/toy');
            expect(router.isToyAccessAllowed()).toBe(true);
            expect(toyHandler).toHaveBeenCalled();
        });
    });

    // Test Scenario 9: Admin Route Bypass
    describe('9. Admin Route Bypass', () => {
        test('should show config screen on /admin route', () => {
            const adminHandler = jest.fn();

            router = new Router();
            router.addRoute('/admin', adminHandler);

            router.navigate('/admin');

            expect(router.getCurrentRoute()).toBe('/admin');
            expect(adminHandler).toHaveBeenCalledTimes(1);
        });

        test('should handle /admin on initial load', () => {
            mockLocation.pathname = '/admin';
            const adminHandler = jest.fn();

            router = new Router();
            router.addRoute('/admin', adminHandler);

            router.init();

            expect(router.getCurrentRoute()).toBe('/admin');
            expect(adminHandler).toHaveBeenCalledTimes(1);
        });
    });

    // Additional Tests: Route Not Found
    describe('Route Not Found Handling', () => {
        test('should redirect to default route for unknown paths', () => {
            const defaultHandler = jest.fn();

            router = new Router();
            router.addRoute('/', defaultHandler);

            router.navigate('/unknown-path');

            expect(mockHistory.replaceState).toHaveBeenCalledWith({}, '', '/');
            expect(router.getCurrentRoute()).toBe('/');
        });
    });

    // Additional Tests: Popstate Event Handling
    describe('Popstate Event Handling', () => {
        test('should handle browser back/forward navigation', () => {
            const handler1 = jest.fn();
            const handler2 = jest.fn();

            router = new Router();
            router.addRoute('/page1', handler1);
            router.addRoute('/page2', handler2);

            router.navigate('/page1');
            router.navigate('/page2');

            // Simulate browser back button
            mockLocation.pathname = '/page1';
            popstateListeners.forEach(h => h({ state: null }));

            expect(router.getCurrentRoute()).toBe('/page1');
            expect(handler1).toHaveBeenCalledTimes(2); // Once on navigate, once on popstate
        });
    });

    // Additional Tests: Utility Methods
    describe('Utility Methods', () => {
        test('isCurrentRoute should return true for current route', () => {
            router = new Router();
            router.addRoute('/test', jest.fn());
            router.navigate('/test');

            expect(router.isCurrentRoute('/test')).toBe(true);
            expect(router.isCurrentRoute('/other')).toBe(false);
        });

        test('resetToyAccess should set allowDirectToyAccess to false', () => {
            router = new Router();
            router.allowToyAccess();
            expect(router.isToyAccessAllowed()).toBe(true);

            router.resetToyAccess();
            expect(router.isToyAccessAllowed()).toBe(false);
        });
    });
});
