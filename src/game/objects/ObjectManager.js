/**
 * ObjectManager - Manages the lifecycle and state of all game objects
 * Handles object creation, tracking, positioning, and cleanup
 */
export class ObjectManager {
    constructor(scene) {
        this.scene = scene;
        this.objects = [];
        this.movingObjects = new Map(); // Objects currently lerping to target positions
        this.lerpSpeed = 0.15; // Lerp interpolation speed (0.1 = slow, 0.3 = fast)
        
        // Auto-cleanup timer management
        this.autoCleanupEnabled = false;
        this.cleanupInterval = null;
        this.defaultObjectLifetime = 60000; // 60 seconds default
        
        this.initializeAutoCleanup();
    }

    initializeAutoCleanup() {
        // Check config for auto-cleanup settings
        const config = this.scene.configManager ? this.scene.configManager.getConfig() : null;
        this.autoCleanupEnabled = config?.autoCleanup?.enabled || false;
        this.defaultObjectLifetime = (config?.autoCleanup?.timeoutSeconds || 60) * 1000;
        
        if (this.autoCleanupEnabled) {
            this.startAutoCleanupTimer();
        }
    }

    startAutoCleanupTimer() {
        // Run cleanup check every 5 seconds
        this.cleanupInterval = setInterval(() => {
            this.checkForStaleObjects();
        }, 5000);
    }

    stopAutoCleanupTimer() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }

    checkForStaleObjects() {
        const now = Date.now();
        const objectsToRemove = [];

        this.objects.forEach(obj => {
            if (obj.lastTouchedTime) {
                const timeSinceTouch = now - obj.lastTouchedTime;
                if (timeSinceTouch > this.defaultObjectLifetime) {
                    // Don't remove objects that are currently speaking
                    if (!this.scene.speechManager || !this.scene.speechManager.isObjectSpeaking(obj)) {
                        objectsToRemove.push(obj);
                    }
                }
            }
        });

        // Remove stale objects with cute effects
        objectsToRemove.forEach(obj => {
            this.removeObjectWithEffects(obj);
        });
    }

    addObject(obj) {
        if (!obj.id) {
            obj.id = this.generateObjectId();
        }
        
        // Set initial touch time for auto-cleanup
        obj.lastTouchedTime = Date.now();
        
        this.objects.push(obj);
        return obj;
    }

    removeObject(obj) {
        const index = this.objects.indexOf(obj);
        if (index > -1) {
            this.objects.splice(index, 1);
        }

        // Clean up all components
        this.cleanupObjectComponents(obj);
        
        // Remove from moving objects if it was lerping
        if (this.movingObjects.has(obj.id)) {
            this.movingObjects.delete(obj.id);
        }
        
        // Stop any audio tones for this object
        if (this.scene.audioManager) {
            this.scene.audioManager.stopTone(obj.id);
        }

        // Clean up drag trails
        if (this.scene.dragTrailManager) {
            this.scene.dragTrailManager.cleanupTrail(obj.id);
        }
    }

    removeObjectWithEffects(obj) {
        // Create celebration particle effect
        if (this.scene.particleManager) {
            this.scene.particleManager.createCelebrationEffect(obj.x, obj.y, obj.id);
        }

        // Play cute despawn sound effect
        this.playDespawnSound();

        // Fade out the object before removing
        this.scene.tweens.add({
            targets: [obj, ...(obj.englishWords || []), ...(obj.spanishWords || [])],
            alpha: 0,
            duration: 500,
            onComplete: () => {
                this.removeObject(obj);
            }
        });
    }

    playDespawnSound() {
        // Create a quick "pop" sound using Web Audio API
        if (this.scene.audioManager && this.scene.audioManager.audioContext) {
            try {
                const oscillator = this.scene.audioManager.audioContext.createOscillator();
                const gainNode = this.scene.audioManager.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.scene.audioManager.audioContext.destination);
                
                oscillator.frequency.value = 800; // High frequency for "pop"
                oscillator.type = 'sine';
                
                gainNode.gain.setValueAtTime(0.1, this.scene.audioManager.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, this.scene.audioManager.audioContext.currentTime + 0.1);
                
                oscillator.start();
                oscillator.stop(this.scene.audioManager.audioContext.currentTime + 0.1);
            } catch (error) {
                console.warn('Could not play despawn sound:', error);
            }
        }
    }

    cleanupObjectComponents(obj) {
        // Clean up main object
        if (obj.destroy) {
            obj.destroy();
        }

        // Clean up text components
        if (obj.englishWords) {
            obj.englishWords.forEach(word => {
                if (word.destroy) word.destroy();
            });
        }
        if (obj.spanishWords) {
            obj.spanishWords.forEach(word => {
                if (word.destroy) word.destroy();
            });
        }
        if (obj.allLanguageWords) {
            obj.allLanguageWords.forEach(langGroup => {
                if (langGroup.words) {
                    langGroup.words.forEach(word => {
                        if (word.destroy) word.destroy();
                    });
                }
            });
        }

        // Clean up numeral components
        if (obj.kaktovikNumeral && obj.kaktovikNumeral.destroy) {
            obj.kaktovikNumeral.destroy();
        }
        if (obj.binaryHearts && obj.binaryHearts.destroy) {
            obj.binaryHearts.destroy();
        }
        if (obj.cistercianNumeral && obj.cistercianNumeral.destroy) {
            obj.cistercianNumeral.destroy();
        }

        // Clean up legacy labels
        if (obj.englishLabel && obj.englishLabel.destroy) {
            obj.englishLabel.destroy();
        }
        if (obj.spanishLabel && obj.spanishLabel.destroy) {
            obj.spanishLabel.destroy();
        }
    }

    getObjectAtPosition(x, y) {
        // Use positioning system if available for more accurate collision detection
        if (this.scene.positioningSystem) {
            return this.scene.positioningSystem.getObjectAtPosition(x, y);
        }

        // Fallback to simple distance-based detection
        const tolerance = 50;
        return this.objects.find(obj => {
            const distance = Math.sqrt(Math.pow(obj.x - x, 2) + Math.pow(obj.y - y, 2));
            return distance <= tolerance;
        });
    }

    updateObjectTouchTime(obj) {
        if (obj) {
            obj.lastTouchedTime = Date.now();
        }
    }

    setObjectPosition(obj, targetX, targetY) {
        if (!obj) return;

        // Update main object position
        obj.setPosition(targetX, targetY);

        // Update component positions using stored layout
        if (obj.componentLayout) {
            obj.componentLayout.forEach(component => {
                if (component.object && component.object.active) {
                    const newX = targetX + component.offsetX;
                    const newY = targetY + component.offsetY;
                    component.object.setPosition(newX, newY);
                }
            });
        } else {
            // FALLBACK: Use old hardcoded method for backward compatibility
            if (obj.englishWords && obj.englishWords.length > 0) {
                this.repositionWordObjects(obj.englishWords, targetX, targetY + 60);
            }
            if (obj.spanishWords && obj.spanishWords.length > 0) {
                this.repositionWordObjects(obj.spanishWords, targetX, targetY + 90);
            }
            
            if (obj.kaktovikNumeral) {
                obj.kaktovikNumeral.setPosition(targetX, targetY - 64);
            }
            if (obj.binaryHearts) {
                obj.binaryHearts.setPosition(targetX, targetY - 30);
            }
            if (obj.cistercianNumeral) {
                obj.cistercianNumeral.setPosition(targetX, targetY - 100);
            }
        }

        // Update legacy label positions (for backward compatibility)
        // DISABLED: Skip legacy positioning when componentLayout exists to prevent conflicts
        if (!obj.componentLayout) {
            if (obj.englishLabel) {
                obj.englishLabel.setPosition(targetX, targetY + 60);
            }
            if (obj.spanishLabel) {
                obj.spanishLabel.setPosition(targetX, targetY + 90);
            }
        }
    }

    repositionWordObjects(wordObjects, centerX, y) {
        if (!wordObjects || wordObjects.length === 0) return;
        
        // Always recalculate spacing from scratch to ensure proper positioning
        const layoutInfo = wordObjects._layoutInfo;
        const spaceWidth = layoutInfo?.spaceWidth || 8;
        let totalWidth = 0;
        
        // Calculate total width needed
        wordObjects.forEach((wordObj, index) => {
            totalWidth += wordObj.width;
            if (index < wordObjects.length - 1) {
                totalWidth += spaceWidth;
            }
        });
        
        // Position words starting from the left edge of the centered group
        let currentX = centerX - (totalWidth / 2);
        
        wordObjects.forEach((wordObj, index) => {
            wordObj.setPosition(currentX, y);
            currentX += wordObj.width + (index < wordObjects.length - 1 ? spaceWidth : 0);
        });
    }

    moveObjectTo(obj, targetX, targetY, useSmoothing = true) {
        if (!obj) return;

        if (useSmoothing) {
            // Start smooth movement
            this.movingObjects.set(obj.id, {
                object: obj,
                startX: obj.x,
                startY: obj.y,
                targetX: targetX,
                targetY: targetY,
                progress: 0
            });
        } else {
            // Immediate movement
            this.setObjectPosition(obj, targetX, targetY);
        }
    }

    update() {
        this.updateObjectMovements();
    }

    updateObjectMovements() {
        // Update all objects that are currently lerping
        for (const [objId, movement] of this.movingObjects) {
            movement.progress += this.lerpSpeed;
            
            if (movement.progress >= 1) {
                // Movement complete
                this.setObjectPosition(movement.object, movement.targetX, movement.targetY);
                this.movingObjects.delete(objId);
            } else {
                // Interpolate position
                const currentX = this.lerp(movement.startX, movement.targetX, movement.progress);
                const currentY = this.lerp(movement.startY, movement.targetY, movement.progress);
                this.setObjectPosition(movement.object, currentX, currentY);
            }
        }
    }

    lerp(start, end, progress) {
        return start + (end - start) * progress;
    }

    generateObjectId() {
        return 'obj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getObjectCount() {
        return this.objects.length;
    }

    getAllObjects() {
        return [...this.objects]; // Return copy to prevent external modification
    }

    clearAllObjects() {
        // Remove all objects with cleanup
        while (this.objects.length > 0) {
            this.removeObject(this.objects[0]);
        }
    }

    destroy() {
        this.stopAutoCleanupTimer();
        this.clearAllObjects();
        this.movingObjects.clear();
    }
}