/**
 * ConfigScreen event wiring (buttons, sliders, audio controls, grid toggles).
 * Functions take the owning ConfigScreen instance as first argument and call
 * back through it (screen.method) so instance-level spies still intercept.
 */
import { on } from './domHelpers.js';

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
    screen.container.querySelectorAll('.start-button').forEach((btn) => {
        btn.addEventListener('click', () => screen.startPlaying());
    });

    // Back to the toy selector
    const backToToysBtn = screen.container.querySelector('#back-to-toys-btn');
    if (backToToysBtn) {
        backToToysBtn.addEventListener('click', () => {
            if (screen.router) screen.router.navigate('/');
        });
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
    on(screen.container, '#cleanup-timer-seconds', 'input', (e) => {
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

    const setValueText = (el, text) => { if (el) el.textContent = text; };

    // Each pair below (volume slider + mute checkbox) is wired independently, and
    // tolerates the other half or its value label being absent.
    const wireVolume = (slider, valueEl, muteBox, fallbackVolume) => {
        if (slider) {
            slider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                setValueText(valueEl, `${value}%`);
                // Auto-engage mute at 0, auto-disengage above 0
                if (muteBox) {
                    if (value === 0) muteBox.checked = true;
                    else if (muteBox.checked) muteBox.checked = false;
                }
            });
        }
        if (muteBox) {
            muteBox.addEventListener('change', (e) => {
                if (!slider) return;
                if (e.target.checked) {
                    // Store current volume before muting
                    slider.dataset.previousVolume = slider.value;
                    slider.value = 0;
                    setValueText(valueEl, '0%');
                } else {
                    const previousVolume = slider.dataset.previousVolume || fallbackVolume;
                    slider.value = previousVolume;
                    setValueText(valueEl, `${previousVolume}%`);
                }
            });
        }
    };

    wireVolume(audioVolumeSlider, audioVolumeValue, audioMuteCheckbox, '50');
    wireVolume(speechVolumeSlider, speechVolumeValue, speechMuteCheckbox, '70');

    // Tone duration slider - update display with formatted text
    if (toneDurationSlider) {
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

            setValueText(toneDurationValue, displayText);
        });
    }

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
