/**
 * AdvancedSection - Advanced Configuration Section
 *
 * Manages:
 * - Special number displays (Cistercian, Kaktovik, Binary, Object Counting)
 * - Auto-cleanup timer settings
 * - Audio & speech volume/mute controls with sync
 * - Grid mode settings and toggles
 */

export class AdvancedSection {
    constructor(container) {
        this.container = container;
    }

    /**
     * Render the advanced section HTML
     * @returns {string} HTML string for the section
     */
    render() {
        return `
            <section class="config-section">
                <h2 class="section-title" data-help-anchor="special-numbers">Special number displays</h2>
                <p class="section-help">These show numbers in different ways - great for math exploration!</p>

                <div class="advanced-options" data-help-anchor="special-numbers">
                    <label class="advanced-option">
                        <input type="checkbox" id="cistercian-enabled" checked>
                        ⚙️ Cistercian Numerals
                        <span class="advanced-note">Ancient monastery number system</span>
                    </label>
                    <label class="advanced-option">
                        <input type="checkbox" id="kaktovik-enabled" checked>
                        ❄️ Kaktovik Numerals
                        <span class="advanced-note">Inuit base-20 number system</span>
                    </label>
                    <label class="advanced-option">
                        <input type="checkbox" id="binary-enabled" checked>
                        ❤️ Binary Hearts
                        <span class="advanced-note">Computer-style numbers with hearts</span>
                    </label>
                    <label class="advanced-option">
                        <input type="radio" name="counting-mode" id="object-counting-enabled" value="objectCounting">
                        🔢 Object Counting (Place Values)
                        <span class="advanced-note">🍎=1s, 🛍️=10s, 📦=100s, 🚛=1000s (e.g. 15 = 1🛍️ + 5🍎)</span>
                    </label>
                    <label class="advanced-option">
                        <input type="radio" name="counting-mode" id="only-apples-enabled" value="onlyApples" checked>
                        🍎 Only Apples Counting
                        <span class="advanced-note">Simple counting with just apples (e.g. 5 = 🍎🍎🍎🍎🍎)</span>
                    </label>
                </div>

                <div class="auto-cleanup-section">
                    <h3 class="subsection-title" data-help-anchor="auto-cleanup">🧹 Auto-Cleanup Timer</h3>
                    <p class="section-help">Objects that haven't been touched will automatically disappear with cute effects!</p>

                    <div class="cleanup-controls">
                        <label class="advanced-option">
                            <input type="checkbox" id="auto-cleanup-enabled" checked>
                            ⏰ Enable Auto-Cleanup
                            <span class="advanced-note">Objects disappear after not being touched for a while</span>
                        </label>

                        <div class="cleanup-timer-control">
                            <label class="timer-label">
                                Objects disappear after:
                                <input type="number" id="cleanup-timer-seconds" class="timer-input" min="5" max="300" step="5" value="10">
                                seconds of no interaction
                            </label>
                            <p class="timer-note">⭐ Each object gets its own timer that resets when touched, clicked, or voiced. When the timer expires, the object disappears with a fun pop sound and firework effects!</p>
                        </div>
                    </div>
                </div>

                <div class="audio-controls-section">
                    <h3 class="subsection-title" data-help-anchor="audio-controls">🔊 Audio & Voice Controls</h3>
                    <p class="section-help">Adjust volume levels and speech speed for the perfect experience.</p>

                    <div class="audio-controls">
                        <div class="audio-control-group">
                            <h4 class="control-group-title">🎵 Audio Tones (Position-Based Sounds)</h4>
                            <div class="volume-control">
                                <label class="volume-label">
                                    <span class="label-text">Volume:</span>
                                    <input type="range" id="audio-volume" class="volume-slider" min="0" max="100" value="10">
                                    <span class="volume-value" id="audio-volume-value">10%</span>
                                </label>
                                <label class="mute-checkbox">
                                    <input type="checkbox" id="audio-mute">
                                    🔇 Mute Audio Tones
                                </label>
                            </div>
                            <div class="duration-control">
                                <label class="duration-label">
                                    <span class="label-text">⏱️ Tone Duration:</span>
                                    <input type="range" id="audio-tone-duration" class="duration-slider"
                                           min="-1" max="20000" step="100" value="-1"
                                           list="duration-markers">
                                    <span class="duration-value" id="audio-tone-duration-value">Until Destroyed</span>
                                </label>
                                <datalist id="duration-markers">
                                    <option value="-1" label="∞"></option>
                                    <option value="100" label="0.1s"></option>
                                    <option value="1000" label="1s"></option>
                                    <option value="5000" label="5s"></option>
                                    <option value="10000" label="10s"></option>
                                    <option value="20000" label="20s"></option>
                                </datalist>
                                <p class="control-note">How long audio tones play before automatically stopping</p>
                            </div>
                            <p class="advanced-note">Audio tones change based on where objects are positioned on screen</p>
                        </div>

                        <div class="audio-control-group">
                            <h4 class="control-group-title">🗣️ Speech Voice (Words & Labels)</h4>
                            <div class="volume-control">
                                <label class="volume-label">
                                    <span class="label-text">Volume:</span>
                                    <input type="range" id="speech-volume" class="volume-slider" min="0" max="100" value="70">
                                    <span class="volume-value" id="speech-volume-value">70%</span>
                                </label>
                                <label class="mute-checkbox">
                                    <input type="checkbox" id="speech-mute">
                                    🔇 Mute Speech
                                </label>
                            </div>
                            <div class="speech-rate-control">
                                <label class="rate-label">
                                    <span class="label-text">Speech Speed:</span>
                                    <select id="speech-rate" class="rate-dropdown">
                                        <option value="0.25">0.25x (Very Slow)</option>
                                        <option value="0.5">0.5x (Slow)</option>
                                        <option value="0.75">0.75x (Slightly Slow)</option>
                                        <option value="1.0" selected>1x (Normal)</option>
                                        <option value="1.5">1.5x (Fast)</option>
                                        <option value="2.0">2x (Very Fast)</option>
                                    </select>
                                </label>
                            </div>
                            <p class="advanced-note">Speech is how objects announce themselves when spawned or clicked</p>
                        </div>
                    </div>
                </div>

                <div class="grid-mode-section">
                    <h3 class="subsection-title" data-help-anchor="grid-mode">📐 Grid Mode (Advanced)</h3>
                    <p class="section-help">Optional structured layout where objects snap to a fixed grid. When disabled (default), objects can be placed anywhere.</p>

                    <div class="grid-mode-controls">
                        <label class="advanced-option">
                            <input type="checkbox" id="grid-mode-enabled">
                            🎯 Enable Grid Mode
                            <span class="advanced-note">Switch from free-form to structured grid layout</span>
                        </label>

                        <div class="grid-settings" id="grid-settings-container">
                            <div class="grid-size-selector">
                                <label class="grid-control-label">
                                    Grid Size:
                                    <select id="grid-size-select" class="grid-select">
                                        <option value="3x3">3×3 (Large cells)</option>
                                        <option value="4x4" selected>4×4 (Recommended)</option>
                                        <option value="5x5">5×5 (Medium cells)</option>
                                        <option value="6x6">6×6 (Small cells)</option>
                                    </select>
                                </label>
                            </div>

                            <label class="advanced-option">
                                <input type="checkbox" id="grid-show-lines" checked>
                                🔲 Show Grid Lines
                                <span class="advanced-note">Display visual grid overlay</span>
                            </label>

                            <label class="advanced-option">
                                <input type="checkbox" id="grid-auto-populate">
                                🎲 Auto-Populate Grid
                                <span class="advanced-note">Fill grid with objects when starting</span>
                            </label>

                            <label class="advanced-option">
                                <input type="checkbox" id="grid-wrap-navigation">
                                🔄 Wrap Navigation
                                <span class="advanced-note">Allow keyboard navigation to wrap at edges</span>
                            </label>

                            <div class="grid-padding-control">
                                <label class="grid-control-label">
                                    Cell Spacing:
                                    <input type="range" id="grid-cell-padding" min="0" max="30" value="10" class="slider">
                                    <span id="grid-padding-value">10</span>px
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        `;
    }

    /**
     * Attach event listeners for this section
     * @param {Function} onConfigChange - Callback when configuration changes
     */
    attachEventListeners(onConfigChange) {
        this.setupAudioControls();

        // Special number checkboxes
        const specialNumberCheckboxes = ['cistercian-enabled', 'kaktovik-enabled', 'binary-enabled'];
        specialNumberCheckboxes.forEach(id => {
            const checkbox = this.container.querySelector(`#${id}`);
            if (checkbox) {
                checkbox.addEventListener('change', onConfigChange);
            }
        });

        // Counting mode radio buttons
        const countingRadios = this.container.querySelectorAll('input[name="counting-mode"]');
        countingRadios.forEach(radio => {
            radio.addEventListener('change', onConfigChange);
        });

        // Auto-cleanup controls
        const cleanupCheckbox = this.container.querySelector('#auto-cleanup-enabled');
        const cleanupTimer = this.container.querySelector('#cleanup-timer-seconds');
        if (cleanupCheckbox) cleanupCheckbox.addEventListener('change', onConfigChange);
        if (cleanupTimer) cleanupTimer.addEventListener('change', onConfigChange);

        // Audio/speech controls trigger config save
        const audioControls = [
            '#audio-volume', '#audio-mute', '#audio-tone-duration',
            '#speech-volume', '#speech-mute', '#speech-rate'
        ];
        audioControls.forEach(selector => {
            const control = this.container.querySelector(selector);
            if (control) {
                const eventType = control.tagName === 'SELECT' ? 'change' : 'input';
                control.addEventListener(eventType, onConfigChange);
            }
        });

        // Grid mode controls
        const gridControls = [
            '#grid-mode-enabled', '#grid-size-select', '#grid-show-lines',
            '#grid-auto-populate', '#grid-wrap-navigation', '#grid-cell-padding'
        ];
        gridControls.forEach(selector => {
            const control = this.container.querySelector(selector);
            if (control) {
                const eventType = selector === '#grid-cell-padding' ? 'input' : 'change';
                control.addEventListener(eventType, onConfigChange);
            }
        });
    }

    /**
     * Set up audio control interactions (volume/mute sync, duration formatting)
     */
    setupAudioControls() {
        // Audio volume controls
        const audioVolumeSlider = this.container.querySelector('#audio-volume');
        const audioVolumeValue = this.container.querySelector('#audio-volume-value');
        const audioMuteCheckbox = this.container.querySelector('#audio-mute');

        // Audio tone duration controls
        const toneDurationSlider = this.container.querySelector('#audio-tone-duration');
        const toneDurationValue = this.container.querySelector('#audio-tone-duration-value');

        // Speech volume controls
        const speechVolumeSlider = this.container.querySelector('#speech-volume');
        const speechVolumeValue = this.container.querySelector('#speech-volume-value');
        const speechMuteCheckbox = this.container.querySelector('#speech-mute');

        // Audio volume slider - update display and sync mute
        if (audioVolumeSlider && audioVolumeValue && audioMuteCheckbox) {
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
        }

        // Tone duration slider - update display with formatted text
        if (toneDurationSlider && toneDurationValue) {
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
        }

        // Speech volume slider - update display and sync mute
        if (speechVolumeSlider && speechVolumeValue && speechMuteCheckbox) {
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
        }

        // Grid Mode toggle - show/hide settings
        const gridModeCheckbox = this.container.querySelector('#grid-mode-enabled');
        if (gridModeCheckbox) {
            gridModeCheckbox.addEventListener('change', (e) => {
                this.toggleGridSettings(e.target.checked);
            });
        }

        // Grid cell padding slider - update display value
        const gridPaddingSlider = this.container.querySelector('#grid-cell-padding');
        const gridPaddingValue = this.container.querySelector('#grid-padding-value');
        if (gridPaddingSlider && gridPaddingValue) {
            gridPaddingSlider.addEventListener('input', (e) => {
                gridPaddingValue.textContent = e.target.value;
            });
        }
    }

    /**
     * Toggle visibility of grid settings based on grid mode enabled state
     * @param {boolean} enabled - Whether grid mode is enabled
     */
    toggleGridSettings(enabled) {
        const gridSettings = this.container.querySelector('#grid-settings-container');
        if (gridSettings) {
            if (enabled) {
                gridSettings.classList.add('visible');
            } else {
                gridSettings.classList.remove('visible');
            }
        }
    }

    /**
     * Get grid size from select dropdown
     * @returns {{rows: number, cols: number}} Grid dimensions
     */
    getGridSizeFromSelect() {
        const sizeValue = this.container.querySelector('#grid-size-select').value;
        const [rows, cols] = sizeValue.split('x').map(n => parseInt(n));
        return { rows, cols };
    }

    /**
     * Load configuration into UI elements
     * @param {Object} config - Configuration object
     */
    loadConfig(config) {
        // Load special number modes
        const cistercian = this.container.querySelector('#cistercian-enabled');
        const kaktovik = this.container.querySelector('#kaktovik-enabled');
        const binary = this.container.querySelector('#binary-enabled');

        if (cistercian && config.advanced) cistercian.checked = config.advanced.cistercian ?? true;
        if (kaktovik && config.advanced) kaktovik.checked = config.advanced.kaktovik ?? true;
        if (binary && config.advanced) binary.checked = config.advanced.binary ?? true;

        // Load counting mode
        const countingMode = config.advanced?.countingMode || 'onlyApples';
        const objectCounting = this.container.querySelector('#object-counting-enabled');
        const onlyApples = this.container.querySelector('#only-apples-enabled');
        if (objectCounting && onlyApples) {
            objectCounting.checked = countingMode === 'objectCounting';
            onlyApples.checked = countingMode === 'onlyApples';
        }

        // Load auto-cleanup settings
        const cleanupEnabled = this.container.querySelector('#auto-cleanup-enabled');
        const cleanupTimer = this.container.querySelector('#cleanup-timer-seconds');
        if (cleanupEnabled && config.advanced) cleanupEnabled.checked = config.advanced.autoCleanupEnabled ?? true;
        if (cleanupTimer && config.advanced) cleanupTimer.value = config.advanced.autoCleanupSeconds ?? 10;

        // Load audio settings
        if (config.audio) {
            const audioVolume = this.container.querySelector('#audio-volume');
            const audioVolumeValue = this.container.querySelector('#audio-volume-value');
            const audioMute = this.container.querySelector('#audio-mute');
            const toneDuration = this.container.querySelector('#audio-tone-duration');
            const toneDurationValue = this.container.querySelector('#audio-tone-duration-value');

            if (audioVolume) audioVolume.value = config.audio.volume ?? 10;
            if (audioVolumeValue) audioVolumeValue.textContent = `${config.audio.volume ?? 10}%`;
            if (audioMute) audioMute.checked = config.audio.muted ?? false;
            if (toneDuration) toneDuration.value = config.audio.toneDuration ?? -1;
            if (toneDurationValue) {
                const val = config.audio.toneDuration ?? -1;
                toneDurationValue.textContent = val === -1 ? 'Until Destroyed' :
                    val < 1000 ? `${val}ms` : `${(val / 1000).toFixed(1)}s`;
            }
        }

        // Load speech settings
        if (config.speech) {
            const speechVolume = this.container.querySelector('#speech-volume');
            const speechVolumeValue = this.container.querySelector('#speech-volume-value');
            const speechMute = this.container.querySelector('#speech-mute');
            const speechRate = this.container.querySelector('#speech-rate');

            if (speechVolume) speechVolume.value = config.speech.volume ?? 70;
            if (speechVolumeValue) speechVolumeValue.textContent = `${config.speech.volume ?? 70}%`;
            if (speechMute) speechMute.checked = config.speech.muted ?? false;
            if (speechRate) speechRate.value = String(config.speech.rate ?? 1.0);
        }

        // Load grid mode settings
        if (config.gridMode) {
            const gridEnabled = this.container.querySelector('#grid-mode-enabled');
            const gridSize = this.container.querySelector('#grid-size-select');
            const gridShowLines = this.container.querySelector('#grid-show-lines');
            const gridAutoPopulate = this.container.querySelector('#grid-auto-populate');
            const gridWrap = this.container.querySelector('#grid-wrap-navigation');
            const gridPadding = this.container.querySelector('#grid-cell-padding');
            const gridPaddingValue = this.container.querySelector('#grid-padding-value');

            if (gridEnabled) {
                gridEnabled.checked = config.gridMode.enabled ?? false;
                this.toggleGridSettings(config.gridMode.enabled ?? false);
            }
            if (gridSize) gridSize.value = `${config.gridMode.rows ?? 4}x${config.gridMode.cols ?? 4}`;
            if (gridShowLines) gridShowLines.checked = config.gridMode.showLines ?? true;
            if (gridAutoPopulate) gridAutoPopulate.checked = config.gridMode.autoPopulate ?? false;
            if (gridWrap) gridWrap.checked = config.gridMode.wrapNavigation ?? false;
            if (gridPadding) gridPadding.value = config.gridMode.cellPadding ?? 10;
            if (gridPaddingValue) gridPaddingValue.textContent = String(config.gridMode.cellPadding ?? 10);
        }
    }

    /**
     * Get configuration data from UI elements
     * @returns {Object} Advanced configuration including audio, speech, gridMode
     */
    getConfigData() {
        // Get counting mode
        const objectCountingChecked = this.container.querySelector('#object-counting-enabled')?.checked ?? false;
        const countingMode = objectCountingChecked ? 'objectCounting' : 'onlyApples';

        return {
            advanced: {
                cistercian: this.container.querySelector('#cistercian-enabled')?.checked ?? true,
                kaktovik: this.container.querySelector('#kaktovik-enabled')?.checked ?? true,
                binary: this.container.querySelector('#binary-enabled')?.checked ?? true,
                countingMode: countingMode,
                autoCleanupEnabled: this.container.querySelector('#auto-cleanup-enabled')?.checked ?? true,
                autoCleanupSeconds: parseInt(this.container.querySelector('#cleanup-timer-seconds')?.value ?? 10)
            },
            audio: {
                volume: parseInt(this.container.querySelector('#audio-volume')?.value ?? 10),
                muted: this.container.querySelector('#audio-mute')?.checked ?? false,
                toneDuration: parseInt(this.container.querySelector('#audio-tone-duration')?.value ?? -1)
            },
            speech: {
                volume: parseInt(this.container.querySelector('#speech-volume')?.value ?? 70),
                muted: this.container.querySelector('#speech-mute')?.checked ?? false,
                rate: parseFloat(this.container.querySelector('#speech-rate')?.value ?? '1.0')
            },
            gridMode: {
                enabled: this.container.querySelector('#grid-mode-enabled')?.checked ?? false,
                ...this.getGridSizeFromSelect(),
                showLines: this.container.querySelector('#grid-show-lines')?.checked ?? true,
                autoPopulate: this.container.querySelector('#grid-auto-populate')?.checked ?? false,
                wrapNavigation: this.container.querySelector('#grid-wrap-navigation')?.checked ?? false,
                cellPadding: parseInt(this.container.querySelector('#grid-cell-padding')?.value ?? 10)
            }
        };
    }
}
