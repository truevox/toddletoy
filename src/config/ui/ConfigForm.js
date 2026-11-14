/**
 * ConfigScreen form <-> config logic (load into UI, collect from UI, helpers).
 * Functions take the owning ConfigScreen instance as first argument and call
 * back through it (screen.method) so instance-level spies still intercept.
 */

/**
 * Load current configuration into the UI
 */
export function loadCurrentConfig(screen) {
    const config = screen.configManager.getConfig();

    // Content types
    screen.setCheckboxValue('#shapes-enabled', config.content.shapes.enabled);
    screen.setSliderValue('#shapes-weight', config.content.shapes.weight);

    screen.setCheckboxValue('#small-numbers-enabled', config.content.smallNumbers.enabled);
    screen.setSliderValue('#small-numbers-weight', config.content.smallNumbers.weight);
    screen.setInputValue('#small-min', config.content.smallNumbers.min);
    screen.setInputValue('#small-max', config.content.smallNumbers.max);

    screen.setCheckboxValue('#large-numbers-enabled', config.content.largeNumbers.enabled);
    screen.setSliderValue('#large-numbers-weight', config.content.largeNumbers.weight);
    screen.setInputValue('#large-min', config.content.largeNumbers.min);
    screen.setInputValue('#large-max', config.content.largeNumbers.max);

    screen.setCheckboxValue('#uppercase-enabled', config.content.uppercaseLetters.enabled);
    screen.setSliderValue('#uppercase-weight', config.content.uppercaseLetters.weight);

    screen.setCheckboxValue('#lowercase-enabled', config.content.lowercaseLetters.enabled);
    screen.setSliderValue('#lowercase-weight', config.content.lowercaseLetters.weight);

    screen.setCheckboxValue('#emojis-enabled', config.content.emojis.enabled);
    screen.setSliderValue('#emojis-weight', config.content.emojis.weight);

    // Emoji categories
    Object.keys(config.emojiCategories).forEach(category => {
        screen.setCheckboxValue(`#${category}-enabled`, config.emojiCategories[category].enabled);
        screen.setSliderValue(`#${category}-weight`, config.emojiCategories[category].weight);
    });

    // Update emoji master checkbox based on category states
    screen.updateEmojiMasterCheckbox();

    // Refresh language columns
    screen.languageSection.populateLanguageColumns();

    // Advanced options
    screen.setCheckboxValue('#cistercian-enabled', config.advanced.numberModes.cistercian);
    screen.setCheckboxValue('#kaktovik-enabled', config.advanced.numberModes.kaktovik);
    screen.setCheckboxValue('#binary-enabled', config.advanced.numberModes.binary);
    // Set counting mode radio button based on config
    if (config.advanced.numberModes.objectCounting) {
        const radio = screen.container.querySelector('#object-counting-enabled');
        if (radio) radio.checked = true;
    } else if (config.advanced.numberModes.onlyApples) {
        const radio = screen.container.querySelector('#only-apples-enabled');
        if (radio) radio.checked = true;
    }
    screen.setCheckboxValue('#skip-config-checkbox', config.advanced.skipConfig);

    // Auto-cleanup configuration
    screen.setCheckboxValue('#auto-cleanup-enabled', config.advanced.autoCleanup.enabled);
    screen.setInputValue('#cleanup-timer-seconds', config.advanced.autoCleanup.timeoutSeconds);

    // Grid Mode configuration
    if (config.gridMode) {
        screen.setCheckboxValue('#grid-mode-enabled', config.gridMode.enabled);
        screen.setCheckboxValue('#grid-show-lines', config.gridMode.showGrid);
        screen.setCheckboxValue('#grid-auto-populate', config.gridMode.autoPopulate);
        screen.setCheckboxValue('#grid-wrap-navigation', config.gridMode.wrapNavigation);
        screen.setInputValue('#grid-cell-padding', config.gridMode.cellPadding);

        // Set grid size select
        const gridSize = `${config.gridMode.rows}x${config.gridMode.cols}`;
        screen.setSelectValue('#grid-size-select', gridSize);

        // Update padding display
        const paddingValue = screen.container.querySelector('#grid-padding-value');
        if (paddingValue) paddingValue.textContent = config.gridMode.cellPadding;

        // Show/hide grid settings based on enabled state
        screen.toggleGridSettings(config.gridMode.enabled);
    }

    // Audio configuration
    if (config.audio) {
        screen.setSliderValue('#audio-volume', config.audio.volume);
        screen.setCheckboxValue('#audio-mute', config.audio.mute);
        const audioVolumeValue = screen.container.querySelector('#audio-volume-value');
        if (audioVolumeValue) audioVolumeValue.textContent = `${config.audio.volume}%`;

        // Tone duration slider
        const toneDuration = config.audio.toneDuration !== undefined ? config.audio.toneDuration : -1;
        screen.setSliderValue('#audio-tone-duration', toneDuration);
        const toneDurationValue = screen.container.querySelector('#audio-tone-duration-value');
        if (toneDurationValue) {
            let displayText;
            if (toneDuration === -1) {
                displayText = 'Until Destroyed';
            } else if (toneDuration < 1000) {
                displayText = `${toneDuration}ms`;
            } else {
                displayText = `${(toneDuration / 1000).toFixed(1)}s`;
            }
            toneDurationValue.textContent = displayText;
        }
    }

    // Speech configuration
    if (config.speech) {
        screen.setSliderValue('#speech-volume', config.speech.volume);
        screen.setCheckboxValue('#speech-mute', config.speech.mute);
        screen.setSelectValue('#speech-rate', config.speech.rate);
        const speechVolumeValue = screen.container.querySelector('#speech-volume-value');
        if (speechVolumeValue) speechVolumeValue.textContent = `${config.speech.volume}%`;
    }
}

/**
 * Helper methods for setting form values
 */
export function setCheckboxValue(screen, selector, value) {
    const element = screen.container.querySelector(selector);
    if (element) element.checked = value;
}

export function setSliderValue(screen, selector, value) {
    const element = screen.container.querySelector(selector);
    if (element) {
        element.value = value;
        const valueSpan = screen.container.querySelector(`${selector}-value`);
        if (valueSpan) valueSpan.textContent = value;
    }
}

export function setInputValue(screen, selector, value) {
    const element = screen.container.querySelector(selector);
    if (element) element.value = value;
}

export function setRadioValue(screen, name, value) {
    const element = screen.container.querySelector(`input[name="${name}"][value="${value}"]`);
    if (element) element.checked = true;
}

export function setSelectValue(screen, selector, value) {
    const element = screen.container.querySelector(selector);
    if (element) element.value = value;
}

/**
 * Validate number ranges and auto-adjust if needed
 */
export function validateNumberRanges(screen) {
    const smallMax = parseInt(screen.container.querySelector('#small-max').value);
    const largeMin = parseInt(screen.container.querySelector('#large-min').value);

    // Auto-adjust overlapping ranges
    if (smallMax >= largeMin) {
        screen.container.querySelector('#small-max').value = largeMin - 1;
    }
    if (largeMin <= smallMax) {
        screen.container.querySelector('#large-min').value = smallMax + 1;
    }
}

/**
 * Build configuration object from UI state
 */
export function buildConfigFromUI(screen) {
    return {
        content: {
            shapes: {
                enabled: screen.container.querySelector('#shapes-enabled').checked,
                weight: parseInt(screen.container.querySelector('#shapes-weight').value)
            },
            smallNumbers: {
                enabled: screen.container.querySelector('#small-numbers-enabled').checked,
                min: parseInt(screen.container.querySelector('#small-min').value),
                max: parseInt(screen.container.querySelector('#small-max').value),
                weight: parseInt(screen.container.querySelector('#small-numbers-weight').value)
            },
            largeNumbers: {
                enabled: screen.container.querySelector('#large-numbers-enabled').checked,
                min: parseInt(screen.container.querySelector('#large-min').value),
                max: parseInt(screen.container.querySelector('#large-max').value),
                weight: parseInt(screen.container.querySelector('#large-numbers-weight').value)
            },
            uppercaseLetters: {
                enabled: screen.container.querySelector('#uppercase-enabled').checked,
                weight: parseInt(screen.container.querySelector('#uppercase-weight').value)
            },
            lowercaseLetters: {
                enabled: screen.container.querySelector('#lowercase-enabled').checked,
                weight: parseInt(screen.container.querySelector('#lowercase-weight').value)
            },
            emojis: {
                enabled: screen.container.querySelector('#emojis-enabled').checked,
                weight: parseInt(screen.container.querySelector('#emojis-weight').value)
            }
        },
        emojiCategories: {
            animals: {
                enabled: screen.container.querySelector('#animals-enabled').checked,
                weight: parseInt(screen.container.querySelector('#animals-weight').value)
            },
            food: {
                enabled: screen.container.querySelector('#food-enabled').checked,
                weight: parseInt(screen.container.querySelector('#food-weight').value)
            },
            vehicles: {
                enabled: screen.container.querySelector('#vehicles-enabled').checked,
                weight: parseInt(screen.container.querySelector('#vehicles-weight').value)
            },
            faces: {
                enabled: screen.container.querySelector('#faces-enabled').checked,
                weight: parseInt(screen.container.querySelector('#faces-weight').value)
            },
            nature: {
                enabled: screen.container.querySelector('#nature-enabled').checked,
                weight: parseInt(screen.container.querySelector('#nature-weight').value)
            },
            objects: {
                enabled: screen.container.querySelector('#objects-enabled').checked,
                weight: parseInt(screen.container.querySelector('#objects-weight').value)
            }
        },
        colorCategories: screen.configManager.getConfig().colorCategories,
        languages: screen.configManager.getConfig().languages,
        audio: {
            volume: parseInt(screen.container.querySelector('#audio-volume').value),
            mute: screen.container.querySelector('#audio-mute').checked,
            toneDuration: parseInt(screen.container.querySelector('#audio-tone-duration').value)
        },
        speech: {
            volume: parseInt(screen.container.querySelector('#speech-volume').value),
            mute: screen.container.querySelector('#speech-mute').checked,
            rate: parseFloat(screen.container.querySelector('#speech-rate').value)
        },
        advanced: {
            skipConfig: screen.container.querySelector('#skip-config-checkbox').checked,
            numberModes: {
                cistercian: screen.container.querySelector('#cistercian-enabled').checked,
                kaktovik: screen.container.querySelector('#kaktovik-enabled').checked,
                binary: screen.container.querySelector('#binary-enabled').checked,
                // Read counting mode from radio button group
                objectCounting: screen.container.querySelector('#object-counting-enabled').checked,
                onlyApples: screen.container.querySelector('#only-apples-enabled').checked
            },
            autoCleanup: {
                enabled: screen.container.querySelector('#auto-cleanup-enabled').checked,
                timeoutSeconds: parseInt(screen.container.querySelector('#cleanup-timer-seconds').value)
            }
        },
        gridMode: {
            enabled: screen.container.querySelector('#grid-mode-enabled').checked,
            rows: screen.getGridSizeFromSelect().rows,
            cols: screen.getGridSizeFromSelect().cols,
            showGrid: screen.container.querySelector('#grid-show-lines').checked,
            autoPopulate: screen.container.querySelector('#grid-auto-populate').checked,
            cellPadding: parseInt(screen.container.querySelector('#grid-cell-padding').value),
            wrapNavigation: screen.container.querySelector('#grid-wrap-navigation').checked,
            highlightStyle: 'default',
            theme: 'default'
        }
    };
}

/**
 * Helper to parse grid size from select value
 */
export function getGridSizeFromSelect(screen) {
    const sizeValue = screen.container.querySelector('#grid-size-select').value;
    const [rows, cols] = sizeValue.split('x').map(n => parseInt(n));
    return { rows, cols };
}

/**
 * Toggle visibility of grid settings based on grid mode enabled state
 */
export function toggleGridSettings(screen, enabled) {
    const gridSettings = screen.container.querySelector('#grid-settings-container');
    if (gridSettings) {
        if (enabled) {
            gridSettings.classList.add('visible');
        } else {
            gridSettings.classList.remove('visible');
        }
    }
}

/**
 * Set up the emoji master toggle behavior
 */
export function updateEmojiMasterCheckbox(screen) {
    // Check if all categories are enabled
    const categories = ['animals', 'food', 'vehicles', 'faces', 'nature', 'objects'];
    const allEnabled = categories.every(cat => {
        const el = screen.container.querySelector(`#${cat}-enabled`);
        return el && el.checked;
    });

    // Update master checkbox state without triggering change event
    const masterCheckbox = screen.container.querySelector('#emojis-all-categories');
    if (masterCheckbox) {
        masterCheckbox.checked = allEnabled;
        masterCheckbox.indeterminate = !allEnabled && categories.some(cat => {
            const el = screen.container.querySelector(`#${cat}-enabled`);
            return el && el.checked;
        });
    }
}
