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
                    ${this.createParentGuidanceSection()}
                    ${new PlayingTips().render()}
                    ${new ContentTypes(this.container).render()}
                    ${new EmojiCategories(this.container).render()}
                    ${this.createLanguageSection()}
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
        this.populateLanguageColumns();
        
        // Append to body (initially hidden)
        this.container.style.display = 'none';
        document.body.appendChild(this.container);
    }

    /**
     * Create parent guidance section for PWA installation and safety
     */
    createParentGuidanceSection() {
        const isPWAInstalled = this.detectPWAInstalled();
        const platform = this.detectPlatform();

        return `
            <section class="parent-guidance-banner">
                <h2 class="guidance-banner-title" data-help-anchor="install-app">🚀 Getting Started with ToddleToy</h2>
                <p class="guidance-banner-subtitle">Follow these steps for the safest and best play experience</p>

                <div class="guidance-cards">
                    ${this.createInstallCard(isPWAInstalled)}
                    ${this.createBookmarkCard()}
                    ${this.createAppPinningCard(platform)}
                </div>
            </section>
        `;
    }

    /**
     * Create PWA installation card
     */
    createInstallCard(isPWAInstalled) {
        if (isPWAInstalled) {
            return `
                <div class="guidance-card install-card installed">
                    <div class="card-icon">✅</div>
                    <h3 class="card-title">App Installed!</h3>
                    <p class="card-content">
                        Great! ToddleToy is installed as an app. Your child can now play without accidentally
                        leaving the app. For even more safety, check out the "Keep Your Child Safe" section below.
                    </p>
                </div>
            `;
        }

        // Check if we have the install prompt available
        const hasInstallPrompt = this.deferredPrompt !== null;

        return `
            <div class="guidance-card install-card">
                <div class="card-icon">🚀</div>
                <h3 class="card-title">Best Experience: Install as App</h3>
                <p class="card-content">
                    Install ToddleToy like a regular app on your device for the safest experience:
                </p>
                <ul class="card-list">
                    <li>✅ <strong>Prevents accidental exits</strong> - No browser buttons to worry about</li>
                    <li>✅ <strong>Works offline</strong> - Play anywhere, anytime</li>
                    <li>✅ <strong>Faster loading</strong> - Opens instantly like any other app</li>
                    <li>✅ <strong>Full screen play</strong> - More space for your child to explore</li>
                </ul>
                ${hasInstallPrompt ?
                    `<button class="install-app-button" id="install-pwa-btn">
                        <span class="button-icon">📱</span>
                        Install ToddleToy Now
                    </button>` :
                    this.getManualInstallInstructions()
                }
            </div>
        `;
    }

    /**
     * Get manual installation instructions based on platform
     */
    getManualInstallInstructions() {
        const platform = this.detectPlatform();

        if (platform === PLATFORMS.IOS) {
            return `
                <div class="manual-install-instructions">
                    <p><strong>To install on iPhone/iPad:</strong></p>
                    <ol>
                        <li>Tap the Share button <span class="ios-icon">⎙</span></li>
                        <li>Scroll down and tap "Add to Home Screen"</li>
                        <li>Tap "Add" in the top right corner</li>
                    </ol>
                </div>
            `;
        } else if (platform === PLATFORMS.ANDROID) {
            return `
                <div class="manual-install-instructions">
                    <p><strong>To install on Android:</strong></p>
                    <ol>
                        <li>Tap the menu button (⋮) in your browser</li>
                        <li>Tap "Install app" or "Add to Home screen"</li>
                        <li>Tap "Install" to confirm</li>
                    </ol>
                </div>
            `;
        } else {
            return `
                <div class="manual-install-instructions">
                    <p><strong>To install on desktop:</strong></p>
                    <ol>
                        <li>Look for the install icon in your browser's address bar</li>
                        <li>Or use your browser's menu: "Install ToddleToy..." or "Install app"</li>
                        <li>Click "Install" to confirm</li>
                    </ol>
                </div>
            `;
        }
    }

    /**
     * Create bookmark instructions card
     */
    createBookmarkCard() {
        const platform = this.detectPlatform();
        let bookmarkInstructions = '';

        if (platform === PLATFORMS.IOS) {
            bookmarkInstructions = 'Tap <span class="ios-icon">⎙</span> Share → "Add Bookmark"';
        } else if (platform === PLATFORMS.ANDROID) {
            bookmarkInstructions = 'Tap ⋮ Menu → "Add bookmark" or ⭐ Star icon';
        } else if (platform === 'mac') {
            bookmarkInstructions = 'Press <kbd>⌘ Cmd</kbd> + <kbd>D</kbd>';
        } else {
            bookmarkInstructions = 'Press <kbd>Ctrl</kbd> + <kbd>D</kbd>';
        }

        return `
            <div class="guidance-card bookmark-card">
                <div class="card-icon">📌</div>
                <h3 class="card-title">Can't Install? Bookmark This Page</h3>
                <p class="card-content">
                    If you're not ready to install right now, save this settings page as a bookmark
                    so you can easily come back and adjust ToddleToy's settings later.
                </p>
                <div class="bookmark-instructions">
                    <strong>Quick shortcut:</strong> ${bookmarkInstructions}
                </div>
                <p class="card-note">
                    💡 Having this page bookmarked means you can quickly get back to settings if
                    your child accidentally leaves the play screen.
                </p>
            </div>
        `;
    }

    /**
     * Create app pinning/guided access card
     */
    createAppPinningCard(platform) {
        let instructions = '';
        let documentationLink = '';

        if (platform === PLATFORMS.IOS) {
            instructions = `
                <h4>🔒 Enable Guided Access</h4>
                <p>Guided Access locks your iPhone/iPad to a single app and lets you control which features are available:</p>
                <ol>
                    <li>Go to <strong>Settings</strong> → <strong>Accessibility</strong> → <strong>Guided Access</strong></li>
                    <li>Turn on <strong>Guided Access</strong></li>
                    <li>Set a <strong>Passcode</strong> (important: this is how you exit!)</li>
                    <li>Open ToddleToy and <strong>triple-click the side button</strong></li>
                    <li>Tap <strong>Start</strong> to begin Guided Access</li>
                </ol>
                <p class="exit-note">To exit: <strong>Triple-click the side button</strong> and enter your passcode</p>
            `;
            documentationLink = 'https://support.apple.com/en-us/HT202612';
        } else if (platform === PLATFORMS.ANDROID) {
            instructions = `
                <h4>📌 Enable Screen Pinning</h4>
                <p>Screen Pinning keeps ToddleToy in full view and prevents your child from leaving the app:</p>
                <ol>
                    <li>Go to <strong>Settings</strong> → <strong>Security</strong> → <strong>Advanced</strong></li>
                    <li>Turn on <strong>Screen Pinning</strong></li>
                    <li>Enable "Ask for PIN before unpinning" for extra security</li>
                    <li>Open ToddleToy, then tap the <strong>Recent Apps</strong> button (□)</li>
                    <li>Tap the <strong>app icon</strong> at the top and select <strong>Pin</strong></li>
                </ol>
                <p class="exit-note">To exit: <strong>Hold Back + Overview buttons</strong> (or swipe up and hold on gesture navigation)</p>
            `;
            documentationLink = 'https://support.google.com/android/answer/9455138';
        } else {
            instructions = `
                <h4>🖥️ Full Screen Mode</h4>
                <p>Use your browser's full screen mode to maximize play space:</p>
                <ul>
                    <li><strong>Windows:</strong> Press <kbd>F11</kbd> to enter full screen</li>
                    <li><strong>Mac:</strong> Press <kbd>⌘ Cmd</kbd> + <kbd>Ctrl</kbd> + <kbd>F</kbd></li>
                    <li><strong>Chrome:</strong> Click ⋮ menu → "Full screen"</li>
                </ul>
                <p class="card-note">
                    💡 For maximum safety, we recommend installing ToddleToy as an app on a mobile device
                    and using Guided Access (iOS) or Screen Pinning (Android).
                </p>
            `;
            documentationLink = '';
        }

        return `
            <div class="guidance-card app-pinning-card">
                <div class="card-icon">🔒</div>
                <h3 class="card-title" data-help-anchor="guided-access">Keep Your Child Safe in the App</h3>
                <p class="card-content">
                    Use your device's built-in safety features to lock ToddleToy in place, preventing
                    your child from accidentally leaving the app or accessing other apps.
                </p>
                <details class="app-pinning-details">
                    <summary class="details-summary">
                        📖 Show ${platform === PLATFORMS.IOS ? 'Guided Access' : platform === PLATFORMS.ANDROID ? 'Screen Pinning' : 'Full Screen'} Instructions
                    </summary>
                    <div class="details-content">
                        ${instructions}
                        ${documentationLink ?
                            `<a href="${documentationLink}" target="_blank" rel="noopener noreferrer" class="official-docs-link">
                                📚 View Official ${platform === PLATFORMS.IOS ? 'Apple' : 'Google'} Documentation →
                            </a>` : ''
                        }
                    </div>
                </details>
                <p class="card-emphasis">
                    ⭐ <strong>Pro Tip:</strong> This works best when ToddleToy is installed as an app!
                </p>
            </div>
        `;
    }




    /**
     * Create drag-and-drop language selection section
     */
    createLanguageSection() {
        return `
            <section class="config-section">
                <h2 class="section-title" data-help-anchor="languages">What language(s)?</h2>
                <p class="section-help">Tap to toggle languages between columns, or drag to reorder. Enabled languages will be spoken and displayed.</p>
                
                <div class="language-drag-container">
                    <div class="language-column enabled-column">
                        <h3 class="column-title">
                            <span class="column-icon">✅</span>
                            Enabled Languages
                        </h3>
                        <p class="column-help">Languages the child will hear and see</p>
                        <div class="language-dropzone" id="enabled-languages" data-column="enabled">
                            <!-- Enabled languages will be populated here -->
                        </div>
                    </div>
                    
                    <div class="language-column available-column">
                        <h3 class="column-title">
                            <span class="column-icon">📋</span>
                            Available Languages
                        </h3>
                        <p class="column-help">Drag languages to enable them</p>
                        <div class="language-dropzone" id="available-languages" data-column="available">
                            <!-- Available languages will be populated here -->
                        </div>
                    </div>
                </div>
                
                <div class="language-tips">
                    <div class="tip-item">
                        <span class="tip-icon">💡</span>
                        <span class="tip-text">Drag to reorder: First language = primary speech</span>
                    </div>
                    <div class="tip-item">
                        <span class="tip-icon">🌍</span>
                        <span class="tip-text">Multiple languages = child learns different ways to say things</span>
                    </div>
                </div>
            </section>
        `;
    }


    /**
     * Populate the language columns with draggable language items
     */
    populateLanguageColumns() {
        const config = this.configManager.getConfig();
        const enabledContainer = this.container.querySelector('#enabled-languages');
        const availableContainer = this.container.querySelector('#available-languages');
        
        // Clear existing content
        enabledContainer.innerHTML = '';
        availableContainer.innerHTML = '';
        
        // Add enabled languages
        config.languages.enabled.forEach((language, index) => {
            const languageElement = this.createLanguageElement(language, index + 1);
            enabledContainer.appendChild(languageElement);
        });
        
        // Add available languages
        config.languages.available.forEach(language => {
            const languageElement = this.createLanguageElement(language);
            availableContainer.appendChild(languageElement);
        });
        
        // Set up drag and drop
        this.setupLanguageDragAndDrop();
    }

    /**
     * Create a draggable language element
     */
    createLanguageElement(language, priority = null) {
        const element = document.createElement('div');
        element.className = 'language-item';
        element.dataset.languageCode = language.code;
        
        // Get flag emoji for language
        const flagEmoji = this.getLanguageFlag(language.code);
        
        // Ensure language has difficulty data
        const rank = language.difficultyRank || this.getDefaultRank(language.code);
        
        const difficultyLevel = this.getDifficultyLevel(rank);
        const difficultyText = this.getDifficultyText(difficultyLevel);
        
        element.innerHTML = `
            <span class="language-flag">${flagEmoji}</span>
            <div class="language-info">
                <div class="language-name">${language.name}</div>
                <div class="language-native">${language.nativeName}</div>
            </div>
            ${priority ? `<span class="language-difficulty difficulty-${difficultyLevel}">${priority === 1 ? 'Primary' : `#${priority}`}</span>` : `<span class="language-difficulty difficulty-${difficultyLevel}">${difficultyText}</span>`}
        `;
        
        return element;
    }


    /**
     * Set up drag and drop functionality for languages
     */
    setupLanguageDragAndDrop() {
        const languageItems = this.container.querySelectorAll('.language-item');
        
        languageItems.forEach(item => {
            this.makeLanguageItemDraggable(item);
        });
    }

    /**
     * Make a language item draggable with mouse/touch events and tap-to-toggle
     */
    makeLanguageItemDraggable(item) {
        let isDragging = false;
        let hasMoved = false;
        let dragOffset = { x: 0, y: 0 };
        let dragElement = null;
        let originalParent = null;
        let originalNextSibling = null;
        let startX = 0;
        let startY = 0;

        const startDrag = (e) => {
            // Prevent if clicking on text to allow selection
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;

            isDragging = true;
            hasMoved = false;
            originalParent = item.parentNode;
            originalNextSibling = item.nextElementSibling;

            const rect = item.getBoundingClientRect();
            const clientX = e.clientX || (e.touches && e.touches[0].clientX);
            const clientY = e.clientY || (e.touches && e.touches[0].clientY);

            startX = clientX;
            startY = clientY;

            dragOffset.x = clientX - rect.left;
            dragOffset.y = clientY - rect.top;

            // Don't create drag element yet - wait for movement
            e.preventDefault();
        };

        const drag = (e) => {
            if (!isDragging) return;

            const clientX = e.clientX || (e.touches && e.touches[0].clientX);
            const clientY = e.clientY || (e.touches && e.touches[0].clientY);

            // Check if moved significantly (threshold: 10px)
            const deltaX = Math.abs(clientX - startX);
            const deltaY = Math.abs(clientY - startY);

            if (!hasMoved && (deltaX > 10 || deltaY > 10)) {
                hasMoved = true;

                // Now create drag element
                const rect = item.getBoundingClientRect();
                dragElement = item.cloneNode(true);
                dragElement.style.cssText = `
                    position: fixed;
                    pointer-events: none;
                    z-index: 1000;
                    opacity: 0.8;
                    transform: rotate(3deg);
                    width: ${rect.width}px;
                    box-shadow: 0 8px 16px rgba(0,0,0,0.3);
                `;
                document.body.appendChild(dragElement);

                // Style original item
                item.style.opacity = '0.3';
                item.classList.add('dragging');

                // Prevent text selection
                document.body.style.userSelect = 'none';
            }

            if (hasMoved) {
                // Use requestAnimationFrame for smoother updates
                requestAnimationFrame(() => {
                    if (!dragElement) return;

                    // Update drag element position immediately
                    dragElement.style.left = (clientX - dragOffset.x) + 'px';
                    dragElement.style.top = (clientY - dragOffset.y) + 'px';

                    // Find drop target
                    const dropTarget = this.findDropTarget(clientX, clientY, item.dataset.languageCode);
                    this.updateDropIndicator(dropTarget);
                });
            }

            e.preventDefault();
        };

        const endDrag = (e) => {
            if (!isDragging) return;

            isDragging = false;

            const clientX = e.clientX || e.changedTouches && e.changedTouches[0].clientX;
            const clientY = e.clientY || e.changedTouches && e.changedTouches[0].clientY;

            // Clean up
            if (dragElement) {
                dragElement.remove();
                dragElement = null;
            }

            item.style.opacity = '';
            item.classList.remove('dragging');
            document.body.style.userSelect = '';
            this.clearDropIndicators();

            if (hasMoved) {
                // Handle drop for drag operation
                const dropTarget = this.findDropTarget(clientX, clientY, item.dataset.languageCode);
                if (dropTarget) {
                    this.handleLanguageDrop(item.dataset.languageCode, dropTarget);
                }
            } else {
                // Handle tap/click - toggle between columns
                this.toggleLanguageColumn(item.dataset.languageCode);
            }

            hasMoved = false;
        };

        // Mouse events
        item.addEventListener('mousedown', startDrag);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', endDrag);

        // Touch events
        item.addEventListener('touchstart', startDrag, { passive: false });
        document.addEventListener('touchmove', drag, { passive: false });
        document.addEventListener('touchend', endDrag);
    }

    /**
     * Toggle a language between enabled and available columns
     */
    toggleLanguageColumn(languageCode) {
        const config = this.configManager.getConfig();

        // Check if it's in enabled languages
        const enabledIndex = config.languages.enabled.findIndex(lang => lang.code === languageCode);
        if (enabledIndex !== -1) {
            // Move from enabled to available
            const [language] = config.languages.enabled.splice(enabledIndex, 1);
            config.languages.available.push(language);
        } else {
            // Check if it's in available languages
            const availableIndex = config.languages.available.findIndex(lang => lang.code === languageCode);
            if (availableIndex !== -1) {
                // Move from available to enabled
                const [language] = config.languages.available.splice(availableIndex, 1);
                config.languages.enabled.push(language);
            }
        }

        // Save and refresh
        this.configManager.saveConfig(config);
        this.populateLanguageColumns();
    }

    /**
     * Find the drop target based on mouse position
     */
    findDropTarget(clientX, clientY, draggedCode) {
        const dropzones = this.container.querySelectorAll('.language-dropzone');
        
        for (const zone of dropzones) {
            const rect = zone.getBoundingClientRect();
            if (clientX >= rect.left && clientX <= rect.right && 
                clientY >= rect.top && clientY <= rect.bottom) {
                
                const column = zone.dataset.column;
                const languageItems = Array.from(zone.querySelectorAll('.language-item:not(.dragging)'));
                
                // Check if dragged item is already in this column
                const draggedInColumn = zone.querySelector(`[data-language-code="${draggedCode}"]`);
                const isReorder = !!draggedInColumn;
                
                if (languageItems.length === 0) {
                    return { 
                        zone, 
                        column, 
                        isReorder, 
                        insertIndex: 0, 
                        insertElement: zone, 
                        insertBefore: false 
                    };
                }
                
                let insertIndex = languageItems.length;
                let insertElement = null;
                let insertBefore = false;
                
                for (let i = 0; i < languageItems.length; i++) {
                    const item = languageItems[i];
                    const itemRect = item.getBoundingClientRect();
                    const midpoint = itemRect.top + itemRect.height / 2;
                    
                    if (clientY < midpoint) {
                        insertIndex = i;
                        insertElement = item;
                        insertBefore = true;
                        break;
                    }
                }
                
                if (!insertElement) {
                    insertElement = languageItems[languageItems.length - 1];
                    insertBefore = false;
                }
                
                return { zone, column, isReorder, insertIndex, insertElement, insertBefore };
            }
        }
        
        return null;
    }

    /**
     * Update drop indicator based on drop target
     */
    updateDropIndicator(dropTarget) {
        this.clearDropIndicators();
        
        if (!dropTarget || !dropTarget.insertElement) return;
        
        const indicator = document.createElement('div');
        indicator.className = 'drop-indicator';
        indicator.style.cssText = `
            height: 3px;
            background: #4CAF50;
            margin: 2px 0;
            border-radius: 2px;
            opacity: 0.9;
            box-shadow: 0 0 4px rgba(76, 175, 80, 0.5);
        `;
        
        if (dropTarget.insertBefore) {
            dropTarget.insertElement.parentNode.insertBefore(indicator, dropTarget.insertElement);
        } else {
            dropTarget.insertElement.parentNode.appendChild(indicator);
        }
        
        // Add column highlighting
        dropTarget.zone.classList.add('drag-over');
    }

    /**
     * Clear all drop indicators and highlights
     */
    clearDropIndicators() {
        const indicators = this.container.querySelectorAll('.drop-indicator');
        indicators.forEach(indicator => indicator.remove());
        
        const dropzones = this.container.querySelectorAll('.language-dropzone');
        dropzones.forEach(zone => zone.classList.remove('drag-over'));
    }

    /**
     * Handle language drop
     */
    handleLanguageDrop(languageCode, dropTarget) {
        if (dropTarget.isReorder) {
            this.reorderLanguage(languageCode, dropTarget.column, dropTarget.insertIndex);
        } else {
            this.moveLanguage(languageCode, dropTarget.column);
        }
    }

    /**
     * Reorder a language within the same column
     */
    reorderLanguage(languageCode, column, insertIndex) {
        const config = this.configManager.getConfig();
        const languageArray = column === 'enabled' ? config.languages.enabled : config.languages.available;
        
        // Find current index
        const currentIndex = languageArray.findIndex(lang => lang.code === languageCode);
        if (currentIndex === -1) return;
        
        // Remove from current position
        const [language] = languageArray.splice(currentIndex, 1);
        
        // Adjust insert index if moving within same array
        const adjustedIndex = currentIndex < insertIndex ? insertIndex - 1 : insertIndex;
        
        // Insert at new position
        languageArray.splice(adjustedIndex, 0, language);
        
        // Update configuration and repopulate
        this.configManager.saveConfig(config);
        this.populateLanguageColumns();
    }

    /**
     * Move a language between enabled and available columns
     */
    moveLanguage(languageCode, targetColumn) {
        const config = this.configManager.getConfig();
        
        // Find the language in current configuration
        let language = null;
        let sourceColumn = null;
        
        // Check enabled languages
        const enabledIndex = config.languages.enabled.findIndex(lang => lang.code === languageCode);
        if (enabledIndex !== -1) {
            language = config.languages.enabled[enabledIndex];
            sourceColumn = 'enabled';
        }
        
        // Check available languages
        const availableIndex = config.languages.available.findIndex(lang => lang.code === languageCode);
        if (availableIndex !== -1) {
            language = config.languages.available[availableIndex];
            sourceColumn = 'available';
        }
        
        // If source and target are the same, do nothing
        if (sourceColumn === targetColumn || !language) {
            return;
        }
        
        // Remove from source
        if (sourceColumn === 'enabled') {
            config.languages.enabled.splice(enabledIndex, 1);
        } else {
            config.languages.available.splice(availableIndex, 1);
        }
        
        // Add to target
        if (targetColumn === 'enabled') {
            config.languages.enabled.push(language);
        } else {
            config.languages.available.push(language);
        }
        
        // Update configuration and repopulate
        this.configManager.saveConfig(config);
        this.populateLanguageColumns();
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
        this.populateLanguageColumns();

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