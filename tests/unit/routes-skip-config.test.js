/**
 * Integration tests for the routing flow including mode selector entry point
 * and skip-config functionality.
 *
 * Routing structure (as of v1.0.72+):
 *   /        → ToyModeSelector (new entry point)
 *   /config  → ConfigScreen (was previously /)
 *   /toy     → ToddlerToyGame (access-guarded)
 *   /orrery  → OrreryToy
 *   /globe   → GlobeToy
 */

import { Router } from '../../src/routes/Router.js';

// Mock ConfigManager
class MockConfigManager {
    constructor(shouldSkip = false) {
        this._shouldSkip = shouldSkip;
    }

    shouldSkipConfig() {
        return this._shouldSkip;
    }
}

/**
 * Mirrors the real AppRoutes structure:
 *   /       → showModeSelector()
 *   /config → showConfigScreen()
 *   /toy    → guarded toy screen
 */
class TestAppRoutes {
    constructor(shouldSkip = false) {
        this.router = new Router();
        this.configManager = new MockConfigManager(shouldSkip);
        this.currentScreen = null;
        this.setupRoutes();
    }

    setupRoutes() {
        // Root: mode selector (new entry point — was previously the config screen)
        this.router.addRoute('/', () => {
            this.showModeSelector();
        });

        // Config screen (previously at '/')
        this.router.addRoute('/config', () => {
            this.showConfigScreen();
        });

        this.router.addRoute('/toy', () => {
            if (!this.router.isToyAccessAllowed()) {
                console.log('Direct toy access denied, redirecting to mode selector');
                this.router.replace('/');
                return;
            }
            this.currentScreen = 'toy';
            console.log('Toy access allowed, showing toy screen');
        });
    }

    showModeSelector() {
        this.currentScreen = 'selector';
        console.log('Showing mode selector');
    }

    showConfigScreen(forceShow = false) {
        // Check if we should skip config and go straight to toy
        if (!forceShow && this.configManager.shouldSkipConfig()) {
            if (this.router.getCurrentRoute() !== '/toy') {
                console.log('Skipping config, redirecting to toy');
                // CRITICAL: Allow toy access before redirecting
                this.router.allowToyAccess();
                this.router.replace('/toy');
            }
            return;
        }
        this.currentScreen = 'config';
        console.log('Showing config screen');
    }
}

describe('Mode Selector Entry Point', () => {
    let mockWindow;
    let mockHistory;

    beforeEach(() => {
        mockHistory = { pushState: jest.fn(), replaceState: jest.fn() };
        mockWindow = {
            location: { pathname: '/' },
            history: mockHistory,
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
        };
        Object.defineProperty(global, 'window', { writable: true, configurable: true, value: mockWindow });
    });

    test('root "/" shows mode selector, not config', () => {
        const app = new TestAppRoutes(false);
        app.router.init();

        expect(app.currentScreen).toBe('selector');
        expect(app.router.getCurrentRoute()).toBe('/');
        expect(mockHistory.replaceState).not.toHaveBeenCalled();
    });

    test('navigating to "/config" shows config screen', () => {
        const app = new TestAppRoutes(false);
        app.router.init(); // starts at '/' → mode selector

        app.router.navigate('/config');

        expect(app.currentScreen).toBe('config');
        expect(app.router.getCurrentRoute()).toBe('/config');
    });

    test('direct "/toy" access redirects to mode selector', () => {
        const app = new TestAppRoutes(false);
        mockWindow.location.pathname = '/toy';
        app.router.init();

        // Toy access is denied; should redirect to '/'
        expect(app.currentScreen).toBe('selector');
        expect(app.router.getCurrentRoute()).toBe('/');
    });
});

describe('Skip Config Flow (via /config)', () => {
    let mockWindow;
    let mockHistory;

    beforeEach(() => {
        mockHistory = { pushState: jest.fn(), replaceState: jest.fn() };
        mockWindow = {
            location: { pathname: '/' },
            history: mockHistory,
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
        };
        Object.defineProperty(global, 'window', { writable: true, configurable: true, value: mockWindow });
    });

    test('should NOT create redirect loop when skip config is enabled', () => {
        const app = new TestAppRoutes(true); // shouldSkip = true

        // Navigate to /config (e.g., user clicked Sandbox card)
        app.router.init();           // '/' → mode selector
        app.router.navigate('/config'); // '/config' → skip fires → replace('/toy')

        // Verify flow:
        // 1. /config triggers showConfigScreen()
        // 2. Skip enabled → allowToyAccess() then replace('/toy')
        // 3. /toy guard passes because access is allowed
        expect(app.router.isToyAccessAllowed()).toBe(true);
        expect(app.router.getCurrentRoute()).toBe('/toy');
        expect(app.currentScreen).toBe('toy');
        expect(mockHistory.replaceState).toHaveBeenCalledWith({}, '', '/toy');
    });

    test('should end up at mode selector if skip config but NO allowToyAccess() call (demonstrates the bug)', () => {
        // Without allowToyAccess(), the broken version redirects /toy → / → mode selector
        // (No infinite loop, but user ends up at mode selector instead of the toy)
        class BrokenAppRoutes extends TestAppRoutes {
            showConfigScreen(forceShow = false) {
                if (!forceShow && this.configManager.shouldSkipConfig()) {
                    if (this.router.getCurrentRoute() !== '/toy') {
                        // BUG: Missing router.allowToyAccess() call!
                        this.router.replace('/toy');
                    }
                    return;
                }
            }
        }

        const brokenApp = new BrokenAppRoutes(true);
        brokenApp.router.init();        // '/' → mode selector
        brokenApp.router.navigate('/config'); // '/config' → broken skip → replace('/toy')
        // '/toy' guard fails (allowToyAccess was never called) → replace('/')
        // '/' → mode selector again

        // Bug effect: user ends up back at mode selector instead of in the toy
        expect(brokenApp.router.isToyAccessAllowed()).toBe(false);
        expect(brokenApp.currentScreen).toBe('selector');
        expect(brokenApp.router.getCurrentRoute()).toBe('/');
    });

    test('should show config normally when skip is disabled', () => {
        const app = new TestAppRoutes(false); // shouldSkip = false

        app.router.init();
        app.router.navigate('/config');

        expect(app.currentScreen).toBe('config');
        expect(app.router.getCurrentRoute()).toBe('/config');
        expect(app.router.isToyAccessAllowed()).toBe(false);
        expect(mockHistory.replaceState).not.toHaveBeenCalled();
    });

    test('should show config even with skip when forceShow=true (admin route)', () => {
        const app = new TestAppRoutes(true); // shouldSkip = true

        app.router.init();
        // Directly call showConfigScreen with forceShow=true (like /admin route does)
        app.showConfigScreen(true);

        expect(app.currentScreen).toBe('config');
        expect(mockHistory.replaceState).not.toHaveBeenCalledWith({}, '', '/toy');
        expect(app.router.isToyAccessAllowed()).toBe(false);
    });
});
