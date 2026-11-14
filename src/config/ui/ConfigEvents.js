/**
 * ConfigScreen event wiring (buttons, sliders, audio controls, grid toggles).
 * Functions take the owning ConfigScreen instance as first argument and call
 * back through it (screen.method) so instance-level spies still intercept.
 */

/**
 * Add event listeners to interactive elements
 */
export function addEventListeners(screen) {
    // Documentation button
    const documentationBtn = screen.container.querySelector('#documentation-btn');
    if (documentationBtn) {
        documentationBtn.addEventListener('click', () => {
            if (screen.helpSystem) {
                screen.helpSystem.showFullDocumentation();
            }
        });
    }

    // Start playing buttons (top and bottom)
    const startBtnTop = screen.container.querySelector('#start-playing-btn-top');
    const startBtnBottom = screen.container.querySelector('#start-playing-btn-bottom');

    if (startBtnTop) {
        startBtnTop.addEventListener('click', () => screen.startPlaying());
    }
    if (startBtnBottom) {
        startBtnBottom.addEventListener('click', () => screen.startPlaying());
    }

    // Reset/Undo button
    const resetUndoBtn = screen.container.querySelector('#reset-undo-btn');
    if (resetUndoBtn) {
        resetUndoBtn.addEventListener('click', () => screen.handleResetUndo());
    }

    // Update app button (handler will be enhanced by main.js service worker logic)
    const updateBtn = screen.container.querySelector('#update-app-btn');
    if (updateBtn) {
        // Dispatch custom event that main.js will handle
        updateBtn.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('app-update-requested'));
        });
    }

    // PWA Install button
    const installBtn = screen.container.querySelector('#install-pwa-btn');
    if (installBtn) {
        installBtn.addEventListener('click', () => screen.handlePWAInstall());
    }

    // Weight sliders - update display values
    const sliders = screen.container.querySelectorAll('.weight-slider');
    sliders.forEach(slider => {
        slider.addEventListener('input', (e) => {
            const valueSpan = screen.container.querySelector(`#${e.target.id}-value`);
            if (valueSpan) {
                valueSpan.textContent = e.target.value;
            }
            screen.switchToResetMode(); // Any change switches back to reset mode
        });
    });

    // Number range inputs - validate and auto-adjust
    const rangeInputs = screen.container.querySelectorAll('.range-input');
    rangeInputs.forEach(input => {
        input.addEventListener('change', () => {
            screen.validateNumberRanges();
            screen.switchToResetMode();
        });
    });

    // Cleanup timer validation
    const cleanupTimerInput = screen.container.querySelector('#cleanup-timer-seconds');
    cleanupTimerInput.addEventListener('input', (e) => {
        let value = parseInt(e.target.value);
        if (value < 5) {
            e.target.value = 5;
        } else if (value > 300) {
            e.target.value = 300;
        }
    });

    // Emoji master toggle functionality

    // Audio controls volume/mute sync
    screen.setupAudioControls();

    // Save configuration on any change
    const allInputs = screen.container.querySelectorAll('input, select');
    allInputs.forEach(input => {
        input.addEventListener('change', () => {
            screen.saveCurrentConfig();
            screen.switchToResetMode();
        });
    });
}

/**
 * Set up audio controls with volume/mute sync
 */
export function setupAudioControls(screen) {
    // Audio volume controls
    const audioVolumeSlider = screen.container.querySelector('#audio-volume');
    const audioVolumeValue = screen.container.querySelector('#audio-volume-value');
    const audioMuteCheckbox = screen.container.querySelector('#audio-mute');

    // Audio tone duration controls
    const toneDurationSlider = screen.container.querySelector('#audio-tone-duration');
    const toneDurationValue = screen.container.querySelector('#audio-tone-duration-value');

    // Speech volume controls
    const speechVolumeSlider = screen.container.querySelector('#speech-volume');
    const speechVolumeValue = screen.container.querySelector('#speech-volume-value');
    const speechMuteCheckbox = screen.container.querySelector('#speech-mute');

    // Audio volume slider - update display and sync mute
    audioVolumeSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        audioVolumeValue.textContent = `${value}%`;

        // Auto-engage mute when volume hits 0
        if (value === 0) {
            audioMuteCheckbox.checked = true;
        } else if (audioMuteCheckbox.checked) {
            // Auto-disengage mute when volume goes above 0
            audioMuteCheckbox.checked = false;
        }
    });

    // Audio mute checkbox - sync with volume
    audioMuteCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            // Store current volume before muting
            audioVolumeSlider.dataset.previousVolume = audioVolumeSlider.value;
            audioVolumeSlider.value = 0;
            audioVolumeValue.textContent = '0%';
        } else {
            // Restore previous volume or set to 50 if was 0
            const previousVolume = audioVolumeSlider.dataset.previousVolume || '50';
            audioVolumeSlider.value = previousVolume;
            audioVolumeValue.textContent = `${previousVolume}%`;
        }
    });

    // Tone duration slider - update display with formatted text
    toneDurationSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        let displayText;

        if (value === -1) {
            displayText = 'Until Destroyed';
        } else if (value < 1000) {
            displayText = `${value}ms`;
        } else {
            displayText = `${(value / 1000).toFixed(1)}s`;
        }

        toneDurationValue.textContent = displayText;
    });

    // Speech volume slider - update display and sync mute
    speechVolumeSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        speechVolumeValue.textContent = `${value}%`;

        // Auto-engage mute when volume hits 0
        if (value === 0) {
            speechMuteCheckbox.checked = true;
        } else if (speechMuteCheckbox.checked) {
            // Auto-disengage mute when volume goes above 0
            speechMuteCheckbox.checked = false;
        }
    });

    // Speech mute checkbox - sync with volume
    speechMuteCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            // Store current volume before muting
            speechVolumeSlider.dataset.previousVolume = speechVolumeSlider.value;
            speechVolumeSlider.value = 0;
            speechVolumeValue.textContent = '0%';
        } else {
            // Restore previous volume or set to 70 if was 0
            const previousVolume = speechVolumeSlider.dataset.previousVolume || '70';
            speechVolumeSlider.value = previousVolume;
            speechVolumeValue.textContent = `${previousVolume}%`;
        }
    });

    // Grid Mode toggle - show/hide settings
    const gridModeCheckbox = screen.container.querySelector('#grid-mode-enabled');
    if (gridModeCheckbox) {
        gridModeCheckbox.addEventListener('change', (e) => {
            screen.toggleGridSettings(e.target.checked);
        });
    }

    // Grid cell padding slider - update display value
    const gridPaddingSlider = screen.container.querySelector('#grid-cell-padding');
    const gridPaddingValue = screen.container.querySelector('#grid-padding-value');
    if (gridPaddingSlider && gridPaddingValue) {
        gridPaddingSlider.addEventListener('input', (e) => {
            gridPaddingValue.textContent = e.target.value;
        });
    }
}
