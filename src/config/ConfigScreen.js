/**
 * ConfigScreen - User interface for configuring the toddler toy
 * Provides intuitive controls for content selection, weights, and settings
 */
import { HelpSystem } from './HelpSystem.js';
import { PLATFORMS } from './constants.js';
import { detectPlatform, detectPWAInstalled } from '../utils/platformUtils.js';
import { getLanguageFlag, getDifficultyLevel, getDifficultyText, getDefaultRank, getDefaultHours } from '../utils/languageUtils.js';
import { PlayingTips } from './ui/PlayingTips.js';
import { ContentTypes } from './ui/ContentTypes.js';
import { EmojiCategories } from './ui/EmojiCategories.js';
import { AdvancedSection } from './ui/AdvancedSection.js';
import { ParentGuidance } from './ui/ParentGuidance.js';
import { LanguageSection } from './ui/LanguageSection.js';
import './ConfigScreen.css';

export class ConfigScreen {
    constructor(configManager, router) {
        this.configManager = configManager;
        this.router = router;
        this.container = null;
        this.isVisible = false;
        this.configBeforeReset = null; // Store config before reset for undo
        this.isUndoMode = false; // Track if button is in undo mode
        this.deferredPrompt = null; // Store beforeinstallprompt event for PWA installation

        // Listen for PWA install prompt
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            console.log('beforeinstallprompt event captured');
            // Update UI to show install button if config screen is already created
            if (this.container) {
                this.updateInstallButtonVisibility();
            }
        });

        this.createUI();
        this.loadCurrentConfig();

        // Initialize help system
        this.helpSystem = new HelpSystem(this.container);
        this.helpSystem.initialize();

        // Show onboarding for first-time users after UI is fully loaded
        this.helpSystem.showOnboardingIfNeeded();
    }

    /**
     * Create the configuration UI
     */
    createUI() {
        // Create main container
        this.container = document.createElement('div');
        this.container.id = 'config-screen';
        this.container.className = 'config-screen';

        // Initialize language section module
        this.languageSection = new LanguageSection(this.container, this.configManager);

        // Build the interface
        this.container.innerHTML = `
            <div class="config-container">
                <header class="config-header">
                    <div class="header-top-right">
                        <div class="version-display" id="app-version">v${typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0'}</div>
                        <button class="documentation-button" id="documentation-btn" title="View full documentation">📚 Docs</button>
                        <button class="update-button" id="update-app-btn">Check for Updates</button>
                        <div id="update-status-msg" class="update-status"></div>
                    </div>
                    <h1 class="config-title">
                        <span class="title-letter t">T</span><span class="title-letter o1">o</span><span class="title-letter d1">d</span><span class="title-letter d2">d</span><span class="title-letter l">l</span><span class="title-letter e">e</span><span class="title-letter t2">T</span><span class="title-letter o2">o</span><span class="title-letter y">y</span>
                    </h1>
                    <p class="config-subtitle">Configure your child's learning experience</p>
                </header>

                <main class="config-main">
                    ${new ParentGuidance(this.deferredPrompt).render()}
                    ${new PlayingTips().render()}
                    ${new ContentTypes(this.container).render()}
                    ${new EmojiCategories(this.container).render()}
                    ${this.languageSection.render()}
                    ${new AdvancedSection(this.container).render()}
                </main>

                <footer class="config-footer">
                    <button class="start-button" id="start-playing-btn-bottom">
                        ▶️ START PLAYING
                    </button>
                    <div class="config-actions">
                        <label class="skip-config-checkbox">
                            <input type="checkbox" id="skip-config-checkbox">
                            ⚡ Skip this screen next time
                        </label>
                    </div>
                    <button class="reset-undo-button" id="reset-undo-btn">Reset to Defaults</button>
                </footer>
            </div>
        `;

        // Add event listeners
        this.addEventListeners();

        // Populate language columns
        this.languageSection.populateLanguageColumns();

        // Append to body (initially hidden)
        this.container.style.display = 'none';
        document.body.appendChild(this.container);
    }




    /**
     * Add event listeners to interactive elements
     */
    addEventListeners() {
        // Documentation button
        const documentationBtn = this.container.querySelector('#documentation-btn');
        if (documentationBtn) {
            documentationBtn.addEventListener('click', () => {
                if (this.helpSystem) {
                    this.helpSystem.showFullDocumentation();
                }
            });
        }

        // Start playing buttons (top and bottom)
        const startBtnTop = this.container.querySelector('#start-playing-btn-top');
        const startBtnBottom = this.container.querySelector('#start-playing-btn-bottom');

        if (startBtnTop) {
            startBtnTop.addEventListener('click', () => this.startPlaying());
        }
        if (startBtnBottom) {
            startBtnBottom.addEventListener('click', () => this.startPlaying());
        }

        // Reset/Undo button
        const resetUndoBtn = this.container.querySelector('#reset-undo-btn');
        if (resetUndoBtn) {
            resetUndoBtn.addEventListener('click', () => this.handleResetUndo());
        }

        // Update app button (handler will be enhanced by main.js service worker logic)
        const updateBtn = this.container.querySelector('#update-app-btn');
        if (updateBtn) {
            // Dispatch custom event that main.js will handle
            updateBtn.addEventListener('click', () => {
                window.dispatchEvent(new CustomEvent('app-update-requested'));
            });
        }

        // PWA Install button
        const installBtn = this.container.querySelector('#install-pwa-btn');
        if (installBtn) {
            installBtn.addEventListener('click', () => this.handlePWAInstall());
        }

        // Weight sliders - update display values
        const sliders = this.container.querySelectorAll('.weight-slider');
        sliders.forEach(slider => {
            slider.addEventListener('input', (e) => {
                const valueSpan = this.container.querySelector(`#${e.target.id}-value`);
                if (valueSpan) {
                    valueSpan.textContent = e.target.value;
                }
                this.switchToResetMode(); // Any change switches back to reset mode
            });
        });

        // Number range inputs - validate and auto-adjust
        const rangeInputs = this.container.querySelectorAll('.range-input');
        rangeInputs.forEach(input => {
            input.addEventListener('change', () => {
                this.validateNumberRanges();
                this.switchToResetMode();
            });
        });

        // Cleanup timer validation
        const cleanupTimerInput = this.container.querySelector('#cleanup-timer-seconds');
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
        this.setupAudioControls();

        // Save configuration on any change
        const allInputs = this.container.querySelectorAll('input, select');
        allInputs.forEach(input => {
            input.addEventListener('change', () => {
                this.saveCurrentConfig();
                this.switchToResetMode();
            });
        });
    }

    /**
     * Set up audio controls with volume/mute sync
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
     * Set up the emoji master toggle behavior
     */
    updateEmojiMasterCheckbox() {
        // Check if all categories are enabled
        const categories = ['animals', 'food', 'vehicles', 'faces', 'nature', 'objects'];
        const allEnabled = categories.every(cat => {
            const el = this.container.querySelector(`#${cat}-enabled`);
            return el && el.checked;
        });

        // Update master checkbox state without triggering change event
        const masterCheckbox = this.container.querySelector('#emojis-all-categories');
        if (masterCheckbox) {
            masterCheckbox.checked = allEnabled;
            masterCheckbox.indeterminate = !allEnabled && categories.some(cat => {
                const el = this.container.querySelector(`#${cat}-enabled`);
                return el && el.checked;
            });
        }
    }

    createParentGuidanceSection() {
        return new ParentGuidance(this.deferredPrompt).render();
    }

    /**
     * Load current configuration into the UI
     */
    loadCurrentConfig() {
        const config = this.configManager.getConfig();

        // Content types
        this.setCheckboxValue('#shapes-enabled', config.content.shapes.enabled);
        this.setSliderValue('#shapes-weight', config.content.shapes.weight);

        this.setCheckboxValue('#small-numbers-enabled', config.content.smallNumbers.enabled);
        this.setSliderValue('#small-numbers-weight', config.content.smallNumbers.weight);
        this.setInputValue('#small-min', config.content.smallNumbers.min);
        this.setInputValue('#small-max', config.content.smallNumbers.max);

        this.setCheckboxValue('#large-numbers-enabled', config.content.largeNumbers.enabled);
        this.setSliderValue('#large-numbers-weight', config.content.largeNumbers.weight);
        this.setInputValue('#large-min', config.content.largeNumbers.min);
        this.setInputValue('#large-max', config.content.largeNumbers.max);

        this.setCheckboxValue('#uppercase-enabled', config.content.uppercaseLetters.enabled);
        this.setSliderValue('#uppercase-weight', config.content.uppercaseLetters.weight);

        this.setCheckboxValue('#lowercase-enabled', config.content.lowercaseLetters.enabled);
        this.setSliderValue('#lowercase-weight', config.content.lowercaseLetters.weight);

        this.setCheckboxValue('#emojis-enabled', config.content.emojis.enabled);
        this.setSliderValue('#emojis-weight', config.content.emojis.weight);

        // Emoji categories
        Object.keys(config.emojiCategories).forEach(category => {
            this.setCheckboxValue(`#${category}-enabled`, config.emojiCategories[category].enabled);
            this.setSliderValue(`#${category}-weight`, config.emojiCategories[category].weight);
        });

        // Update emoji master checkbox based on category states
        this.updateEmojiMasterCheckbox();

        // Refresh language columns
        this.languageSection.populateLanguageColumns();

        // Advanced options
        this.setCheckboxValue('#cistercian-enabled', config.advanced.numberModes.cistercian);
        this.setCheckboxValue('#kaktovik-enabled', config.advanced.numberModes.kaktovik);
        this.setCheckboxValue('#binary-enabled', config.advanced.numberModes.binary);
        // Set counting mode radio button based on config
        if (config.advanced.numberModes.objectCounting) {
            const radio = this.container.querySelector('#object-counting-enabled');
            if (radio) radio.checked = true;
        } else if (config.advanced.numberModes.onlyApples) {
            const radio = this.container.querySelector('#only-apples-enabled');
            if (radio) radio.checked = true;
        }
        this.setCheckboxValue('#skip-config-checkbox', config.advanced.skipConfig);

        // Auto-cleanup configuration
        this.setCheckboxValue('#auto-cleanup-enabled', config.advanced.autoCleanup.enabled);
        this.setInputValue('#cleanup-timer-seconds', config.advanced.autoCleanup.timeoutSeconds);

        // Grid Mode configuration
        if (config.gridMode) {
            this.setCheckboxValue('#grid-mode-enabled', config.gridMode.enabled);
            this.setCheckboxValue('#grid-show-lines', config.gridMode.showGrid);
            this.setCheckboxValue('#grid-auto-populate', config.gridMode.autoPopulate);
            this.setCheckboxValue('#grid-wrap-navigation', config.gridMode.wrapNavigation);
            this.setInputValue('#grid-cell-padding', config.gridMode.cellPadding);

            // Set grid size select
            const gridSize = `${config.gridMode.rows}x${config.gridMode.cols}`;
            this.setSelectValue('#grid-size-select', gridSize);

            // Update padding display
            const paddingValue = this.container.querySelector('#grid-padding-value');
            if (paddingValue) paddingValue.textContent = config.gridMode.cellPadding;

            // Show/hide grid settings based on enabled state
            this.toggleGridSettings(config.gridMode.enabled);
        }

        // Audio configuration
        if (config.audio) {
            this.setSliderValue('#audio-volume', config.audio.volume);
            this.setCheckboxValue('#audio-mute', config.audio.mute);
            const audioVolumeValue = this.container.querySelector('#audio-volume-value');
            if (audioVolumeValue) audioVolumeValue.textContent = `${config.audio.volume}%`;

            // Tone duration slider
            const toneDuration = config.audio.toneDuration !== undefined ? config.audio.toneDuration : -1;
            this.setSliderValue('#audio-tone-duration', toneDuration);
            const toneDurationValue = this.container.querySelector('#audio-tone-duration-value');
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
            this.setSliderValue('#speech-volume', config.speech.volume);
            this.setCheckboxValue('#speech-mute', config.speech.mute);
            this.setSelectValue('#speech-rate', config.speech.rate);
            const speechVolumeValue = this.container.querySelector('#speech-volume-value');
            if (speechVolumeValue) speechVolumeValue.textContent = `${config.speech.volume}%`;
        }
    }

    /**
     * Helper methods for setting form values
     */
    setCheckboxValue(selector, value) {
        const element = this.container.querySelector(selector);
        if (element) element.checked = value;
    }

    setSliderValue(selector, value) {
        const element = this.container.querySelector(selector);
        if (element) {
            element.value = value;
            const valueSpan = this.container.querySelector(`${selector}-value`);
            if (valueSpan) valueSpan.textContent = value;
        }
    }

    setInputValue(selector, value) {
        const element = this.container.querySelector(selector);
        if (element) element.value = value;
    }

    setRadioValue(name, value) {
        const element = this.container.querySelector(`input[name="${name}"][value="${value}"]`);
        if (element) element.checked = true;
    }

    setSelectValue(selector, value) {
        const element = this.container.querySelector(selector);
        if (element) element.value = value;
    }

    /**
     * Validate number ranges and auto-adjust if needed
     */
    validateNumberRanges() {
        const smallMax = parseInt(this.container.querySelector('#small-max').value);
        const largeMin = parseInt(this.container.querySelector('#large-min').value);

        // Auto-adjust overlapping ranges
        if (smallMax >= largeMin) {
            this.container.querySelector('#small-max').value = largeMin - 1;
        }
        if (largeMin <= smallMax) {
            this.container.querySelector('#large-min').value = smallMax + 1;
        }
    }

    /**
     * Save current configuration
     */
    saveCurrentConfig() {
        const config = this.buildConfigFromUI();
        const result = this.configManager.updateConfig(config);

        if (result.warnings.length > 0) {
            console.warn('Configuration warnings:', result.warnings);
        }
    }

    /**
     * Build configuration object from UI state
     */
    buildConfigFromUI() {
        return {
            content: {
                shapes: {
                    enabled: this.container.querySelector('#shapes-enabled').checked,
                    weight: parseInt(this.container.querySelector('#shapes-weight').value)
                },
                smallNumbers: {
                    enabled: this.container.querySelector('#small-numbers-enabled').checked,
                    min: parseInt(this.container.querySelector('#small-min').value),
                    max: parseInt(this.container.querySelector('#small-max').value),
                    weight: parseInt(this.container.querySelector('#small-numbers-weight').value)
                },
                largeNumbers: {
                    enabled: this.container.querySelector('#large-numbers-enabled').checked,
                    min: parseInt(this.container.querySelector('#large-min').value),
                    max: parseInt(this.container.querySelector('#large-max').value),
                    weight: parseInt(this.container.querySelector('#large-numbers-weight').value)
                },
                uppercaseLetters: {
                    enabled: this.container.querySelector('#uppercase-enabled').checked,
                    weight: parseInt(this.container.querySelector('#uppercase-weight').value)
                },
                lowercaseLetters: {
                    enabled: this.container.querySelector('#lowercase-enabled').checked,
                    weight: parseInt(this.container.querySelector('#lowercase-weight').value)
                },
                emojis: {
                    enabled: this.container.querySelector('#emojis-enabled').checked,
                    weight: parseInt(this.container.querySelector('#emojis-weight').value)
                }
            },
            emojiCategories: {
                animals: {
                    enabled: this.container.querySelector('#animals-enabled').checked,
                    weight: parseInt(this.container.querySelector('#animals-weight').value)
                },
                food: {
                    enabled: this.container.querySelector('#food-enabled').checked,
                    weight: parseInt(this.container.querySelector('#food-weight').value)
                },
                vehicles: {
                    enabled: this.container.querySelector('#vehicles-enabled').checked,
                    weight: parseInt(this.container.querySelector('#vehicles-weight').value)
                },
                faces: {
                    enabled: this.container.querySelector('#faces-enabled').checked,
                    weight: parseInt(this.container.querySelector('#faces-weight').value)
                },
                nature: {
                    enabled: this.container.querySelector('#nature-enabled').checked,
                    weight: parseInt(this.container.querySelector('#nature-weight').value)
                },
                objects: {
                    enabled: this.container.querySelector('#objects-enabled').checked,
                    weight: parseInt(this.container.querySelector('#objects-weight').value)
                }
            },
            colorCategories: this.configManager.getConfig().colorCategories,
            languages: this.configManager.getConfig().languages,
            audio: {
                volume: parseInt(this.container.querySelector('#audio-volume').value),
                mute: this.container.querySelector('#audio-mute').checked,
                toneDuration: parseInt(this.container.querySelector('#audio-tone-duration').value)
            },
            speech: {
                volume: parseInt(this.container.querySelector('#speech-volume').value),
                mute: this.container.querySelector('#speech-mute').checked,
                rate: parseFloat(this.container.querySelector('#speech-rate').value)
            },
            advanced: {
                skipConfig: this.container.querySelector('#skip-config-checkbox').checked,
                numberModes: {
                    cistercian: this.container.querySelector('#cistercian-enabled').checked,
                    kaktovik: this.container.querySelector('#kaktovik-enabled').checked,
                    binary: this.container.querySelector('#binary-enabled').checked,
                    // Read counting mode from radio button group
                    objectCounting: this.container.querySelector('#object-counting-enabled').checked,
                    onlyApples: this.container.querySelector('#only-apples-enabled').checked
                },
                autoCleanup: {
                    enabled: this.container.querySelector('#auto-cleanup-enabled').checked,
                    timeoutSeconds: parseInt(this.container.querySelector('#cleanup-timer-seconds').value)
                }
            },
            gridMode: {
                enabled: this.container.querySelector('#grid-mode-enabled').checked,
                rows: this.getGridSizeFromSelect().rows,
                cols: this.getGridSizeFromSelect().cols,
                showGrid: this.container.querySelector('#grid-show-lines').checked,
                autoPopulate: this.container.querySelector('#grid-auto-populate').checked,
                cellPadding: parseInt(this.container.querySelector('#grid-cell-padding').value),
                wrapNavigation: this.container.querySelector('#grid-wrap-navigation').checked,
                highlightStyle: 'default',
                theme: 'default'
            }
        };
    }

    /**
     * Helper to parse grid size from select value
     */
    getGridSizeFromSelect() {
        const sizeValue = this.container.querySelector('#grid-size-select').value;
        const [rows, cols] = sizeValue.split('x').map(n => parseInt(n));
        return { rows, cols };
    }

    /**
     * Toggle visibility of grid settings based on grid mode enabled state
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
     * Start playing - navigate to toy
     */
    startPlaying() {
        console.log('startPlaying called - saving config and navigating to toy');
        this.saveCurrentConfig();

        // Verify config was saved
        const savedConfig = localStorage.getItem('toddleToyConfig');
        console.log('Config saved to localStorage:', !!savedConfig);

        // Allow toy access since user went through config
        this.router.allowToyAccess();

        this.hide(); // Hide the configuration screen
        this.router.navigate('/toy');
    }

    /**
     * Reset to defaults
     */
    /**
     * Handle reset/undo button click
     */
    handleResetUndo() {
        if (this.isUndoMode) {
            // Undo the reset - restore previous config
            if (this.configBeforeReset) {
                this.configManager.saveConfig(this.configBeforeReset);
                this.loadCurrentConfig();
                this.configBeforeReset = null;
                this.switchToResetMode();
            }
        } else {
            // Reset to defaults
            if (confirm('Reset all settings to defaults? This will undo your current configuration.')) {
                // Save current config for undo
                this.configBeforeReset = this.configManager.getConfig();
                this.configManager.resetToDefaults();
                this.loadCurrentConfig();
                this.switchToUndoMode();
            }
        }
    }

    /**
     * Switch button to undo mode
     */
    switchToUndoMode() {
        this.isUndoMode = true;
        const btn = this.container.querySelector('#reset-undo-btn');
        if (btn) {
            btn.textContent = '↶ Undo Reset';
            btn.classList.add('undo-mode');
        }
    }

    /**
     * Switch button to reset mode
     */
    switchToResetMode() {
        if (!this.isUndoMode) return; // Already in reset mode

        this.isUndoMode = false;
        this.configBeforeReset = null;
        const btn = this.container.querySelector('#reset-undo-btn');
        if (btn) {
            btn.textContent = 'Reset to Defaults';
            btn.classList.remove('undo-mode');
        }
    }

    resetToDefaults() {
        // Deprecated - use handleResetUndo instead
        this.handleResetUndo();
    }

    /**
     * Show the configuration screen
     * @param {boolean} isAdmin - Whether this is admin access
     */
    show(isAdmin = false) {
        this.container.style.display = 'block';
        this.isVisible = true;
        this.loadCurrentConfig(); // Refresh from current config

        // Show PWA installation prompt for admin users
        if (isAdmin) {
            this.showPWAInstallPrompt();
        }
    }

    /**
     * Hide the configuration screen
     */
    hide() {
        this.container.style.display = 'none';
        this.isVisible = false;
    }

    /**
     * Check if currently visible
     */
    isShowing() {
        return this.isVisible;
    }

    /**
     * Show PWA installation prompt for admin users
     */
    showPWAInstallPrompt() {
        // Check if already installed or if browser supports PWA installation
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
            window.navigator.standalone === true;

        if (isStandalone) {
            // Already installed as PWA
            this.createNotification('✅ PWA Installed', 'ToddleToy is already installed as a Progressive Web App!', 'success');
            return;
        }

        // Check if installation is supported
        if ('serviceWorker' in navigator && 'BeforeInstallPromptEvent' in window) {
            this.createNotification(
                '📱 Install as App',
                'Install ToddleToy as a PWA to use offline! Look for the "Install" button in your browser or use the browser menu to "Install App".',
                'info'
            );
        } else {
            this.createNotification(
                '💡 Use Offline',
                'ToddleToy works offline! Add it to your home screen for quick access. On mobile: use "Add to Home Screen" in your browser menu.',
                'info'
            );
        }
    }

    /**
     * Create a notification banner
     */
    createNotification(title, message, type = 'info') {
        // Remove any existing notifications
        const existingNotifications = this.container.querySelectorAll('.admin-notification');
        existingNotifications.forEach(n => n.remove());

        const notification = document.createElement('div');
        notification.className = `admin-notification admin-notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <h3 class="notification-title">${title}</h3>
                <p class="notification-message">${message}</p>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        // Insert after the header
        const header = this.container.querySelector('.config-header');
        header.parentNode.insertBefore(notification, header.nextSibling);

        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 10000);
    }

    /**
     * Handle PWA installation when user clicks install button
     */
    async handlePWAInstall() {
        if (!this.deferredPrompt) {
            console.log('No deferred prompt available');
            return;
        }

        const installBtn = this.container.querySelector('#install-pwa-btn');
        if (installBtn) {
            installBtn.disabled = true;
            installBtn.textContent = 'Installing...';
        }

        try {
            // Show the install prompt
            await this.deferredPrompt.prompt();

            // Wait for the user to respond
            const { outcome } = await this.deferredPrompt.userChoice;
            console.log(`User response to install prompt: ${outcome}`);

            if (outcome === 'accepted') {
                console.log('PWA installation accepted');
                this.createNotification(
                    '🎉 Installation Successful!',
                    'ToddleToy has been installed! You can now find it with your other apps.',
                    'success'
                );

                // Refresh the guidance section to show installed state
                setTimeout(() => {
                    const main = this.container.querySelector('.config-main');
                    if (main) {
                        const newGuidance = this.createParentGuidanceSection();
                        const oldGuidance = main.querySelector('.parent-guidance-banner');
                        if (oldGuidance) {
                            const tempDiv = document.createElement('div');
                            tempDiv.innerHTML = newGuidance;
                            oldGuidance.replaceWith(tempDiv.firstElementChild);
                        }
                    }
                }, 1000);
            } else {
                console.log('PWA installation declined');
                if (installBtn) {
                    installBtn.disabled = false;
                    installBtn.innerHTML = '<span class="button-icon">📱</span> Install ToddleToy Now';
                }
            }

            // Clear the deferred prompt
            this.deferredPrompt = null;

        } catch (error) {
            console.error('Error during PWA installation:', error);
            if (installBtn) {
                installBtn.disabled = false;
                installBtn.innerHTML = '<span class="button-icon">📱</span> Install ToddleToy Now';
            }
        }
    }

    /**
     * Update install button visibility based on deferred prompt availability
     */
    updateInstallButtonVisibility() {
        const main = this.container.querySelector('.config-main');
        if (main) {
            const newGuidance = this.createParentGuidanceSection();
            const oldGuidance = main.querySelector('.parent-guidance-banner');
            if (oldGuidance) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = newGuidance;
                oldGuidance.replaceWith(tempDiv.firstElementChild);

                // Re-attach event listener for install button
                const installBtn = this.container.querySelector('#install-pwa-btn');
                if (installBtn) {
                    installBtn.addEventListener('click', () => this.handlePWAInstall());
                }
            }
        }
    }
}