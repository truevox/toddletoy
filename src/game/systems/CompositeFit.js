import { getObjectExtents, DEFAULT_EDGE_MARGIN } from '../../positioning/BoundsClamp.js';
import { scaleComposite } from './GridFit.js';
import { viewSize } from './DisplayScale.js';

/**
 * CompositeFit - safety net for the biggest composites (a number with every
 * number mode on): when glyph, captions, rows and counting bar together are
 * larger than the screen, shrink the whole object uniformly so it fits.
 * The factor is remembered as obj.baseScale so drag feedback returns to it.
 * @returns {number} the scale applied (1 = already fits)
 */
export function fitCompositeToView(scene, obj, margin = DEFAULT_EDGE_MARGIN) {
    const ext = getObjectExtents(obj);
    if (!ext) return 1;
    const { width, height } = viewSize(scene);
    const w = ext.right - ext.left;
    const h = ext.bottom - ext.top;
    if (!(w > 0) || !(h > 0)) return 1;

    const s = Math.min(1, (width - 2 * margin) / w, (height - 2 * margin) / h);
    if (!(s > 0) || s > 0.995) return 1;
    scaleComposite(obj, s);
    obj.baseScale = (obj.baseScale || 1) * s;
    return s;
}
