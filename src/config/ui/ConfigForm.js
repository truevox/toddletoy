/**
 * ConfigScreen form <-> config logic (load into UI, collect from UI, helpers).
 * Functions take the owning ConfigScreen instance as first argument and call
 * back through it (screen.method) so instance-level spies still intercept.
 */
import { readChecked, readInt, readFloat } from './domHelpers.js';

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
    } else {
        const radio = screen.container.querySelector('#counting-none');
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
    if (!element) return;
    element.value = value;
    // Numeric values (e.g. rate 1 vs option "1.0") don't match by string: fall back to numeric compare
    if (element.tagName === 'SELECT' && element.selectedIndex === -1 && typeof value === 'number') {
        const idx = Array.from(element.options).findIndex(o => parseFloat(o.value) === value);
        if (idx >= 0) element.selectedIndex = idx;
    }
}

/**
 * Validate number ranges and auto-adjust if needed
 */
export function validateNumberRanges(screen) {
    const smallMaxEl = screen.container.querySelector('#small-max');
    const largeMinEl = screen.container.querySelector('#large-min');
    if (!smallMaxEl || !largeMinEl) return;

    const smallMax = parseInt(smallMaxEl.value);
    const largeMin = parseInt(largeMinEl.value);

    // Auto-adjust overlapping ranges
    if (smallMax >= largeMin) {
        smallMaxEl.value = largeMin - 1;
    }
    if (largeMin <= smallMax) {
        largeMinEl.value = smallMax + 1;
    }
}

/**
 * Build configuration object from UI state.
 * Any control that is missing from the DOM (or holds a non-number) keeps the
 * value from the currently stored config instead of aborting the save.
 */
export function buildConfigFromUI(screen) {
    const c = screen.container;
    const cur = screen.configManager.getConfig();
    const checked = (sel, fb) => readChecked(c, sel, fb);
    const int = (sel, fb) => readInt(c, sel, fb);

    const toggle = (cfg, enabledSel, weightSel) => ({
        ...cfg,
        enabled: checked(enabledSel, cfg.enabled),
        weight: int(weightSel, cfg.weight)
    });
    const range = (cfg, enabledSel, minSel, maxSel, weightSel) => ({
        ...toggle(cfg, enabledSel, weightSel),
        min: int(minSel, cfg.min),
        max: int(maxSel, cfg.max)
    });

    const content = cur.content;
    const cats = cur.emojiCategories;
    const catNames = ['animals', 'food', 'vehicles', 'faces', 'nature', 'objects'];
    const emojiCategories = { ...cats };
    catNames.forEach(name => {
        emojiCategories[name] = toggle(cats[name], `#${name}-enabled`, `#${name}-weight`);
    });

    const grid = cur.gridMode;
    const gridSize = screen.getGridSizeFromSelect();
    const nm = cur.advanced.numberModes;

    return {
        content: {
            ...content,
            shapes: toggle(content.shapes, '#shapes-enabled', '#shapes-weight'),
            smallNumbers: range(content.smallNumbers, '#small-numbers-enabled', '#small-min', '#small-max', '#small-numbers-weight'),
            largeNumbers: range(content.largeNumbers, '#large-numbers-enabled', '#large-min', '#large-max', '#large-numbers-weight'),
            uppercaseLetters: toggle(content.uppercaseLetters, '#uppercase-enabled', '#uppercase-weight'),
            lowercaseLetters: toggle(content.lowercaseLetters, '#lowercase-enabled', '#lowercase-weight'),
            emojis: toggle(content.emojis, '#emojis-enabled', '#emojis-weight')
        },
        emojiCategories,
        colorCategories: cur.colorCategories,
        languages: cur.languages,
        audio: {
            ...cur.audio,
            volume: int('#audio-volume', cur.audio.volume),
            mute: checked('#audio-mute', cur.audio.mute),
            toneDuration: int('#audio-tone-duration', cur.audio.toneDuration)
        },
        speech: {
            ...cur.speech,
            volume: int('#speech-volume', cur.speech.volume),
            mute: checked('#speech-mute', cur.speech.mute),
            rate: readFloat(c, '#speech-rate', cur.speech.rate)
        },
        advanced: {
            ...cur.advanced,
            skipConfig: checked('#skip-config-checkbox', cur.advanced.skipConfig),
            numberModes: {
                ...nm,
                cistercian: checked('#cistercian-enabled', nm.cistercian),
                kaktovik: checked('#kaktovik-enabled', nm.kaktovik),
                binary: checked('#binary-enabled', nm.binary),
                // Counting mode is a radio group
                objectCounting: checked('#object-counting-enabled', nm.objectCounting),
                onlyApples: checked('#only-apples-enabled', nm.onlyApples)
            },
            autoCleanup: {
                ...cur.advanced.autoCleanup,
                enabled: checked('#auto-cleanup-enabled', cur.advanced.autoCleanup.enabled),
                timeoutSeconds: int('#cleanup-timer-seconds', cur.advanced.autoCleanup.timeoutSeconds)
            }
        },
        gridMode: {
            ...grid,
            enabled: checked('#grid-mode-enabled', grid.enabled),
            rows: gridSize.rows,
            cols: gridSize.cols,
            showGrid: checked('#grid-show-lines', grid.showGrid),
            autoPopulate: checked('#grid-auto-populate', grid.autoPopulate),
            cellPadding: int('#grid-cell-padding', grid.cellPadding),
            wrapNavigation: checked('#grid-wrap-navigation', grid.wrapNavigation),
            highlightStyle: 'default',
            theme: 'default'
        }
    };
}

/**
 * Helper to parse grid size from select value (falls back to the stored grid size)
 */
export function getGridSizeFromSelect(screen) {
    const el = screen.container.querySelector('#grid-size-select');
    const stored = screen.configManager.getConfig().gridMode || {};
    const [rows, cols] = el ? String(el.value).split('x').map(n => parseInt(n)) : [];
    return {
        rows: Number.isNaN(rows) || rows === undefined ? stored.rows : rows,
        cols: Number.isNaN(cols) || cols === undefined ? stored.cols : cols
    };
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
