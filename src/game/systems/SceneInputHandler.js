import { trackMove, isTapRelease } from '../input/PointerRegistry.js';

/**
 * SceneInputHandler - Reacts to InputManager events (pointer, keyboard, gamepad) and drives dragging.
 * Pointer state is per finger (scene.pointerRegistry, scene.spawnGuard); calls go back through the
 * scene so spies intercept. Several fingers can spawn, tap and drag at once.
 */
import { KeyActions } from '../input/KeyActions.js';

const now = () => Date.now();
const MOUSE_ID = 0;
const LEGACY_ID = 'legacy'; // a drag set through the old scene.draggedObject property

export class SceneInputHandler {
    constructor(scene) {
        this.scene = scene;
        this.keyActions = new KeyActions(scene);
    }

    get registry() { return this.scene.pointerRegistry; }

    // Input event handlers
    async onInputPointerDown(data) {
        const { x, y } = data;
        const id = data.id ?? MOUSE_ID;
        const scene = this.scene;

        // Warn if system not fully initialized (race condition debugging)
        if (!scene.isFullyInitialized) {
            console.warn('⚠️ Input received before full initialization (data:', scene.dataLoaded, 'fonts:', scene.fontsLoaded, ')');
        }

        // A palm is one soft touch: it makes something on empty space, or just pats what it landed on
        if (data.palm) return this.onPalm(x, y, id);

        if (this.registry.has(id)) this.endPointer(id, { cancelled: true }); // a lost pointer-up
        const rec = this.registry.begin(id, x, y, now(), !!data.touch);

        // Grid Mode: each finger fills / replaces its own cell (no dragging)
        if (scene.gridMode.enabled && scene.gridMode.gridManager) {
            const gridCell = scene.gridMode.gridManager.getGridCell(x, y);
            if (gridCell) {
                const { row, col } = gridCell;
                if (!scene.canSpawnAfterMovement()) return;
                const obj = await scene.spawnObjectInGridCell(row, col, 'random');
                scene.announceObject(obj, x, y);
            }
            return; // Skip free-form mode handling
        }

        // Free-form Mode: empty space spawns, an object is dragged (or tapped)
        // A finger landing on (or just by) an object another finger is holding does nothing: no tug-of-war,
        // and no new object under a lifted, tilted drag
        if (this.nearDragged(x, y)) return;
        const hitObject = scene.getObjectUnderPointer(x, y);
        const isSpeaking = scene.speechManager.getIsSpeaking();

        // 1. Empty space: always a new thing. Speech queues (SpeechQueue), so a child
        //    tapping quickly gets something new every time. The anti-bounce check is
        //    this finger's own: other fingers never block it.
        if (!hitObject) {
            if (scene.spawnGuard.canSpawn(id, now())) {
                scene.spawnGuard.noteSpawn(id, now());
                await scene.spawnAndAnnounce(x, y, 'random');
            }
            return;
        }

        // 2. On an object: drag it (a short press that does not wander is a tap, see pointer up).
        //    Not what this finger just made, and not what another finger already holds.
        if (!scene.spawnGuard.canDrag(id, now())) return;
        if (scene.isObjectDragged(hitObject)) return;
        if (!scene.startDragging(hitObject, x, y, id)) return;
        scene.autoCleanupManager.updateObjectTouchTime(hitObject);
        if (isSpeaking) {
            // Re-voice the object being touched (the queue ignores it if it is already speaking or waiting)
            scene.speechManager.speakText(hitObject, 'both');
        }
        rec.revoiced = isSpeaking;
    }

    /** Is (x, y) on a dragged object, with room for its lift and tilt? */
    nearDragged(x, y) {
        for (const o of this.scene.getDraggedObjects()) {
            if (!o || !o.active || typeof o.getBounds !== 'function') continue;
            const b = o.getBounds();
            const padX = Math.max(12, b.width * 0.2), padY = Math.max(12, b.height * 0.3);
            if (x >= b.x - padX && x <= b.x + b.width + padX && y >= b.y - padY && y <= b.y + b.height + padY) return true;
        }
        return false;
    }

    async onPalm(x, y, id) {
        const scene = this.scene;
        if (scene.gridMode.enabled && scene.gridMode.gridManager) return this.onInputPointerDown({ x, y, id, touch: true });
        const hit = scene.getObjectUnderPointer(x, y);
        if (hit) {
            if (scene.objectMotion) scene.objectMotion.react(hit);
            scene.audioManager.playTap(hit);
        } else if (scene.spawnGuard.canSpawn(id, now())) {
            scene.spawnGuard.noteSpawn(id, now());
            await scene.spawnAndAnnounce(x, y, 'random');
        }
    }

    onInputPointerMove(data) {
        const { x, y } = data;
        const rec = this.registry.get(data.id ?? MOUSE_ID);
        if (!rec) return;

        // A press that has not wandered yet is still a possible tap: do not shove the object
        if (trackMove(rec, x, y, now()) || !rec.obj) return; // still a possible tap, or nothing held

        const obj = rec.obj;
        if (!obj.active) { this.registry.dropObject(obj); return; }
        // Use immediate positioning during drag (no lerp lag)
        this.scene.moveObjectTo(obj, x, y, false); // false = instant, no smooth lerp
        this.scene.spawnGuard.noteMove(rec.id, now());
        if (!rec.pickedUp) { rec.pickedUp = true; this.scene.audioManager.playPickup(obj); }
        this.scene.audioManager.playDragStep(obj, x, y);
        this.scene.particleManager.updateDragTrail(obj, x, y);
    }

    onInputPointerUp(data) {
        if (data && data.palm) return;
        const id = (data && data.id) ?? MOUSE_ID;
        const rec = this.registry.get(id);
        if (!rec) {
            if (this.registry.has(LEGACY_ID)) this.endPointer(LEGACY_ID);
            this.releaseSpawnLock();
            return;
        }
        const cancelled = !!(data && data.canceled);
        const tap = !cancelled && rec.obj && rec.obj.active && isTapRelease(rec, data && data.x, data && data.y, now()) ? rec : null;
        const tapObj = rec.obj;
        this.endPointer(id, { cancelled });
        if (!tap || !tapObj) return;
        if (this.scene.objects && this.scene.objects.indexOf(tapObj) === -1) return;

        // A tap: react, and say the name again whether or not speech was running
        if (this.scene.objectMotion) this.scene.objectMotion.react(tapObj);
        this.scene.audioManager.playTap(tapObj);
        if (!rec.revoiced) this.scene.speechManager.speakText(tapObj, 'both');
    }

    /** One finger is done: release what it held and forget it. */
    endPointer(id, { cancelled = false } = {}) {
        const rec = this.registry.get(id);
        if (!rec) return;
        if (rec.obj) this.stopDragging(id, { cancelled });
        this.registry.end(id);
        this.releaseSpawnLock();
    }

    /** The post-spawn input lock (used by keys / gamepad too) ends when no finger is down. */
    releaseSpawnLock() {
        if (!this.registry.anyDown()) this.scene.awaitingSpawnInputRelease = false;
    }

    /** Every finger lets go (reset, shutdown): nothing is left dragging. */
    cancelAllPointers() {
        for (const id of this.registry.ids()) this.endPointer(id, { cancelled: true });
        this.registry.clearDrags();
        this.releaseSpawnLock();
    }

    /**
     * Start dragging an object for a pointer, with visual feedback.
     * @returns {boolean} false if that object is already held or the pointer already holds one
     */
    startDragging(obj, x, y, pointerId = MOUSE_ID) {
        if (!obj || !obj.active) return false;
        const r = this.registry;
        if (!r.has(pointerId)) r.begin(pointerId, x ?? obj.x, y ?? obj.y, now(), false).moved = true; // no press to judge as a tap
        if (!r.startDrag(pointerId, obj)) return false;
        r.get(pointerId).pickedUp = false; // the pick-up blip waits until the press really becomes a drag

        // Lift (1.15x) and tilt are motion factors applied by ObjectMotion while the object is dragged
        this.scene.particleManager.startDragTrail(obj);
        return true;
    }

    /**
     * Stop a pointer's drag (ObjectMotion eases the lift back down). With no id, every drag stops.
     */
    stopDragging(pointerId, { cancelled = false, object = null, silent = false } = {}) {
        const r = this.registry;
        const ids = pointerId === undefined ? r.ids().filter(i => r.get(i).obj) : [pointerId];
        const objs = [];
        for (const id of ids) {
            const o = r.stopDrag(id, { cancelled, t: typeof performance !== 'undefined' ? performance.now() : now() });
            if (o) objs.push(o);
        }
        if (object && !objs.includes(object)) objs.push(object);
        if (!objs.length) return;
        for (const o of objs) this.scene.particleManager.stopDragTrail(o);
        // Remember where objects were left so a reload restores them there
        if (!silent && this.scene.saveGameState) this.scene.saveGameState();
    }

    /** Baby keyboard: see ../input/KeyActions.js */
    async onInputKeyPress(data) {
        return this.keyActions.play(data);
    }

    onInputKeyRelease() {
        this.releaseSpawnLock();
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
