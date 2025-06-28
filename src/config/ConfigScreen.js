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
                    <h1 class="config-title">
                        <span class="title-letter t">T</span><span class="title-letter o1">o</span><span class="title-letter d1">d</span><span class="title-letter d2">d</span><span class="title-letter l">l</span><span class="title-letter e">e</span><span class="title-letter t2">T</span><span class="title-letter o2">o</span><span class="title-letter y">y</span>
                    </h1>
                    <p class="config-subtitle">Configure your child's learning experience</p>
                </header>

                <main class="config-main">
                    ${this.createContentTypesSection()}
                    ${this.createEmojiCategoriesSection()}
                    ${this.createColorCategoriesSection()}
                    ${this.createLanguageSection()}
                    ${this.createAdvancedSection()}
                </main>

                <footer class="config-footer">
                    <button class="start-button" id="start-playing-btn">
                        ▶️ START PLAYING
                    </button>
                    <div class="config-actions">
                        <button class="secondary-button" id="reset-defaults-btn">Reset to Defaults</button>
                        <label class="skip-config-checkbox">
                            <input type="checkbox" id="skip-config-checkbox">
                            ⚡ Skip this screen next time
                        </label>
                    </div>
                </footer>
            </div>
        `;
        
        // Add event listeners
        this.addEventListeners();
        
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
            <section class="config-section">
                <h2 class="section-title">What kinds of emojis?</h2>
                <p class="section-help">Choose which types of emojis to include. Make favorites appear more often.</p>
                
                <div class="emoji-grid">
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
     * Create color categories section
     */
    createColorCategoriesSection() {
        return `
            <section class="config-section">
                <h2 class="section-title">What colors should things be?</h2>
                <p class="section-help">Choose which colors appear in shapes and letters. More variety = more learning!</p>
                
                <div class="color-grid">
                    <div class="color-item">
                        <label class="color-label">
                            <input type="checkbox" id="primary-colors-enabled" class="color-checkbox">
                            🔴 Primary Colors
                        </label>
                        <div class="weight-control">
                            <input type="range" id="primary-colors-weight" class="weight-slider" min="1" max="100" value="50">
                            <span class="weight-value" id="primary-colors-weight-value">50</span>
                        </div>
                        <p class="color-examples">Red, Blue, Yellow - basic color learning</p>
                    </div>

                    <div class="color-item">
                        <label class="color-label">
                            <input type="checkbox" id="secondary-colors-enabled" class="color-checkbox">
                            🟢 Secondary Colors
                        </label>
                        <div class="weight-control">
                            <input type="range" id="secondary-colors-weight" class="weight-slider" min="1" max="100" value="35">
                            <span class="weight-value" id="secondary-colors-weight-value">35</span>
                        </div>
                        <p class="color-examples">Green, Orange, Purple - expanded color vocabulary</p>
                    </div>

                    <div class="color-item">
                        <label class="color-label">
                            <input type="checkbox" id="neutral-colors-enabled" class="color-checkbox">
                            🤍 Neutral Colors
                        </label>
                        <div class="weight-control">
                            <input type="range" id="neutral-colors-weight" class="weight-slider" min="1" max="100" value="15">
                            <span class="weight-value" id="neutral-colors-weight-value">15</span>
                        </div>
                        <p class="color-examples">Black, White, Brown, Gray - advanced color concepts</p>
                    </div>
                </div>
            </section>
        `;
    }

    /**
     * Create language selection section
     */
    createLanguageSection() {
        return `
            <section class="config-section">
                <h2 class="section-title">What language(s)?</h2>
                <p class="section-help">Choose how words are spoken and displayed.</p>
                
                <div class="language-options">
                    <div class="language-group">
                        <h3 class="language-group-title">Primary Languages</h3>
                        <label class="language-option">
                            <input type="radio" name="language" value="en" id="language-en">
                            🇺🇸 English Only
                        </label>
                        <label class="language-option">
                            <input type="radio" name="language" value="es" id="language-es">
                            🇪🇸 Spanish Only
                        </label>
                        <label class="language-option">
                            <input type="radio" name="language" value="bilingual" id="language-bilingual" checked>
                            🌍 Both English & Spanish
                            <span class="language-note">Child hears words in both English and Spanish</span>
                        </label>
                    </div>

                    <div class="language-group">
                        <h3 class="language-group-title">World Languages</h3>
                        <label class="language-option">
                            <input type="radio" name="language" value="zh" id="language-zh">
                            🇨🇳 Mandarin Chinese (中文)
                        </label>
                        <label class="language-option">
                            <input type="radio" name="language" value="hi" id="language-hi">
                            🇮🇳 Hindi (हिन्दी)
                        </label>
                        <label class="language-option">
                            <input type="radio" name="language" value="ar" id="language-ar">
                            🇸🇦 Arabic (العربية)
                        </label>
                        <label class="language-option">
                            <input type="radio" name="language" value="fr" id="language-fr">
                            🇫🇷 French (Français)
                        </label>
                        <label class="language-option">
                            <input type="radio" name="language" value="bn" id="language-bn">
                            🇧🇩 Bengali (বাংলা)
                        </label>
                        <label class="language-option">
                            <input type="radio" name="language" value="pt" id="language-pt">
                            🇵🇹 Portuguese (Português)
                        </label>
                        <label class="language-option">
                            <input type="radio" name="language" value="ru" id="language-ru">
                            🇷🇺 Russian (Русский)
                        </label>
                        <label class="language-option">
                            <input type="radio" name="language" value="id" id="language-id">
                            🇮🇩 Indonesian (Bahasa Indonesia)
                        </label>
                    </div>

                    <div class="language-group">
                        <h3 class="language-group-title">Fun Languages</h3>
                        <label class="language-option">
                            <input type="radio" name="language" value="tlh" id="language-tlh">
                            🖖 Klingon (tlhIngan Hol)
                            <span class="language-note">From Star Trek - logical language!</span>
                        </label>
                        <label class="language-option">
                            <input type="radio" name="language" value="jbo" id="language-jbo">
                            🤖 Lojban (la .lojban.)
                            <span class="language-note">Constructed logical language</span>
                        </label>
                        <label class="language-option">
                            <input type="radio" name="language" value="eo" id="language-eo">
                            🌟 Esperanto
                            <span class="language-note">International auxiliary language</span>
                        </label>
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
                </div>
                
                <div class="auto-cleanup-section">
                    <h3 class="subsection-title">🧹 Auto-Cleanup Timer</h3>
                    <p class="section-help">Objects that haven't been touched will automatically disappear with cute effects!</p>
                    
                    <div class="cleanup-controls">
                        <label class="advanced-option">
                            <input type="checkbox" id="auto-cleanup-enabled">
                            ⏰ Enable Auto-Cleanup
                            <span class="advanced-note">Objects disappear after not being touched for a while</span>
                        </label>
                        
                        <div class="cleanup-timer-control">
                            <label class="timer-label">
                                Objects disappear after: 
                                <input type="number" id="cleanup-timer-minutes" class="timer-input" min="0.5" max="10" step="0.5" value="2">
                                minutes of no interaction
                            </label>
                            <p class="timer-note">⭐ Each object gets its own timer that resets when touched, clicked, or voiced. When the timer expires, the object disappears with a fun pop sound and firework effects!</p>
                        </div>
                    </div>
                </div>
            </section>
        `;
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
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                overflow-y: auto;
                z-index: 1000;
                font-family: 'Arial', sans-serif;
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
                text-align: center;
                margin-bottom: 30px;
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
                background: rgba(255, 255, 255, 0.1);
                border-radius: 15px;
                padding: 25px;
                margin-bottom: 25px;
                backdrop-filter: blur(10px);
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

            .content-item, .emoji-item, .color-item {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 10px;
                padding: 15px;
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

            .content-examples, .emoji-examples, .color-examples {
                font-size: 0.85rem;
                opacity: 0.7;
                margin: 5px 0 0 0;
                font-style: italic;
            }

            .language-options {
                display: flex;
                flex-direction: column;
                gap: 25px;
            }

            .language-group {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 12px;
                padding: 20px;
                border-left: 4px solid #4CAF50;
            }

            .language-group-title {
                font-size: 1.2rem;
                font-weight: bold;
                margin: 0 0 15px 0;
                color: #4CAF50;
            }

            .language-option {
                display: flex;
                align-items: center;
                font-size: 1.1rem;
                cursor: pointer;
                padding: 10px;
                margin-bottom: 8px;
                border-radius: 8px;
                background: rgba(255, 255, 255, 0.1);
                transition: background-color 0.2s;
            }

            .language-option:hover {
                background: rgba(255, 255, 255, 0.15);
            }

            .language-option input {
                margin-right: 10px;
                transform: scale(1.2);
            }

            .language-note {
                display: block;
                font-size: 0.85rem;
                opacity: 0.7;
                margin-left: 25px;
                font-style: italic;
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
                text-align: center;
                margin-top: 30px;
            }

            .start-button {
                background: linear-gradient(45deg, #4CAF50, #45a049);
                color: white;
                border: none;
                padding: 20px 40px;
                font-size: 1.5rem;
                font-weight: bold;
                border-radius: 15px;
                cursor: pointer;
                margin-bottom: 20px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                transition: transform 0.2s, box-shadow 0.2s;
            }

            .start-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(0,0,0,0.3);
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

            /* Mobile responsiveness */
            @media (max-width: 768px) {
                .config-container {
                    padding: 15px;
                }

                .config-title {
                    font-size: 2rem;
                }

                .content-grid, .emoji-grid, .color-grid {
                    grid-template-columns: 1fr;
                }

                .config-actions {
                    flex-direction: column;
                    gap: 15px;
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

        // Reset defaults button
        const resetBtn = this.container.querySelector('#reset-defaults-btn');
        resetBtn.addEventListener('click', () => this.resetToDefaults());

        // Weight sliders - update display values
        const sliders = this.container.querySelectorAll('.weight-slider');
        sliders.forEach(slider => {
            slider.addEventListener('input', (e) => {
                const valueSpan = this.container.querySelector(`#${e.target.id}-value`);
                if (valueSpan) {
                    valueSpan.textContent = e.target.value;
                }
            });
        });

        // Number range inputs - validate and auto-adjust
        const rangeInputs = this.container.querySelectorAll('.range-input');
        rangeInputs.forEach(input => {
            input.addEventListener('change', () => this.validateNumberRanges());
        });

        // Cleanup timer validation
        const cleanupTimerInput = this.container.querySelector('#cleanup-timer-minutes');
        cleanupTimerInput.addEventListener('input', (e) => {
            let value = parseFloat(e.target.value);
            if (value < 0.5) {
                e.target.value = 0.5;
            } else if (value > 10) {
                e.target.value = 10;
            }
        });

        // Save configuration on any change
        const allInputs = this.container.querySelectorAll('input');
        allInputs.forEach(input => {
            input.addEventListener('change', () => this.saveCurrentConfig());
        });
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

        // Color categories
        Object.keys(config.colorCategories).forEach(category => {
            const kebabCase = category.replace(/([A-Z])/g, '-$1').toLowerCase();
            this.setCheckboxValue(`#${kebabCase}-colors-enabled`, config.colorCategories[category].enabled);
            this.setSliderValue(`#${kebabCase}-colors-weight`, config.colorCategories[category].weight);
        });

        // Language
        this.setRadioValue('language', config.language);

        // Advanced options
        this.setCheckboxValue('#cistercian-enabled', config.advanced.numberModes.cistercian);
        this.setCheckboxValue('#kaktovik-enabled', config.advanced.numberModes.kaktovik);
        this.setCheckboxValue('#binary-enabled', config.advanced.numberModes.binary);
        this.setCheckboxValue('#skip-config-checkbox', config.advanced.skipConfig);

        // Auto-cleanup configuration
        this.setCheckboxValue('#auto-cleanup-enabled', config.advanced.autoCleanup.enabled);
        this.setInputValue('#cleanup-timer-minutes', config.advanced.autoCleanup.timeoutMinutes);
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

    /**
     * Validate number ranges and auto-adjust if needed
     */
    validateNumberRanges() {
        const smallMin = parseInt(this.container.querySelector('#small-min').value);
        const smallMax = parseInt(this.container.querySelector('#small-max').value);
        const largeMin = parseInt(this.container.querySelector('#large-min').value);
        const largeMax = parseInt(this.container.querySelector('#large-max').value);

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
            colorCategories: {
                primary: {
                    enabled: this.container.querySelector('#primary-colors-enabled').checked,
                    weight: parseInt(this.container.querySelector('#primary-colors-weight').value)
                },
                secondary: {
                    enabled: this.container.querySelector('#secondary-colors-enabled').checked,
                    weight: parseInt(this.container.querySelector('#secondary-colors-weight').value)
                },
                neutral: {
                    enabled: this.container.querySelector('#neutral-colors-enabled').checked,
                    weight: parseInt(this.container.querySelector('#neutral-colors-weight').value)
                }
            },
            language: this.container.querySelector('input[name="language"]:checked').value,
            advanced: {
                skipConfig: this.container.querySelector('#skip-config-checkbox').checked,
                numberModes: {
                    cistercian: this.container.querySelector('#cistercian-enabled').checked,
                    kaktovik: this.container.querySelector('#kaktovik-enabled').checked,
                    binary: this.container.querySelector('#binary-enabled').checked
                },
                autoCleanup: {
                    enabled: this.container.querySelector('#auto-cleanup-enabled').checked,
                    timeoutMinutes: parseFloat(this.container.querySelector('#cleanup-timer-minutes').value)
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
        
        this.router.navigate('/toy');
    }

    /**
     * Reset to defaults
     */
    resetToDefaults() {
        if (confirm('Reset all settings to defaults? This will undo your current configuration.')) {
            this.configManager.resetToDefaults();
            this.loadCurrentConfig();
        }
    }

    /**
     * Show the configuration screen
     */
    show() {
        this.container.style.display = 'block';
        this.isVisible = true;
        this.loadCurrentConfig(); // Refresh from current config
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
}