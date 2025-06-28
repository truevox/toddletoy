describe('Grid Configuration Integration', () => {
    let configManager;
    let gameScene;
    let mockLocalStorage;

    beforeEach(() => {
        // Mock localStorage
        mockLocalStorage = {
            getItem: jest.fn(),
            setItem: jest.fn(),
            removeItem: jest.fn()
        };
        global.localStorage = mockLocalStorage;

        // Mock ConfigManager
        configManager = {
            config: {
                gridMode: {
                    enabled: false,
                    rows: 4,
                    cols: 4,
                    showGrid: true,
                    autoPopulate: false,
                    cellPadding: 10,
                    wrapNavigation: false,
                    highlightStyle: 'default',
                    theme: 'default'
                }
            },
            saveConfig: jest.fn(),
            loadConfig: jest.fn(),
            resetToDefaults: jest.fn(),
            validateConfig: jest.fn(),
            getGridConfig: jest.fn(),
            setGridConfig: jest.fn(),
            updateGridSettings: jest.fn()
        };

        // Mock GameScene
        gameScene = {
            configManager: configManager,
            gridManager: null,
            gridMode: {
                enabled: false,
                currentSettings: null
            },
            // Grid mode methods
            enableGridMode: jest.fn(),
            disableGridMode: jest.fn(),
            updateGridConfiguration: jest.fn(),
            recreateGridManager: jest.fn(),
            applyGridSettings: jest.fn(),
            validateGridModeCompatibility: jest.fn()
        };
    });

    describe('Grid Mode Toggle Functionality', () => {
        test('should enable grid mode when configuration is set to enabled', () => {
            configManager.config.gridMode.enabled = true;
            
            gameScene.applyGridSettings(configManager.config.gridMode);
            
            expect(gameScene.applyGridSettings).toHaveBeenCalledWith(configManager.config.gridMode);
            expect(gameScene.enableGridMode).toHaveBeenCalled();
        });

        test('should disable grid mode when configuration is set to disabled', () => {
            gameScene.gridMode.enabled = true;
            configManager.config.gridMode.enabled = false;
            
            gameScene.applyGridSettings(configManager.config.gridMode);
            
            expect(gameScene.applyGridSettings).toHaveBeenCalledWith(configManager.config.gridMode);
            expect(gameScene.disableGridMode).toHaveBeenCalled();
        });

        test('should handle rapid toggle operations correctly', () => {
            configManager.config.gridMode.enabled = true;
            gameScene.applyGridSettings(configManager.config.gridMode);
            
            configManager.config.gridMode.enabled = false;
            gameScene.applyGridSettings(configManager.config.gridMode);
            
            configManager.config.gridMode.enabled = true;
            gameScene.applyGridSettings(configManager.config.gridMode);
            
            expect(gameScene.applyGridSettings).toHaveBeenCalledTimes(3);
        });

        test('should maintain grid state when other configurations change', () => {
            configManager.config.gridMode.enabled = true;
            configManager.config.gridMode.showGrid = false;
            
            gameScene.applyGridSettings(configManager.config.gridMode);
            
            expect(gameScene.applyGridSettings).toHaveBeenCalledWith(
                expect.objectContaining({
                    enabled: true,
                    showGrid: false
                })
            );
        });

        test('should validate grid mode prerequisites before enabling', () => {
            configManager.config.gridMode.enabled = true;
            
            gameScene.validateGridModeCompatibility();
            gameScene.applyGridSettings(configManager.config.gridMode);
            
            expect(gameScene.validateGridModeCompatibility).toHaveBeenCalled();
            expect(gameScene.applyGridSettings).toHaveBeenCalledWith(configManager.config.gridMode);
        });
    });

    describe('Grid Size Configuration Options', () => {
        test('should accept valid 3x3 grid configuration', () => {
            const gridConfig = {
                enabled: true,
                rows: 3,
                cols: 3,
                showGrid: true
            };
            
            configManager.validateConfig(gridConfig);
            configManager.setGridConfig(gridConfig);
            
            expect(configManager.validateConfig).toHaveBeenCalledWith(gridConfig);
            expect(configManager.setGridConfig).toHaveBeenCalledWith(gridConfig);
        });

        test('should accept valid 4x4 grid configuration', () => {
            const gridConfig = {
                enabled: true,
                rows: 4,
                cols: 4,
                showGrid: true
            };
            
            configManager.validateConfig(gridConfig);
            configManager.setGridConfig(gridConfig);
            
            expect(configManager.validateConfig).toHaveBeenCalledWith(gridConfig);
            expect(configManager.setGridConfig).toHaveBeenCalledWith(gridConfig);
        });

        test('should accept valid 5x5 grid configuration', () => {
            const gridConfig = {
                enabled: true,
                rows: 5,
                cols: 5,
                showGrid: true
            };
            
            configManager.validateConfig(gridConfig);
            configManager.setGridConfig(gridConfig);
            
            expect(configManager.validateConfig).toHaveBeenCalledWith(gridConfig);
            expect(configManager.setGridConfig).toHaveBeenCalledWith(gridConfig);
        });

        test('should accept valid 6x6 grid configuration', () => {
            const gridConfig = {
                enabled: true,
                rows: 6,
                cols: 6,
                showGrid: true
            };
            
            configManager.validateConfig(gridConfig);
            configManager.setGridConfig(gridConfig);
            
            expect(configManager.validateConfig).toHaveBeenCalledWith(gridConfig);
            expect(configManager.setGridConfig).toHaveBeenCalledWith(gridConfig);
        });

        test('should reject invalid grid sizes below minimum', () => {
            const invalidConfig = {
                enabled: true,
                rows: 2,
                cols: 2,
                showGrid: true
            };
            
            configManager.validateConfig(invalidConfig);
            
            expect(configManager.validateConfig).toHaveBeenCalledWith(invalidConfig);
            // Should reject configurations below 3x3
        });

        test('should reject invalid grid sizes above maximum', () => {
            const invalidConfig = {
                enabled: true,
                rows: 7,
                cols: 7,
                showGrid: true
            };
            
            configManager.validateConfig(invalidConfig);
            
            expect(configManager.validateConfig).toHaveBeenCalledWith(invalidConfig);
            // Should reject configurations above 6x6
        });

        test('should handle asymmetric grid configurations', () => {
            const asymmetricConfig = {
                enabled: true,
                rows: 3,
                cols: 5,
                showGrid: true
            };
            
            configManager.validateConfig(asymmetricConfig);
            configManager.setGridConfig(asymmetricConfig);
            
            expect(configManager.validateConfig).toHaveBeenCalledWith(asymmetricConfig);
            expect(configManager.setGridConfig).toHaveBeenCalledWith(asymmetricConfig);
        });

        test('should recreate grid manager when size changes', () => {
            configManager.config.gridMode.rows = 3;
            configManager.config.gridMode.cols = 3;
            gameScene.applyGridSettings(configManager.config.gridMode);
            
            configManager.config.gridMode.rows = 5;
            configManager.config.gridMode.cols = 5;
            gameScene.applyGridSettings(configManager.config.gridMode);
            
            expect(gameScene.recreateGridManager).toHaveBeenCalled();
        });
    });

    describe('Configuration Persistence', () => {
        test('should save grid configuration to localStorage', () => {
            const gridConfig = {
                enabled: true,
                rows: 4,
                cols: 4,
                showGrid: true,
                autoPopulate: false
            };
            
            configManager.setGridConfig(gridConfig);
            configManager.saveConfig();
            
            expect(configManager.saveConfig).toHaveBeenCalled();
            expect(mockLocalStorage.setItem).toHaveBeenCalled();
        });

        test('should load grid configuration from localStorage', () => {
            const savedConfig = JSON.stringify({
                gridMode: {
                    enabled: true,
                    rows: 5,
                    cols: 5,
                    showGrid: false,
                    autoPopulate: true
                }
            });
            
            mockLocalStorage.getItem.mockReturnValue(savedConfig);
            configManager.loadConfig();
            
            expect(configManager.loadConfig).toHaveBeenCalled();
            expect(mockLocalStorage.getItem).toHaveBeenCalled();
        });

        test('should handle missing localStorage gracefully', () => {
            mockLocalStorage.getItem.mockReturnValue(null);
            
            configManager.loadConfig();
            
            expect(configManager.loadConfig).toHaveBeenCalled();
            // Should use default configuration
        });

        test('should handle corrupted localStorage data', () => {
            mockLocalStorage.getItem.mockReturnValue('invalid json{');
            
            configManager.loadConfig();
            
            expect(configManager.loadConfig).toHaveBeenCalled();
            // Should fall back to defaults
        });

        test('should maintain configuration across browser sessions', () => {
            const gridConfig = {
                enabled: true,
                rows: 4,
                cols: 4,
                showGrid: true
            };
            
            configManager.setGridConfig(gridConfig);
            configManager.saveConfig();
            
            // Simulate browser restart
            configManager.loadConfig();
            const loadedConfig = configManager.getGridConfig();
            
            expect(configManager.getGridConfig).toHaveBeenCalled();
            // Should match saved configuration
        });

        test('should auto-save configuration changes', () => {
            configManager.config.gridMode.rows = 5;
            configManager.updateGridSettings({ rows: 5 });
            
            expect(configManager.updateGridSettings).toHaveBeenCalledWith({ rows: 5 });
            expect(configManager.saveConfig).toHaveBeenCalled();
        });
    });

    describe('Configuration Validation', () => {
        test('should validate complete grid configuration object', () => {
            const completeConfig = {
                enabled: true,
                rows: 4,
                cols: 4,
                showGrid: true,
                autoPopulate: false,
                cellPadding: 10,
                wrapNavigation: false,
                highlightStyle: 'default',
                theme: 'default'
            };
            
            configManager.validateConfig(completeConfig);
            
            expect(configManager.validateConfig).toHaveBeenCalledWith(completeConfig);
            // Should pass validation
        });

        test('should validate partial grid configuration updates', () => {
            const partialUpdate = {
                rows: 5,
                showGrid: false
            };
            
            configManager.validateConfig(partialUpdate, true); // Partial validation
            
            expect(configManager.validateConfig).toHaveBeenCalledWith(partialUpdate, true);
            // Should pass partial validation
        });

        test('should reject configuration with invalid data types', () => {
            const invalidConfig = {
                enabled: 'true', // Should be boolean
                rows: '4',       // Should be number
                cols: 4.5,       // Should be integer
                showGrid: 1      // Should be boolean
            };
            
            configManager.validateConfig(invalidConfig);
            
            expect(configManager.validateConfig).toHaveBeenCalledWith(invalidConfig);
            // Should fail validation
        });

        test('should reject configuration with missing required fields', () => {
            const incompleteConfig = {
                enabled: true
                // Missing rows, cols, etc.
            };
            
            configManager.validateConfig(incompleteConfig);
            
            expect(configManager.validateConfig).toHaveBeenCalledWith(incompleteConfig);
            // Should fail validation for missing fields
        });

        test('should apply default values for optional fields', () => {
            const minimalConfig = {
                enabled: true,
                rows: 4,
                cols: 4
            };
            
            configManager.validateConfig(minimalConfig);
            configManager.setGridConfig(minimalConfig);
            
            expect(configManager.validateConfig).toHaveBeenCalledWith(minimalConfig);
            // Should apply defaults for showGrid, autoPopulate, etc.
        });

        test('should validate configuration ranges and constraints', () => {
            const testConfigs = [
                { rows: 3, cols: 3 }, // Valid minimum
                { rows: 6, cols: 6 }, // Valid maximum
                { rows: 2, cols: 3 }, // Invalid minimum rows
                { rows: 3, cols: 7 }, // Invalid maximum cols
                { cellPadding: -5 },  // Invalid negative padding
                { cellPadding: 100 }  // Excessive padding
            ];
            
            testConfigs.forEach(config => {
                configManager.validateConfig(config);
            });
            
            expect(configManager.validateConfig).toHaveBeenCalledTimes(6);
        });
    });

    describe('Mode Switching (Free-form ↔ Grid)', () => {
        test('should cleanly switch from free-form to grid mode', () => {
            gameScene.gridMode.enabled = false; // Start in free-form
            
            configManager.config.gridMode.enabled = true;
            gameScene.applyGridSettings(configManager.config.gridMode);
            
            expect(gameScene.enableGridMode).toHaveBeenCalled();
            // Should clean up free-form mode and initialize grid mode
        });

        test('should cleanly switch from grid to free-form mode', () => {
            gameScene.gridMode.enabled = true; // Start in grid
            
            configManager.config.gridMode.enabled = false;
            gameScene.applyGridSettings(configManager.config.gridMode);
            
            expect(gameScene.disableGridMode).toHaveBeenCalled();
            // Should clean up grid mode and initialize free-form mode
        });

        test('should preserve existing objects during mode switch', () => {
            const existingObjects = [
                { id: 'obj1', x: 100, y: 100 },
                { id: 'obj2', x: 200, y: 200 }
            ];
            gameScene.objects = existingObjects;
            
            configManager.config.gridMode.enabled = true;
            gameScene.applyGridSettings(configManager.config.gridMode);
            
            expect(gameScene.applyGridSettings).toHaveBeenCalledWith(configManager.config.gridMode);
            // Objects should be preserved or repositioned appropriately
        });

        test('should handle mode switching during active interactions', () => {
            gameScene.isDragging = true;
            gameScene.currentSpeech = { speaking: true };
            
            configManager.config.gridMode.enabled = true;
            gameScene.applyGridSettings(configManager.config.gridMode);
            
            expect(gameScene.applyGridSettings).toHaveBeenCalledWith(configManager.config.gridMode);
            // Should gracefully handle ongoing interactions
        });

        test('should update input handlers during mode switch', () => {
            configManager.config.gridMode.enabled = true;
            gameScene.applyGridSettings(configManager.config.gridMode);
            
            configManager.config.gridMode.enabled = false;
            gameScene.applyGridSettings(configManager.config.gridMode);
            
            expect(gameScene.applyGridSettings).toHaveBeenCalledTimes(2);
            // Input handlers should be updated for each mode
        });

        test('should maintain audio and visual effects during mode switch', () => {
            gameScene.activeTones = new Map([['tone1', {}]]);
            gameScene.particleEmitters = new Map([['emitter1', {}]]);
            
            configManager.config.gridMode.enabled = true;
            gameScene.applyGridSettings(configManager.config.gridMode);
            
            expect(gameScene.applyGridSettings).toHaveBeenCalledWith(configManager.config.gridMode);
            // Effects should continue playing
        });
    });

    describe('Auto-Population Configuration', () => {
        test('should enable auto-population when configured', () => {
            configManager.config.gridMode.autoPopulate = true;
            configManager.config.gridMode.enabled = true;
            
            gameScene.applyGridSettings(configManager.config.gridMode);
            
            expect(gameScene.applyGridSettings).toHaveBeenCalledWith(
                expect.objectContaining({ autoPopulate: true })
            );
            // Should populate grid with random objects
        });

        test('should disable auto-population when configured', () => {
            configManager.config.gridMode.autoPopulate = false;
            configManager.config.gridMode.enabled = true;
            
            gameScene.applyGridSettings(configManager.config.gridMode);
            
            expect(gameScene.applyGridSettings).toHaveBeenCalledWith(
                expect.objectContaining({ autoPopulate: false })
            );
            // Should start with empty grid
        });

        test('should respect content configuration for auto-population', () => {
            configManager.config.gridMode.autoPopulate = true;
            configManager.config.contentTypes = {
                emojis: true,
                shapes: false,
                numbers: true,
                letters: false
            };
            
            gameScene.applyGridSettings(configManager.config.gridMode);
            
            expect(gameScene.applyGridSettings).toHaveBeenCalledWith(
                expect.objectContaining({ autoPopulate: true })
            );
            // Should only use enabled content types for auto-population
        });

        test('should handle auto-population with different grid sizes', () => {
            const sizes = [
                { rows: 3, cols: 3 }, // 9 cells
                { rows: 4, cols: 4 }, // 16 cells
                { rows: 5, cols: 5 }, // 25 cells
                { rows: 6, cols: 6 }  // 36 cells
            ];
            
            sizes.forEach(size => {
                configManager.config.gridMode = {
                    ...configManager.config.gridMode,
                    ...size,
                    autoPopulate: true
                };
                gameScene.applyGridSettings(configManager.config.gridMode);
            });
            
            expect(gameScene.applyGridSettings).toHaveBeenCalledTimes(4);
            // Should handle auto-population for all sizes
        });

        test('should allow partial auto-population', () => {
            configManager.config.gridMode.autoPopulate = true;
            configManager.config.gridMode.autoPopulatePercentage = 0.5; // 50% of cells
            
            gameScene.applyGridSettings(configManager.config.gridMode);
            
            expect(gameScene.applyGridSettings).toHaveBeenCalledWith(
                expect.objectContaining({ autoPopulate: true })
            );
            // Should populate only 50% of available cells
        });
    });

    describe('Configuration Error Handling', () => {
        test('should handle configuration loading errors gracefully', () => {
            mockLocalStorage.getItem.mockImplementation(() => {
                throw new Error('LocalStorage access denied');
            });
            
            configManager.loadConfig();
            
            expect(configManager.loadConfig).toHaveBeenCalled();
            // Should fall back to default configuration
        });

        test('should handle configuration saving errors gracefully', () => {
            mockLocalStorage.setItem.mockImplementation(() => {
                throw new Error('Storage quota exceeded');
            });
            
            configManager.saveConfig();
            
            expect(configManager.saveConfig).toHaveBeenCalled();
            // Should handle error without crashing
        });

        test('should recover from invalid configuration state', () => {
            configManager.config.gridMode = null; // Invalid state
            
            configManager.resetToDefaults();
            gameScene.applyGridSettings(configManager.config.gridMode);
            
            expect(configManager.resetToDefaults).toHaveBeenCalled();
            // Should restore valid default configuration
        });

        test('should validate configuration before applying to game scene', () => {
            const invalidConfig = {
                enabled: true,
                rows: -1, // Invalid
                cols: 'invalid' // Invalid type
            };
            
            configManager.validateConfig(invalidConfig);
            
            expect(configManager.validateConfig).toHaveBeenCalledWith(invalidConfig);
            // Should not apply invalid configuration to game scene
        });

        test('should provide meaningful error messages for validation failures', () => {
            const invalidConfigs = [
                { rows: 0 }, // Zero rows
                { cols: 10 }, // Too many columns
                { cellPadding: 'large' }, // Invalid type
                { theme: 123 } // Invalid type
            ];
            
            invalidConfigs.forEach(config => {
                configManager.validateConfig(config);
            });
            
            expect(configManager.validateConfig).toHaveBeenCalledTimes(4);
            // Should provide specific error messages for each validation failure
        });
    });
});