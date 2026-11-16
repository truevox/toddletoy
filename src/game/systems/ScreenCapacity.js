/**
 * ScreenCapacity - how many objects a screen holds. Big objects mean fewer.
 * Target: total body area <= FILL of the screen, never fewer than MIN_CAPACITY.
 * advanced.maxObjects > 0 overrides the automatic figure. Grid mode is exempt.
 */
export const FILL = 0.58;
export const MIN_CAPACITY = 3;

/** Pure formula. meanArea <= 0 (nothing measured yet) means "no limit from area". */
export function computeCapacity(width, height, meanArea, maxObjects = 0) {
    if (maxObjects > 0) return Math.floor(maxObjects);
    if (!(meanArea > 0)) return Infinity;
    return Math.max(MIN_CAPACITY, Math.floor((FILL * width * height) / meanArea));
}

export function meanBodyArea(bodies) {
    let sum = 0, n = 0;
    for (let i = 0; i < bodies.length; i++) {
        const s = bodies[i];
        if (!s) continue;
        const a = (s.r - s.l) * (s.b - s.t);
        if (a > 0) { sum += a; n++; }
    }
    return n ? sum / n : 0;
}

/**
 * Remove the oldest removable objects until the count fits. `states` is parallel to
 * `objects`. Never removes the dragged object, a speaking one, or the newest.
 * Returns the number removed.
 */
export function enforceCapacity(scene, width, height, maxObjects) {
    let removed = 0;
    for (let guard = 0; guard < 64; guard++) {
        const objs = scene.objects;
        const n = objs.length;
        if (n < 2) break;
        const cap = computeCapacity(width, height, meanFromObjects(objs), maxObjects);
        if (n <= cap) break;
        let victim = null;
        for (let i = 0; i < n - 1; i++) {
            const o = objs[i];
            if (!o || !o.active || o === scene.draggedObject) continue;
            if (scene.speechManager && scene.speechManager.isObjectSpeaking && scene.speechManager.isObjectSpeaking(o)) continue;
            victim = o; break;
        }
        if (!victim) break;
        scene.removeObject(victim);
        removed++;
    }
    return removed;
}

function meanFromObjects(objs) {
    let sum = 0, n = 0;
    for (let i = 0; i < objs.length; i++) {
        const s = objs[i] && objs[i].__soft;
        if (!s) continue;
        const a = (s.r - s.l) * (s.b - s.t);
        if (a > 0) { sum += a; n++; }
    }
    return n ? sum / n : 0;
}

/** Current capacity for a scene (for tests and debugging). */
export function sceneCapacity(scene, width, height, maxObjects) {
    return computeCapacity(width, height, meanFromObjects(scene.objects || []), maxObjects);
}
