/**
 * BoundsClamp - keeps a whole composite toy object (main glyph + labels +
 * number-mode rows + object-counting rows) inside the visible area.
 *
 * Layout model: every component keeps a fixed offset from the main object
 * (see MovementManager.setObjectPosition / componentLayout), so the composite's
 * extents relative to (obj.x, obj.y) are constant for a given object. We measure
 * them from the live Phaser bounds and clamp the anchor position accordingly.
 */

export const DEFAULT_EDGE_MARGIN = 8;

function toRect(b) {
    if (!b || !Number.isFinite(b.width) || !Number.isFinite(b.height)) return null;
    return { left: b.x, top: b.y, right: b.x + b.width, bottom: b.y + b.height };
}

function union(a, b) {
    if (!a) return b;
    if (!b) return a;
    return {
        left: Math.min(a.left, b.left),
        top: Math.min(a.top, b.top),
        right: Math.max(a.right, b.right),
        bottom: Math.max(a.bottom, b.bottom)
    };
}

/** World-space rect of a game object, or null if hidden/destroyed/unmeasurable. */
function boundsOf(go) {
    if (!go || go.active === false || go.visible === false) return null;

    // Containers (e.g. ResourceBar) pool hidden sprites; only count visible children
    if (Array.isArray(go.list)) {
        return go.list.reduce((acc, child) => union(acc, boundsOf(child)), null);
    }

    if (typeof go.getBounds !== 'function') return null;
    try {
        return toRect(go.getBounds());
    } catch (error) {
        return null;
    }
}

/** Every game object that belongs to the composite toy object. */
export function getCompositeComponents(obj) {
    const components = [obj];

    if (Array.isArray(obj.allLanguageWords) && obj.allLanguageWords.length > 0) {
        obj.allLanguageWords.forEach(group => (group.words || []).forEach(w => components.push(w)));
    } else {
        (obj.englishWords || []).forEach(w => components.push(w));
        (obj.spanishWords || []).forEach(w => components.push(w));
    }

    const numberModes = obj.componentLayout && obj.componentLayout.numberModes;
    if (Array.isArray(numberModes)) {
        numberModes.forEach(c => c && c.object && components.push(c.object));
    }
    return components;
}

/**
 * Extents of the composite relative to the object's anchor position:
 * { left, right, top, bottom } where left/top are usually negative.
 * Returns null when nothing can be measured (e.g. test mocks).
 */
export function getObjectExtents(obj) {
    if (!obj || !Number.isFinite(obj.x) || !Number.isFinite(obj.y)) return null;

    const rect = getCompositeComponents(obj).reduce((acc, go) => union(acc, boundsOf(go)), null);
    if (!rect) return null;

    return {
        left: rect.left - obj.x,
        right: rect.right - obj.x,
        top: rect.top - obj.y,
        bottom: rect.bottom - obj.y
    };
}

function clampAxis(value, extentMin, extentMax, size, margin) {
    const lo = margin - extentMin;
    const hi = size - margin - extentMax;
    if (lo > hi) return (lo + hi) / 2; // Composite bigger than the screen: centre it
    return Math.min(hi, Math.max(lo, value));
}

/**
 * Clamp a desired anchor position so the whole composite stays inside
 * [margin, size - margin] on both axes.
 * @param {Object} obj - main game object with componentLayout / label words
 * @param {number} x - desired anchor X
 * @param {number} y - desired anchor Y
 * @param {{width:number,height:number}} bounds - visible area size
 * @param {number} [margin]
 * @returns {{x:number,y:number}}
 */
export function clampPositionToBounds(obj, x, y, bounds, margin = DEFAULT_EDGE_MARGIN) {
    if (!bounds || !Number.isFinite(bounds.width) || !Number.isFinite(bounds.height)) return { x, y };
    const ext = getObjectExtents(obj);
    if (!ext) return { x, y };

    return {
        x: clampAxis(x, ext.left, ext.right, bounds.width, margin),
        y: clampAxis(y, ext.top, ext.bottom, bounds.height, margin)
    };
}

/** Proportionally map a position from one viewport size to another. */
export function remapPosition(x, y, from, to) {
    const sx = from.width > 0 ? to.width / from.width : 1;
    const sy = from.height > 0 ? to.height / from.height : 1;
    return { x: x * sx, y: y * sy };
}
