/**
 * @jest-environment jsdom
 */

// Test the configuration system components
// Note: Mocking instead of importing to avoid ES6 module issues in Jest

// Mock localStorage for testing
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
};
global.localStorage = localStorageMock;

import { ConfigManager } from '../src/config/ConfigManager.js';
import { Router } from '../src/routes/Router.js';

describe('Configuration System', () => {
    describe('ConfigManager', () => {
        let configManager;

        beforeEach(() => {
            jest.clearAllMocks();
            configManager = new ConfigManager();
        });

        test('should create default configuration', () => {
            const defaults = configManager.getDefaults();
            
            expect(defaults.content.shapes.enabled).toBe(true);
            expect(defaults.content.shapes.weight).toBe(25);
            expect(defaults.content.smallNumbers.min).toBe(0);
            expect(defaults.content.smallNumbers.max).toBe(20);
            expect(configManager.getLanguage()).toBe('bilingual');
        });

        test('should validate configuration and fix overlapping number ranges', () => {
            const invalidConfig = {
                ...configManager.getDefaults(),
                content: {
                    ...configManager.getDefaults().content,
                    smallNumbers: { enabled: true, min: 0, max: 25, weight: 30 },
                    largeNumbers: { enabled: true, min: 20, max: 9999, weight: 10 }
                }
            };

            const result = configManager.validateConfig(invalidConfig);
            
            expect(result.warnings.length).toBe(1);
            expect(result.config.content.smallNumbers.max).toBeLessThan(
                result.config.content.largeNumbers.min
            );
        });

        test('should get weighted content probabilities', () => {
            const weights = configManager.getContentWeights();
            
            expect(Array.isArray(weights)).toBe(true);
            expect(weights.length).toBeGreaterThan(0);
            
            const totalProbability = weights.reduce((sum, item) => sum + item.probability, 0);
            expect(totalProbability).toBeCloseTo(1, 2); // Should sum to 1
        });

        test('should handle emoji category weights', () => {
            const emojiWeights = configManager.getEmojiCategoryWeights();
            
            expect(Array.isArray(emojiWeights)).toBe(true);
            expect(emojiWeights.some(w => w.category === 'animals')).toBe(true);
        });

        test('should handle color category weights', () => {
            const colorWeights = configManager.getColorCategoryWeights();
            
            expect(Array.isArray(colorWeights)).toBe(true);
            expect(colorWeights.some(w => w.category === 'primary')).toBe(true);
        });

        test('should provide number range accessors', () => {
            const smallRange = configManager.getSmallNumberRange();
            const largeRange = configManager.getLargeNumberRange();
            
            expect(smallRange.min).toBe(0);
            expect(smallRange.max).toBe(20);
            expect(largeRange.min).toBe(21);
            expect(largeRange.max).toBe(9999);
        });

        test('should handle skip config setting', () => {
            expect(configManager.shouldSkipConfig()).toBe(false);
        });

        test('should get language setting', () => {
            expect(configManager.getLanguage()).toBe('bilingual');
        });

        test('should get number modes', () => {
            const modes = configManager.getNumberModes();
            
            expect(modes.cistercian).toBe(true);
            expect(modes.kaktovik).toBe(true);
            expect(modes.binary).toBe(true);
        });
    });

    describe('Router', () => {
        let router;

        beforeEach(() => {
            jest.clearAllMocks();
            router = new Router();
            jest.spyOn(router, 'handleRouteChange');
            jest.spyOn(router, 'navigate');
            jest.spyOn(router, 'replace');
            router.init();
        });

        test('should initialize with default route', () => {
            expect(router.getCurrentRoute()).toBe('/');
        });

        test('should register and handle routes', () => {
            const handler = jest.fn();
            router.addRoute('/test', handler);
            
            router.navigate('/test');
            
            expect(handler).toHaveBeenCalled();
            expect(router.getCurrentRoute()).toBe('/test');
        });

        test('should handle route replacement', () => {
            const handler = jest.fn();
            router.addRoute('/replace-test', handler);
            
            router.replace('/replace-test');
            
            expect(handler).toHaveBeenCalled();
            expect(router.replace).toHaveBeenCalled();
        });

        test('should check current route', () => {
            const handler = jest.fn();
            router.addRoute('/current-test', handler);
            router.navigate('/current-test');
            
            expect(router.isCurrentRoute('/current-test')).toBe(true);
            expect(router.isCurrentRoute('/other-route')).toBe(false);
        });
    });

    describe('Configuration Integration', () => {
        test('should integrate ConfigManager with application settings', () => {
            const configManager = new ConfigManager();
            const config = configManager.getConfig();
            
            // Verify all required sections exist
            expect(config.content).toBeDefined();
            expect(config.emojiCategories).toBeDefined();
            expect(config.colorCategories).toBeDefined();
            expect(config.languages).toBeDefined();
            expect(config.advanced).toBeDefined();
            
            // Verify category structure
            expect(config.emojiCategories.animals).toBeDefined();
            expect(config.emojiCategories.food).toBeDefined();
            expect(config.emojiCategories.vehicles).toBeDefined();
            
            expect(config.colorCategories.primary).toBeDefined();
            expect(config.colorCategories.secondary).toBeDefined();
            expect(config.colorCategories.neutral).toBeDefined();
        });

        test('should validate realistic configuration updates', () => {
            const configManager = new ConfigManager();
            
            const updatedConfig = {
                ...configManager.getDefaults(),
                content: {
                    ...configManager.getDefaults().content,
                    shapes: { enabled: true, weight: 50 },
                    emojis: { enabled: false, weight: 0 }
                },
                language: 'en'
            };

            const result = configManager.updateConfig(updatedConfig);
            
            expect(result.success).toBe(true);
            expect(result.config.content.shapes.weight).toBe(50);
            expect(result.config.languages.enabled[0].code).toBe('en');
        });
    });
});