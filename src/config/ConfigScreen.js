/**
 * ConfigScreen - User interface for configuring the toddler toy
 * Provides intuitive controls for content selection, weights, and settings
 */
import { HelpSystem } from './HelpSystem.js';
import { PLATFORMS } from './constants.js';
import { safeStorage } from '../utils/safeStorage.js';
import { detectPlatform, detectPWAInstalled } from '../utils/platformUtils.js';
import { getLanguageFlag, getDifficultyLevel, getDifficultyText, getDefaultRank, getDefaultHours } from '../utils/languageUtils.js';
import { PlayingTips } from './ui/PlayingTips.js';
import { ContentTypes } from './ui/ContentTypes.js';
import { EmojiCategories } from './ui/EmojiCategories.js';
import { AdvancedSection } from './ui/AdvancedSection.js';
import { ParentGuidance } from './ui/ParentGuidance.js';
import { LanguageSection } from './ui/LanguageSection.js';
import { showPWAInstallPrompt, createNotification, handlePWAInstall, updateInstallButtonVisibility } from './ui/PWAInstall.js';
import { addEventListeners, setupAudioControls } from './ui/ConfigEvents.js';
import {
    loadCurrentConfig, setCheckboxValue, setSliderValue, setInputValue, setRadioValue, setSelectValue,
    validateNumberRanges, buildConfigFromUI, getGridSizeFromSelect, toggleGridSettings, updateEmojiMasterCheckbox
} from './ui/ConfigForm.js';
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
                    <div class="quick-start">
                        <button class="start-button" id="start-playing-btn-header">
                            ▶️ START PLAYING
                        </button>
                        <p class="quick-start-note">The settings below are ready to go. Scroll down any time to change them.</p>
                        <button class="back-to-toys-button" id="back-to-toys-btn" type="button">← All toys</button>
                    </div>
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
        return addEventListeners(this);
    }

    /**
     * Set up audio controls with volume/mute sync
     */
    setupAudioControls() {
        return setupAudioControls(this);
    }

    /**
     * Set up the emoji master toggle behavior
     */
    updateEmojiMasterCheckbox() {
        return updateEmojiMasterCheckbox(this);
    }

    createParentGuidanceSection() {
        return new ParentGuidance(this.deferredPrompt).render();
    }

    /**
     * Load current configuration into the UI
     */
    loadCurrentConfig() {
        return loadCurrentConfig(this);
    }

    /**
     * Helper methods for setting form values
     */
    setCheckboxValue(selector, value) {
        return setCheckboxValue(this, selector, value);
    }

    setSliderValue(selector, value) {
        return setSliderValue(this, selector, value);
    }

    setInputValue(selector, value) {
        return setInputValue(this, selector, value);
    }

    setRadioValue(name, value) {
        return setRadioValue(this, name, value);
    }

    setSelectValue(selector, value) {
        return setSelectValue(this, selector, value);
    }

    /**
     * Validate number ranges and auto-adjust if needed
     */
    validateNumberRanges() {
        return validateNumberRanges(this);
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
        return buildConfigFromUI(this);
    }

    /**
     * Helper to parse grid size from select value
     */
    getGridSizeFromSelect() {
        return getGridSizeFromSelect(this);
    }

    /**
     * Toggle visibility of grid settings based on grid mode enabled state
     */
    toggleGridSettings(enabled) {
        return toggleGridSettings(this, enabled);
    }

    /**
     * Start playing - navigate to toy
     */
    startPlaying() {
        console.log('startPlaying called - saving config and navigating to toy');
        this.saveCurrentConfig();

        // Verify config was saved
        const savedConfig = safeStorage.getItem('toddleToyConfig');
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
        return showPWAInstallPrompt(this);
    }

    /**
     * Create a notification banner
     */
    createNotification(title, message, type = 'info') {
        return createNotification(this, title, message, type);
    }

    /**
     * Handle PWA installation when user clicks install button
     */
    async handlePWAInstall() {
        return handlePWAInstall(this);
    }

    /**
     * Update install button visibility based on deferred prompt availability
     */
    updateInstallButtonVisibility() {
        return updateInstallButtonVisibility(this);
    }
}