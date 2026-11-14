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

/** Size (px) of the square kept clear in the top-right corner for the parent exit button (44px + 8px inset + slack). */
export const EXIT_BUTTON_KEEP_OUT = 60;

/** Default keep-out rectangles (canvas coordinates) for a visible area. */
export function defaultKeepOutRects(bounds, size = EXIT_BUTTON_KEEP_OUT) {
    if (!bounds || !Number.isFinite(bounds.width)) return [];
    return [{ x: bounds.width - size, y: 0, width: size, height: size }];
}

function overlapAmounts(rect, k) {
    const ox = Math.min(rect.right, k.x + k.width) - Math.max(rect.left, k.x);
    const oy = Math.min(rect.bottom, k.y + k.height) - Math.max(rect.top, k.y);
    return ox > 0 && oy > 0 ? { ox, oy } : null;
}

/**
 * Push the composite out of a keep-out rectangle by the smaller of: moving left
 * or moving down (only moves that stay in bounds are preferred).
 */
function avoidKeepOut(pos, ext, bounds, margin, k) {
    const rect = () => ({
        left: pos.x + ext.left, right: pos.x + ext.right,
        top: pos.y + ext.top, bottom: pos.y + ext.bottom
    });
    const hit = overlapAmounts(rect(), k);
    if (!hit) return pos;

    const r = rect();
    const left = r.right - k.x;              // distance to move left
    const down = (k.y + k.height) - r.top;   // distance to move down
    const canLeft = r.left - left >= margin;
    const canDown = r.bottom + down <= bounds.height - margin;

    let dir;
    if (canLeft && canDown) dir = left <= down ? 'left' : 'down';
    else if (canLeft) dir = 'left';
    else if (canDown) dir = 'down';
    else dir = left <= down ? 'left' : 'down';

    return dir === 'left' ? { x: pos.x - left, y: pos.y } : { x: pos.x, y: pos.y + down };
}

/**
 * Clamp a desired anchor position so the whole composite stays inside
 * [margin, size - margin] on both axes and out of any keep-out rectangles.
 * @param {Object} obj - main game object with componentLayout / label words
 * @param {number} x - desired anchor X
 * @param {number} y - desired anchor Y
 * @param {{width:number,height:number}} bounds - visible area size
 * @param {number} [margin]
 * @param {Array<{x:number,y:number,width:number,height:number}>} [keepOutRects] - canvas-space rects to stay clear of
 * @returns {{x:number,y:number}}
 */
export function clampPositionToBounds(obj, x, y, bounds, margin = DEFAULT_EDGE_MARGIN, keepOutRects = []) {
    if (!bounds || !Number.isFinite(bounds.width) || !Number.isFinite(bounds.height)) return { x, y };
    const ext = getObjectExtents(obj);
    if (!ext) return { x, y };

    let pos = {
        x: clampAxis(x, ext.left, ext.right, bounds.width, margin),
        y: clampAxis(y, ext.top, ext.bottom, bounds.height, margin)
    };
    (keepOutRects || []).forEach(k => {
        if (k && Number.isFinite(k.x) && Number.isFinite(k.width)) pos = avoidKeepOut(pos, ext, bounds, margin, k);
    });
    return pos;
}

/** Proportionally map a position from one viewport size to another. */
export function remapPosition(x, y, from, to) {
    const sx = from.width > 0 ? to.width / from.width : 1;
    const sy = from.height > 0 ? to.height / from.height : 1;
    return { x: x * sx, y: y * sy };
}
