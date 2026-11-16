/**
 * pointerState - the scene members that expose per-finger state:
 *   pointerRegistry, spawnGuard                (the state itself, built on first use)
 *   getDraggedObjects(), isObjectDragged(obj)  (the multi-drag API)
 *   draggedObject, isDragging                  (old single-drag names, kept as views:
 *                                               "the latest drag" / "any drag")
 * Installed on GameScene's prototype; tests install it on plain scene objects.
 */
import { PointerRegistry } from './PointerRegistry.js';
import { SpawnGuard } from './SpawnGuard.js';

const LEGACY_ID = 'legacy'; // a drag set through the old draggedObject property has no finger behind it

const members = {
    get pointerRegistry() { return this._pointerRegistry || (this._pointerRegistry = new PointerRegistry()); },
    get spawnGuard() { return this._spawnGuard || (this._spawnGuard = new SpawnGuard()); },
    getDraggedObjects() { return this.pointerRegistry.draggedObjects(); },
    isObjectDragged(obj) { return this.pointerRegistry.isObjectDragged(obj); },
    get draggedObject() { return this.pointerRegistry.latestDragged(); },
    set draggedObject(obj) {
        const r = this.pointerRegistry;
        if (!obj) { r.clearDrags(); return; }
        if (!r.has(LEGACY_ID)) r.begin(LEGACY_ID, obj.x, obj.y, Date.now(), false);
        r.stopDrag(LEGACY_ID);
        r.startDrag(LEGACY_ID, obj);
    },
    get isDragging() { return this.pointerRegistry.draggedObjects().length > 0; },
    set isDragging(on) { if (!on) this.pointerRegistry.clearDrags(); }
};

export function installPointerState(target) {
    Object.defineProperties(target, Object.getOwnPropertyDescriptors(members));
    return target;
}
