import { layoutNumber } from './CistercianGlyph.js';

// Size of one glyph cell in px at scale 1 (stave height = 3 cells = 39px)
export const CELL_SIZE = 13;
export const STROKE_RATIO = 0.24;   // stroke width as a fraction of one cell
const CAP_STEPS = 8;                // arc steps per round cap

/** Stroke width (px) for a given cell size. */
export function strokeWidthFor(cell) {
    return Math.max(2, Math.round(cell * STROKE_RATIO * 10) / 10);
}

/**
 * Polygon outlining one stroke as a capsule (a line with round caps). Pure
 * geometry, so the glyph stays vector-sharp at any size or pixel ratio.
 * @returns {Array<{x:number,y:number}>}
 */
export function capsulePoints(x1, y1, x2, y2, radius, steps = CAP_STEPS) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const points = [];
    for (let i = 0; i <= steps; i++) {            // cap around the end point
        const a = angle - Math.PI / 2 + (Math.PI * i) / steps;
        points.push({ x: x2 + Math.cos(a) * radius, y: y2 + Math.sin(a) * radius });
    }
    for (let i = 0; i <= steps; i++) {            // cap around the start point
        const a = angle + Math.PI / 2 + (Math.PI * i) / steps;
        points.push({ x: x1 + Math.cos(a) * radius, y: y1 + Math.sin(a) * radius });
    }
    return points;
}

/** Fill every stroke of a number into a Graphics object, centred on its local origin. */
export function drawCistercianFigure(graphics, layout, cell, color = 0xffffff) {
    const radius = strokeWidthFor(cell) / 2;
    const top = -(layout.height * cell) / 2;
    graphics.clear();
    graphics.fillStyle(color, 1);
    layout.glyphs.forEach(glyph => {
        glyph.segments.forEach(s => {
            graphics.fillPoints(capsulePoints(
                (s.x1 + glyph.centerX) * cell, top + s.y1 * cell,
                (s.x2 + glyph.centerX) * cell, top + s.y2 * cell,
                radius
            ), true);
        });
    });
    return graphics;
}

/**
 * Create a procedurally drawn Cistercian numeral (no font, no text object).
 *
 * It is a plain Phaser Graphics object centred on (x, y), so setPosition,
 * setAlpha, setVisible, scale and destroy behave like any other numeral
 * component. Graphics has no size of its own, so width/height/displayHeight
 * and getBounds are attached for the stack layout and for BoundsClamp.
 *
 * @param {Phaser.Scene} scene
 * @param {number} x - centre X
 * @param {number} y - centre Y
 * @param {number} number - non-negative integer (groups of four digits become separate glyphs)
 * @param {{cell?:number,color?:number}} [options]
 */
export function createCistercianNumeral(scene, x, y, number, options = {}) {
    const cell = options.cell || CELL_SIZE;
    const layout = layoutNumber(number);
    const stroke = strokeWidthFor(cell);
    const width = layout.width * cell + stroke;
    const height = layout.height * cell + stroke;

    const graphics = scene.add.graphics({ x, y });
    drawCistercianFigure(graphics, layout, cell, options.color);

    Object.defineProperties(graphics, {
        width: { value: width, configurable: true },
        height: { value: height, configurable: true },
        displayWidth: { get() { return width * (this.scaleX ?? 1); }, configurable: true },
        displayHeight: { get() { return height * (this.scaleY ?? 1); }, configurable: true }
    });
    graphics.numberValue = number;
    graphics.figure = layout;
    graphics.getBounds = function getBounds(output = {}) {
        const w = this.displayWidth;
        const h = this.displayHeight;
        output.x = this.x - w / 2;
        output.y = this.y - h / 2;
        output.width = w;
        output.height = h;
        return output;
    };
    return graphics;
}
