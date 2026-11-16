/**
 * SceneInputHandler - Reacts to InputManager events (pointer, keyboard, gamepad) and drives dragging.
 * State stays on the scene; calls go back through the scene so spies intercept.
 */
import { KeyActions } from '../input/KeyActions.js';

const TAP_SLOP = 10;      // logical px a press may wander and still be a tap
const TAP_MAX_MS = 350;   // longest press that still counts as a tap

export class SceneInputHandler {
    constructor(scene) {
        this.scene = scene;
        this.keyActions = new KeyActions(scene);
        this.tap = null; // press that may turn out to be a tap: { obj, x, y, t, moved, revoiced }
    }

    // Input event handlers
    async onInputPointerDown(data) {
        const { x, y } = data;

        // Warn if system not fully initialized (race condition debugging)
        if (!this.scene.isFullyInitialized) {
            console.warn('⚠️ Input received before full initialization (data:', this.scene.dataLoaded, 'fonts:', this.scene.fontsLoaded, ')');
        }

        // Grid Mode: Map click to grid cell and spawn there
        if (this.scene.gridMode.enabled && this.scene.gridMode.gridManager) {
            const gridCell = this.scene.gridMode.gridManager.getGridCell(x, y);

            if (gridCell) {
                const { row, col } = gridCell;

                if (!this.scene.canSpawnAfterMovement()) {
                    return;
                }

                // Spawn object in grid cell (replaces existing if present)
                const obj = await this.scene.spawnObjectInGridCell(row, col, 'random');
                this.scene.announceObject(obj, x, y);
            }
            return; // Skip free-form mode handling
        }

        // Free-form Mode: Check spawn eligibility FIRST, then move/drag
        this.tap = null;
        const hitObject = this.scene.getObjectUnderPointer(x, y);
        const isSpeaking = this.scene.speechManager.getIsSpeaking();

        // 1. Empty space: always a new thing. Speech queues (SpeechQueue), so a child
        //    tapping quickly gets something new every time instead of dragging the
        //    object that happens to be speaking.
        if (!hitObject) {
            if (this.scene.canSpawnAfterMovement()) {
                await this.scene.spawnAndAnnounce(x, y, 'random');
            }
            return;
        }

        // 2. On an object: drag it (a short press that does not wander is a tap, see pointer up)
        if (!this.scene.canMoveAfterSpawn()) {
            return;
        }
        this.scene.startDragging(hitObject, x, y);
        this.scene.autoCleanupManager.updateObjectTouchTime(hitObject);
        if (isSpeaking) {
            // Re-voice the object being touched (the queue ignores it if it is already speaking or waiting)
            this.scene.speechManager.speakText(hitObject, 'both');
        }
        this.tap = { obj: hitObject, x, y, t: Date.now(), moved: false, revoiced: isSpeaking };
    }

    onInputPointerMove(data) {
        const { x, y } = data;

        // A press that has not wandered yet is still a possible tap: do not shove the object
        const tap = this.tap;
        if (tap && !tap.moved) {
            const far = Math.hypot(x - tap.x, y - tap.y) > TAP_SLOP;
            if (far || Date.now() - tap.t >= TAP_MAX_MS) tap.moved = true;
            else return;
        }

        if (this.scene.isDragging && this.scene.draggedObject && this.scene.canMoveAfterSpawn()) {
            // Use immediate positioning during drag (no lerp lag)
            this.scene.moveObjectTo(this.scene.draggedObject, x, y, false); // false = instant, no smooth lerp
            const dragged = this.scene.draggedObject;
            if (!this.pickedUp) { this.pickedUp = true; this.scene.audioManager.playPickup(dragged); }
            this.scene.audioManager.playDragStep(dragged, x, y);
            this.scene.particleManager.updateDragTrail(this.scene.draggedObject, x, y);
        }
    }

    onInputPointerUp(data) {
        this.scene.awaitingSpawnInputRelease = false;
        const tap = this.tap;
        this.tap = null;
        if (this.scene.isDragging && this.scene.draggedObject) {
            this.scene.stopDragging();
        }
        if (!tap || tap.moved || !tap.obj.active || Date.now() - tap.t >= TAP_MAX_MS) return;
        if (data && Number.isFinite(data.x) && Number.isFinite(data.y) &&
            Math.hypot(data.x - tap.x, data.y - tap.y) > TAP_SLOP) return;
        if (this.scene.objects && this.scene.objects.indexOf(tap.obj) === -1) return;

        // A tap: react, and say the name again whether or not speech was running
        if (this.scene.objectMotion) this.scene.objectMotion.react(tap.obj);
        this.scene.audioManager.playTap(tap.obj);
        if (!tap.revoiced) this.scene.speechManager.speakText(tap.obj, 'both');
    }

    /**
     * Start dragging an object with visual feedback
     * @param {Object} obj - The object to start dragging
     */
    startDragging(obj) {
        if (!obj || !obj.active) return;

        // Don't cancel smooth movements - let finger movement naturally take over
        // This allows smooth lerp animations to complete if user doesn't move finger

        // Set drag state
        this.scene.isDragging = true;
        this.scene.draggedObject = obj;
        this.pickedUp = false; // the pick-up blip waits until the press really becomes a drag

        // Lift (1.15x) and tilt are motion factors applied by ObjectMotion while draggedObject is set

        // Start particle trail
        this.scene.particleManager.startDragTrail(obj);

    }

    /**
     * Stop dragging (ObjectMotion eases the lift back down)
     */
    stopDragging() {
        if (!this.scene.draggedObject) return;

        const obj = this.scene.draggedObject;


        // Stop particle trail
        this.scene.particleManager.stopDragTrail(obj);

        // Clear drag state
        this.scene.isDragging = false;
        this.scene.draggedObject = null;

        // Remember where the object was left so a reload restores it there
        if (this.scene.saveGameState) this.scene.saveGameState();

    }

    /** Baby keyboard: see ../input/KeyActions.js */
    async onInputKeyPress(data) {
        return this.keyActions.play(data);
    }

    onInputKeyRelease() {
        this.scene.awaitingSpawnInputRelease = false;
    }

    async onInputGamepadButtonDown(data) {
        const { position } = data;

        if (!this.scene.speechManager.getIsSpeaking()) {
            if (!this.scene.canSpawnAfterMovement()) {
                return;
            }
            await this.scene.spawnAndAnnounce(position.x, position.y, 'random');
        } else if (this.scene.speechManager.getCurrentSpeakingObject() && this.scene.canMoveAfterSpawn()) {
            this.scene.autoCleanupManager.updateObjectTouchTime(this.scene.speechManager.getCurrentSpeakingObject());
            this.scene.moveObjectTo(this.scene.speechManager.getCurrentSpeakingObject(), position.x, position.y);
            this.scene.audioManager.playTap(this.scene.speechManager.getCurrentSpeakingObject(), position.x, position.y);
        }
    }

    onInputGamepadButtonUp() {
        this.scene.awaitingSpawnInputRelease = false;
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
