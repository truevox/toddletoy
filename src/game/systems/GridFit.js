import { getObjectExtents, getCompositeComponents } from '../../positioning/BoundsClamp.js';

/** Breathing room (px) kept between a composite and its cell edges. */
export function cellPaddingFor(cellWidth, cellHeight) {
    return Math.max(3, Math.round(Math.min(cellWidth, cellHeight) * 0.05));
}

/**
 * Uniform scale (<= 1) that makes a composite of the given size fit a cell
 * minus padding on every side. Never scales up.
 * @param {{width:number,height:number}} size - composite size
 * @param {{width:number,height:number}} cell - cell size
 * @param {number} [padding]
 */
export function computeFitScale(size, cell, padding = cellPaddingFor(cell.width, cell.height)) {
    const availW = Math.max(1, cell.width - 2 * padding);
    const availH = Math.max(1, cell.height - 2 * padding);
    if (!(size.width > 0) || !(size.height > 0)) return 1;
    return Math.min(1, availW / size.width, availH / size.height);
}

/** Offset that moves a composite's extents (relative to its anchor) so it is centred on a point. */
export function computeCenteringShift(anchor, ext, center) {
    return {
        dx: center.x - (anchor.x + (ext.left + ext.right) / 2),
        dy: center.y - (anchor.y + (ext.top + ext.bottom) / 2)
    };
}

function scaleOffset(layout, s) {
    if (layout) { layout.offsetX *= s; layout.offsetY *= s; }
}

/** Scale every stored layout offset so later setObjectPosition calls keep the scaled arrangement. */
function scaleStoredLayout(obj, s) {
    const cl = obj.componentLayout;
    if (!cl) return;
    (cl.numberModes || []).forEach(c => scaleOffset(c, s));

    // Words are positioned at x + offsetX - width/2 with the UNscaled width, so fold that in.
    const scaleWordLayouts = (layouts, words) => {
        (layouts || []).forEach((l, i) => {
            const w = words && words[i] ? words[i].width : 0;
            l.offsetX = s * l.offsetX - (s * w) / 2 + w / 2;
            l.offsetY *= s;
        });
    };
    (cl.allLanguageWords || []).forEach(group => {
        const actual = (obj.allLanguageWords || []).find(g => g.languageCode === group.languageCode);
        scaleWordLayouts(group.words, actual && actual.words);
    });
    scaleWordLayouts(cl.englishWords, obj.englishWords);
    scaleWordLayouts(cl.spanishWords, obj.spanishWords);
}

/**
 * Scale the whole composite uniformly about the object's anchor.
 * Every component's position and scale are transformed, as are stored offsets.
 */
export function scaleComposite(obj, s) {
    if (!(s > 0) || Math.abs(s - 1) < 1e-4) return;
    const ax = obj.x, ay = obj.y;
    getCompositeComponents(obj).forEach(c => {
        if (c !== obj && typeof c.setPosition === 'function') {
            c.setPosition(ax + (c.x - ax) * s, ay + (c.y - ay) * s);
        }
        if (typeof c.setScale === 'function') c.setScale((c.scaleX ?? 1) * s, (c.scaleY ?? 1) * s);
    });
    scaleStoredLayout(obj, s);
}

/**
 * Fit a spawned composite inside a grid cell: scale down uniformly when it
 * exceeds the cell minus padding, then centre it on the cell.
 * @param {Object} scene - needs movementManager.setObjectPosition
 * @param {Object} obj
 * @param {{x:number,y:number}} center - cell centre
 * @param {{width:number,height:number}} cell - cell size
 * @returns {number} the scale applied (1 = unchanged)
 */
export function fitObjectToCell(scene, obj, center, cell) {
    let ext = getObjectExtents(obj);
    if (!ext) return 1;

    const s = computeFitScale({ width: ext.right - ext.left, height: ext.bottom - ext.top }, cell);
    scaleComposite(obj, s);

    ext = getObjectExtents(obj) || ext;
    const { dx, dy } = computeCenteringShift({ x: obj.x, y: obj.y }, ext, center);
    scene.movementManager.setObjectPosition(obj, obj.x + dx, obj.y + dy);
    obj.gridFitScale = s;
    return s;
}
