/**
 * Read-only view of "what is being dragged" for systems that must not care how many
 * fingers there are. Works on the real scene (pointer registry) and on the plain
 * scene shape older code and tests use (draggedObject).
 */
export function draggedObjects(scene) {
    if (!scene) return [];
    if (typeof scene.getDraggedObjects === 'function') return scene.getDraggedObjects();
    return scene.draggedObject ? [scene.draggedObject] : [];
}

export function isDragged(scene, obj) {
    if (!scene || !obj) return false;
    if (typeof scene.isObjectDragged === 'function') return scene.isObjectDragged(obj);
    return scene.draggedObject === obj;
}

export function anyDragged(scene) {
    return draggedObjects(scene).length > 0;
}
