/**
 * ObjectLifecycle - Spawning, announcing and removing scene objects.
 * State stays on the scene; calls go back through the scene so spies intercept.
 */
export class ObjectLifecycle {
    constructor(scene) {
        this.scene = scene;
    }

    async spawnObjectAt(x, y, type = 'random') {
        try {
            // Get spawn type based on configuration
            const spawnType = type === 'random' ? this.scene.selectSpawnType() : type;
            let selectedItem;
            let actualType = spawnType;

            // Get item based on type
            switch (spawnType) {
                case 'emoji':
                    selectedItem = await this.scene.getRandomEmoji();
                    break;
                case 'uppercaseLetters':
                case 'lowercaseLetters':
                    selectedItem = await this.scene.getRandomLetter(spawnType);
                    actualType = 'letter';
                    break;
                case 'smallNumbers':
                case 'largeNumbers':
                    selectedItem = await this.scene.getRandomNumber(spawnType);
                    actualType = 'number';
                    break;
                case 'shapes':
                    selectedItem = await this.scene.getRandomShape();
                    actualType = 'shape';
                    break;
                default:
                    selectedItem = await this.scene.getRandomEmoji();
                    actualType = 'emoji';
            }

            if (!selectedItem) {
                console.warn('No item selected for spawn');
                return null;
            }

            if (actualType === 'letter') {
                const letterColor = await this.scene.getRandomColor();
                selectedItem.color = letterColor;
            } else if (actualType === 'shape') {
                const allowedCategories = Array.isArray(selectedItem.colors) ? selectedItem.colors : null;
                const shapeColor = await this.scene.getRandomColor(allowedCategories);
                selectedItem.color = shapeColor;
            }

            selectedItem.type = actualType;

            const displayText = this.scene.renderManager.getDisplayText(selectedItem, actualType);
            const obj = this.scene.createPrimaryDisplayObject(actualType, selectedItem, displayText, x, y);

            if (!obj) {
                console.warn('Failed to create object for type:', actualType);
                return null;
            }

            // Store object data and metadata
            obj.itemData = selectedItem;
            obj.type = actualType;
            obj.id = `object_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            obj.lastTouchedTime = Date.now();

            // Add to objects array
            this.scene.objects.push(obj);

            // Render number modes FIRST if this is a number (to calculate layout offset)
            if (actualType === 'number') {
                this.scene.renderAllNumberModes(obj, selectedItem.value, x, y);
            }

            // Display text labels with dynamic vertical offset (for object counting layout)
            const verticalOffset = obj.componentLayout?.labelVerticalOffset || 0;
            this.scene.renderManager.displayTextLabels(obj, verticalOffset);

            // Keep the whole composite (glyph, labels, rows) inside the visible area
            this.scene.keepObjectInBounds(obj);

            // Track spawn time to prevent accidental immediate interaction
            this.scene.lastSpawnTime = Date.now();
            this.scene.awaitingSpawnInputRelease = true;

            // Save game state after spawning
            this.scene.saveGameState();

            return obj;

        } catch (error) {
            console.error('Error spawning object:', error);
            return null;
        }
    }

    /**
     * Spawn an object and announce it with speech, audio, and particle effects.
     * This helper consolidates the common pattern of spawning + announcing used across input handlers.
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {string} type - Spawn type (default: 'random')
     * @returns {Promise<Object|null>} The spawned object or null if spawn failed
     */
    async spawnAndAnnounce(x, y, type = 'random') {
        const obj = await this.scene.spawnObjectAt(x, y, type);
        if (obj) {
            // Use the (possibly clamped) final position for audio/particles
            this.scene.announceObject(obj, obj.x, obj.y);
        }
        return obj;
    }

    /**
     * Announce an already-spawned object with speech, audio, and particle effects.
     * Used after spawnObjectInGridCell or other specialized spawn methods.
     * @param {Object} obj - The spawned object
     * @param {number} x - X coordinate for audio/particles
     * @param {number} y - Y coordinate for audio/particles
     */
    announceObject(obj, x, y) {
        if (!obj) return;
        this.scene.speechManager.speakText(obj, 'both');
        this.scene.audioManager.generateContinuousTone(x, y, obj.id);
        this.scene.particleManager.createSpawnBurst(x, y);
    }

    removeObject(obj) {
        if (!obj) return;

        const gridCell = obj.gridCell; // Store before removal

        try {
            // Stop any audio tones
            if (this.scene.audioManager.hasTone(obj.id)) {
                this.scene.audioManager.stopTone(obj.id);
            }

            // Clean up particles
            this.scene.particleManager.cleanupParticles(obj.id);

            // Stop drag trails
            this.scene.particleManager.stopDragTrail(obj);

            // Clean up word sparkles
            this.scene.particleManager.cleanupWordSparkles(obj);

            // Remove from objects array
            const index = this.scene.objects.indexOf(obj);
            if (index !== -1) {
                this.scene.objects.splice(index, 1);
            }

            // Remove from grid occupied cells if in grid mode
            if (gridCell) {
                const cellKey = `${gridCell.row},${gridCell.col}`;
                this.scene.gridMode.occupiedCells.delete(cellKey);
            }

            // Clean up component layout objects
            if (obj.componentLayout) {
                // Clean up number mode components
                if (obj.componentLayout.numberModes) {
                    obj.componentLayout.numberModes.forEach(comp => {
                        if (comp.object && comp.object.destroy) {
                            comp.object.destroy();
                        }
                    });
                }

                // Clean up word objects
                if (obj.allLanguageWords) {
                    obj.allLanguageWords.forEach(langGroup => {
                        if (langGroup.words) {
                            langGroup.words.forEach(wordObj => {
                                if (wordObj && wordObj.destroy) {
                                    wordObj.destroy();
                                }
                            });
                        }
                    });
                }
            }

            // Destroy main object
            if (obj.destroy) {
                obj.destroy();
            }

        } catch (error) {
            console.warn('Error removing object:', error);
        }

        // Save game state after removing object
        this.scene.saveGameState();
    }
}
