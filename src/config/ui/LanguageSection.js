/**
 * LanguageSection - Language Selection Section with Drag-and-Drop
 *
 * Manages language selection with dual-column interface (enabled/available) supporting:
 * - Drag-and-drop reordering within columns
 * - Drag-and-drop movement between columns
 * - Tap/click to toggle languages between columns
 * - Visual drop indicators and feedback
 * - Touch and mouse input support
 *
 * Complex drag-and-drop state machine:
 * - Distinguishes between tap (toggle) and drag (reorder/move)
 * - Handles reordering within same column vs moving between columns
 * - Provides visual feedback with drop indicators and column highlighting
 */

import { getLanguageFlag, getDifficultyLevel, getDifficultyText, getDefaultRank } from '../../utils/languageUtils.js';

export class LanguageSection {
    constructor(container, configManager) {
        this.container = container;
        this.configManager = configManager;
    }

    /**
     * Render the language section HTML
     * @returns {string} HTML string for the section
     */
    render() {
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
     * @param {Object} language - Language object with code, name, nativeName
     * @param {number|null} priority - Priority number for enabled languages (1 = primary)
     * @returns {HTMLElement} Language element div
     */
    createLanguageElement(language, priority = null) {
        const element = document.createElement('div');
        element.className = 'language-item';
        element.dataset.languageCode = language.code;

        // Get flag emoji for language
        const flagEmoji = getLanguageFlag(language.code);

        // Ensure language has difficulty data
        const rank = language.difficultyRank || getDefaultRank(language.code);

        const difficultyLevel = getDifficultyLevel(rank);
        const difficultyText = getDifficultyText(difficultyLevel);

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
     * @param {HTMLElement} item - Language item element to make draggable
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
     * @param {string} languageCode - Language code to toggle
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
     * @param {number} clientX - Mouse X coordinate
     * @param {number} clientY - Mouse Y coordinate
     * @param {string} draggedCode - Language code being dragged
     * @returns {Object|null} Drop target object or null
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
     * @param {Object|null} dropTarget - Drop target object from findDropTarget()
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
     * @param {string} languageCode - Language code being dropped
     * @param {Object} dropTarget - Drop target object
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
     * @param {string} languageCode - Language code to reorder
     * @param {string} column - Column ('enabled' or 'available')
     * @param {number} insertIndex - Index to insert at
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
     * @param {string} languageCode - Language code to move
     * @param {string} targetColumn - Target column ('enabled' or 'available')
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
}
