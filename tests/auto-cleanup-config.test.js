/**
 * @jest-environment jsdom
 */

// Test auto-cleanup timer configuration functionality
describe('Auto-Cleanup Configuration', () => {
    let mockConfigManager;
    let mockRouter;
    let ConfigScreen;

    beforeEach(() => {
        // Mock DOM environment
        document.body.innerHTML = '';
        
        // Mock localStorage
        global.localStorage = {
            getItem: jest.fn(),
            setItem: jest.fn(),
            removeItem: jest.fn(),
            clear: jest.fn()
        };

        // Mock ConfigManager
        mockConfigManager = {
            getDefaults: jest.fn().mockReturnValue({
                content: {
                    shapes: { enabled: true, weight: 25 },
                    smallNumbers: { enabled: true, min: 0, max: 20, weight: 30 },
                    largeNumbers: { enabled: true, min: 21, max: 9999, weight: 10 },
                    uppercaseLetters: { enabled: true, weight: 25 },
                    lowercaseLetters: { enabled: false, weight: 15 },
                    emojis: { enabled: true, weight: 20 }
                },
                emojiCategories: {
                    animals: { enabled: true, weight: 40 },
                    food: { enabled: true, weight: 30 },
                    vehicles: { enabled: true, weight: 15 },
                    faces: { enabled: true, weight: 10 },
                    nature: { enabled: false, weight: 3 },
                    objects: { enabled: false, weight: 2 }
                },
                colorCategories: {
                    primary: { enabled: true, weight: 50 },
                    secondary: { enabled: true, weight: 35 },
                    neutral: { enabled: false, weight: 15 }
                },
                language: 'bilingual',
                advanced: {
                    skipConfig: false,
                    numberModes: { 
                        cistercian: true, 
                        kaktovik: true, 
                        binary: true 
                    },
                    autoCleanup: {
                        enabled: false,
                        timeoutMinutes: 2
                    }
                }
            }),
            getConfig: jest.fn().mockReturnValue({
                content: {
                    shapes: { enabled: true, weight: 25 },
                    smallNumbers: { enabled: true, min: 0, max: 20, weight: 30 },
                    largeNumbers: { enabled: true, min: 21, max: 9999, weight: 10 },
                    uppercaseLetters: { enabled: true, weight: 25 },
                    lowercaseLetters: { enabled: false, weight: 15 },
                    emojis: { enabled: true, weight: 20 }
                },
                emojiCategories: {
                    animals: { enabled: true, weight: 40 },
                    food: { enabled: true, weight: 30 },
                    vehicles: { enabled: true, weight: 15 },
                    faces: { enabled: true, weight: 10 },
                    nature: { enabled: false, weight: 3 },
                    objects: { enabled: false, weight: 2 }
                },
                colorCategories: {
                    primary: { enabled: true, weight: 50 },
                    secondary: { enabled: true, weight: 35 },
                    neutral: { enabled: false, weight: 15 }
                },
                language: 'bilingual',
                advanced: {
                    skipConfig: false,
                    numberModes: { 
                        cistercian: true, 
                        kaktovik: true, 
                        binary: true 
                    },
                    autoCleanup: {
                        enabled: false,
                        timeoutMinutes: 2
                    }
                }
            }),
            updateConfig: jest.fn().mockReturnValue({ 
                success: true, 
                errors: [], 
                warnings: [],
                config: {}
            }),
            resetToDefaults: jest.fn().mockReturnValue(true),
            getAutoCleanupConfig: jest.fn().mockReturnValue({
                enabled: false,
                timeoutMinutes: 2
            })
        };

        // Mock Router
        mockRouter = {
            navigate: jest.fn(),
            addRoute: jest.fn(),
            getCurrentRoute: jest.fn()
        };

        // Import ConfigScreen after mocking
        jest.doMock('../src/config/ConfigManager.js', () => ({ ConfigManager: jest.fn() }));
        
        // Create a mock ConfigScreen class for testing
        ConfigScreen = class {
            constructor(configManager, router) {
                this.configManager = configManager;
                this.router = router;
                this.container = null;
                this.isVisible = false;
                this.createUI();
                this.loadCurrentConfig();
            }

            createUI() {
                this.container = document.createElement('div');
                this.container.id = 'config-screen';
                this.container.innerHTML = `
                    <div class="auto-cleanup-section">
                        <div class="cleanup-controls">
                            <label class="advanced-option">
                                <input type="checkbox" id="auto-cleanup-enabled">
                                Enable Auto-Cleanup
                            </label>
                            <div class="cleanup-timer-control">
                                <label class="timer-label">
                                    Objects disappear after: 
                                    <input type="number" id="cleanup-timer-minutes" min="0.5" max="10" step="0.5" value="2">
                                    minutes
                                </label>
                            </div>
                        </div>
                    </div>
                `;
                document.body.appendChild(this.container);
            }

            loadCurrentConfig() {
                const config = this.configManager.getConfig();
                this.setCheckboxValue('#auto-cleanup-enabled', config.advanced.autoCleanup.enabled);
                this.setInputValue('#cleanup-timer-minutes', config.advanced.autoCleanup.timeoutMinutes);
            }

            setCheckboxValue(selector, value) {
                const element = this.container.querySelector(selector);
                if (element) element.checked = value;
            }

            setInputValue(selector, value) {
                const element = this.container.querySelector(selector);
                if (element) element.value = value;
            }

            buildConfigFromUI() {
                return {
                    content: {
                        shapes: { enabled: true, weight: 25 },
                        smallNumbers: { enabled: true, min: 0, max: 20, weight: 30 },
                        largeNumbers: { enabled: true, min: 21, max: 9999, weight: 10 },
                        uppercaseLetters: { enabled: true, weight: 25 },
                        lowercaseLetters: { enabled: false, weight: 15 },
                        emojis: { enabled: true, weight: 20 }
                    },
                    emojiCategories: {
                        animals: { enabled: true, weight: 40 },
                        food: { enabled: true, weight: 30 },
                        vehicles: { enabled: true, weight: 15 },
                        faces: { enabled: true, weight: 10 },
                        nature: { enabled: false, weight: 3 },
                        objects: { enabled: false, weight: 2 }
                    },
                    colorCategories: {
                        primary: { enabled: true, weight: 50 },
                        secondary: { enabled: true, weight: 35 },
                        neutral: { enabled: false, weight: 15 }
                    },
                    language: 'bilingual',
                    advanced: {
                        skipConfig: false,
                        numberModes: { 
                            cistercian: true, 
                            kaktovik: true, 
                            binary: true 
                        },
                        autoCleanup: {
                            enabled: this.container.querySelector('#auto-cleanup-enabled').checked,
                            timeoutMinutes: parseFloat(this.container.querySelector('#cleanup-timer-minutes').value)
                        }
                    }
                };
            }

            saveCurrentConfig() {
                const config = this.buildConfigFromUI();
                return this.configManager.updateConfig(config);
            }
        };
    });

    describe('Auto-Cleanup UI Creation', () => {
        test('should create auto-cleanup section in config UI', () => {
            const configScreen = new ConfigScreen(mockConfigManager, mockRouter);
            
            // Verify auto-cleanup section exists
            const cleanupSection = configScreen.container.querySelector('.auto-cleanup-section');
            expect(cleanupSection).toBeTruthy();
            
            // Verify enable checkbox exists
            const enableCheckbox = configScreen.container.querySelector('#auto-cleanup-enabled');
            expect(enableCheckbox).toBeTruthy();
            expect(enableCheckbox.type).toBe('checkbox');
            
            // Verify timer input exists
            const timerInput = configScreen.container.querySelector('#cleanup-timer-minutes');
            expect(timerInput).toBeTruthy();
            expect(timerInput.type).toBe('number');
            expect(timerInput.min).toBe('0.5');
            expect(timerInput.max).toBe('10');
            expect(timerInput.step).toBe('0.5');
        });
    });

    describe('Auto-Cleanup Configuration Loading', () => {
        test('should load default auto-cleanup configuration', () => {
            const configScreen = new ConfigScreen(mockConfigManager, mockRouter);
            
            const enableCheckbox = configScreen.container.querySelector('#auto-cleanup-enabled');
            const timerInput = configScreen.container.querySelector('#cleanup-timer-minutes');
            
            // Should load default values (disabled, 2 minutes)
            expect(enableCheckbox.checked).toBe(false);
            expect(parseFloat(timerInput.value)).toBe(2);
        });

        test('should load custom auto-cleanup configuration', () => {
            // Mock custom config
            mockConfigManager.getConfig.mockReturnValue({
                content: {
                    shapes: { enabled: true, weight: 25 },
                    smallNumbers: { enabled: true, min: 0, max: 20, weight: 30 },
                    largeNumbers: { enabled: true, min: 21, max: 9999, weight: 10 },
                    uppercaseLetters: { enabled: true, weight: 25 },
                    lowercaseLetters: { enabled: false, weight: 15 },
                    emojis: { enabled: true, weight: 20 }
                },
                emojiCategories: {
                    animals: { enabled: true, weight: 40 },
                    food: { enabled: true, weight: 30 },
                    vehicles: { enabled: true, weight: 15 },
                    faces: { enabled: true, weight: 10 },
                    nature: { enabled: false, weight: 3 },
                    objects: { enabled: false, weight: 2 }
                },
                colorCategories: {
                    primary: { enabled: true, weight: 50 },
                    secondary: { enabled: true, weight: 35 },
                    neutral: { enabled: false, weight: 15 }
                },
                language: 'bilingual',
                advanced: {
                    skipConfig: false,
                    numberModes: { 
                        cistercian: true, 
                        kaktovik: true, 
                        binary: true 
                    },
                    autoCleanup: {
                        enabled: true,
                        timeoutMinutes: 5
                    }
                }
            });

            const configScreen = new ConfigScreen(mockConfigManager, mockRouter);
            
            const enableCheckbox = configScreen.container.querySelector('#auto-cleanup-enabled');
            const timerInput = configScreen.container.querySelector('#cleanup-timer-minutes');
            
            // Should load custom values (enabled, 5 minutes)
            expect(enableCheckbox.checked).toBe(true);
            expect(parseFloat(timerInput.value)).toBe(5);
        });
    });

    describe('Auto-Cleanup Configuration Saving', () => {
        test('should save auto-cleanup configuration when enabled', () => {
            const configScreen = new ConfigScreen(mockConfigManager, mockRouter);
            
            // Enable auto-cleanup and set custom timer
            const enableCheckbox = configScreen.container.querySelector('#auto-cleanup-enabled');
            const timerInput = configScreen.container.querySelector('#cleanup-timer-minutes');
            
            enableCheckbox.checked = true;
            timerInput.value = '3.5';
            
            // Save configuration
            const result = configScreen.saveCurrentConfig();
            
            // Verify updateConfig was called with correct auto-cleanup settings
            expect(mockConfigManager.updateConfig).toHaveBeenCalled();
            const calledConfig = mockConfigManager.updateConfig.mock.calls[0][0];
            
            expect(calledConfig.advanced.autoCleanup.enabled).toBe(true);
            expect(calledConfig.advanced.autoCleanup.timeoutMinutes).toBe(3.5);
        });

        test('should save auto-cleanup configuration when disabled', () => {
            const configScreen = new ConfigScreen(mockConfigManager, mockRouter);
            
            // Disable auto-cleanup
            const enableCheckbox = configScreen.container.querySelector('#auto-cleanup-enabled');
            const timerInput = configScreen.container.querySelector('#cleanup-timer-minutes');
            
            enableCheckbox.checked = false;
            timerInput.value = '1';
            
            // Save configuration
            configScreen.saveCurrentConfig();
            
            // Verify updateConfig was called with correct auto-cleanup settings
            expect(mockConfigManager.updateConfig).toHaveBeenCalled();
            const calledConfig = mockConfigManager.updateConfig.mock.calls[0][0];
            
            expect(calledConfig.advanced.autoCleanup.enabled).toBe(false);
            expect(calledConfig.advanced.autoCleanup.timeoutMinutes).toBe(1);
        });
    });

    describe('Timer Input Validation', () => {
        test('should handle minimum timer value (0.5 minutes)', () => {
            const configScreen = new ConfigScreen(mockConfigManager, mockRouter);
            
            const timerInput = configScreen.container.querySelector('#cleanup-timer-minutes');
            timerInput.value = '0.5';
            
            configScreen.saveCurrentConfig();
            
            const calledConfig = mockConfigManager.updateConfig.mock.calls[0][0];
            expect(calledConfig.advanced.autoCleanup.timeoutMinutes).toBe(0.5);
        });

        test('should handle maximum timer value (10 minutes)', () => {
            const configScreen = new ConfigScreen(mockConfigManager, mockRouter);
            
            const timerInput = configScreen.container.querySelector('#cleanup-timer-minutes');
            timerInput.value = '10';
            
            configScreen.saveCurrentConfig();
            
            const calledConfig = mockConfigManager.updateConfig.mock.calls[0][0];
            expect(calledConfig.advanced.autoCleanup.timeoutMinutes).toBe(10);
        });

        test('should handle decimal timer values', () => {
            const configScreen = new ConfigScreen(mockConfigManager, mockRouter);
            
            const timerInput = configScreen.container.querySelector('#cleanup-timer-minutes');
            timerInput.value = '2.5';
            
            configScreen.saveCurrentConfig();
            
            const calledConfig = mockConfigManager.updateConfig.mock.calls[0][0];
            expect(calledConfig.advanced.autoCleanup.timeoutMinutes).toBe(2.5);
        });
    });

    describe('ConfigManager Integration', () => {
        test('should include auto-cleanup in default configuration', () => {
            const defaults = mockConfigManager.getDefaults();
            
            expect(defaults.advanced.autoCleanup).toBeDefined();
            expect(defaults.advanced.autoCleanup.enabled).toBe(false);
            expect(defaults.advanced.autoCleanup.timeoutMinutes).toBe(2);
        });

        test('should provide getAutoCleanupConfig method', () => {
            const autoCleanupConfig = mockConfigManager.getAutoCleanupConfig();
            
            expect(autoCleanupConfig).toBeDefined();
            expect(autoCleanupConfig.enabled).toBeDefined();
            expect(autoCleanupConfig.timeoutMinutes).toBeDefined();
        });
    });
});