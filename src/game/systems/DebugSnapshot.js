/**
 * DebugSnapshot - plain-JSON picture of the sandbox for browser tests.
 * `glyph` is the main object's box; `bounds` is the union including labels and
 * number-mode components; `overlaps` counts object pairs whose bounds intersect.
 */

export function boxOf(o) {
    if (!o) return null;
    const b = typeof o.getBounds === 'function' ? o.getBounds() : o;
    const x = b.x, y = b.y, w = b.width, h = b.height;
    if (![x, y, w, h].every(Number.isFinite)) return null;
    return { x, y, w, h };
}

export function unionBox(boxes) {
    const list = boxes.filter(Boolean);
    if (list.length === 0) return null;
    const x1 = Math.min(...list.map(b => b.x));
    const y1 = Math.min(...list.map(b => b.y));
    const x2 = Math.max(...list.map(b => b.x + b.w));
    const y2 = Math.max(...list.map(b => b.y + b.h));
    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

/** Strict intersection: boxes that only touch do not overlap. */
export function boxesIntersect(a, b) {
    return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

export function countOverlaps(boxes) {
    let n = 0;
    for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
            if (boxes[i] && boxes[j] && boxesIntersect(boxes[i], boxes[j])) n++;
        }
    }
    return n;
}

function componentObjects(obj) {
    const parts = [];
    (obj.allLanguageWords || []).forEach(g => (g.words || []).forEach(w => parts.push(w)));
    ((obj.componentLayout && obj.componentLayout.numberModes) || []).forEach(c => {
        if (c.object) parts.push(c.object);
        if (Array.isArray(c.objects)) parts.push(...c.objects);
    });
    return parts.filter(p => p && p.active !== false);
}

export function buildSnapshot(scene) {
    const objects = [];
    for (const obj of scene.objects || []) {
        if (!obj || !obj.active) continue;
        const glyph = boxOf(obj);
        const bounds = unionBox([glyph, ...componentObjects(obj).map(boxOf)]);
        objects.push({ id: obj.id, type: obj.type, x: obj.x, y: obj.y, glyph, bounds });
    }
    const canvas = (scene.game && scene.game.canvas) || {};
    return {
        width: scene.scale.width,
        height: scene.scale.height,
        dpr: window.devicePixelRatio,
        canvas: { width: canvas.width, height: canvas.height },
        objects,
        overlaps: countOverlaps(objects.map(o => o.bounds))
    };
}
