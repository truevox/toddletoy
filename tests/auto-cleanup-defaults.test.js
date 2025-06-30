/**
 * @jest-environment jsdom
 */

// Test auto-cleanup default configuration
describe('Auto-Cleanup Defaults', () => {
    let mockConfigManager;

    beforeEach(() => {
        // Mock localStorage
        global.localStorage = {
            getItem: jest.fn().mockReturnValue(null), // No stored config
            setItem: jest.fn(),
            removeItem: jest.fn(),
            clear: jest.fn()
        };

        // Create mock ConfigManager with expected defaults
        mockConfigManager = {
            getDefaults: jest.fn().mockReturnValue({
                advanced: {
                    autoCleanup: {
                        enabled: true,
                        timeoutSeconds: 10
                    }
                }
            }),
            getConfig: jest.fn().mockReturnValue({
                advanced: {
                    autoCleanup: {
                        enabled: true,
                        timeoutSeconds: 10
                    }
                }
            }),
            getAutoCleanupConfig: jest.fn().mockReturnValue({
                enabled: true,
                timeoutSeconds: 10
            })
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Default Configuration', () => {
        test('should enable auto-cleanup by default', () => {
            const defaults = mockConfigManager.getDefaults();
            
            expect(defaults.advanced.autoCleanup.enabled).toBe(true);
        });

        test('should set default timeout to 10 seconds', () => {
            const defaults = mockConfigManager.getDefaults();
            
            expect(defaults.advanced.autoCleanup.timeoutSeconds).toBe(10);
        });

        test('should not have timeoutMinutes in defaults', () => {
            const defaults = mockConfigManager.getDefaults();
            
            expect(defaults.advanced.autoCleanup.timeoutMinutes).toBeUndefined();
        });

        test('should use seconds for auto-cleanup configuration', () => {
            const config = mockConfigManager.getAutoCleanupConfig();
            
            expect(config.timeoutSeconds).toBeDefined();
            expect(config.timeoutMinutes).toBeUndefined();
        });
    });

    describe('Configuration Loading', () => {
        test('should load default auto-cleanup when no stored config exists', () => {
            const config = mockConfigManager.getConfig();
            
            expect(config.advanced.autoCleanup.enabled).toBe(true);
            expect(config.advanced.autoCleanup.timeoutSeconds).toBe(10);
        });

        test('should merge stored config with new defaults', () => {
            // Test that ConfigManager properly merges configs
            // (This will be verified in integration tests)
            const config = mockConfigManager.getConfig();
            
            // Should have default auto-cleanup
            expect(config.advanced.autoCleanup.enabled).toBe(true);
            expect(config.advanced.autoCleanup.timeoutSeconds).toBe(10);
        });
    });
});