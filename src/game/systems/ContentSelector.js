import emojiDataBundled from '../../../public/emojis.json'
import thingsDataBundled from '../../../public/things.json'
import { normaliseBound, applyRangeFilter, generateRangeFallback } from '../utils/numberRangeGenerator.js'

/**
 * ContentSelector - Random content selection (type, emoji, shape, letter, color, number).
 * State (emojiData, thingsData, configManager) stays on the scene; calls go back through the scene.
 */
export class ContentSelector {
    constructor(scene) {
        this.scene = scene;
    }

    // Configuration and content selection methods
    selectSpawnType() {
        const config = this.scene.configManager ? this.scene.configManager.getConfig() : null;
        if (!config) return 'emoji';

        const types = config.content || {};
        const weights = [];

        if (types.shapes?.enabled && types.shapes?.weight > 0) weights.push({ type: 'shapes', weight: types.shapes.weight });
        if (types.smallNumbers?.enabled && types.smallNumbers?.weight > 0) weights.push({ type: 'smallNumbers', weight: types.smallNumbers.weight });
        if (types.largeNumbers?.enabled && types.largeNumbers?.weight > 0) weights.push({ type: 'largeNumbers', weight: types.largeNumbers.weight });
        if (types.uppercaseLetters?.enabled && types.uppercaseLetters?.weight > 0) weights.push({ type: 'uppercaseLetters', weight: types.uppercaseLetters.weight });
        if (types.lowercaseLetters?.enabled && types.lowercaseLetters?.weight > 0) weights.push({ type: 'lowercaseLetters', weight: types.lowercaseLetters.weight });
        if (types.emojis?.enabled && types.emojis?.weight > 0) weights.push({ type: 'emoji', weight: types.emojis.weight });

        if (weights.length === 0) return 'emoji';

        // Weighted random selection
        const totalWeight = weights.reduce((sum, item) => sum + item.weight, 0);
        let random = Math.random() * totalWeight;

        for (const item of weights) {
            random -= item.weight;
            if (random <= 0) {
                return item.type;
            }
        }

        return weights[0].type;
    }

    /** Is this content type switched on (and weighted) in the parent's settings? */
    isTypeEnabled(name) {
        const config = this.scene.configManager ? this.scene.configManager.getConfig() : null;
        const t = config && config.content && config.content[name];
        return !!(t && t.enabled && t.weight > 0);
    }

    /**
     * The content a baby-keyboard key asks for, or null when the settings do not allow it
     * (the caller then spawns a random enabled thing instead).
     * @param {'letter'|'digit'|'other'} kind
     * @param {string|number} value - letter (any case) or digit
     * @returns {Promise<{type:string,item:Object}|null>} type is a spawn type ('uppercaseLetters', 'smallNumbers', ...)
     */
    async resolveKeyContent(kind, value) {
        if (!this.scene.thingsData) this.scene.thingsData = thingsDataBundled;
        if (kind === 'letter') {
            const type = this.isTypeEnabled('uppercaseLetters') ? 'uppercaseLetters'
                : this.isTypeEnabled('lowercaseLetters') ? 'lowercaseLetters' : null;
            if (!type) return null;
            const upper = type === 'uppercaseLetters';
            const wanted = upper ? String(value).toUpperCase() : String(value).toLowerCase();
            const found = (this.scene.thingsData.letters || []).find(l => l.case === (upper ? 'upper' : 'lower') && l.value === wanted);
            return found ? { type, item: { ...found, type: 'letter' } } : null;
        }
        if (kind === 'digit') {
            const n = Number(value);
            const found = (this.scene.thingsData.numbers || []).find(x => x.value === n);
            if (!found) return null;
            for (const type of ['smallNumbers', 'largeNumbers']) {
                if (!this.isTypeEnabled(type)) continue;
                const range = this.scene.getNumberRangeForType(type);
                if (applyRangeFilter([found], normaliseBound(range?.min, undefined), normaliseBound(range?.max, undefined)).length === 0) continue;
                const color = await this.scene.getRandomColor();
                return { type, item: { ...found, type: 'number', color } };
            }
        }
        return null;
    }

    async getRandomEmoji() {
        // Emoji data is bundled at build time (see the import at the top of this
        // file), so it is always available - no network fetch, no failure mode.
        if (!this.scene.emojiData) {
            this.scene.emojiData = emojiDataBundled;
        }

        // Get filtered emojis based on enabled emoji categories
        const config = this.scene.configManager ? this.scene.configManager.getConfig() : null;
        let availableEmojis = this.scene.emojiData;

        // Filter by enabled emoji categories (animals, food, vehicles, etc.)
        if (config && config.emojiCategories) {
            const enabledCategories = Object.entries(config.emojiCategories)
                .filter(([, val]) => val.enabled)
                .map(([key]) => key);

            if (enabledCategories.length > 0) {
                availableEmojis = availableEmojis.filter(emoji =>
                    emoji.categories && emoji.categories.some(cat =>
                        enabledCategories.includes(cat)
                    )
                );

            }
        }

        // Fallback to all emojis if no valid ones after filtering
        if (availableEmojis.length === 0) {
            console.warn('⚠️ No emojis matched enabled categories, using all emojis as fallback');
            availableEmojis = this.scene.emojiData;
        }

        // Select random emoji
        const randomIndex = Math.floor(Math.random() * availableEmojis.length);
        return availableEmojis[randomIndex];
    }

    async getRandomShape() {
        if (!this.scene.thingsData) {
            this.scene.thingsData = thingsDataBundled;
        }

        const shapes = this.scene.thingsData.shapes || [];
        if (shapes.length === 0) {
            console.error('⚠️ No shapes found in bundled things.json data - check public/things.json');
            return { value: 'Circle', type: 'shape' };
        }

        const randomIndex = Math.floor(Math.random() * shapes.length);
        return { ...shapes[randomIndex], type: 'shape' };
    }

    async getRandomLetter(configType = 'uppercaseLetters') {
        if (!this.scene.thingsData) {
            this.scene.thingsData = thingsDataBundled;
        }

        const letters = this.scene.thingsData.letters || [];
        const isUppercase = configType === 'uppercaseLetters';
        const filteredLetters = letters.filter(letter =>
            isUppercase ? letter.case === 'upper' : letter.case === 'lower'
        );

        if (filteredLetters.length === 0) {
            console.error('⚠️ No letters found in bundled things.json data - check public/things.json');
            return { value: isUppercase ? 'A' : 'a', type: 'letter' };
        }

        const randomIndex = Math.floor(Math.random() * filteredLetters.length);
        return { ...filteredLetters[randomIndex], type: 'letter' };
    }

    async getRandomColor(allowedCategories = null) {
        if (!this.scene.thingsData) {
            this.scene.thingsData = thingsDataBundled;
        }

        // Get enabled color categories from config
        const config = this.scene.configManager ? this.scene.configManager.getConfig() : null;
        const colorCategories = config?.colorCategories || {};

        // Get enabled category names
        const enabledCategories = Object.entries(colorCategories)
            .filter(([, value]) => value.enabled)
            .map(([key]) => key);

        // Filter colors by enabled categories
        const colors = this.scene.thingsData.colors || [];
        const allowedSet = Array.isArray(allowedCategories) && allowedCategories.length > 0
            ? new Set(allowedCategories)
            : null;

        const matchesAllowed = (color) => {
            if (!allowedSet) return true;
            if (color.category && allowedSet.has(color.category)) return true;
            if (Array.isArray(color.categories)) {
                return color.categories.some(cat => allowedSet.has(cat));
            }
            return false;
        };

        let availableColors = colors.filter(color =>
            (enabledCategories.length === 0 || enabledCategories.includes(color.category)) && matchesAllowed(color)
        );

        // If filtering by enabled categories removed all options, fallback to allowed categories regardless of config
        if (availableColors.length === 0 && allowedSet) {
            availableColors = colors.filter(matchesAllowed);
        }

        // Fallback to all colors if none available
        if (availableColors.length === 0) {
            availableColors = colors;
        }

        // Select random color
        if (availableColors.length === 0) {
            console.error('⚠️ No colors found in bundled things.json data - check public/things.json');
            return { value: 'White', en: 'White', hex: '#ffffff' };
        }

        const randomIndex = Math.floor(Math.random() * availableColors.length);
        const chosenColor = availableColors[randomIndex];
        return { ...chosenColor };
    }

    async getRandomNumber(configType = 'smallNumbers') {
        if (!this.scene.thingsData) {
            this.scene.thingsData = thingsDataBundled;
        }

        const numbers = this.scene.thingsData.numbers || [];

        if (numbers.length === 0) {
            console.error('⚠️ No numbers found in bundled things.json data - check public/things.json');
            return { value: 1, type: 'number' };
        }

        const range = this.scene.getNumberRangeForType(configType);
        const min = normaliseBound(range?.min, undefined);
        const max = normaliseBound(range?.max, undefined);

        let filteredNumbers = applyRangeFilter(numbers, min, max);
        let selectedNumber;

        if (filteredNumbers.length === 0) {
            if (range) {
                console.warn(`No numbers available for ${configType} in range ${min ?? '-∞'}-${max ?? '+∞'}. Attempting to generate values.`);
            }

            selectedNumber = generateRangeFallback({ min, max, configType, configManager: this.scene.configManager });

            if (!selectedNumber) {
                // Fall back to legacy heuristics before finally resorting to the raw dataset
                if (configType === 'smallNumbers') {
                    filteredNumbers = numbers.filter(num => num.value <= 10);
                } else if (configType === 'largeNumbers') {
                    filteredNumbers = numbers.filter(num => num.value >= 12);
                }

                if (filteredNumbers.length > 0) {
                    const legacyIndex = Math.floor(Math.random() * filteredNumbers.length);
                    selectedNumber = { ...filteredNumbers[legacyIndex], type: 'number' };
                }
            }
        }

        if (!selectedNumber) {
            // Normal path: use filtered dataset values
            const pool = filteredNumbers.length > 0 ? filteredNumbers : numbers;
            const randomIndex = Math.floor(Math.random() * pool.length);
            selectedNumber = { ...pool[randomIndex], type: 'number' };
        }

        const number = { ...selectedNumber };

        // Assign a random color to the number
        const color = await this.scene.getRandomColor();
        number.color = color;

        return number;
    }

    getNumberRangeForType(configType) {
        if (!this.scene.configManager) return null;

        if (configType === 'smallNumbers' && this.scene.configManager.getSmallNumberRange) {
            return this.scene.configManager.getSmallNumberRange();
        }

        if (configType === 'largeNumbers' && this.scene.configManager.getLargeNumberRange) {
            return this.scene.configManager.getLargeNumberRange();
        }

        return null;
    }
}
