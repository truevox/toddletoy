/**
 * ConfigScreen - User interface for configuring the toddler toy
 * Provides intuitive controls for content selection, weights, and settings
 */
export class ConfigScreen {
    constructor(configManager, router) {
        this.configManager = configManager;
        this.router = router;
        this.container = null;
        this.isVisible = false;
        this.configBeforeReset = null; // Store config before reset for undo
        this.isUndoMode = false; // Track if button is in undo mode

        this.createUI();
        this.loadCurrentConfig();
    }

    /**
     * Create the configuration UI
     */
    createUI() {
        // Create main container
        this.container = document.createElement('div');
        this.container.id = 'config-screen';
        this.container.className = 'config-screen';
        
        // Add CSS styles
        this.addStyles();
        
        // Build the interface
        this.container.innerHTML = `
            <div class="config-container">
                <header class="config-header">
                    <div class="header-top-right">
                        <div class="version-display" id="app-version">v${typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0'}</div>
                        <button class="update-button" id="update-app-btn">Check for Updates</button>
                        <div id="update-status-msg" class="update-status"></div>
                    </div>
                    <h1 class="config-title">
                        <span class="title-letter t">T</span><span class="title-letter o1">o</span><span class="title-letter d1">d</span><span class="title-letter d2">d</span><span class="title-letter l">l</span><span class="title-letter e">e</span><span class="title-letter t2">T</span><span class="title-letter o2">o</span><span class="title-letter y">y</span>
                    </h1>
                    <p class="config-subtitle">Configure your child's learning experience</p>
                </header>

                <main class="config-main">
                    ${this.createContentTypesSection()}
                    ${this.createEmojiCategoriesSection()}
                    ${this.createLanguageSection()}
                    ${this.createAdvancedSection()}
                </main>

                <footer class="config-footer">
                    <div class="usage-guidance">
                        <h3 class="guidance-title">👨‍👩‍👧 Using ToddleToy with Your Child</h3>
                        <div class="guidance-content">
                            <p class="guidance-text">
                                <strong>ToddleToy works best when an adult supervises and plays along!</strong>
                                Encourage your child to explore, ask questions, and discover new words together.
                            </p>
                            <p class="guidance-note">
                                ⚠️ <strong>Note:</strong> The free web version allows easy navigation back to this config screen.
                                Toddlers may accidentally tap the browser back button. We recommend staying nearby to help if needed.
                            </p>
                            <p class="guidance-premium">
                                🚀 <strong>Coming Soon:</strong> Premium version with full-screen toy mode, enhanced parental controls,
                                and offline play without browser navigation!
                            </p>
                        </div>
                    </div>

                    <button class="start-button" id="start-playing-btn">
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
     * Create content types configuration section
     */
    createContentTypesSection() {
        return `
            <section class="config-section">
                <h2 class="section-title">What should appear in the toy?</h2>
                <p class="section-help">Choose what your child will see and interact with. Use sliders to make some things appear more often than others.</p>
                
                <div class="content-grid">
                    <div class="content-item">
                        <label class="content-label">
                            <input type="checkbox" id="shapes-enabled" class="content-checkbox">
                            🔵🔺⭐ Shapes
                        </label>
                        <div class="weight-control">
                            <label class="weight-label">How often?</label>
                            <input type="range" id="shapes-weight" class="weight-slider" min="1" max="100" value="25">
                            <span class="weight-value" id="shapes-weight-value">25</span>
                        </div>
                        <p class="content-examples">Examples: circles, squares, triangles, stars</p>
                    </div>

                    <div class="content-item">
                        <label class="content-label">
                            <input type="checkbox" id="small-numbers-enabled" class="content-checkbox">
                            🔢 Small Numbers
                        </label>
                        <div class="number-range">
                            <label>Range: <input type="number" id="small-min" class="range-input" min="0" max="9998" value="0"> to <input type="number" id="small-max" class="range-input" min="1" max="9999" value="20"></label>
                        </div>
                        <div class="weight-control">
                            <label class="weight-label">How often?</label>
                            <input type="range" id="small-numbers-weight" class="weight-slider" min="1" max="100" value="30">
                            <span class="weight-value" id="small-numbers-weight-value">30</span>
                        </div>
                        <p class="content-examples">Examples: 0, 1, 2, 3... good for counting practice</p>
                    </div>

                    <div class="content-item">
                        <label class="content-label">
                            <input type="checkbox" id="large-numbers-enabled" class="content-checkbox">
                            🔢 Large Numbers
                        </label>
                        <div class="number-range">
                            <label>Range: <input type="number" id="large-min" class="range-input" min="1" max="9998" value="21"> to <input type="number" id="large-max" class="range-input" min="2" max="9999" value="9999"></label>
                        </div>
                        <div class="weight-control">
                            <label class="weight-label">How often?</label>
                            <input type="range" id="large-numbers-weight" class="weight-slider" min="1" max="100" value="10">
                            <span class="weight-value" id="large-numbers-weight-value">10</span>
                        </div>
                        <p class="content-examples">Examples: 25, 150, 1000... for advanced learners</p>
                    </div>

                    <div class="content-item">
                        <label class="content-label">
                            <input type="checkbox" id="uppercase-enabled" class="content-checkbox">
                            📝 UPPERCASE Letters
                        </label>
                        <div class="weight-control">
                            <label class="weight-label">How often?</label>
                            <input type="range" id="uppercase-weight" class="weight-slider" min="1" max="100" value="25">
                            <span class="weight-value" id="uppercase-weight-value">25</span>
                        </div>
                        <p class="content-examples">Examples: A, B, C, D... classic letter learning</p>
                    </div>

                    <div class="content-item">
                        <label class="content-label">
                            <input type="checkbox" id="lowercase-enabled" class="content-checkbox">
                            📝 lowercase letters
                        </label>
                        <div class="weight-control">
                            <label class="weight-label">How often?</label>
                            <input type="range" id="lowercase-weight" class="weight-slider" min="1" max="100" value="15">
                            <span class="weight-value" id="lowercase-weight-value">15</span>
                        </div>
                        <p class="content-examples">Examples: a, b, c, d... for reading readiness</p>
                    </div>

                    <div class="content-item">
                        <label class="content-label">
                            <input type="checkbox" id="emojis-enabled" class="content-checkbox">
                            😊 Emojis
                        </label>
                        <div class="weight-control">
                            <label class="weight-label">How often?</label>
                            <input type="range" id="emojis-weight" class="weight-slider" min="1" max="100" value="20">
                            <span class="weight-value" id="emojis-weight-value">20</span>
                        </div>
                        <p class="content-examples">Examples: animals, foods, faces... fun and engaging</p>
                    </div>
                </div>
            </section>
        `;
    }

    /**
     * Create emoji categories section
     */
    createEmojiCategoriesSection() {
        return `
            <section class="config-section emoji-categories-section">
                <h2 class="section-title">What kinds of emojis?</h2>
                <p class="section-help">Choose which types of emojis to include. Make favorites appear more often.</p>
                <p class="emoji-dependency-note">💡 These categories are only used when "😊 Emojis" is enabled above</p>
                
                <div class="emoji-grid emoji-subcategories">
                    <div class="emoji-item">
                        <label class="emoji-label">
                            <input type="checkbox" id="animals-enabled" class="emoji-checkbox">
                            🐶 Animals
                        </label>
                        <div class="weight-control">
                            <input type="range" id="animals-weight" class="weight-slider" min="1" max="100" value="40">
                            <span class="weight-value" id="animals-weight-value">40</span>
                        </div>
                        <p class="emoji-examples">Examples: dogs, cats, lions, fish</p>
                    </div>

                    <div class="emoji-item">
                        <label class="emoji-label">
                            <input type="checkbox" id="food-enabled" class="emoji-checkbox">
                            🍎 Food
                        </label>
                        <div class="weight-control">
                            <input type="range" id="food-weight" class="weight-slider" min="1" max="100" value="30">
                            <span class="weight-value" id="food-weight-value">30</span>
                        </div>
                        <p class="emoji-examples">Examples: fruits, pizza, cookies, milk</p>
                    </div>

                    <div class="emoji-item">
                        <label class="emoji-label">
                            <input type="checkbox" id="vehicles-enabled" class="emoji-checkbox">
                            🚗 Vehicles
                        </label>
                        <div class="weight-control">
                            <input type="range" id="vehicles-weight" class="weight-slider" min="1" max="100" value="15">
                            <span class="weight-value" id="vehicles-weight-value">15</span>
                        </div>
                        <p class="emoji-examples">Examples: cars, trains, airplanes, rockets</p>
                    </div>

                    <div class="emoji-item">
                        <label class="emoji-label">
                            <input type="checkbox" id="faces-enabled" class="emoji-checkbox">
                            😀 Faces
                        </label>
                        <div class="weight-control">
                            <input type="range" id="faces-weight" class="weight-slider" min="1" max="100" value="10">
                            <span class="weight-value" id="faces-weight-value">10</span>
                        </div>
                        <p class="emoji-examples">Examples: happy, surprised, laughing, sleepy</p>
                    </div>

                    <div class="emoji-item">
                        <label class="emoji-label">
                            <input type="checkbox" id="nature-enabled" class="emoji-checkbox">
                            🌳 Nature
                        </label>
                        <div class="weight-control">
                            <input type="range" id="nature-weight" class="weight-slider" min="1" max="100" value="3">
                            <span class="weight-value" id="nature-weight-value">3</span>
                        </div>
                        <p class="emoji-examples">Examples: trees, flowers, sun, rain</p>
                    </div>

                    <div class="emoji-item">
                        <label class="emoji-label">
                            <input type="checkbox" id="objects-enabled" class="emoji-checkbox">
                            ⚽ Objects
                        </label>
                        <div class="weight-control">
                            <input type="range" id="objects-weight" class="weight-slider" min="1" max="100" value="2">
                            <span class="weight-value" id="objects-weight-value">2</span>
                        </div>
                        <p class="emoji-examples">Examples: balls, toys, books, music</p>
                    </div>
                </div>
            </section>
        `;
    }


    /**
     * Create drag-and-drop language selection section
     */
    createLanguageSection() {
        return `
            <section class="config-section">
                <h2 class="section-title">What language(s)?</h2>
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
     * Create advanced options section
     */
    createAdvancedSection() {
        return `
            <section class="config-section">
                <h2 class="section-title">Special number displays</h2>
                <p class="section-help">These show numbers in different ways - great for math exploration!</p>
                
                <div class="advanced-options">
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
                        <input type="checkbox" id="object-counting-enabled">
                        🔢 Object Counting (Place Values)
                        <span class="advanced-note">🍎=1s, 🛍️=10s, 📦=100s, 🚛=1000s (e.g. 15 = 1🛍️ + 5🍎)</span>
                    </label>
                    <label class="advanced-option">
                        <input type="checkbox" id="only-apples-enabled" checked>
                        🍎 Only Apples Counting
                        <span class="advanced-note">Simple counting with just apples (e.g. 5 = 🍎🍎🍎🍎🍎)</span>
                    </label>
                </div>
                
                <div class="auto-cleanup-section">
                    <h3 class="subsection-title">🧹 Auto-Cleanup Timer</h3>
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
                    <h3 class="subsection-title">🔊 Audio & Voice Controls</h3>
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
     * Get flag emoji for language code
     */
    getLanguageFlag(code) {
        const flags = {
            'en': '🇺🇸', 'es': '🇪🇸', 'zh': '🇨🇳', 'hi': '🇮🇳', 'ar': '🇸🇦', 
            'fr': '🇫🇷', 'bn': '🇧🇩', 'pt': '🇵🇹', 'ru': '🇷🇺', 'id': '🇮🇩',
            'tlh': '⚔️', 'jbo': '🤖', 'eo': '⭐'
        };
        return flags[code] || '🌍';
    }

    /**
     * Get difficulty level category for styling
     */
    getDifficultyLevel(rank) {
        if (rank === 1) return 'trivial';   // Esperanto
        if (rank <= 3) return 'easy';       // Indonesian, Spanish
        if (rank <= 6) return 'medium';     // Portuguese, French, English
        if (rank <= 8) return 'hard';       // Lojban, Russian
        if (rank <= 10) return 'very-hard'; // Bengali, Hindi
        if (rank <= 11) return 'extreme';   // Klingon
        return 'nightmare';                 // Arabic, Chinese
    }

    /**
     * Get difficulty text for display
     */
    getDifficultyText(level) {
        const texts = {
            'trivial': 'Trivial',
            'easy': 'Easy',
            'medium': 'Medium',
            'hard': 'Hard',
            'very-hard': 'Very Hard',
            'extreme': 'Extreme',
            'nightmare': 'Expert Only'
        };
        return texts[level] || 'Medium';
    }

    /**
     * Get default difficulty rank for language code
     */
    getDefaultRank(code) {
        const ranks = {
            'eo': 1, 'id': 2, 'es': 3, 'pt': 4, 'fr': 5, 'en': 6,
            'jbo': 7, 'ru': 8, 'bn': 9, 'hi': 10, 'tlh': 11, 'ar': 12, 'zh': 13
        };
        return ranks[code] || 6; // Default to English difficulty
    }

    /**
     * Get default learning hours for language code
     */
    getDefaultHours(code) {
        const hours = {
            'eo': '150-200h', 'id': '900h', 'es': '600-750h', 'pt': '600-750h', 
            'fr': '600-750h', 'en': '700-900h', 'jbo': '1000h±', 'ru': '1100h',
            'bn': '1100h', 'hi': '1100h', 'tlh': '1400h±', 'ar': '2200h', 'zh': '2200h+'
        };
        return hours[code] || '700-900h'; // Default to English hours
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
     * Add CSS styles to the page
     */
    addStyles() {
        const styleId = 'config-screen-styles';
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .config-screen {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
                color: white;
                overflow-y: auto;
                z-index: 1000;
                font-family: 'Inter', 'Segoe UI', 'Roboto', sans-serif;
                animation: fadeIn 0.6s ease-out;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }

            .config-container {
                max-width: 1200px;
                margin: 0 auto;
                padding: 20px;
                min-height: 100vh;
                display: flex;
                flex-direction: column;
            }

            .config-header {
                position: relative;
                text-align: center;
                margin-bottom: 30px;
            }
            .header-top-right {
                position: absolute;
                top: 10px;
                right: 10px;
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                gap: 8px;
            }
            .version-display {
                font-size: 0.9rem;
                color: rgba(255, 255, 255, 0.6);
                font-weight: normal;
            }
            .update-button {
                background: rgba(255, 255, 255, 0.15);
                color: white;
                border: 1px solid rgba(255, 255, 255, 0.3);
                padding: 6px 12px;
                border-radius: 6px;
                font-size: 0.85rem;
                cursor: pointer;
                transition: all 0.2s ease;
                white-space: nowrap;
            }
            .update-button:hover {
                background: rgba(255, 255, 255, 0.25);
            }
            .update-button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .config-title {
                font-size: 3rem;
                margin: 0;
                font-weight: bold;
            }

            .title-letter {
                display: inline-block;
                margin: 0 2px;
            }
            .title-letter.t { color: #ff6b6b; }
            .title-letter.o1 { color: #4ecdc4; }
            .title-letter.d1 { color: #45b7d1; }
            .title-letter.d2 { color: #f9ca24; }
            .title-letter.l { color: #6c5ce7; }
            .title-letter.e { color: #a29bfe; }
            .title-letter.t2 { color: #fd79a8; }
            .title-letter.o2 { color: #00b894; }
            .title-letter.y { color: #e17055; }

            .config-subtitle {
                font-size: 1.2rem;
                margin: 10px 0 0 0;
                opacity: 0.9;
            }

            .config-main {
                flex: 1;
            }

            .config-section {
                background: rgba(255, 255, 255, 0.15);
                border-radius: 20px;
                padding: 30px;
                margin-bottom: 30px;
                backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
            }
            
            .config-section::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 3px;
                background: linear-gradient(90deg, #ff6b6b, #4ecdc4, #45b7d1, #f9ca24);
                opacity: 0.8;
            }
            
            .config-section:hover {
                transform: translateY(-2px);
                box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
                background: rgba(255, 255, 255, 0.18);
            }

            .section-title {
                font-size: 1.5rem;
                margin: 0 0 10px 0;
                color: #fff;
            }

            .section-help {
                margin: 0 0 20px 0;
                opacity: 0.8;
                font-style: italic;
            }

            .content-grid, .emoji-grid, .color-grid {
                display: grid;
                gap: 20px;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            }

            .emoji-categories-section {
                position: relative;
                border-left: 4px solid rgba(255, 255, 255, 0.3);
                margin-left: 20px;
                padding-left: 30px;
                transition: all 0.3s ease;
            }

            .emoji-categories-section.emoji-enabled {
                border-left-color: #4CAF50;
                background: rgba(76, 175, 80, 0.05);
            }

            .emoji-categories-section.emoji-disabled {
                opacity: 0.5;
                border-left-color: #f44336;
            }

            .emoji-dependency-note {
                font-size: 0.9rem;
                padding: 10px 15px;
                margin: 10px 0 20px 0;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                border-left: 3px solid #2196F3;
                font-style: italic;
            }

            .emoji-subcategories {
                transition: all 0.3s ease;
            }

            .emoji-subcategories.disabled {
                opacity: 0.4;
                pointer-events: none;
            }

            .content-item, .emoji-item, .color-item {
                background: rgba(255, 255, 255, 0.12);
                border-radius: 16px;
                padding: 20px;
                border: 1px solid rgba(255, 255, 255, 0.15);
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
            }
            
            .content-item::before, .emoji-item::before, .color-item::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(135deg, rgba(255,255,255,0.1), transparent);
                opacity: 0;
                transition: opacity 0.3s ease;
                pointer-events: none;
            }
            
            .content-item:hover, .emoji-item:hover, .color-item:hover {
                transform: translateY(-2px);
                background: rgba(255, 255, 255, 0.18);
                border-color: rgba(255, 255, 255, 0.3);
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
            }
            
            .content-item:hover::before, .emoji-item:hover::before, .color-item:hover::before {
                opacity: 1;
            }

            .content-label, .emoji-label, .color-label {
                display: flex;
                align-items: center;
                font-size: 1.1rem;
                font-weight: bold;
                margin-bottom: 10px;
                cursor: pointer;
            }

            .content-checkbox, .emoji-checkbox, .color-checkbox {
                margin-right: 10px;
                transform: scale(1.2);
            }

            .weight-control {
                display: flex;
                align-items: center;
                gap: 10px;
                margin: 10px 0;
            }

            .weight-label {
                font-size: 0.9rem;
                min-width: 80px;
            }

            .weight-slider {
                flex: 1;
                height: 6px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 3px;
                outline: none;
            }

            .weight-value {
                min-width: 30px;
                font-weight: bold;
            }

            .number-range {
                margin: 10px 0;
            }

            .range-input {
                width: 80px;
                padding: 5px;
                border: none;
                border-radius: 5px;
                text-align: center;
            }

            .content-examples, .emoji-examples {
                font-size: 0.85rem;
                opacity: 0.7;
                margin: 5px 0 0 0;
                font-style: italic;
            }

            .language-drag-container {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 30px;
                margin: 20px 0;
            }

            .language-column {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 12px;
                padding: 20px;
                min-height: 400px;
            }

            .enabled-column {
                border-left: 4px solid #4CAF50;
            }

            .available-column {
                border-left: 4px solid #2196F3;
            }

            .column-title {
                font-size: 1.2rem;
                font-weight: bold;
                margin: 0 0 10px 0;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .enabled-column .column-title {
                color: #4CAF50;
            }

            .available-column .column-title {
                color: #2196F3;
            }

            .column-help {
                font-size: 0.9rem;
                opacity: 0.8;
                margin: 0 0 20px 0;
                font-style: italic;
            }

            .language-dropzone {
                min-height: 300px;
                border: 2px dashed rgba(255, 255, 255, 0.3);
                border-radius: 8px;
                padding: 15px;
                transition: all 0.3s ease;
            }

            .language-dropzone.drag-over {
                border-color: #4CAF50;
                background: rgba(76, 175, 80, 0.1);
            }

            .language-item {
                display: flex;
                align-items: center;
                padding: 12px 15px;
                margin: 8px 0;
                border-radius: 8px;
                cursor: grab;
                transition: all 0.2s ease;
                user-select: none;
                position: relative;
                background: rgba(255, 255, 255, 0.15);
                border: 1px solid rgba(255, 255, 255, 0.2);
            }

            .enabled-column .language-item {
                background: rgba(76, 175, 80, 0.2);
                border-color: rgba(76, 175, 80, 0.4);
            }

            .available-column .language-item {
                background: rgba(33, 150, 243, 0.2);
                border-color: rgba(33, 150, 243, 0.4);
            }

            .language-item:active {
                cursor: grabbing;
            }

            .language-item.dragging {
                opacity: 0.5;
                transform: rotate(5deg);
            }

            .language-flag {
                font-size: 1.5rem;
                margin-right: 12px;
            }

            .language-info {
                flex: 1;
            }

            .language-name {
                font-weight: bold;
                font-size: 1rem;
                margin-bottom: 2px;
            }

            .language-native {
                font-size: 0.85rem;
                opacity: 0.8;
                font-style: italic;
            }

            .language-difficulty {
                font-size: 0.7rem;
                padding: 3px 8px;
                border-radius: 12px;
                margin-left: 8px;
                font-weight: bold;
                text-align: center;
                min-width: 80px;
            }

            .difficulty-trivial {
                background: #8BC34A;
                color: white;
            }

            .difficulty-easy {
                background: #4CAF50;
                color: white;
            }

            .difficulty-medium {
                background: #FF9800;
                color: white;
            }

            .difficulty-hard {
                background: #FF5722;
                color: white;
            }

            .difficulty-very-hard {
                background: #E91E63;
                color: white;
            }

            .difficulty-extreme {
                background: #9C27B0;
                color: white;
            }

            .difficulty-nightmare {
                background: #212121;
                color: white;
                border: 1px solid #FF1744;
            }

            .language-tips {
                margin-top: 20px;
                display: flex;
                gap: 20px;
                flex-wrap: wrap;
            }

            .tip-item {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 10px 15px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                font-size: 0.9rem;
            }

            .tip-icon {
                font-size: 1.2rem;
            }

            .advanced-options {
                display: flex;
                flex-direction: column;
                gap: 15px;
            }

            .advanced-option {
                display: flex;
                align-items: center;
                font-size: 1.1rem;
                cursor: pointer;
                padding: 10px;
                border-radius: 8px;
                background: rgba(255, 255, 255, 0.1);
            }

            .advanced-option input {
                margin-right: 10px;
                transform: scale(1.2);
            }

            .advanced-note {
                display: block;
                font-size: 0.85rem;
                opacity: 0.7;
                margin-left: 25px;
                font-style: italic;
            }

            .auto-cleanup-section {
                margin-top: 25px;
                padding-top: 20px;
                border-top: 1px solid rgba(255, 255, 255, 0.2);
            }

            .subsection-title {
                font-size: 1.3rem;
                margin: 0 0 10px 0;
                color: #fff;
            }

            .cleanup-controls {
                display: flex;
                flex-direction: column;
                gap: 15px;
            }

            .cleanup-timer-control {
                margin-left: 25px;
                padding: 15px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 10px;
                border-left: 3px solid #4CAF50;
            }

            .timer-label {
                display: flex;
                align-items: center;
                font-size: 1rem;
                gap: 10px;
                margin-bottom: 10px;
            }

            .timer-input {
                width: 80px;
                padding: 8px;
                border: 1px solid rgba(255, 255, 255, 0.3);
                border-radius: 5px;
                background: rgba(255, 255, 255, 0.1);
                color: white;
                font-size: 1rem;
                text-align: center;
            }

            .timer-input:focus {
                outline: none;
                border-color: #4CAF50;
                box-shadow: 0 0 10px rgba(76, 175, 80, 0.3);
            }

            .timer-note {
                font-size: 0.9rem;
                opacity: 0.8;
                margin: 0;
                padding: 10px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                border-left: 3px solid #FFC107;
            }

            .config-footer {
                position: relative;
                text-align: center;
                margin-top: 30px;
            }

            .start-button {
                background: linear-gradient(135deg, #4CAF50, #45a049, #66BB6A);
                color: white;
                border: none;
                padding: 24px 48px;
                font-size: 1.6rem;
                font-weight: 700;
                border-radius: 20px;
                cursor: pointer;
                margin-bottom: 25px;
                box-shadow: 0 8px 25px rgba(76, 175, 80, 0.3);
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            .start-button::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
                transition: left 0.6s ease;
            }
            
            .start-button:hover {
                transform: translateY(-3px) scale(1.02);
                box-shadow: 0 12px 35px rgba(76, 175, 80, 0.4);
            }
            
            .start-button:hover::before {
                left: 100%;
            }
            
            .start-button:active {
                transform: translateY(-1px) scale(0.98);
            }

            .config-actions {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 20px;
                flex-wrap: wrap;
            }

            .secondary-button {
                background: rgba(255, 255, 255, 0.2);
                color: white;
                border: 1px solid rgba(255, 255, 255, 0.3);
                padding: 10px 20px;
                border-radius: 8px;
                cursor: pointer;
                transition: background 0.2s;
            }

            .secondary-button:hover {
                background: rgba(255, 255, 255, 0.3);
            }

            .skip-config-checkbox {
                display: flex;
                align-items: center;
                cursor: pointer;
            }

            .skip-config-checkbox input {
                margin-right: 8px;
                transform: scale(1.1);
            }

            .update-status {
                font-size: 0.75rem;
                color: rgba(255, 255, 255, 0.8);
                min-height: 16px;
                text-align: right;
            }
            .reset-undo-button {
                position: absolute;
                bottom: 20px;
                left: 20px;
                background: rgba(255, 255, 255, 0.15);
                color: white;
                border: 1px solid rgba(255, 255, 255, 0.3);
                padding: 10px 20px;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 0.9rem;
            }
            .reset-undo-button:hover {
                background: rgba(255, 255, 255, 0.25);
            }
            .reset-undo-button.undo-mode {
                background: rgba(255, 193, 7, 0.3);
                border-color: rgba(255, 193, 7, 0.6);
            }
            .reset-undo-button.undo-mode:hover {
                background: rgba(255, 193, 7, 0.4);
            }

            /* Mobile responsiveness */
            @media (max-width: 768px) {
                .config-container {
                    padding: 15px;
                }

                .config-title {
                    font-size: 2rem;
                }

                .content-grid, .emoji-grid {
                    grid-template-columns: 1fr;
                }

                .language-drag-container {
                    grid-template-columns: 1fr;
                    gap: 20px;
                }

                .language-column {
                    min-height: auto;
                }

                .language-dropzone {
                    min-height: 150px;
                }

                .config-actions {
                    flex-direction: column;
                    gap: 15px;
                }
            }

            /* Admin notification styles */
            .admin-notification {
                margin: 20px 0;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                animation: slideIn 0.3s ease-out;
            }

            .admin-notification-info {
                background: linear-gradient(135deg, #3498db, #2980b9);
                border-left: 4px solid #2196F3;
            }

            .admin-notification-success {
                background: linear-gradient(135deg, #27ae60, #229954);
                border-left: 4px solid #4CAF50;
            }

            .notification-content {
                padding: 20px;
                color: white;
                position: relative;
            }

            .notification-title {
                margin: 0 0 8px 0;
                font-size: 1.2rem;
                font-weight: bold;
            }

            .notification-message {
                margin: 0;
                line-height: 1.5;
                opacity: 0.95;
            }

            .notification-close {
                position: absolute;
                top: 10px;
                right: 15px;
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                font-size: 18px;
                width: 24px;
                height: 24px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s;
            }

            .notification-close:hover {
                background: rgba(255,255,255,0.3);
            }

            @keyframes slideIn {
                from {
                    transform: translateY(-20px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Add event listeners to interactive elements
     */
    addEventListeners() {
        // Start playing button
        const startBtn = this.container.querySelector('#start-playing-btn');
        startBtn.addEventListener('click', () => this.startPlaying());

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
        this.setupEmojiMasterToggle();

        // Object counting mutual exclusivity
        this.setupObjectCountingMutualExclusivity();

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
    }

    /**
     * Set up the emoji master toggle behavior
     */
    setupEmojiMasterToggle() {
        const masterCheckbox = this.container.querySelector('#emojis-enabled');
        const categoryCheckboxes = this.container.querySelectorAll('#animals-enabled, #food-enabled, #vehicles-enabled, #faces-enabled, #nature-enabled, #objects-enabled');

        // When master checkbox changes, update all category checkboxes and visual styling
        masterCheckbox.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            categoryCheckboxes.forEach(checkbox => {
                checkbox.checked = isChecked;
            });
            
            // Update visual styling of emoji categories section
            this.updateEmojiCategoriesVisualState(isChecked);
            
            // Save after updating all checkboxes
            this.saveCurrentConfig();
        });

        // When any category checkbox changes, update master checkbox
        categoryCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateEmojiMasterCheckboxState();
            });
        });
        
        // Initialize visual state
        this.updateEmojiMasterCheckboxState();
    }

    /**
     * Update the master emoji checkbox based on category checkbox states
     */
    updateEmojiMasterCheckbox() {
        this.updateEmojiMasterCheckboxState();
    }

    /**
     * Update the master emoji checkbox state (checked/unchecked/indeterminate)
     */
    updateEmojiMasterCheckboxState() {
        const masterCheckbox = this.container.querySelector('#emojis-enabled');
        const categoryCheckboxes = this.container.querySelectorAll('#animals-enabled, #food-enabled, #vehicles-enabled, #faces-enabled, #nature-enabled, #objects-enabled');
        
        if (masterCheckbox && categoryCheckboxes.length > 0) {
            const checkedCount = Array.from(categoryCheckboxes).filter(cb => cb.checked).length;
            const totalCount = categoryCheckboxes.length;
            
            if (checkedCount === 0) {
                // None selected - unchecked
                masterCheckbox.checked = false;
                masterCheckbox.indeterminate = false;
                this.updateEmojiCategoriesVisualState(false);
            } else if (checkedCount === totalCount) {
                // All selected - checked
                masterCheckbox.checked = true;
                masterCheckbox.indeterminate = false;
                this.updateEmojiCategoriesVisualState(true);
            } else {
                // Partial selection - indeterminate (half-ticked gray)
                masterCheckbox.checked = false;
                masterCheckbox.indeterminate = true;
                this.updateEmojiCategoriesVisualState(true); // Categories are still usable
            }
        }
    }

    /**
     * Update visual styling of emoji categories section based on master toggle state
     */
    updateEmojiCategoriesVisualState(isEnabled) {
        const categoriesSection = this.container.querySelector('.emoji-categories-section');
        const subcategoriesDiv = this.container.querySelector('.emoji-subcategories');
        
        if (categoriesSection) {
            // Remove all state classes
            categoriesSection.classList.remove('emoji-enabled', 'emoji-disabled');
            
            // Add appropriate state class
            if (isEnabled) {
                categoriesSection.classList.add('emoji-enabled');
            } else {
                categoriesSection.classList.add('emoji-disabled');
            }
        }
        
        if (subcategoriesDiv) {
            if (isEnabled) {
                subcategoriesDiv.classList.remove('disabled');
            } else {
                subcategoriesDiv.classList.add('disabled');
            }
        }
    }

    /**
     * Set up mutual exclusivity between Object Counting and Only Apples
     */
    setupObjectCountingMutualExclusivity() {
        const objectCountingCheckbox = this.container.querySelector('#object-counting-enabled');
        const onlyApplesCheckbox = this.container.querySelector('#only-apples-enabled');

        if (objectCountingCheckbox && onlyApplesCheckbox) {
            // When Object Counting is checked, uncheck Only Apples
            objectCountingCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    onlyApplesCheckbox.checked = false;
                }
            });

            // When Only Apples is checked, uncheck Object Counting
            onlyApplesCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    objectCountingCheckbox.checked = false;
                }
            });
        }
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
        this.populateLanguageColumns();

        // Advanced options
        this.setCheckboxValue('#cistercian-enabled', config.advanced.numberModes.cistercian);
        this.setCheckboxValue('#kaktovik-enabled', config.advanced.numberModes.kaktovik);
        this.setCheckboxValue('#binary-enabled', config.advanced.numberModes.binary);
        this.setCheckboxValue('#object-counting-enabled', config.advanced.numberModes.objectCounting);
        this.setCheckboxValue('#only-apples-enabled', config.advanced.numberModes.onlyApples);
        this.setCheckboxValue('#skip-config-checkbox', config.advanced.skipConfig);

        // Auto-cleanup configuration
        this.setCheckboxValue('#auto-cleanup-enabled', config.advanced.autoCleanup.enabled);
        this.setInputValue('#cleanup-timer-seconds', config.advanced.autoCleanup.timeoutSeconds);

        // Audio configuration
        if (config.audio) {
            this.setSliderValue('#audio-volume', config.audio.volume);
            this.setCheckboxValue('#audio-mute', config.audio.mute);
            const audioVolumeValue = this.container.querySelector('#audio-volume-value');
            if (audioVolumeValue) audioVolumeValue.textContent = `${config.audio.volume}%`;
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
                mute: this.container.querySelector('#audio-mute').checked
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
                    objectCounting: this.container.querySelector('#object-counting-enabled').checked,
                    onlyApples: this.container.querySelector('#only-apples-enabled').checked
                },
                autoCleanup: {
                    enabled: this.container.querySelector('#auto-cleanup-enabled').checked,
                    timeoutSeconds: parseInt(this.container.querySelector('#cleanup-timer-seconds').value)
                }
            }
        };
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
}