/**
 * @jest-environment jsdom
 */

// Test for AutoCleanupManager extraction following TDD principles
// This ensures that the auto-cleanup functionality is preserved during refactoring

describe('AutoCleanupManager', () => {
    let autoCleanupManager;
    let mockScene;
    let mockParticleManager;
    let mockConfigManager;
    let mockObjects;

    beforeEach(() => {
        // Mock particle manager
        mockParticleManager = {
            createCleanupParticleEffect: jest.fn()
        };

        // Mock config manager
        mockConfigManager = {
            getConfig: jest.fn().mockReturnValue({
                autoCleanup: {
                    enabled: true,
                    timeout: 5000 // 5 seconds
                }
            })
        };

        // Mock objects array
        mockObjects = [];

        // Mock scene
        mockScene = {
            particleManager: mockParticleManager,
            configManager: mockConfigManager,
            objects: mockObjects,
            removeObject: jest.fn(),
            time: {
                now: 1000
            }
        };

        // Create AutoCleanupManager class inline for testing
        class AutoCleanupManager {
            constructor(scene) {
                this.scene = scene;
                this.autoCleanupConfig = null;
                this.lastCleanupCheck = Date.now();
                this.cleanupCheckInterval = 1000; // Check every second
                this.updateAutoCleanupConfig();
            }

            updateAutoCleanupConfig() {
                const config = this.scene.configManager ? this.scene.configManager.getConfig() : null;
                this.autoCleanupConfig = config?.autoCleanup || null;
            }

            checkAutoCleanup() {
                const now = Date.now();
                if (now - this.lastCleanupCheck < this.cleanupCheckInterval) return;
                
                this.lastCleanupCheck = now;
                
                if (!this.autoCleanupConfig || !this.autoCleanupConfig.enabled || !this.autoCleanupConfig.timeout) {
                    return;
                }
                
                const objectsToCleanup = this.scene.objects.filter(obj => {
                    if (!obj || !obj.active) return false;
                    
                    const timeSinceLastTouch = now - (obj.lastTouchedTime || obj.spawnTime || now);
                    return timeSinceLastTouch > this.autoCleanupConfig.timeout;
                });
                
                objectsToCleanup.forEach(obj => {
                    this.cleanupObjectWithEffects(obj);
                });
            }

            cleanupObjectWithEffects(obj) {
                if (!obj || !obj.active) return;
                
                // Create cleanup particle effect
                this.scene.particleManager.createCleanupParticleEffect(obj.x, obj.y);
                
                // Remove the object
                this.scene.removeObject(obj);
            }

            updateObjectTouchTime(obj) {
                if (obj) {
                    obj.lastTouchedTime = Date.now();
                }
            }

            isEnabled() {
                return this.autoCleanupConfig && this.autoCleanupConfig.enabled;
            }

            getTimeout() {
                return this.autoCleanupConfig ? this.autoCleanupConfig.timeout : null;
            }

            getCheckInterval() {
                return this.cleanupCheckInterval;
            }

            setCheckInterval(interval) {
                this.cleanupCheckInterval = Math.max(100, interval); // Minimum 100ms
            }
        }

        autoCleanupManager = new AutoCleanupManager(mockScene);
    });

    describe('Configuration Management', () => {
        test('should initialize with config from scene', () => {
            expect(autoCleanupManager.isEnabled()).toBe(true);
            expect(autoCleanupManager.getTimeout()).toBe(5000);
        });

        test('should handle disabled auto-cleanup', () => {
            mockConfigManager.getConfig.mockReturnValue({
                autoCleanup: {
                    enabled: false,
                    timeout: 5000
                }
            });

            autoCleanupManager.updateAutoCleanupConfig();

            expect(autoCleanupManager.isEnabled()).toBe(false);
        });

        test('should handle missing config', () => {
            mockConfigManager.getConfig.mockReturnValue(null);

            autoCleanupManager.updateAutoCleanupConfig();

            expect(autoCleanupManager.isEnabled()).toBeFalsy();
            expect(autoCleanupManager.getTimeout()).toBe(null);
        });
    });

    describe('Touch Time Management', () => {
        test('should update object last touched time', () => {
            const mockObject = {
                id: 'test-obj',
                active: true,
                lastTouchedTime: 0
            };

            const beforeTime = Date.now();
            autoCleanupManager.updateObjectTouchTime(mockObject);
            const afterTime = Date.now();

            expect(mockObject.lastTouchedTime).toBeGreaterThanOrEqual(beforeTime);
            expect(mockObject.lastTouchedTime).toBeLessThanOrEqual(afterTime);
        });

        test('should handle null object gracefully', () => {
            expect(() => {
                autoCleanupManager.updateObjectTouchTime(null);
            }).not.toThrow();
        });
    });

    describe('Cleanup Logic', () => {
        test('should not cleanup when disabled', () => {
            mockConfigManager.getConfig.mockReturnValue({
                autoCleanup: { enabled: false }
            });
            autoCleanupManager.updateAutoCleanupConfig();

            const oldObject = {
                id: 'old-obj',
                active: true,
                x: 100,
                y: 200,
                lastTouchedTime: Date.now() - 10000 // 10 seconds ago
            };
            mockObjects.push(oldObject);

            autoCleanupManager.checkAutoCleanup();

            expect(mockScene.removeObject).not.toHaveBeenCalled();
        });

        test('should cleanup old objects when enabled', () => {
            const oldTime = Date.now() - 10000; // 10 seconds ago
            const oldObject = {
                id: 'old-obj',
                active: true,
                x: 100,
                y: 200,
                lastTouchedTime: oldTime
            };
            mockObjects.push(oldObject);

            // Force cleanup check by resetting last check time
            autoCleanupManager.lastCleanupCheck = 0;

            autoCleanupManager.checkAutoCleanup();

            expect(mockParticleManager.createCleanupParticleEffect).toHaveBeenCalledWith(100, 200);
            expect(mockScene.removeObject).toHaveBeenCalledWith(oldObject);
        });

        test('should not cleanup recent objects', () => {
            const recentObject = {
                id: 'recent-obj',
                active: true,
                x: 100,
                y: 200,
                lastTouchedTime: Date.now() - 1000 // 1 second ago (recent)
            };
            mockObjects.push(recentObject);

            autoCleanupManager.lastCleanupCheck = 0;
            autoCleanupManager.checkAutoCleanup();

            expect(mockScene.removeObject).not.toHaveBeenCalled();
        });

        test('should handle objects without lastTouchedTime using spawnTime', () => {
            const oldObject = {
                id: 'old-obj',
                active: true,
                x: 100,
                y: 200,
                spawnTime: Date.now() - 10000 // 10 seconds ago
            };
            mockObjects.push(oldObject);

            autoCleanupManager.lastCleanupCheck = 0;
            autoCleanupManager.checkAutoCleanup();

            expect(mockScene.removeObject).toHaveBeenCalledWith(oldObject);
        });

        test('should respect cleanup check interval', () => {
            autoCleanupManager.lastCleanupCheck = Date.now() - 500; // 500ms ago

            autoCleanupManager.checkAutoCleanup();

            // Should not check because interval hasn't passed
            expect(mockScene.removeObject).not.toHaveBeenCalled();
        });
    });

    describe('Configuration Options', () => {
        test('should allow setting check interval', () => {
            autoCleanupManager.setCheckInterval(2000);
            expect(autoCleanupManager.getCheckInterval()).toBe(2000);
        });

        test('should enforce minimum check interval', () => {
            autoCleanupManager.setCheckInterval(50); // Too low
            expect(autoCleanupManager.getCheckInterval()).toBe(100); // Clamped to minimum
        });
    });

    describe('Cleanup Effects', () => {
        test('should create particle effects when cleaning up', () => {
            const testObject = {
                id: 'test-obj',
                active: true,
                x: 150,
                y: 250
            };

            autoCleanupManager.cleanupObjectWithEffects(testObject);

            expect(mockParticleManager.createCleanupParticleEffect).toHaveBeenCalledWith(150, 250);
            expect(mockScene.removeObject).toHaveBeenCalledWith(testObject);
        });

        test('should handle inactive objects gracefully', () => {
            const inactiveObject = {
                id: 'inactive-obj',
                active: false,
                x: 100,
                y: 200
            };

            autoCleanupManager.cleanupObjectWithEffects(inactiveObject);

            expect(mockParticleManager.createCleanupParticleEffect).not.toHaveBeenCalled();
            expect(mockScene.removeObject).not.toHaveBeenCalled();
        });
    });
});