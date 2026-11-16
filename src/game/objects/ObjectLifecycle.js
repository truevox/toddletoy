/**
 * ObjectLifecycle - Spawning, announcing and removing scene objects.
 * State stays on the scene; calls go back through the scene so spies intercept.
 */
import { fitCompositeToView } from '../systems/CompositeFit.js';

/** Colour (0xRRGGBB) and kind for the spawn burst; colour only when the object has one. */
function burstOptions(obj) {
    const opts = { kind: obj.type };
    const hex = obj.itemData && obj.itemData.color && obj.itemData.color.hex;
    const n = typeof hex === 'string' ? parseInt(hex.replace('#', ''), 16) : NaN;
    if (Number.isFinite(n)) opts.color = n;
    return opts;
}

export class ObjectLifecycle {
    constructor(scene) {
        this.scene = scene;
    }

    /** @param {Object|null} [item] - a specific item (a chosen letter or number) instead of a random one of `type` */
    async spawnObjectAt(x, y, type = 'random', item = null) {
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
                    selectedItem = item ? { ...item } : await this.scene.getRandomLetter(spawnType);
                    actualType = 'letter';
                    break;
                case 'smallNumbers':
                case 'largeNumbers':
                    selectedItem = item ? { ...item } : await this.scene.getRandomNumber(spawnType);
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

            // Shrink an oversized composite to the screen, then keep it inside the visible area
            fitCompositeToView(this.scene, obj);
            this.scene.keepObjectInBounds(obj);

            // Pop in (first applied on the next tick, after any cell fitting)
            if (this.scene.objectMotion) this.scene.objectMotion.popIn(obj);

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
    async spawnAndAnnounce(x, y, type = 'random', item = null) {
        const obj = await this.scene.spawnObjectAt(x, y, type, item);
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
        this.scene.audioManager.playSpawn(obj, x, y);
        this.scene.particleManager.createSpawnBurst(x, y, burstOptions(obj));
    }

    removeObject(obj) {
        if (!obj) return;

        const gridCell = obj.gridCell; // Store before removal

        try {
            // Cute pop (also cuts off anything still ringing for this object)
            this.scene.audioManager.playPop(obj);

            // Clean up particles
            this.scene.particleManager.cleanupParticles(obj.id);

            // Stop drag trails, and let go of it if a finger was holding it
            this.scene.particleManager.stopDragTrail(obj);
            if (this.scene.pointerRegistry) this.scene.pointerRegistry.dropObject(obj);

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

            // Stop any queued smooth move (a removed object must not be nudged again)
            if (this.scene.movementManager && this.scene.movementManager.clearMovement) {
                this.scene.movementManager.clearMovement(obj.id);
            }

            // Pop out: hand the display objects to a short-lived ghost that destroys them
            if (this.scene.objectMotion && this.scene.objectMotion.releaseToGhost(obj)) {
                // destroyed by the ghost when its animation ends
            } else {
                this.destroyDisplayObjects(obj);
            }

        } catch (error) {
            console.warn('Error removing object:', error);
        }

        // Save game state after removing object
        this.scene.saveGameState();
    }

    /** Immediate destruction of a removed object's glyph, captions and number rows. */
    destroyDisplayObjects(obj) {
        if (obj.componentLayout) {
            if (obj.componentLayout.numberModes) {
                obj.componentLayout.numberModes.forEach(comp => {
                    if (comp.object && comp.object.destroy) comp.object.destroy();
                });
            }
            if (obj.allLanguageWords) {
                obj.allLanguageWords.forEach(langGroup => {
                    if (langGroup.words) {
                        langGroup.words.forEach(wordObj => {
                            if (wordObj && wordObj.destroy) wordObj.destroy();
                        });
                    }
                });
            }
        }
        if (obj.destroy) obj.destroy();
    }
}
