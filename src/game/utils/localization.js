const DEFAULT_FALLBACK_KEYS = ['en', 'en-US', 'en-GB', 'value', 'label', 'name'];

function normaliseLanguageCandidates(languageCode) {
    if (!languageCode) {
        return [];
    }

    const candidates = new Set();
    candidates.add(languageCode);

    if (languageCode.includes('-')) {
        const [base] = languageCode.split('-');
        if (base) {
            candidates.add(base);
        }
    }

    candidates.add(languageCode.replace('-', ''));
    candidates.add(languageCode.replace('-', '_'));

    return Array.from(candidates).filter(Boolean);
}

function coerceString(value) {
    if (value === undefined || value === null) {
        return '';
    }
    if (typeof value === 'number') {
        return String(value);
    }
    if (typeof value === 'string') {
        return value.trim();
    }
    return '';
}

export function getLocalizedString(data, languageCode, extraFallbacks = []) {
    if (data === undefined || data === null) {
        return '';
    }

    if (typeof data === 'string' || typeof data === 'number') {
        return coerceString(data);
    }

    const candidates = [
        ...normaliseLanguageCandidates(languageCode),
        ...extraFallbacks,
        ...DEFAULT_FALLBACK_KEYS
    ];

    for (const key of candidates) {
        if (!key) continue;
        const value = coerceString(data[key]);
        if (value) {
            return value;
        }
    }

    if ('value' in data) {
        const coerced = coerceString(data.value);
        if (coerced) {
            return coerced;
        }
    }

    if ('name' in data) {
        const coerced = coerceString(data.name);
        if (coerced) {
            return coerced;
        }
    }

    return '';
}

export function buildColorizedLabel(itemData, languageCode) {
    if (!itemData) {
        return '';
    }

    const baseLabel = getLocalizedString(itemData, languageCode) ||
        getLocalizedString(itemData, 'en') ||
        coerceString(itemData.value);

    if (itemData.color) {
        const colorWord = getLocalizedString(itemData.color, languageCode) ||
            getLocalizedString(itemData.color, 'en');

        if (colorWord) {
            return baseLabel ? `${colorWord} ${baseLabel}` : colorWord;
        }
    }

    return baseLabel;
}
