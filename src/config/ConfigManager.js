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
            languages: {
                enabled: [
                    { code: 'en', name: 'English', nativeName: 'English', difficultyRank: 6, learningHours: '700-900h', colors: ['#B22234', '#FFFFFF', '#3C3B6E'] }, // American Red, White, Blue 🇺🇸
                    { code: 'es', name: 'Spanish', nativeName: 'Español', difficultyRank: 3, learningHours: '600-750h', colors: ['#AA151B', '#F1BF00'] } // Spanish Red & Yellow 🇪🇸
                ],
                available: [
                    { code: 'eo', name: 'Esperanto', nativeName: 'Esperanto', difficultyRank: 1, learningHours: '150-200h', colors: ['#009900', '#FFFFFF'] }, // Esperanto Green & White ⭐
                    { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', difficultyRank: 2, learningHours: '900h', colors: ['#FF0000', '#FFFFFF'] }, // Indonesian Red & White 🇮🇩
                    { code: 'pt', name: 'Portuguese', nativeName: 'Português', difficultyRank: 4, learningHours: '600-750h', colors: ['#006600', '#FF0000'] }, // Portuguese Green & Red 🇵🇹
                    { code: 'fr', name: 'French', nativeName: 'Français', difficultyRank: 5, learningHours: '600-750h', colors: ['#0055A4', '#FFFFFF', '#EF4135'] }, // French Blue, White, Red 🇫🇷
                    { code: 'jbo', name: 'Lojban', nativeName: 'la .lojban.', difficultyRank: 7, learningHours: '1000h±', colors: ['#00FF00', '#0000FF'] }, // Lojban Logical Green & Blue 🤖
                    { code: 'ru', name: 'Russian', nativeName: 'Русский', difficultyRank: 8, learningHours: '1100h', colors: ['#FFFFFF', '#0039A6', '#D52B1E'] }, // Russian White, Blue, Red 🇷🇺
                    { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', difficultyRank: 9, learningHours: '1100h', colors: ['#006A4E', '#F42A41'] }, // Bangladesh Green & Red 🇧🇩
                    { code: 'hi', name: 'Hindi', nativeName: 'हिन্দী', difficultyRank: 10, learningHours: '1100h', colors: ['#FF9933', '#FFFFFF', '#138808'] }, // Indian Saffron, White, Green 🇮🇳
                    { code: 'tlh', name: 'Klingon', nativeName: 'tlhIngan Hol', difficultyRank: 11, learningHours: '1400h±', colors: ['#8B0000', '#000000', '#FFD700'] }, // Klingon Dark Red, Black, Gold ⚔️
                    { code: 'ar', name: 'Modern Standard Arabic', nativeName: 'العربية', difficultyRank: 12, learningHours: '2200h', colors: ['#000000', '#FFFFFF', '#007A3D'] }, // Pan-Arab Black, White, Green
                    { code: 'zh', name: 'Mandarin Chinese', nativeName: '中文', difficultyRank: 13, learningHours: '2200h+', colors: ['#DE2910', '#FFDE00'] } // Chinese Red & Yellow 🇨🇳
                ]
            },
            advanced: {
                skipConfig: false,
                numberModes: { 
                    cistercian: true, 
                    kaktovik: true, 
                    binary: true,
                    objectCounting: false,
                    onlyApples: true
                },
                autoCleanup: {
                    enabled: true,
                    timeoutSeconds: 10
                }
            }
        };
    }

    /**
     * Load configuration from localStorage or use defaults
     */
    loadConfig() {
        try {
            // Clear cache in development mode if force refresh detected
            if (this.isDevelopmentMode() && this.isForceRefresh()) {
                console.log('🔄 Development mode force refresh detected - clearing localStorage cache');
                localStorage.removeItem(this.storageKey);
                return this.getDefaults();
            }
            
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Migrate old language structure if needed
                const migrated = this.migrateLanguageStructure(parsed);
                // Merge with defaults to ensure all required properties exist
                return this.mergeWithDefaults(migrated);
            }
        } catch (error) {
            console.warn('Failed to load config from localStorage:', error);
        }
        return this.getDefaults();
    }

    /**
     * Check if running in development mode
     */
    isDevelopmentMode() {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               window.location.port === '4000' ||
               window.location.port === '4001';
    }

    /**
     * Check if this is a force refresh (Ctrl+F5, Cmd+Shift+R)
     */
    isForceRefresh() {
        // Check for cache-busting URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('fresh') || urlParams.has('nocache')) {
            return true;
        }
        
        // Check for performance navigation type indicating force refresh
        if (performance.navigation && performance.navigation.type === 1) {
            return true;
        }
        
        return false;
    }

    /**
     * Migrate old language structure to new difficulty ranking system
     */
    migrateLanguageStructure(config) {
        if (!config.languages) return config;
        
        // Language difficulty mapping
        const difficultyData = {
            'eo': { difficultyRank: 1, learningHours: '150-200h' },
            'id': { difficultyRank: 2, learningHours: '900h' },
            'es': { difficultyRank: 3, learningHours: '600-750h' },
            'pt': { difficultyRank: 4, learningHours: '600-750h' },
            'fr': { difficultyRank: 5, learningHours: '600-750h' },
            'en': { difficultyRank: 6, learningHours: '700-900h' },
            'jbo': { difficultyRank: 7, learningHours: '1000h±' },
            'ru': { difficultyRank: 8, learningHours: '1100h' },
            'bn': { difficultyRank: 9, learningHours: '1100h' },
            'hi': { difficultyRank: 10, learningHours: '1100h' },
            'tlh': { difficultyRank: 11, learningHours: '1400h±' },
            'ar': { difficultyRank: 12, learningHours: '2200h' },
            'zh': { difficultyRank: 13, learningHours: '2200h+' }
        };
        
        // Update enabled languages
        if (config.languages.enabled) {
            config.languages.enabled = config.languages.enabled.map(lang => {
                const data = difficultyData[lang.code];
                if (data && !lang.difficultyRank) {
                    return { ...lang, ...data };
                }
                return lang;
            });
        }
        
        // Update available languages  
        if (config.languages.available) {
            config.languages.available = config.languages.available.map(lang => {
                const data = difficultyData[lang.code];
                if (data && !lang.difficultyRank) {
                    return { ...lang, ...data };
                }
                return lang;
            });
        }
        
        return config;
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
        if (config.content.smallNumbers.max >= config.content.largeNumbers.min) {
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
        // Map config keys to game types
        const typeMapping = {
            'shapes': 'shape',
            'smallNumbers': 'number',
            'largeNumbers': 'number', 
            'uppercaseLetters': 'letter',
            'lowercaseLetters': 'letter',
            'emojis': 'emoji'
        };

        const enabled = Object.entries(this.config.content)
            .filter(([key, value]) => value.enabled)
            .map(([key, value]) => ({ 
                type: typeMapping[key] || key, 
                configKey: key,
                weight: value.weight 
            }));

        // Special handling for emojis: include if any emoji category is enabled
        // even if the main emoji toggle is off
        const hasEmojiToggle = enabled.some(item => item.configKey === 'emojis');
        const hasAnyEmojiCategory = Object.values(this.config.emojiCategories).some(cat => cat.enabled);
        
        if (!hasEmojiToggle && hasAnyEmojiCategory) {
            // Add emoji type with weight based on enabled categories
            const emojiCategoryWeight = Object.values(this.config.emojiCategories)
                .filter(cat => cat.enabled)
                .reduce((sum, cat) => sum + cat.weight, 0);
            
            // Use the actual total category weight without scaling down
            if (emojiCategoryWeight > 0) {
                enabled.push({
                    type: 'emoji',
                    configKey: 'emojis',
                    weight: emojiCategoryWeight // Use full category weight, no scaling
                });
            }
        }

        const totalWeight = enabled.reduce((sum, item) => sum + item.weight, 0);
        
        return enabled.map(item => ({
            type: item.type,
            configKey: item.configKey,
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
     * Get enabled languages configuration
     */
    getLanguages() {
        return { ...this.config.languages };
    }

    /**
     * Get enabled language codes for backward compatibility
     */
    getLanguage() {
        // Return 'bilingual' if both en and es are enabled, otherwise first enabled language
        const enabledCodes = this.config.languages.enabled.map(lang => lang.code);
        if (enabledCodes.includes('en') && enabledCodes.includes('es') && enabledCodes.length === 2) {
            return 'bilingual';
        }
        return enabledCodes[0] || 'en';
    }

    /**
     * Get enabled number display modes
     */
    getNumberModes() {
        return { ...this.config.advanced.numberModes };
    }

    /**
     * Get auto-cleanup configuration
     */
    getAutoCleanupConfig() {
        return { ...this.config.advanced.autoCleanup };
    }

    /**
     * Clear all caches (localStorage, Service Worker) - development utility
     */
    async clearAllCaches() {
        try {
            // Clear localStorage
            localStorage.removeItem(this.storageKey);
            console.log('✅ localStorage cache cleared');
            
            // Clear Service Worker caches
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(
                    cacheNames.map(cacheName => caches.delete(cacheName))
                );
                console.log('✅ Service Worker caches cleared');
            }
            
            // Clear browser cache programmatically (if possible)
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.getRegistration();
                if (registration) {
                    await registration.unregister();
                    console.log('✅ Service Worker unregistered');
                }
            }
            
            console.log('🔄 All caches cleared - refresh page for clean state');
            return true;
        } catch (error) {
            console.error('Failed to clear caches:', error);
            return false;
        }
    }
}