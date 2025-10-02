/**
 * Integration tests for skip config functionality
 * Tests the critical bug fix: router.allowToyAccess() must be called before redirect
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

// Simple AppRoutes mock to test skip config flow
class TestAppRoutes {
    constructor(shouldSkip = false) {
        this.router = new Router();
        this.configManager = new MockConfigManager(shouldSkip);
        this.setupRoutes();
    }

    setupRoutes() {
        // Simulate the real routes from routes.js
        this.router.addRoute('/', () => {
            this.showConfigScreen();
        });

        this.router.addRoute('/toy', () => {
            if (!this.router.isToyAccessAllowed()) {
                console.log('Direct toy access denied, redirecting to config');
                this.router.replace('/');
                return;
            }
            console.log('Toy access allowed, showing toy screen');
        });
    }

    showConfigScreen(forceShow = false) {
        // Check if we should skip config and go straight to toy
        if (!forceShow && this.configManager.shouldSkipConfig()) {
            if (this.router.getCurrentRoute() !== '/toy') {
                console.log('Skipping config, redirecting to toy');
                // CRITICAL FIX: Allow toy access before redirecting
                this.router.allowToyAccess();
                this.router.replace('/toy');
            }
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
        // Setup minimal window mock
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

    test('should NOT create redirect loop when skip config is enabled', () => {
        const appRoutes = new TestAppRoutes(true); // shouldSkip = true

        // Initialize at root
        appRoutes.router.init();

        // Verify flow:
        // 1. Start at "/" -> calls showConfigScreen()
        // 2. Skip config is enabled -> calls allowToyAccess() then replace('/toy')
        // 3. Navigate to "/toy" -> guard check passes because access is allowed
        // 4. No redirect loop!

        expect(appRoutes.router.isToyAccessAllowed()).toBe(true);
        expect(appRoutes.router.getCurrentRoute()).toBe('/toy');
        expect(mockHistory.replaceState).toHaveBeenCalledWith({}, '', '/toy');
    });

    test('should redirect to "/" if skip config but NO allowToyAccess() call (demonstrates the bug)', () => {
        // Create a broken version that doesn't call allowToyAccess()
        let redirectCount = 0;
        const MAX_REDIRECTS = 3;

        class BrokenAppRoutes extends TestAppRoutes {
            showConfigScreen(forceShow = false) {
                if (!forceShow && this.configManager.shouldSkipConfig()) {
                    if (this.router.getCurrentRoute() !== '/toy') {
                        redirectCount++;
                        if (redirectCount > MAX_REDIRECTS) {
                            // Prevent infinite loop in test
                            return;
                        }
                        // BUG: Missing router.allowToyAccess() call!
                        this.router.replace('/toy');
                    }
                    return;
                }
            }
        }

        const brokenApp = new BrokenAppRoutes(true);
        brokenApp.router.init();

        // The redirect loop protection kicked in
        expect(redirectCount).toBeGreaterThan(MAX_REDIRECTS);
        expect(brokenApp.router.isToyAccessAllowed()).toBe(false);

        // This would cause an infinite loop in a real browser!
    });

    test('should show config normally when skip is disabled', () => {
        const appRoutes = new TestAppRoutes(false); // shouldSkip = false

        appRoutes.router.init();

        // Should stay on config screen
        expect(appRoutes.router.getCurrentRoute()).toBe('/');
        expect(appRoutes.router.isToyAccessAllowed()).toBe(false);
        expect(mockHistory.replaceState).not.toHaveBeenCalled();
    });

    test('should show config even with skip when forceShow=true (admin route)', () => {
        const appRoutes = new TestAppRoutes(true); // shouldSkip = true

        // Directly call showConfigScreen with forceShow=true (like /admin route does)
        appRoutes.showConfigScreen(true); // forceShow = true

        // Should NOT skip to toy when forceShow is true
        expect(mockHistory.replaceState).not.toHaveBeenCalledWith({}, '', '/toy');
        expect(appRoutes.router.isToyAccessAllowed()).toBe(false); // Access not granted
    });
});
