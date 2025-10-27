/**
 * Audio Tone Duration Tests
 * Tests for configurable audio tone duration feature (Issue #2)
 */

import { ConfigManager } from '../src/config/ConfigManager.js';
import { AudioManager } from '../src/game/systems/AudioManager.js';

describe('Audio Tone Duration Configuration', () => {
    let configManager;
    let mockScene;
    let audioManager;
    let mockAudioContext;
    let mockOscillator;
    let mockGainNode;

    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();

        // Mock Web Audio API components
        mockOscillator = {
            connect: jest.fn(),
            start: jest.fn(),
            stop: jest.fn(),
            frequency: { value: 440 },
            type: 'sine'
        };

        mockGainNode = {
            connect: jest.fn(),
            gain: { value: 0.1 }
        };

        mockAudioContext = {
            createOscillator: jest.fn().mockReturnValue(mockOscillator),
            createGain: jest.fn().mockReturnValue(mockGainNode),
            destination: {},
            currentTime: 0,
            state: 'running',
            resume: jest.fn().mockResolvedValue(undefined)
        };

        global.AudioContext = jest.fn().mockImplementation(() => mockAudioContext);

        // Create ConfigManager instance
        configManager = new ConfigManager();

        // Create mock scene with configManager
        mockScene = {
            configManager: configManager,
            scale: {
                width: 800,
                height: 600
            }
        };

        // Create AudioManager instance
        audioManager = new AudioManager(mockScene);
        audioManager.audioContext = mockAudioContext;
    });

    describe('ConfigManager Default Configuration', () => {
        test('should have toneDuration in default audio config', () => {
            const defaults = configManager.getDefaults();
            expect(defaults.audio).toHaveProperty('toneDuration');
        });

        test('should default to -1 (play until destroyed)', () => {
            const defaults = configManager.getDefaults();
            expect(defaults.audio.toneDuration).toBe(-1);
        });

        test('should validate toneDuration range (-1 or 100-20000ms)', () => {
            const config = configManager.getDefaults();

            // Test valid values
            config.audio.toneDuration = -1;
            let validation = configManager.validateConfig(config);
            expect(validation.config.audio.toneDuration).toBe(-1);

            config.audio.toneDuration = 100;
            validation = configManager.validateConfig(config);
            expect(validation.config.audio.toneDuration).toBe(100);

            config.audio.toneDuration = 20000;
            validation = configManager.validateConfig(config);
            expect(validation.config.audio.toneDuration).toBe(20000);

            config.audio.toneDuration = 5000;
            validation = configManager.validateConfig(config);
            expect(validation.config.audio.toneDuration).toBe(5000);
        });

        test('should clamp toneDuration below minimum to 100ms', () => {
            const config = configManager.getDefaults();
            config.audio.toneDuration = 50; // Below minimum

            const validation = configManager.validateConfig(config);
            expect(validation.config.audio.toneDuration).toBe(100);
        });

        test('should clamp toneDuration above maximum to 20000ms', () => {
            const config = configManager.getDefaults();
            config.audio.toneDuration = 30000; // Above maximum

            const validation = configManager.validateConfig(config);
            expect(validation.config.audio.toneDuration).toBe(20000);
        });
    });

    describe('ConfigManager Audio Config API', () => {
        test('should return toneDuration in getAudioConfig()', () => {
            const audioConfig = configManager.getAudioConfig();
            expect(audioConfig).toHaveProperty('toneDuration');
            expect(audioConfig.toneDuration).toBe(-1);
        });

        test('should persist toneDuration to localStorage', () => {
            const config = configManager.getConfig();
            config.audio.toneDuration = 5000;

            configManager.updateConfig(config);

            // Create new ConfigManager to test persistence
            const newConfigManager = new ConfigManager();
            const loadedConfig = newConfigManager.getAudioConfig();

            expect(loadedConfig.toneDuration).toBe(5000);
        });
    });

    describe('AudioManager Duration Support', () => {
        test('should play tone indefinitely when toneDuration is -1', (done) => {
            const config = configManager.getConfig();
            config.audio.toneDuration = -1;
            configManager.updateConfig(config);

            audioManager.generateContinuousTone(100, 200, 'obj1');

            // Verify tone was started
            expect(mockOscillator.start).toHaveBeenCalled();

            // Wait 100ms and verify tone is still active
            setTimeout(() => {
                expect(audioManager.hasTone('obj1')).toBe(true);
                expect(mockOscillator.stop).not.toHaveBeenCalled();
                done();
            }, 100);
        });

        test('should stop tone after specified duration (1000ms)', (done) => {
            const config = configManager.getConfig();
            config.audio.toneDuration = 1000;
            configManager.updateConfig(config);

            audioManager.generateContinuousTone(100, 200, 'obj2');

            // Verify tone was started
            expect(mockOscillator.start).toHaveBeenCalled();

            // Verify tone is still active before timeout
            setTimeout(() => {
                expect(audioManager.hasTone('obj2')).toBe(true);
            }, 500);

            // Verify tone is stopped after timeout
            setTimeout(() => {
                expect(mockOscillator.stop).toHaveBeenCalled();
                expect(audioManager.hasTone('obj2')).toBe(false);
                done();
            }, 1100);
        });

        test('should stop tone after minimum duration (100ms)', (done) => {
            const config = configManager.getConfig();
            config.audio.toneDuration = 100;
            configManager.updateConfig(config);

            audioManager.generateContinuousTone(100, 200, 'obj3');

            // Verify tone is stopped after minimum timeout
            setTimeout(() => {
                expect(mockOscillator.stop).toHaveBeenCalled();
                expect(audioManager.hasTone('obj3')).toBe(false);
                done();
            }, 150);
        });

        test('should allow manual stop before duration expires', () => {
            const config = configManager.getConfig();
            config.audio.toneDuration = 5000;
            configManager.updateConfig(config);

            audioManager.generateContinuousTone(100, 200, 'obj4');
            expect(audioManager.hasTone('obj4')).toBe(true);

            // Manually stop before timeout
            audioManager.stopTone('obj4');

            expect(mockOscillator.stop).toHaveBeenCalled();
            expect(audioManager.hasTone('obj4')).toBe(false);
        });

        test('should cancel previous timeout when replacing tone', (done) => {
            const config = configManager.getConfig();
            config.audio.toneDuration = 2000;
            configManager.updateConfig(config);

            // Create first tone with 2000ms timeout
            audioManager.generateContinuousTone(100, 200, 'obj5');
            const firstOscillator = mockOscillator;

            // Replace with second tone after 500ms
            setTimeout(() => {
                mockOscillator = {
                    connect: jest.fn(),
                    start: jest.fn(),
                    stop: jest.fn(),
                    frequency: { value: 440 },
                    type: 'sine'
                };
                mockAudioContext.createOscillator.mockReturnValue(mockOscillator);

                audioManager.generateContinuousTone(150, 250, 'obj5');

                // First oscillator should have been stopped (and its timeout cleared)
                expect(firstOscillator.stop).toHaveBeenCalled();

                // After 2100ms from start (600ms after first would have expired),
                // verify second tone is still active (only 1600ms into its 2000ms timeout)
                setTimeout(() => {
                    expect(audioManager.hasTone('obj5')).toBe(true);
                    done();
                }, 1600);
            }, 500);
        }, 10000); // Increase timeout to 10 seconds for this test
    });

    describe('Duration Edge Cases', () => {
        test('should handle object removal before duration expires', () => {
            const config = configManager.getConfig();
            config.audio.toneDuration = 10000;
            configManager.updateConfig(config);

            audioManager.generateContinuousTone(100, 200, 'obj6');
            expect(audioManager.hasTone('obj6')).toBe(true);

            // Remove object immediately
            audioManager.stopTone('obj6');

            expect(audioManager.hasTone('obj6')).toBe(false);
        });

        test('should not create tone when audio is muted', () => {
            const config = configManager.getConfig();
            config.audio.mute = true;
            config.audio.toneDuration = 1000;
            configManager.updateConfig(config);

            const result = audioManager.generateContinuousTone(100, 200, 'obj7');

            expect(result).toBeNull();
            expect(audioManager.hasTone('obj7')).toBe(false);
        });
    });
});
