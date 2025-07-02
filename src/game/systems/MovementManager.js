/**
 * MovementManager - Handles smooth object movement and positioning
 * Extracted from GameScene to follow "wide and shallow" principle
 */
export class MovementManager {
    constructor(scene) {
        this.scene = scene;
        
        // Initialize smooth movement state
        this.movingObjects = new Map(); // Objects currently lerping to target positions
        this.lerpSpeed = 0.15; // Lerp interpolation speed (0.1 = slow, 0.3 = fast)
        
        console.log('MovementManager initialized');
    }

    /**
     * Linear interpolation between two values
     * @param {number} start - Starting value
     * @param {number} end - Ending value
     * @param {number} progress - Progress from 0 to 1
     * @returns {number} Interpolated value
     */
    lerp(start, end, progress) {
        return start + (end - start) * progress;
    }

    /**
     * Set object position and update all component positions
     * @param {Object} obj - Phaser game object
     * @param {number} x - Target X position
     * @param {number} y - Target Y position
     */
    setObjectPosition(obj, x, y) {
        if (!obj || !obj.active) return;
        
        // Set object position
        obj.setPosition(x, y);
        
        // Update all component positions using stored relative offsets
        if (obj.componentLayout) {
            // Update all language words using stored layout
            if (obj.componentLayout.allLanguageWords) {
                obj.componentLayout.allLanguageWords.forEach(langGroup => {
                    const actualWords = obj.allLanguageWords?.find(actual => 
                        actual.languageCode === langGroup.languageCode
                    )?.words || [];
                    
                    langGroup.words.forEach((layoutInfo, index) => {
                        const wordObj = actualWords[index];
                        if (wordObj && wordObj.active) {
                            // Use stored offset to maintain relative positioning
                            const newWordX = x + layoutInfo.offsetX - (wordObj.width / 2);
                            const newWordY = y + layoutInfo.offsetY;
                            wordObj.setPosition(newWordX, newWordY);
                        }
                    });
                });
            }

            // Update legacy component layout for backward compatibility
            if (obj.componentLayout.englishWords) {
                obj.englishWords?.forEach((wordObj, index) => {
                    if (wordObj && wordObj.active && obj.componentLayout.englishWords[index]) {
                        const layoutInfo = obj.componentLayout.englishWords[index];
                        const newWordX = x + layoutInfo.offsetX - (wordObj.width / 2);
                        const newWordY = y + layoutInfo.offsetY;
                        wordObj.setPosition(newWordX, newWordY);
                    }
                });
            }

            if (obj.componentLayout.spanishWords) {
                obj.spanishWords?.forEach((wordObj, index) => {
                    if (wordObj && wordObj.active && obj.componentLayout.spanishWords[index]) {
                        const layoutInfo = obj.componentLayout.spanishWords[index];
                        const newWordX = x + layoutInfo.offsetX - (wordObj.width / 2);
                        const newWordY = y + layoutInfo.offsetY;
                        wordObj.setPosition(newWordX, newWordY);
                    }
                });
            }

            // Update number mode components
            if (obj.componentLayout.numberModes) {
                obj.componentLayout.numberModes.forEach(component => {
                    if (component.object && component.object.active) {
                        component.object.setPosition(x + component.offsetX, y + component.offsetY);
                    }
                });
            }
        }
    }

    /**
     * Move object to target position with optional smooth animation
     * @param {Object} obj - Phaser game object to move
     * @param {number} targetX - Target X position
     * @param {number} targetY - Target Y position
     * @param {boolean} useSmooth - Whether to use smooth movement (default: true)
     */
    moveObjectTo(obj, targetX, targetY, useSmooth = true) {
        if (!obj || !obj.active) return;

        if (useSmooth) {
            // Store current position as start point for interpolation
            const startX = obj.x;
            const startY = obj.y;

            // Add to smooth movement queue
            this.movingObjects.set(obj.id, {
                object: obj,
                targetX: targetX,
                targetY: targetY,
                startX: startX,
                startY: startY,
                progress: 0
            });
        } else {
            // Immediate positioning (original functionality)
            this.setObjectPosition(obj, targetX, targetY);
        }
    }

    /**
     * Update all moving objects (called each frame)
     */
    updateObjectMovements() {
        for (const [objId, movement] of this.movingObjects.entries()) {
            const { object, targetX, targetY, startX, startY } = movement;
            
            if (!object.active) {
                this.movingObjects.delete(objId);
                continue;
            }
            
            movement.progress += this.lerpSpeed;
            
            if (movement.progress >= 1) {
                // Movement complete
                this.setObjectPosition(object, targetX, targetY);
                this.movingObjects.delete(objId);
            } else {
                // Interpolate position
                const currentX = this.lerp(startX, targetX, movement.progress);
                const currentY = this.lerp(startY, targetY, movement.progress);
                this.setObjectPosition(object, currentX, currentY);
            }
        }
    }

    /**
     * Check if an object is currently moving
     * @param {string} objId - Object ID
     * @returns {boolean} True if object is moving
     */
    hasMovingObject(objId) {
        return this.movingObjects.has(objId);
    }

    /**
     * Get movement information for an object
     * @param {string} objId - Object ID
     * @returns {Object|null} Movement info or null if not moving
     */
    getMovementInfo(objId) {
        return this.movingObjects.get(objId) || null;
    }

    /**
     * Clear all movement animations
     */
    clearAllMovements() {
        this.movingObjects.clear();
    }

    /**
     * Get count of currently moving objects
     * @returns {number} Number of moving objects
     */
    getMovementCount() {
        return this.movingObjects.size;
    }

    /**
     * Set lerp speed for movement animations
     * @param {number} speed - Lerp speed (0.1 = slow, 0.3 = fast)
     */
    setLerpSpeed(speed) {
        this.lerpSpeed = Math.max(0.01, Math.min(1, speed)); // Clamp between 0.01 and 1
    }

    /**
     * Get current lerp speed
     * @returns {number} Current lerp speed
     */
    getLerpSpeed() {
        return this.lerpSpeed;
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.clearAllMovements();
        console.log('MovementManager destroyed');
    }
}