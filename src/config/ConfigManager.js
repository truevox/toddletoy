/**
 * ConfigManager - Handles configuration storage, validation, and defaults
 * Manages user preferences for the toddler toy application
 */
export class ConfigManager {
    constructor() {
        this.storageKey = 'toddleToyConfig';
        this.config = this.loadConfig();
    }

    /**
     * Get default configuration for new users
     */
    getDefaults() {
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
                primary: { enabled: true, weight: 50 },    // Red, Blue, Yellow
                secondary: { enabled: true, weight: 35 },  // Green, Orange, Purple  
                neutral: { enabled: false, weight: 15 }    // Black, White, Brown, Gray
            },
            language: 'bilingual', // 'en', 'es', 'bilingual'
            advanced: {
                skipConfig: false,
                numberModes: { 
                    cistercian: true, 
                    kaktovik: true, 
                    binary: true 
                }
            }
        };
    }

    /**
     * Load configuration from localStorage or use defaults
     */
    loadConfig() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Merge with defaults to ensure all required properties exist
                return this.mergeWithDefaults(parsed);
            }
        } catch (error) {
            console.warn('Failed to load config from localStorage:', error);
        }
        return this.getDefaults();
    }

    /**
     * Save configuration to localStorage
     */
    saveConfig(config = this.config) {
        try {
            this.config = config;
            localStorage.setItem(this.storageKey, JSON.stringify(config));
            return true;
        } catch (error) {
            console.error('Failed to save config to localStorage:', error);
            return false;
        }
    }

    /**
     * Merge stored config with defaults to handle version updates
     */
    mergeWithDefaults(stored) {
        const defaults = this.getDefaults();
        
        // Deep merge function
        const deepMerge = (target, source) => {
            const result = { ...target };
            for (const key in source) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    result[key] = deepMerge(target[key] || {}, source[key]);
                } else {
                    result[key] = source[key];
                }
            }
            return result;
        };

        return deepMerge(defaults, stored);
    }

    /**
     * Validate and fix configuration issues
     */
    validateConfig(config) {
        const errors = [];
        const warnings = [];

        // Validate number ranges
        if (config.content.smallNumbers.min >= config.content.largeNumbers.min) {
            // Auto-fix: adjust ranges to prevent overlap
            config.content.smallNumbers.max = config.content.largeNumbers.min - 1;
            warnings.push(`Adjusted small number range to ${config.content.smallNumbers.min}-${config.content.smallNumbers.max} to prevent overlap with large numbers`);
        }

        // Ensure at least one content type is enabled
        const enabledContent = Object.values(config.content).some(item => item.enabled);
        if (!enabledContent) {
            config.content.shapes.enabled = true;
            warnings.push('Enabled shapes because at least one content type must be active');
        }

        // Validate weights (should be 1-100)
        const validateWeights = (section) => {
            Object.keys(section).forEach(key => {
                if (section[key].weight !== undefined) {
                    if (section[key].weight < 1) section[key].weight = 1;
                    if (section[key].weight > 100) section[key].weight = 100;
                }
            });
        };

        validateWeights(config.content);
        validateWeights(config.emojiCategories);
        validateWeights(config.colorCategories);

        return { config, errors, warnings };
    }

    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }

    /**
     * Update configuration with validation
     */
    updateConfig(newConfig) {
        const validation = this.validateConfig(newConfig);
        
        if (validation.warnings.length > 0) {
            console.warn('Configuration warnings:', validation.warnings);
        }
        
        if (validation.errors.length > 0) {
            console.error('Configuration errors:', validation.errors);
            return { success: false, errors: validation.errors, warnings: validation.warnings };
        }

        this.config = validation.config;
        const saved = this.saveConfig();
        
        return { 
            success: saved, 
            errors: validation.errors, 
            warnings: validation.warnings,
            config: this.config
        };
    }

    /**
     * Reset to defaults
     */
    resetToDefaults() {
        this.config = this.getDefaults();
        return this.saveConfig();
    }

    /**
     * Get weighted selection probabilities for content types
     */
    getContentWeights() {
        const enabled = Object.entries(this.config.content)
            .filter(([key, value]) => value.enabled)
            .map(([key, value]) => ({ type: key, weight: value.weight }));

        const totalWeight = enabled.reduce((sum, item) => sum + item.weight, 0);
        
        return enabled.map(item => ({
            type: item.type,
            probability: totalWeight > 0 ? item.weight / totalWeight : 0
        }));
    }

    /**
     * Get weighted selection probabilities for emoji categories
     */
    getEmojiCategoryWeights() {
        const enabled = Object.entries(this.config.emojiCategories)
            .filter(([key, value]) => value.enabled)
            .map(([key, value]) => ({ category: key, weight: value.weight }));

        const totalWeight = enabled.reduce((sum, item) => sum + item.weight, 0);
        
        return enabled.map(item => ({
            category: item.category,
            probability: totalWeight > 0 ? item.weight / totalWeight : 0
        }));
    }

    /**
     * Get weighted selection probabilities for color categories
     */
    getColorCategoryWeights() {
        const enabled = Object.entries(this.config.colorCategories)
            .filter(([key, value]) => value.enabled)
            .map(([key, value]) => ({ category: key, weight: value.weight }));

        const totalWeight = enabled.reduce((sum, item) => sum + item.weight, 0);
        
        return enabled.map(item => ({
            category: item.category,
            probability: totalWeight > 0 ? item.weight / totalWeight : 0
        }));
    }

    /**
     * Check if configuration screen should be skipped
     */
    shouldSkipConfig() {
        return this.config.advanced.skipConfig;
    }

    /**
     * Get number range for small numbers
     */
    getSmallNumberRange() {
        return {
            min: this.config.content.smallNumbers.min,
            max: this.config.content.smallNumbers.max
        };
    }

    /**
     * Get number range for large numbers
     */
    getLargeNumberRange() {
        return {
            min: this.config.content.largeNumbers.min,
            max: this.config.content.largeNumbers.max
        };
    }

    /**
     * Get enabled language setting
     */
    getLanguage() {
        return this.config.language;
    }

    /**
     * Get enabled number display modes
     */
    getNumberModes() {
        return { ...this.config.advanced.numberModes };
    }
}