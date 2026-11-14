/**
 * ConfigManager migration and merge-with-defaults logic.
 * Functions take the owning ConfigManager instance as first argument and call
 * back through it (manager.method) so instance-level spies still intercept.
 */

/**
 * Migrate old language structure to new difficulty ranking system
 */
export function migrateLanguageStructure(manager, config) {
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
 * Merge stored config with defaults to handle version updates
 */
export function mergeWithDefaults(manager, stored) {
    const defaults = manager.getDefaults();
    
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
