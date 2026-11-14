/**
 * ConfigManager weight calculations.
 * Functions take the owning ConfigManager instance as first argument and call
 * back through it (manager.method) so instance-level spies still intercept.
 */

/**
 * Get weighted selection probabilities for content types
 */
export function getContentWeights(manager) {
    // Map config keys to game types
    const typeMapping = {
        'shapes': 'shape',
        'smallNumbers': 'number',
        'largeNumbers': 'number', 
        'uppercaseLetters': 'letter',
        'lowercaseLetters': 'letter',
        'emojis': 'emoji'
    };

    const enabled = Object.entries(manager.config.content)
        .filter(([, value]) => value.enabled)
        .map(([key, value]) => ({ 
            type: typeMapping[key] || key, 
            configKey: key,
            weight: value.weight 
        }));

    // Special handling for emojis: include if any emoji category is enabled
    // even if the main emoji toggle is off
    const hasEmojiToggle = enabled.some(item => item.configKey === 'emojis');
    const hasAnyEmojiCategory = Object.values(manager.config.emojiCategories).some(cat => cat.enabled);
    
    if (!hasEmojiToggle && hasAnyEmojiCategory) {
        // Add emoji type with weight based on enabled categories
        const emojiCategoryWeight = Object.values(manager.config.emojiCategories)
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
export function getEmojiCategoryWeights(manager) {
    const enabled = Object.entries(manager.config.emojiCategories)
        .filter(([, value]) => value.enabled)
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
export function getColorCategoryWeights(manager) {
    const enabled = Object.entries(manager.config.colorCategories)
        .filter(([, value]) => value.enabled)
        .map(([key, value]) => ({ category: key, weight: value.weight }));

    const totalWeight = enabled.reduce((sum, item) => sum + item.weight, 0);
    
    return enabled.map(item => ({
        category: item.category,
        probability: totalWeight > 0 ? item.weight / totalWeight : 0
    }));
}
