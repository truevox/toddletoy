/**
 * @jest-environment jsdom
 */

// Test auto-cleanup timer functionality
describe('Auto-Cleanup Functionality', () => {
    let mockScene;
    let mockConfigManager;
    let originalDateNow;
    let mockCurrentTime;

    beforeEach(() => {
        // Mock Date.now() for consistent timing tests
        originalDateNow = Date.now;
        mockCurrentTime = 1000000; // Start at 1000 seconds
        Date.now = jest.fn(() => mockCurrentTime);

        // Mock console.log to reduce test noise
        jest.spyOn(console, 'log').mockImplementation();
        jest.spyOn(console, 'warn').mockImplementation();

        // Mock ConfigManager
        mockConfigManager = {
            getAutoCleanupConfig: jest.fn().mockReturnValue({
                enabled: true,
                timeoutMinutes: 1 // 1 minute timeout for testing
            })
        };

        // Mock Phaser scene components
        const mockTextures = {
            exists: jest.fn().mockReturnValue(true)
        };

        const mockTime = {
            delayedCall: jest.fn((delay, callback) => {
                // Immediately execute callback for testing
                setTimeout(callback, 0);
            })
        };

        const mockAdd = {
            particles: jest.fn().mockReturnValue({
                destroy: jest.fn()
            })
        };

        // Mock audio context
        const mockAudioContext = {
            createOscillator: jest.fn().mockReturnValue({
                connect: jest.fn(),
                frequency: { 
                    setValueAtTime: jest.fn(),
                    exponentialRampToValueAtTime: jest.fn()
                },
                start: jest.fn(),
                stop: jest.fn()
            }),
            createGain: jest.fn().mockReturnValue({
                connect: jest.fn(),
                gain: {
                    setValueAtTime: jest.fn(),
                    exponentialRampToValueAtTime: jest.fn()
                }
            }),
            destination: {},
            currentTime: 0
        };

        // Create mock scene with auto-cleanup methods
        mockScene = {
            configManager: mockConfigManager,
            objects: [],
            autoCleanupConfig: null,
            lastCleanupCheck: 0,
            cleanupCheckInterval: 1000,
            currentSpeakingObject: null,
            isSpeaking: false,
            activeTones: new Map(),
            textures: mockTextures,
            time: mockTime,
            add: mockAdd,
            audioContext: mockAudioContext,

            // Auto-cleanup methods
            initAutoCleanupSystem() {
                this.autoCleanupConfig = null;
                this.lastCleanupCheck = Date.now();
                this.cleanupCheckInterval = 1000;
                this.updateAutoCleanupConfig();
            },

            updateAutoCleanupConfig() {
                if (this.configManager) {
                    this.autoCleanupConfig = this.configManager.getAutoCleanupConfig();
                } else {
                    this.autoCleanupConfig = { enabled: false, timeoutMinutes: 2 };
                }
            },

            checkAutoCleanup() {
                const now = Date.now();
                if (now - this.lastCleanupCheck < this.cleanupCheckInterval) {
                    return;
                }
                this.lastCleanupCheck = now;

                this.updateAutoCleanupConfig();

                if (!this.autoCleanupConfig.enabled) {
                    return;
                }

                const timeoutMs = this.autoCleanupConfig.timeoutMinutes * 60 * 1000;
                const objectsToCleanup = [];

                this.objects.forEach(obj => {
                    const timeSinceLastTouch = now - obj.lastTouchedTime;
                    const isCurrentlySpeaking = this.currentSpeakingObject && this.currentSpeakingObject.id === obj.id;
                    
                    if (timeSinceLastTouch > timeoutMs && !isCurrentlySpeaking) {
                        objectsToCleanup.push(obj);
                    }
                });

                objectsToCleanup.forEach(obj => {
                    this.cleanupObjectWithEffects(obj);
                });
            },

            cleanupObjectWithEffects(obj) {
                console.log(`Auto-cleaning up object ${obj.id} (${obj.type}) after timeout`);
                this.createCleanupParticleEffect(obj.x, obj.y);
                this.playCleanupSound();
                this.removeObject(obj);
            },

            createCleanupParticleEffect(x, y) {
                // Mock particle effect creation
                const emitter = this.add.particles(x, y, 'particle', {});
                this.time.delayedCall(1500, () => emitter.destroy());
            },

            playCleanupSound() {
                // Mock sound creation
                if (this.audioContext) {
                    const oscillator = this.audioContext.createOscillator();
                    const gainNode = this.audioContext.createGain();
                    oscillator.connect(gainNode);
                    gainNode.connect(this.audioContext.destination);
                    oscillator.start();
                    oscillator.stop();
                }
            },

            removeObject(obj) {
                if (obj.sprite) obj.sprite.destroy();
                if (obj.englishLabel) obj.englishLabel.destroy();
                if (obj.spanishLabel) obj.spanishLabel.destroy();

                if (this.activeTones.has(obj.id)) {
                    const tone = this.activeTones.get(obj.id);
                    try { tone.stop(); } catch (e) {}
                    this.activeTones.delete(obj.id);
                }

                const index = this.objects.indexOf(obj);
                if (index > -1) {
                    this.objects.splice(index, 1);
                }
            },

            updateObjectTouchTime(obj) {
                if (obj) {
                    obj.lastTouchedTime = Date.now();
                }
            }
        };

        // Initialize the auto-cleanup system
        mockScene.initAutoCleanupSystem();
    });

    afterEach(() => {
        // Restore original Date.now
        Date.now = originalDateNow;
        jest.restoreAllMocks();
    });

    describe('Auto-Cleanup Initialization', () => {
        test('should initialize auto-cleanup system', () => {
            expect(mockScene.autoCleanupConfig).toBeDefined();
            expect(mockScene.lastCleanupCheck).toBeDefined();
            expect(mockScene.cleanupCheckInterval).toBe(1000);
        });

        test('should load configuration from ConfigManager', () => {
            expect(mockConfigManager.getAutoCleanupConfig).toHaveBeenCalled();
            expect(mockScene.autoCleanupConfig.enabled).toBe(true);
            expect(mockScene.autoCleanupConfig.timeoutMinutes).toBe(1);
        });
    });

    describe('Object Timeout Detection', () => {
        test('should not cleanup objects that are within timeout', () => {
            // Create object with current timestamp
            const obj = {
                id: 'test1',
                type: 'letter',
                x: 100,
                y: 100,
                lastTouchedTime: Date.now(),
                sprite: { destroy: jest.fn() },
                englishLabel: { destroy: jest.fn() }
            };
            mockScene.objects.push(obj);

            // Advance time by 30 seconds (less than 1 minute timeout)
            mockCurrentTime += 30 * 1000;

            mockScene.checkAutoCleanup();

            // Object should still exist
            expect(mockScene.objects).toHaveLength(1);
            expect(obj.sprite.destroy).not.toHaveBeenCalled();
        });

        test('should cleanup objects that exceed timeout', () => {
            // Create object with old timestamp
            const obj = {
                id: 'test2',
                type: 'number',
                x: 200,
                y: 200,
                lastTouchedTime: Date.now(),
                sprite: { destroy: jest.fn() },
                englishLabel: { destroy: jest.fn() }
            };
            mockScene.objects.push(obj);

            // Advance time by 2 minutes (more than 1 minute timeout)
            mockCurrentTime += 2 * 60 * 1000;

            mockScene.checkAutoCleanup();

            // Object should be cleaned up
            expect(mockScene.objects).toHaveLength(0);
            expect(obj.sprite.destroy).toHaveBeenCalled();
        });

        test('should not cleanup currently speaking objects', () => {
            // Create speaking object with old timestamp
            const obj = {
                id: 'speaking',
                type: 'emoji',
                x: 300,
                y: 300,
                lastTouchedTime: Date.now(),
                sprite: { destroy: jest.fn() },
                englishLabel: { destroy: jest.fn() }
            };
            mockScene.objects.push(obj);
            mockScene.currentSpeakingObject = obj;
            mockScene.isSpeaking = true;

            // Advance time by 2 minutes
            mockCurrentTime += 2 * 60 * 1000;

            mockScene.checkAutoCleanup();

            // Speaking object should not be cleaned up
            expect(mockScene.objects).toHaveLength(1);
            expect(obj.sprite.destroy).not.toHaveBeenCalled();
        });
    });

    describe('Auto-Cleanup Configuration', () => {
        test('should skip cleanup when disabled', () => {
            mockConfigManager.getAutoCleanupConfig.mockReturnValue({
                enabled: false,
                timeoutMinutes: 1
            });

            // Create old object
            const obj = {
                id: 'test3',
                type: 'shape',
                x: 400,
                y: 400,
                lastTouchedTime: Date.now(),
                sprite: { destroy: jest.fn() }
            };
            mockScene.objects.push(obj);

            // Advance time beyond timeout
            mockCurrentTime += 2 * 60 * 1000;

            mockScene.checkAutoCleanup();

            // Object should not be cleaned up because cleanup is disabled
            expect(mockScene.objects).toHaveLength(1);
            expect(obj.sprite.destroy).not.toHaveBeenCalled();
        });

        test('should respect custom timeout duration', () => {
            mockConfigManager.getAutoCleanupConfig.mockReturnValue({
                enabled: true,
                timeoutMinutes: 5 // 5 minute timeout
            });

            const obj = {
                id: 'test4',
                type: 'letter',
                x: 500,
                y: 500,
                lastTouchedTime: Date.now(),
                sprite: { destroy: jest.fn() }
            };
            mockScene.objects.push(obj);

            // Advance time by 3 minutes (less than 5 minute timeout)
            mockCurrentTime += 3 * 60 * 1000;

            mockScene.checkAutoCleanup();

            // Object should still exist
            expect(mockScene.objects).toHaveLength(1);

            // Advance time by 3 more minutes (total 6 minutes, more than 5 minute timeout)
            mockCurrentTime += 3 * 60 * 1000;

            mockScene.checkAutoCleanup();

            // Now object should be cleaned up
            expect(mockScene.objects).toHaveLength(0);
            expect(obj.sprite.destroy).toHaveBeenCalled();
        });
    });

    describe('Touch Time Updates', () => {
        test('should update lastTouchedTime when object is touched', () => {
            const obj = {
                id: 'test5',
                lastTouchedTime: 1000
            };

            mockCurrentTime = 5000;
            mockScene.updateObjectTouchTime(obj);

            expect(obj.lastTouchedTime).toBe(5000);
        });

        test('should handle null objects gracefully', () => {
            expect(() => {
                mockScene.updateObjectTouchTime(null);
            }).not.toThrow();

            expect(() => {
                mockScene.updateObjectTouchTime(undefined);
            }).not.toThrow();
        });
    });

    describe('Cleanup Effects', () => {
        test('should create particle effects during cleanup', () => {
            const obj = {
                id: 'test6',
                type: 'emoji',
                x: 600,
                y: 600,
                sprite: { destroy: jest.fn() }
            };

            mockScene.cleanupObjectWithEffects(obj);

            expect(mockScene.add.particles).toHaveBeenCalledWith(600, 600, 'particle', expect.any(Object));
        });

        test('should play sound effect during cleanup', () => {
            const obj = {
                id: 'test7',
                type: 'number',
                x: 700,
                y: 700,
                sprite: { destroy: jest.fn() }
            };

            mockScene.cleanupObjectWithEffects(obj);

            expect(mockScene.audioContext.createOscillator).toHaveBeenCalled();
            expect(mockScene.audioContext.createGain).toHaveBeenCalled();
        });

        test('should handle missing audio context gracefully', () => {
            mockScene.audioContext = null;

            const obj = {
                id: 'test8',
                type: 'shape',
                x: 800,
                y: 800,
                sprite: { destroy: jest.fn() }
            };

            expect(() => {
                mockScene.cleanupObjectWithEffects(obj);
            }).not.toThrow();
        });
    });

    describe('Performance Optimization', () => {
        test('should only check cleanup periodically', () => {
            // Reset lastCleanupCheck to ensure first call proceeds
            mockScene.lastCleanupCheck = 0;
            
            const spy = jest.spyOn(mockScene, 'updateAutoCleanupConfig');
            
            // First call should proceed
            mockScene.checkAutoCleanup();
            expect(spy).toHaveBeenCalledTimes(1);

            // Immediate second call should be skipped (same timestamp)
            mockScene.checkAutoCleanup();
            expect(spy).toHaveBeenCalledTimes(1);

            // After interval, should proceed again
            mockCurrentTime += mockScene.cleanupCheckInterval + 1;
            mockScene.checkAutoCleanup();
            expect(spy).toHaveBeenCalledTimes(2);
        });
    });
});