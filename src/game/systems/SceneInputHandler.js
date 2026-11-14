/**
 * SceneInputHandler - Reacts to InputManager events (pointer, keyboard, gamepad) and drives dragging.
 * State stays on the scene; calls go back through the scene so spies intercept.
 */
export class SceneInputHandler {
    constructor(scene) {
        this.scene = scene;
    }

    // Input event handlers
    async onInputPointerDown(data) {
        console.log('🎯 onInputPointerDown called with data:', data);
        const { x, y } = data;

        // Warn if system not fully initialized (race condition debugging)
        if (!this.scene.isFullyInitialized) {
            console.warn('⚠️ Input received before full initialization (data:', this.scene.dataLoaded, 'fonts:', this.scene.fontsLoaded, ')');
        }

        // Grid Mode: Map click to grid cell and spawn there
        if (this.scene.gridMode.enabled && this.scene.gridMode.gridManager) {
            console.log('📐 Grid Mode active, mapping pointer to grid cell');
            const gridCell = this.scene.gridMode.gridManager.getGridCell(x, y);

            if (gridCell) {
                const { row, col } = gridCell;
                console.log(`📐 Clicked grid cell: ${row},${col}`);

                if (!this.scene.canSpawnAfterMovement()) {
                    console.log('🛑 Grid spawn blocked: too soon after movement');
                    return;
                }

                // Spawn object in grid cell (replaces existing if present)
                const obj = await this.scene.spawnObjectInGridCell(row, col, 'random');
                this.scene.announceObject(obj, x, y);
            } else {
                console.log('📐 Click outside grid boundaries');
            }
            return; // Skip free-form mode handling
        }

        // Free-form Mode: Check spawn eligibility FIRST, then move/drag
        const hitObject = this.scene.getObjectUnderPointer(x, y);
        const isSpeaking = this.scene.speechManager.getIsSpeaking();
        console.log('🎯 hitObject:', hitObject, 'isSpeaking:', isSpeaking);

        // 1. SPAWN CHECK (first priority) — empty space, not speaking
        if (!hitObject && !isSpeaking) {
            if (this.scene.canSpawnAfterMovement()) {
                await this.scene.spawnAndAnnounce(x, y, 'random');
            } else {
                console.log('🛑 Spawn blocked: too soon after movement (%dms)',
                    Date.now() - this.scene.lastMoveTime);
            }
            return;
        }

        // 2. DRAG/MOVE checks (only reached when spawn doesn't apply)
        // Block all movement if post-spawn lock is active
        if (!this.scene.canMoveAfterSpawn()) {
            console.log('🛑 Movement blocked: post-spawn lock active');
            return;
        }

        if (hitObject && !isSpeaking) {
            // Start dragging existing object when not speaking
            this.scene.startDragging(hitObject, x, y);
            this.scene.autoCleanupManager.updateObjectTouchTime(hitObject);
        } else if (hitObject && isSpeaking) {
            // Allow dragging any object even during speech
            this.scene.startDragging(hitObject, x, y);
            this.scene.autoCleanupManager.updateObjectTouchTime(hitObject);
            // Re-voice the object being dragged
            this.scene.speechManager.speakText(hitObject, 'both');
        } else if (isSpeaking && this.scene.speechManager.getCurrentSpeakingObject()) {
            // Teleport speaking object to tap location with smooth lerp AND make it draggable
            const speakingObj = this.scene.speechManager.getCurrentSpeakingObject();
            this.scene.moveObjectTo(speakingObj, x, y, true); // true = smooth lerp animation
            this.scene.audioManager.updateTonePosition(x, y, speakingObj.id);
            this.scene.particleManager.createSpawnBurst(x, y);
            this.scene.autoCleanupManager.updateObjectTouchTime(speakingObj);
            // Start dragging immediately so finger movement works during/after lerp
            this.scene.startDragging(speakingObj, x, y);
        }
    }

    onInputPointerMove(data) {
        const { x, y } = data;

        if (this.scene.isDragging && this.scene.draggedObject && this.scene.canMoveAfterSpawn()) {
            // Use immediate positioning during drag (no lerp lag)
            this.scene.moveObjectTo(this.scene.draggedObject, x, y, false); // false = instant, no smooth lerp
            this.scene.audioManager.updateTonePosition(x, y, this.scene.draggedObject.id);
            this.scene.particleManager.updateDragTrail(this.scene.draggedObject, x, y);
        }
    }

    onInputPointerUp(data) {
        this.scene.awaitingSpawnInputRelease = false;
        if (this.scene.isDragging && this.scene.draggedObject) {
            this.scene.stopDragging();
        }
    }

    /**
     * Start dragging an object with visual feedback
     * @param {Object} obj - The object to start dragging
     * @param {number} x - Current pointer X position
     * @param {number} y - Current pointer Y position
     */
    startDragging(obj, x, y) {
        if (!obj || !obj.active) return;

        // Don't cancel smooth movements - let finger movement naturally take over
        // This allows smooth lerp animations to complete if user doesn't move finger

        // Set drag state
        this.scene.isDragging = true;
        this.scene.draggedObject = obj;

        // Visual feedback: scale up slightly for modern feel
        this.scene.scene.tweens.add({
            targets: obj,
            scaleX: 1.15,
            scaleY: 1.15,
            duration: 100,
            ease: 'Back.easeOut'
        });

        // Start particle trail
        this.scene.particleManager.startDragTrail(obj);

        console.log('👆 Started dragging object:', obj.id);
    }

    /**
     * Stop dragging with smooth scale-down animation
     */
    stopDragging() {
        if (!this.scene.draggedObject) return;

        const obj = this.scene.draggedObject;

        // Visual feedback: scale back to normal
        this.scene.scene.tweens.add({
            targets: obj,
            scaleX: 1.0,
            scaleY: 1.0,
            duration: 150,
            ease: 'Back.easeOut'
        });

        // Stop particle trail
        this.scene.particleManager.stopDragTrail(obj);

        // Clear drag state
        this.scene.isDragging = false;
        this.scene.draggedObject = null;

        console.log('✋ Stopped dragging object:', obj.id);
    }

    async onInputKeyPress(data) {
        const { key, position } = data;

        if (!this.scene.speechManager.getIsSpeaking()) {
            if (!this.scene.canSpawnAfterMovement()) {
                console.log('🛑 Key spawn blocked: too soon after movement');
                return;
            }
            await this.scene.spawnAndAnnounce(position.x, position.y, 'random');
        } else if (this.scene.speechManager.getCurrentSpeakingObject() && this.scene.canMoveAfterSpawn()) {
            this.scene.moveObjectTo(this.scene.speechManager.getCurrentSpeakingObject(), position.x, position.y);
        }
    }

    onInputKeyInterpolate(data) {
        const { position } = data;

        if (this.scene.speechManager.getCurrentSpeakingObject() && this.scene.canMoveAfterSpawn()) {
            this.scene.moveObjectTo(this.scene.speechManager.getCurrentSpeakingObject(), position.x, position.y);
        }
    }

    onInputKeyRelease(data) {
        this.scene.awaitingSpawnInputRelease = false;
    }

    async onInputGamepadButtonDown(data) {
        const { position } = data;

        if (!this.scene.speechManager.getIsSpeaking()) {
            if (!this.scene.canSpawnAfterMovement()) {
                console.log('🛑 Gamepad spawn blocked: too soon after movement');
                return;
            }
            await this.scene.spawnAndAnnounce(position.x, position.y, 'random');
        } else if (this.scene.speechManager.getCurrentSpeakingObject() && this.scene.canMoveAfterSpawn()) {
            this.scene.autoCleanupManager.updateObjectTouchTime(this.scene.speechManager.getCurrentSpeakingObject());
            this.scene.moveObjectTo(this.scene.speechManager.getCurrentSpeakingObject(), position.x, position.y);
            this.scene.audioManager.updateTonePosition(position.x, position.y, this.scene.speechManager.getCurrentSpeakingObject().id);
        }
    }

    onInputGamepadButtonUp(data) {
        this.scene.awaitingSpawnInputRelease = false;
    }

    onInputGamepadMove(data) {
        // Handle gamepad movement if needed
    }

    onInputHoldStart(data) {
        // Handle hold start if needed
    }

    // Object management methods
    getObjectUnderPointer(x, y) {
        // Find the topmost object at the given coordinates
        for (let i = this.scene.objects.length - 1; i >= 0; i--) {
            const obj = this.scene.objects[i];
            if (obj.active && obj.getBounds().contains(x, y)) {
                return obj;
            }
        }
        return null;
    }
}
