import { remapPosition } from '../../positioning/BoundsClamp.js';

/**
 * ResizeRebuild - after a resize/rotation changes the size unit (or the pixel
 * ratio), re-create every free-form object from its data so glyphs, captions,
 * number rows and text resolution are recomputed for the new screen. Positions
 * are remapped proportionally. Runs one rebuild at a time, in order.
 */
export function rebuildObjectsForResize(scene, previous, current) {
    const run = async () => {
        const old = [...(scene.objects || [])];
        const snaps = old.map(obj => ({
            id: obj.id,
            type: obj.type,
            itemData: obj.itemData,
            lastTouchedTime: obj.lastTouchedTime,
            ...remapPosition(obj.x, obj.y, previous, current)
        }));
        if (scene.isDragging && old.includes(scene.draggedObject)) {
            scene.isDragging = false;
            scene.draggedObject = null;
        }
        old.forEach(obj => {
            if (scene.movementManager) scene.movementManager.clearMovement(obj.id);
            scene.removeObject(obj);
        });
        for (const snap of snaps) {
            try { await scene.restoreObject(snap); } catch (error) { console.warn('Rebuild after resize failed for', snap.id, error); }
        }
        if ((scene.objects || []).length > 0) scene.saveGameState();
    };
    scene.resizeRebuild = (scene.resizeRebuild || Promise.resolve()).then(run, run);
    return scene.resizeRebuild;
}
