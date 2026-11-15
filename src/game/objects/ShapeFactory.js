/**
 * ShapeFactory - builds the container used for spawned "shape" toys
 * (circle, square, triangle, star, diamond, heart).
 *
 * Only APIs that exist on Phaser 3 game objects are used. In particular the
 * heart is a sampled-point polygon: Phaser's Graphics has no bezierCurveTo.
 */
import Phaser from 'phaser';
import { viewWidth, viewHeight, sizesFor } from '../systems/DisplayScale.js';

const SHAPE_FILL = 1; // shapes are as tall as the glyph unit (square and diamond are a little smaller by shape)

/**
 * Shape size in px: the same screen-relative unit as every other main glyph
 * (about 20% of the short edge, clamped).
 */
export function calculateShapeSize(minDimension) {
    const dimension = Number.isFinite(minDimension) && minDimension > 0 ? minDimension : 800;
    return Math.round(sizesFor(dimension, dimension).glyph * SHAPE_FILL);
}

/** Scale points to fit `size` and translate so the minimum corner is (0, 0). */
function normalisePoints(points, size) {
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const span = Math.max(Math.max(...xs) - minX, Math.max(...ys) - minY) || 1;
    const k = size / span;
    const flat = [];
    points.forEach(p => flat.push((p.x - minX) * k, (p.y - minY) * k));
    return flat;
}

/**
 * Heart outline sampled from the classic parametric heart curve, as a flat
 * [x, y, ...] array with all coordinates >= 0 so the polygon's bounding box
 * (and therefore its centre origin) is exact.
 */
export function getHeartPoints(size, samples = 40) {
    const raw = [];
    for (let i = 0; i < samples; i++) {
        const t = (i / samples) * Math.PI * 2;
        const hx = 16 * Math.pow(Math.sin(t), 3);
        const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        raw.push({ x: hx, y: hy });
    }
    return normalisePoints(raw, size);
}

// Phaser polygons offset their points by the bounding-box size * origin, so
// points must start at (0,0); negative coordinates would render off-centre.
function polygonPoints(size, coords) {
    return normalisePoints(coords.map(([x, y]) => ({ x, y })), size);
}

/**
 * Extra label offset (added to the responsive base label offset) so the label
 * sits just below the shape's bottom edge. May be negative for big shapes.
 */
export function calculateShapeLabelOffset(scene, size) {
    const styleInfo = scene.renderManager?.textLayoutManager?.calculateResponsiveTextStyle?.();
    if (!styleInfo) return Math.round(size * 0.2);
    const labelFont = parseInt(styleInfo.fontSize, 10) || 24;
    const desiredCentreOffset = size / 2 + labelFont / 2 + Math.round(labelFont * 0.4);
    return Math.round(desiredCentreOffset - styleInfo.labelOffset);
}

export function createShapeObject(scene, itemData, x, y, labelText = '') {
    const minDimension = Math.min(viewWidth(scene), viewHeight(scene));
    const size = calculateShapeSize(minDimension);
    const container = scene.add.container(x, y);

    const colorHex = itemData?.color?.hex || '#ffffff';
    let fillColorInt = 0xffffff;
    try {
        fillColorInt = Phaser.Display.Color.HexStringToColor(colorHex).color;
    } catch (error) {
        console.warn('Failed to parse shape color hex:', colorHex, error);
    }

    const strokeColor = 0xffffff;
    const strokeAlpha = 0.85;
    const strokeWidth = Math.max(2, Math.round(size * 0.08));
    const normalizedValue = (itemData?.value || '').toLowerCase();
    let shape = null;

    const addShape = (gameObject) => {
        if (!gameObject) return;
        gameObject.setPosition(0, 0);
        if (gameObject.setOrigin) gameObject.setOrigin(0.5, 0.5);
        if (gameObject.setStrokeStyle) gameObject.setStrokeStyle(strokeWidth, strokeColor, strokeAlpha);
        container.add(gameObject);
        shape = gameObject;
    };

    switch (normalizedValue) {
        case 'square':
            addShape(scene.add.rectangle(0, 0, size * 0.9, size * 0.9, fillColorInt));
            break;
        case 'triangle':
            addShape(scene.add.polygon(0, 0, polygonPoints(size, [[size / 2, 0], [size, size], [0, size]]), fillColorInt));
            break;
        case 'star':
            // star(x, y, points, innerRadius, outerRadius): outer radius is half the shape size
            addShape(scene.add.star(0, 0, 5, size * 0.24, size * 0.5, fillColorInt));
            break;
        case 'diamond':
            addShape(scene.add.polygon(0, 0, polygonPoints(size, [[size / 2, 0], [size, size / 2], [size / 2, size], [0, size / 2]]), fillColorInt));
            break;
        case 'heart':
            addShape(scene.add.polygon(0, 0, getHeartPoints(size), fillColorInt));
            break;
        case 'circle':
        default:
            addShape(scene.add.circle(0, 0, size / 2, fillColorInt));
            break;
    }

    container.mainShape = shape;
    container.shapeSize = size;
    container.text = labelText || itemData?.value || '';
    container.componentLayout = container.componentLayout || {};
    container.componentLayout.labelVerticalOffset = calculateShapeLabelOffset(scene, size);
    const hitSize = size + Math.round(size * 0.15);
    container.setSize(hitSize, hitSize);
    container.setInteractive(new Phaser.Geom.Rectangle(-hitSize / 2, -hitSize / 2, hitSize, hitSize), Phaser.Geom.Rectangle.Contains);

    return container;
}
