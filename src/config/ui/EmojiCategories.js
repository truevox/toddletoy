/**
 * EmojiCategories - Emoji Category Selection Section
 *
 * Manages emoji category checkboxes with master toggle synchronization.
 * Categories: Animals, Food, Vehicles, Faces, Nature, Objects
 *
 * Features master checkbox logic with indeterminate state:
 * - All categories checked → master checked
 * - No categories checked → master unchecked
 * - Some categories checked → master indeterminate
 */

export class EmojiCategories {
    constructor(container) {
        this.container = container;
    }

    /**
     * Render the emoji categories section HTML
     * @returns {string} HTML string for the section
     */
    render() {
        return `
            <section class="config-section emoji-categories-section">
                <h2 class="section-title" data-help-anchor="emoji-categories">What kinds of emojis?</h2>
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
     * Attach event listeners for this section
     * @param {Function} onConfigChange - Callback when configuration changes
     * @param {Function} onMasterToggle - Callback when master emoji checkbox changes
     */
    attachEventListeners(onConfigChange, onMasterToggle) {
        // Weight sliders: update display and trigger config save
        const categories = ['animals', 'food', 'vehicles', 'faces', 'nature', 'objects'];
        categories.forEach(category => {
            const slider = this.container.querySelector(`#${category}-weight`);
            const valueDisplay = this.container.querySelector(`#${category}-weight-value`);
            if (slider && valueDisplay) {
                slider.addEventListener('input', () => {
                    valueDisplay.textContent = slider.value;
                    onConfigChange();
                });
            }
        });

        // Category checkboxes: trigger master checkbox update and config save
        const categoryCheckboxes = this.container.querySelectorAll('#animals-enabled, #food-enabled, #vehicles-enabled, #faces-enabled, #nature-enabled, #objects-enabled');
        categoryCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateMasterCheckboxState();
                onConfigChange();
            });
        });

        // Initialize master checkbox state
        this.updateMasterCheckboxState();

        // Note: Master emoji checkbox listener is attached by ContentTypes module
        // which calls onMasterToggle when the master checkbox changes
    }

    /**
     * Handle master emoji checkbox toggle from ContentTypes section
     * @param {boolean} isChecked - Whether master checkbox is checked
     */
    handleMasterToggle(isChecked) {
        const categoryCheckboxes = this.container.querySelectorAll('#animals-enabled, #food-enabled, #vehicles-enabled, #faces-enabled, #nature-enabled, #objects-enabled');

        // Update all category checkboxes
        categoryCheckboxes.forEach(checkbox => {
            checkbox.checked = isChecked;
        });

        // Update visual styling
        this.updateVisualState(isChecked);
    }

    /**
     * Update the master emoji checkbox state based on category checkbox states
     * This is called when individual category checkboxes change
     */
    updateMasterCheckboxState() {
        const masterCheckbox = this.container.querySelector('#emojis-enabled');
        const categoryCheckboxes = this.container.querySelectorAll('#animals-enabled, #food-enabled, #vehicles-enabled, #faces-enabled, #nature-enabled, #objects-enabled');

        if (masterCheckbox && categoryCheckboxes.length > 0) {
            const checkedCount = Array.from(categoryCheckboxes).filter(cb => cb.checked).length;
            const totalCount = categoryCheckboxes.length;

            if (checkedCount === 0) {
                // None selected - unchecked
                masterCheckbox.checked = false;
                masterCheckbox.indeterminate = false;
                this.updateVisualState(false);
            } else if (checkedCount === totalCount) {
                // All selected - checked
                masterCheckbox.checked = true;
                masterCheckbox.indeterminate = false;
                this.updateVisualState(true);
            } else {
                // Partial selection - indeterminate (half-ticked gray)
                masterCheckbox.checked = false;
                masterCheckbox.indeterminate = true;
                this.updateVisualState(true); // Categories are still usable
            }
        }
    }

    /**
     * Update visual styling of emoji categories section based on master toggle state
     * @param {boolean} isEnabled - Whether emoji categories are enabled
     */
    updateVisualState(isEnabled) {
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
     * Load configuration into UI elements
     * @param {Object} config - Configuration object
     */
    loadConfig(config) {
        // Load category checkboxes
        const categories = ['animals', 'food', 'vehicles', 'faces', 'nature', 'objects'];
        categories.forEach(category => {
            const checkbox = this.container.querySelector(`#${category}-enabled`);
            if (checkbox && config.emojiCategories && typeof config.emojiCategories[category] === 'boolean') {
                checkbox.checked = config.emojiCategories[category];
            }
        });

        // Load weight sliders
        categories.forEach(category => {
            const slider = this.container.querySelector(`#${category}-weight`);
            const valueDisplay = this.container.querySelector(`#${category}-weight-value`);
            if (slider && config.emojiCategories && typeof config.emojiCategories[`${category}Weight`] === 'number') {
                slider.value = config.emojiCategories[`${category}Weight`];
                if (valueDisplay) {
                    valueDisplay.textContent = slider.value;
                }
            }
        });

        // Update master checkbox state after loading
        this.updateMasterCheckboxState();
    }

    /**
     * Get configuration data from UI elements
     * @returns {Object} Emoji categories configuration object
     */
    getConfigData() {
        return {
            animals: this.container.querySelector('#animals-enabled')?.checked ?? false,
            food: this.container.querySelector('#food-enabled')?.checked ?? false,
            vehicles: this.container.querySelector('#vehicles-enabled')?.checked ?? false,
            faces: this.container.querySelector('#faces-enabled')?.checked ?? false,
            nature: this.container.querySelector('#nature-enabled')?.checked ?? false,
            objects: this.container.querySelector('#objects-enabled')?.checked ?? false,
            animalsWeight: parseInt(this.container.querySelector('#animals-weight')?.value ?? 40),
            foodWeight: parseInt(this.container.querySelector('#food-weight')?.value ?? 30),
            vehiclesWeight: parseInt(this.container.querySelector('#vehicles-weight')?.value ?? 15),
            facesWeight: parseInt(this.container.querySelector('#faces-weight')?.value ?? 10),
            natureWeight: parseInt(this.container.querySelector('#nature-weight')?.value ?? 3),
            objectsWeight: parseInt(this.container.querySelector('#objects-weight')?.value ?? 2)
        };
    }
}
