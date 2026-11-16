/**
 * Audio Tone Duration Tests
 * Tests for configurable audio tone duration feature (Issue #2)
 */

import { ConfigManager } from '../src/config/ConfigManager.js';
import { AudioManager } from '../src/game/systems/AudioManager.js';
import { makeMockContext } from './helpers/mock-audio.js';

describe('Audio Tone Duration Configuration', () => {
    let configManager;
    let mockScene;
    let audioManager;
    let mockAudioContext;

    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();

        mockAudioContext = makeMockContext();
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
        audioManager.engine.unlocked = true; // as after the first tap
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

    // audio.toneDuration is still stored and validated (older configs carry it) but the sound engine
    // plays short enveloped notes that end by themselves, so it no longer changes playback.
    describe('AudioManager ignores toneDuration (notes always end on their own)', () => {
        const withDuration = (ms) => {
            const config = configManager.getConfig();
            config.audio.toneDuration = ms;
            configManager.updateConfig(config);
        };

        test.each([-1, 100, 5000, 20000])('toneDuration %i: a note sounds, then ends by itself', (ms) => {
            withDuration(ms);
            audioManager.generateContinuousTone(100, 200, 'obj1');
            expect(audioManager.hasTone('obj1')).toBe(true);
            mockAudioContext.currentTime = 3;
            expect(audioManager.hasTone('obj1')).toBe(false);
            expect(audioManager.getToneCount()).toBe(0);
            for (const src of mockAudioContext.sources) expect(src.stop).toHaveBeenCalled();
        });

        test('manual stop silences the object at once', () => {
            withDuration(5000);
            audioManager.generateContinuousTone(100, 200, 'obj4');
            expect(audioManager.hasTone('obj4')).toBe(true);
            audioManager.stopTone('obj4');
            expect(audioManager.hasTone('obj4')).toBe(false);
        });

        test('no note is created when audio is muted', () => {
            const config = configManager.getConfig();
            config.audio.mute = true;
            configManager.updateConfig(config);
            expect(audioManager.generateContinuousTone(100, 200, 'obj7')).toBeNull();
            expect(audioManager.hasTone('obj7')).toBe(false);
        });
    });
});
