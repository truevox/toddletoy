/**
 * Integration tests for skip config functionality
 * Tests the critical bug fix: router.allowToyAccess() must be called before redirect
 * Updated for new routing: / → mode selector, /config → config screen
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

// AppRoutes mock matching the real routing from routes.js
class TestAppRoutes {
    constructor(shouldSkip = false) {
        this.router = new Router();
        this.configManager = new MockConfigManager(shouldSkip);
        this.setupRoutes();
    }

    setupRoutes() {
        // / → mode selector (new entry point)
        this.router.addRoute('/', () => {
            this.showModeSelector();
        });

        // /config → config screen
        this.router.addRoute('/config', () => {
            this.showConfigScreen();
        });

        // /toy → sandbox (guard: must have toy access)
        this.router.addRoute('/toy', () => {
            if (!this.router.isToyAccessAllowed()) {
                this.router.replace('/');
                return;
            }
            console.log('Toy access allowed, showing toy screen');
        });
    }

    showModeSelector() {
        console.log('Showing mode selector');
    }

    // Simulate ToyModeSelector._selectMode('sandbox')
    selectSandboxMode() {
        if (this.configManager.shouldSkipConfig()) {
            this.router.allowToyAccess();
            this.router.navigate('/toy');
        } else {
            this.router.navigate('/config');
        }
    }

    showConfigScreen(forceShow = false) {
        if (!forceShow && this.configManager.shouldSkipConfig()) {
            console.log('Skipping config, redirecting to toy');
            this.router.allowToyAccess();
            this.router.replace('/toy');
            return;
        }
        console.log('Showing config screen');
    }
}

describe('Skip Config Flow', () => {
    let mockWindow;
    let mockLocation;
    let mockHistory;

    beforeEach(() => {
        mockLocation = { pathname: '/' };
        mockHistory = {
            pushState: jest.fn(),
            replaceState: jest.fn()
        };

        mockWindow = {
            location: mockLocation,
            history: mockHistory,
            addEventListener: jest.fn(),
            removeEventListener: jest.fn()
        };

        Object.defineProperty(global, 'window', {
            writable: true,
            configurable: true,
            value: mockWindow
        });
    });

    describe('Root route shows mode selector', () => {
        test('navigating to / shows mode selector (not config)', () => {
            const appRoutes = new TestAppRoutes(false);
            appRoutes.router.init();

            // / stays at / (mode selector)
            expect(appRoutes.router.getCurrentRoute()).toBe('/');
            expect(appRoutes.router.isToyAccessAllowed()).toBe(false);
        });

        test('/ does NOT redirect to toy even when skip-config is enabled', () => {
            const appRoutes = new TestAppRoutes(true);
            appRoutes.router.init();

            // Mode selector is shown; skip-config redirect only happens when /config is visited
            expect(appRoutes.router.getCurrentRoute()).toBe('/');
            expect(mockHistory.replaceState).not.toHaveBeenCalledWith({}, '', '/toy');
        });
    });

    describe('Mode selector sandbox path', () => {
        test('selectSandboxMode skips config and goes to /toy when skip-config enabled', () => {
            const appRoutes = new TestAppRoutes(true);
            appRoutes.router.init();

            appRoutes.selectSandboxMode();

            expect(appRoutes.router.isToyAccessAllowed()).toBe(true);
            expect(appRoutes.router.getCurrentRoute()).toBe('/toy');
        });

        test('selectSandboxMode navigates to /config when skip-config disabled', () => {
            const appRoutes = new TestAppRoutes(false);
            appRoutes.router.init();

            appRoutes.selectSandboxMode();

            expect(appRoutes.router.getCurrentRoute()).toBe('/config');
            expect(appRoutes.router.isToyAccessAllowed()).toBe(false);
        });
    });

    describe('/config route skip-config redirect', () => {
        test('should NOT create redirect loop when skip config is enabled via /config', () => {
            const appRoutes = new TestAppRoutes(true);
            appRoutes.router.init();

            // Simulate user navigating to /config (e.g., via back button or direct URL)
            appRoutes.router.navigate('/config');

            // allowToyAccess() called before replace('/toy') — no loop
            expect(appRoutes.router.isToyAccessAllowed()).toBe(true);
            expect(appRoutes.router.getCurrentRoute()).toBe('/toy');
            expect(mockHistory.replaceState).toHaveBeenCalledWith({}, '', '/toy');
        });

        test('should block /toy if allowToyAccess() not called (demonstrates the bug)', () => {
            class BrokenAppRoutes extends TestAppRoutes {
                showConfigScreen(forceShow = false) {
                    if (!forceShow && this.configManager.shouldSkipConfig()) {
                        // BUG: Missing router.allowToyAccess() call!
                        this.router.replace('/toy');
                        return;
                    }
                }
            }

            const brokenApp = new BrokenAppRoutes(true);
            brokenApp.router.init();
            brokenApp.router.navigate('/config');

            // Without allowToyAccess(), /toy is denied and user ends up back at /
            expect(brokenApp.router.isToyAccessAllowed()).toBe(false);
            expect(brokenApp.router.getCurrentRoute()).toBe('/');
        });

        test('should show config normally when skip is disabled', () => {
            const appRoutes = new TestAppRoutes(false);
            appRoutes.router.init();
            appRoutes.router.navigate('/config');

            expect(appRoutes.router.getCurrentRoute()).toBe('/config');
            expect(appRoutes.router.isToyAccessAllowed()).toBe(false);
        });

        test('should show config even with skip when forceShow=true (admin route)', () => {
            const appRoutes = new TestAppRoutes(true);
            appRoutes.router.init();

            appRoutes.showConfigScreen(true);

            expect(mockHistory.replaceState).not.toHaveBeenCalledWith({}, '', '/toy');
            expect(appRoutes.router.isToyAccessAllowed()).toBe(false);
        });
    });

    describe('/toy access guard', () => {
        test('direct /toy access without allowToyAccess redirects to /', () => {
            const appRoutes = new TestAppRoutes(false);
            appRoutes.router.init();

            appRoutes.router.navigate('/toy');

            expect(appRoutes.router.getCurrentRoute()).toBe('/');
            expect(appRoutes.router.isToyAccessAllowed()).toBe(false);
        });
    });
});
