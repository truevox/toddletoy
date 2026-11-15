/**
 * ConfigManager migration and merge-with-defaults logic.
 * Functions take the owning ConfigManager instance as first argument and call
 * back through it (manager.method) so instance-level spies still intercept.
 */

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isLanguageEntry = (l) => isPlainObject(l) && typeof l.code === 'string' && l.code.length > 0;

/**
 * Migrate old language structure to new difficulty ranking system
 */
export function migrateLanguageStructure(manager, config) {
    if (!isPlainObject(config) || !isPlainObject(config.languages)) return config;

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

    const migrateList = (list) => list.filter(isLanguageEntry).map(lang => {
        const data = difficultyData[lang.code];
        if (data && !lang.difficultyRank) {
            return { ...lang, ...data };
        }
        return lang;
    });

    // Update enabled / available languages (ignore wrong-typed lists; merge falls back to defaults)
    if (Array.isArray(config.languages.enabled)) {
        config.languages.enabled = migrateList(config.languages.enabled);
    }
    if (Array.isArray(config.languages.available)) {
        config.languages.available = migrateList(config.languages.available);
    }

    return config;
}

const NUMBER_MODES = ['cistercian', 'kaktovik', 'binary', 'objectCounting', 'onlyApples'];

/**
 * One-off migrations for saved configs written before the current schema.
 * v2 (app 2.3): the extra number displays went from all-on to all-off by
 * default. A saved config that still has the untouched all-on default is
 * calmed; anything a parent had changed is kept as they left it.
 */
export function migrateSchema(config) {
    if (!isPlainObject(config)) return config;
    const from = typeof config.schemaVersion === 'number' ? config.schemaVersion : 1;
    if (from < 2) {
        const modes = config.advanced && config.advanced.numberModes;
        if (isPlainObject(modes) && NUMBER_MODES.every((k) => modes[k] === true)) {
            for (const k of NUMBER_MODES) modes[k] = false;
        }
        config.schemaVersion = 2;
    }
    return config;
}

/**
 * Merge stored config over defaults, validating each field's type against the
 * default. Anything missing or wrong-typed (null, a string where an object is
 * expected, NaN, ...) falls back to the default so a corrupt saved config can
 * never break the config screen.
 */
export function mergeWithDefaults(manager, stored) {
    const defaults = manager.getDefaults();
    if (!isPlainObject(stored)) return defaults;

    const merge = (def, src) => {
        const result = { ...def };
        for (const key of Object.keys(src)) {
            const d = def[key];
            const v = src[key];
            if (d === undefined) {
                // Unknown key (e.g. written by a newer version): keep as-is
                if (v !== undefined) result[key] = v;
            } else if (isPlainObject(d)) {
                result[key] = isPlainObject(v) ? merge(d, v) : d;
            } else if (Array.isArray(d)) {
                result[key] = Array.isArray(v) ? v : d;
            } else if (typeof d === 'number') {
                result[key] = typeof v === 'number' && Number.isFinite(v) ? v : d;
            } else if (typeof v === typeof d) {
                result[key] = v;
            } // else: wrong type, keep default
        }
        return result;
    };

    const merged = merge(defaults, stored);

    // Language lists must hold well-formed entries. "enabled" can never be empty;
    // "available" legitimately is when every language is enabled.
    merged.languages.available = merged.languages.available.filter(isLanguageEntry);
    const enabled = merged.languages.enabled.filter(isLanguageEntry);
    merged.languages.enabled = enabled.length > 0 ? enabled : defaults.languages.enabled;
    const enabledCodes = new Set(merged.languages.enabled.map(l => l.code));
    merged.languages.available = merged.languages.available.filter(l => !enabledCodes.has(l.code));

    return merged;
}
