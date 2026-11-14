/**
 * ConfigManager validation logic.
 * Functions take the owning ConfigManager instance as first argument and call
 * back through it (manager.method) so instance-level spies still intercept.
 */

/**
 * Validate and fix configuration issues
 */
export function validateConfig(manager, config) {
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

    // Validate audio settings
    if (config.audio) {
        if (config.audio.volume < 0) config.audio.volume = 0;
        if (config.audio.volume > 100) config.audio.volume = 100;

        // Validate toneDuration: -1 or 100-20000ms
        if (config.audio.toneDuration !== -1) {
            if (config.audio.toneDuration < 100) config.audio.toneDuration = 100;
            if (config.audio.toneDuration > 20000) config.audio.toneDuration = 20000;
        }
    }

    // Validate speech settings
    if (config.speech) {
        if (config.speech.volume < 0) config.speech.volume = 0;
        if (config.speech.volume > 100) config.speech.volume = 100;
        // Handle NaN or invalid rate values - default to 1.0 (normal speed)
        if (isNaN(config.speech.rate) || config.speech.rate == null) {
            config.speech.rate = 1.0;
        } else {
            if (config.speech.rate < 0.25) config.speech.rate = 0.25;
            if (config.speech.rate > 2.0) config.speech.rate = 2.0;
        }
    }

    return { config, errors, warnings };
}
