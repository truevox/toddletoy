/**
 * Tests for audio configuration system
 * Validates audio/speech volume, mute, and rate settings
 */

import { jest } from '@jest/globals';

// Mock DOM environment
global.window = {
    location: {
        hostname: 'localhost',
        port: '4000',
        search: ''
    },
    localStorage: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn()
    },
    performance: {
        navigation: {
            type: 0
        }
    }
};

describe('Audio Configuration', () => {
    let ConfigManager;

    beforeAll(async () => {
        const configModule = await import('../../src/config/ConfigManager.js');
        ConfigManager = configModule.ConfigManager;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Default Configuration', () => {
        test('should include audio volume settings', () => {
            const configManager = new ConfigManager();
            const defaults = configManager.getDefaults();

            expect(defaults.audio).toBeDefined();
            expect(defaults.audio.volume).toBe(10);
            expect(defaults.audio.mute).toBe(false);
        });

        test('should include speech volume settings', () => {
            const configManager = new ConfigManager();
            const defaults = configManager.getDefaults();

            expect(defaults.speech).toBeDefined();
            expect(defaults.speech.volume).toBe(70);
            expect(defaults.speech.mute).toBe(false);
        });

        test('should include speech rate setting', () => {
            const configManager = new ConfigManager();
            const defaults = configManager.getDefaults();

            expect(defaults.speech.rate).toBe(1.0);
        });
    });

    describe('Configuration Validation', () => {
        test('should validate audio volume range (0-100)', () => {
            const configManager = new ConfigManager();

            const config = {
                ...configManager.getDefaults(),
                audio: { volume: 150, mute: false }
            };

            const result = configManager.validateConfig(config);
            expect(result.config.audio.volume).toBe(100); // Clamped to max
        });

        test('should validate audio volume minimum', () => {
            const configManager = new ConfigManager();

            const config = {
                ...configManager.getDefaults(),
                audio: { volume: -10, mute: false }
            };

            const result = configManager.validateConfig(config);
            expect(result.config.audio.volume).toBe(0); // Clamped to min
        });

        test('should validate speech volume range (0-100)', () => {
            const configManager = new ConfigManager();

            const config = {
                ...configManager.getDefaults(),
                speech: { volume: 200, mute: false, rate: 1.0 }
            };

            const result = configManager.validateConfig(config);
            expect(result.config.speech.volume).toBe(100); // Clamped to max
        });

        test('should validate speech rate range (0.25-2.0)', () => {
            const configManager = new ConfigManager();

            const config = {
                ...configManager.getDefaults(),
                speech: { volume: 70, mute: false, rate: 3.0 }
            };

            const result = configManager.validateConfig(config);
            expect(result.config.speech.rate).toBe(2.0); // Clamped to max
        });

        test('should validate speech rate minimum', () => {
            const configManager = new ConfigManager();

            const config = {
                ...configManager.getDefaults(),
                speech: { volume: 70, mute: false, rate: 0.1 }
            };

            const result = configManager.validateConfig(config);
            expect(result.config.speech.rate).toBe(0.25); // Clamped to min
        });
    });

    describe('Configuration Persistence', () => {
        test('should update and retrieve audio settings', () => {
            const configManager = new ConfigManager();

            const newConfig = {
                ...configManager.getDefaults(),
                audio: { volume: 25, mute: true },
                speech: { volume: 50, mute: false, rate: 1.5 }
            };

            const result = configManager.updateConfig(newConfig);

            expect(result.success).toBe(true);

            const currentConfig = configManager.getConfig();
            expect(currentConfig.audio.volume).toBe(25);
            expect(currentConfig.audio.mute).toBe(true);
            expect(currentConfig.speech.volume).toBe(50);
            expect(currentConfig.speech.rate).toBe(1.5);
        });
    });
});
