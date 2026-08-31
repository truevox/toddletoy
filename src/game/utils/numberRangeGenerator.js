/**
 * Range filtering and synthetic-number generation for getRandomNumber().
 * Extracted from GameScene so the range/generation logic can be reasoned
 * about (and tested) independently of Phaser and the rest of game.js.
 */

const LANGUAGE_LOCALES = {
    en: 'en-US',
    es: 'es-ES',
    zh: 'zh-CN',
    hi: 'hi-IN',
    ar: 'ar-SA',
    fr: 'fr-FR',
    bn: 'bn-BD',
    pt: 'pt-PT',
    ru: 'ru-RU',
    id: 'id-ID'
};

export function normaliseBound(value, fallback) {
    if (value === undefined || value === null) {
        return fallback;
    }

    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
}

export function applyRangeFilter(list, min, max) {
    if (min === undefined && max === undefined) {
        return list;
    }

    return list.filter(num => {
        const value = typeof num.value === 'number' ? num.value : Number(num.value);
        if (Number.isNaN(value)) return false;
        if (min !== undefined && value < min) return false;
        if (max !== undefined && value > max) return false;
        return true;
    });
}

/**
 * Generate a synthetic number/locale-string set within [min, max] when the
 * bundled dataset has no entries in range. Returns null when the range is
 * invalid (min > max) rather than throwing.
 */
export function generateRangeFallback({ min, max, configType, configManager }) {
    const fallbackMin = normaliseBound(min, configType === 'smallNumbers' ? 0 : 12);
    const fallbackMax = normaliseBound(max, configType === 'smallNumbers' ? 10 : 9999);

    if (fallbackMin > fallbackMax) {
        return null;
    }

    const randomValue = Math.floor(Math.random() * (fallbackMax - fallbackMin + 1)) + fallbackMin;

    const enabledLanguages = configManager?.getConfig()?.languages?.enabled || [];
    const generated = {
        value: randomValue,
        type: 'number',
        categories: ['counting', 'generated'],
        source: 'generated-range'
    };

    const getFormatter = (locale) => {
        if (!locale || typeof Intl === 'undefined' || !Intl.NumberFormat) {
            return null;
        }

        try {
            return new Intl.NumberFormat(locale);
        } catch (err) {
            console.warn('Failed to create number formatter for locale', locale, err);
            return null;
        }
    };

    const ensureEntry = (code, formatter) => {
        try {
            generated[code] = formatter ? formatter.format(randomValue) : String(randomValue);
        } catch (fmtError) {
            console.warn('Failed to format number for language', code, fmtError);
            generated[code] = String(randomValue);
        }
    };

    // Always provide English fallback even if not explicitly enabled
    ensureEntry('en', getFormatter(LANGUAGE_LOCALES.en));

    enabledLanguages.forEach(lang => {
        const locale = LANGUAGE_LOCALES[lang.code];
        ensureEntry(lang.code, getFormatter(locale));
    });

    return generated;
}
