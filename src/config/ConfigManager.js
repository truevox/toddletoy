import { getDefaults } from './manager/ConfigDefaults.js';
import { migrateLanguageStructure, mergeWithDefaults } from './manager/ConfigMigration.js';
import { validateConfig } from './manager/ConfigValidation.js';
import { getContentWeights, getEmojiCategoryWeights, getColorCategoryWeights } from './manager/ConfigWeights.js';

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
        return getDefaults(this);
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
               window.location.port === '4001' ||
               window.location.port === '4002';
    }

    /**
     * Check if this is a force refresh (Ctrl+F5, Cmd+Shift+R)
     * IMPORTANT: This should ONLY return true for actual hard refreshes, not normal navigation
     */
    isForceRefresh() {
        // Only check for explicit cache-busting URL parameters
        // DO NOT use performance.navigation.type as it triggers on normal page loads
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.has('fresh') || urlParams.has('nocache');
    }

    /**
     * Migrate old language structure to new difficulty ranking system
     */
    migrateLanguageStructure(config) {
        return migrateLanguageStructure(this, config);
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
        return mergeWithDefaults(this, stored);
    }

    /**
     * Validate and fix configuration issues
     */
    validateConfig(config) {
        return validateConfig(this, config);
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
        return getContentWeights(this);
    }

    /**
     * Get weighted selection probabilities for emoji categories
     */
    getEmojiCategoryWeights() {
        return getEmojiCategoryWeights(this);
    }

    /**
     * Get weighted selection probabilities for color categories
     */
    getColorCategoryWeights() {
        return getColorCategoryWeights(this);
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
     * Get audio configuration
     */
    getAudioConfig() {
        return { ...this.config.audio };
    }

    /**
     * Get speech configuration
     */
    getSpeechConfig() {
        return { ...this.config.speech };
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