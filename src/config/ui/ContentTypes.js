/**
 * ContentTypes - Content Type Selection Section
 *
 * Manages checkboxes, weight sliders, and number ranges for all content types:
 * - Shapes
 * - Small Numbers
 * - Large Numbers
 * - Uppercase Letters
 * - Lowercase Letters
 * - Emojis
 */

export class ContentTypes {
    constructor(container) {
        this.container = container;
    }

    /**
     * Render the content types section HTML
     * @returns {string} HTML string for the section
     */
    render() {
        return `
            <section class="config-section">
                <h2 class="section-title" data-help-anchor="content-types">What should appear in the toy?</h2>
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
     * Attach event listeners for this section
     * @param {Function} onConfigChange - Callback when configuration changes
     * @param {Function} onEmojiToggle - Callback when emoji checkbox changes (for emoji categories section)
     */
    attachEventListeners(onConfigChange, onEmojiToggle) {
        // Weight sliders: update display and trigger config save
        const weightSliders = ['shapes', 'small-numbers', 'large-numbers', 'uppercase', 'lowercase', 'emojis'];
        weightSliders.forEach(type => {
            const slider = this.container.querySelector(`#${type}-weight`);
            const valueDisplay = this.container.querySelector(`#${type}-weight-value`);
            if (slider && valueDisplay) {
                slider.addEventListener('input', () => {
                    valueDisplay.textContent = slider.value;
                    onConfigChange();
                });
            }
        });

        // Checkboxes: trigger config save
        const checkboxes = ['shapes', 'small-numbers', 'large-numbers', 'uppercase', 'lowercase', 'emojis'];
        checkboxes.forEach(type => {
            const checkbox = this.container.querySelector(`#${type}-enabled`);
            if (checkbox) {
                checkbox.addEventListener('change', () => {
                    // Special handling for emoji checkbox
                    if (type === 'emojis' && onEmojiToggle) {
                        onEmojiToggle(checkbox.checked);
                    }
                    onConfigChange();
                });
            }
        });

        // Number range inputs: validate and trigger config save
        const rangeInputs = ['small-min', 'small-max', 'large-min', 'large-max'];
        rangeInputs.forEach(id => {
            const input = this.container.querySelector(`#${id}`);
            if (input) {
                input.addEventListener('change', () => {
                    this.validateNumberRanges();
                    onConfigChange();
                });
            }
        });
    }

    /**
     * Validate and auto-adjust number ranges to prevent overlap
     */
    validateNumberRanges() {
        const smallMin = this.container.querySelector('#small-min');
        const smallMax = this.container.querySelector('#small-max');
        const largeMin = this.container.querySelector('#large-min');
        const largeMax = this.container.querySelector('#large-max');

        if (!smallMin || !smallMax || !largeMin || !largeMax) return;

        // Ensure small-max >= small-min
        if (parseInt(smallMax.value) < parseInt(smallMin.value)) {
            smallMax.value = smallMin.value;
        }

        // Ensure large-min > small-max (no overlap)
        if (parseInt(largeMin.value) <= parseInt(smallMax.value)) {
            largeMin.value = parseInt(smallMax.value) + 1;
        }

        // Ensure large-max >= large-min
        if (parseInt(largeMax.value) < parseInt(largeMin.value)) {
            largeMax.value = largeMin.value;
        }
    }

    /**
     * Load configuration into UI elements
     * @param {Object} config - Configuration object
     */
    loadConfig(config) {
        // Load checkboxes
        const contentTypes = ['shapes', 'small-numbers', 'large-numbers', 'uppercase', 'lowercase', 'emojis'];
        contentTypes.forEach(type => {
            const checkbox = this.container.querySelector(`#${type}-enabled`);
            if (checkbox && config.content && typeof config.content[type] === 'boolean') {
                checkbox.checked = config.content[type];
            }
        });

        // Load weight sliders
        contentTypes.forEach(type => {
            const slider = this.container.querySelector(`#${type}-weight`);
            const valueDisplay = this.container.querySelector(`#${type}-weight-value`);
            if (slider && config.content && typeof config.content[`${type}Weight`] === 'number') {
                slider.value = config.content[`${type}Weight`];
                if (valueDisplay) {
                    valueDisplay.textContent = slider.value;
                }
            }
        });

        // Load number ranges
        const ranges = {
            'small-min': config.content?.smallNumberMin,
            'small-max': config.content?.smallNumberMax,
            'large-min': config.content?.largeNumberMin,
            'large-max': config.content?.largeNumberMax
        };

        Object.entries(ranges).forEach(([id, value]) => {
            const input = this.container.querySelector(`#${id}`);
            if (input && typeof value === 'number') {
                input.value = value;
            }
        });
    }

    /**
     * Get configuration data from UI elements
     * @returns {Object} Content configuration object
     */
    getConfigData() {
        return {
            shapes: this.container.querySelector('#shapes-enabled')?.checked ?? false,
            'small-numbers': this.container.querySelector('#small-numbers-enabled')?.checked ?? false,
            'large-numbers': this.container.querySelector('#large-numbers-enabled')?.checked ?? false,
            uppercase: this.container.querySelector('#uppercase-enabled')?.checked ?? false,
            lowercase: this.container.querySelector('#lowercase-enabled')?.checked ?? false,
            emojis: this.container.querySelector('#emojis-enabled')?.checked ?? false,
            shapesWeight: parseInt(this.container.querySelector('#shapes-weight')?.value ?? 25),
            'small-numbersWeight': parseInt(this.container.querySelector('#small-numbers-weight')?.value ?? 30),
            'large-numbersWeight': parseInt(this.container.querySelector('#large-numbers-weight')?.value ?? 10),
            uppercaseWeight: parseInt(this.container.querySelector('#uppercase-weight')?.value ?? 25),
            lowercaseWeight: parseInt(this.container.querySelector('#lowercase-weight')?.value ?? 15),
            emojisWeight: parseInt(this.container.querySelector('#emojis-weight')?.value ?? 20),
            smallNumberMin: parseInt(this.container.querySelector('#small-min')?.value ?? 0),
            smallNumberMax: parseInt(this.container.querySelector('#small-max')?.value ?? 20),
            largeNumberMin: parseInt(this.container.querySelector('#large-min')?.value ?? 21),
            largeNumberMax: parseInt(this.container.querySelector('#large-max')?.value ?? 9999)
        };
    }
}
