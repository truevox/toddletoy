/**
 * CistercianGlyph - pure model of the Cistercian ("monk") numeral system.
 * No Phaser, no fonts: a number becomes a list of line segments in glyph units.
 *
 * Definition (drawn from the system itself, not from any typeface):
 *  - A vertical stave. One glyph holds any integer 0-9999 (0 is the bare stave).
 *  - Four corners carry the four decimal places:
 *      units     upper-right
 *      tens      upper-left   (units mirrored across the stave)
 *      hundreds  lower-right  (units flipped vertically)
 *      thousands lower-left   (units flipped both ways)
 *  - Units shapes sit in a one-by-one cell attached to the top of the stave
 *    (stave at x = 0, cell spans x 0..1 outward, y 0..1 down from the top):
 *      1 top stroke              2 bottom stroke of the cell
 *      3 diagonal stave-top to outer-bottom
 *      4 diagonal stave-bottom to outer-top
 *      5 = 1 + 4     6 outer vertical edge     7 = 1 + 6     8 = 2 + 6     9 = 1 + 2 + 6
 *  - 10000 and above: groups of four decimal digits become separate glyphs,
 *    most significant group on the left, separated by a clear gap.
 *
 * Coordinates: x grows right, y grows down. A glyph occupies
 * x in [-1, 1] (stave at 0) and y in [0, 3] (stave height = 3 cells, so the
 * upper and lower cells never touch).
 */

export const STAVE_HEIGHT = 3;
export const GLYPH_WIDTH = 2;
export const GLYPH_GAP = 1;      // gap between glyphs in a multi-glyph number, in cells
export const MAX_GLYPH_VALUE = 9999;
export const POSITIONS = ['units', 'tens', 'hundreds', 'thousands'];

const seg = (x1, y1, x2, y2) => ({ x1, y1, x2, y2 });

// Atomic strokes in the units cell
const TOP = seg(0, 0, 1, 0);
const BOTTOM = seg(0, 1, 1, 1);
const DOWN_DIAGONAL = seg(0, 0, 1, 1);   // stave top -> outer bottom
const UP_DIAGONAL = seg(0, 1, 1, 0);     // stave bottom -> outer top
const OUTER = seg(1, 0, 1, 1);

const DIGIT_STROKES = {
    0: [],
    1: [TOP],
    2: [BOTTOM],
    3: [DOWN_DIAGONAL],
    4: [UP_DIAGONAL],
    5: [TOP, UP_DIAGONAL],
    6: [OUTER],
    7: [TOP, OUTER],
    8: [BOTTOM, OUTER],
    9: [TOP, BOTTOM, OUTER]
};

/** Units-cell segments for a digit 0-9 (fresh copies). */
export function digitSegments(digit) {
    const strokes = DIGIT_STROKES[digit];
    if (!strokes) throw new RangeError(`Cistercian digit out of range: ${digit}`);
    return strokes.map(s => ({ ...s }));
}

/** Mirror/flip that carries the units shape to each position. */
function transformFor(position) {
    switch (position) {
        case 'units': return { flipX: false, flipY: false };
        case 'tens': return { flipX: true, flipY: false };
        case 'hundreds': return { flipX: false, flipY: true };
        case 'thousands': return { flipX: true, flipY: true };
        default: throw new RangeError(`Unknown Cistercian position: ${position}`);
    }
}

/** Segments of one digit placed at one of the four positions of a glyph. */
export function positionedDigitSegments(digit, position) {
    const { flipX, flipY } = transformFor(position);
    return digitSegments(digit).map(s => ({
        x1: flipX ? -s.x1 : s.x1,
        y1: flipY ? STAVE_HEIGHT - s.y1 : s.y1,
        x2: flipX ? -s.x2 : s.x2,
        y2: flipY ? STAVE_HEIGHT - s.y2 : s.y2
    }));
}

/** Split 0-9999 into its four digits. */
export function glyphDigits(value) {
    if (!Number.isInteger(value) || value < 0 || value > MAX_GLYPH_VALUE) {
        throw new RangeError(`A single Cistercian glyph holds 0-${MAX_GLYPH_VALUE}, got ${value}`);
    }
    return {
        units: value % 10,
        tens: Math.floor(value / 10) % 10,
        hundreds: Math.floor(value / 100) % 10,
        thousands: Math.floor(value / 1000)
    };
}

/**
 * Segments of ONE glyph (0-9999): the stave first, then each non-zero position.
 * Everything lies within x [-1, 1], y [0, 3].
 */
export function glyphSegments(value) {
    const digits = glyphDigits(value);
    const segments = [seg(0, 0, 0, STAVE_HEIGHT)];
    POSITIONS.forEach(position => {
        if (digits[position] > 0) segments.push(...positionedDigitSegments(digits[position], position));
    });
    return segments;
}

/** Four-decimal-digit groups, most significant first: 12345 -> [1, 2345]. */
export function splitIntoGlyphValues(number) {
    if (!Number.isFinite(number) || number < 0) return [0];
    const n = Math.floor(number);
    if (n === 0) return [0];
    const groups = [];
    let rest = n;
    while (rest > 0) {
        groups.unshift(rest % 10000);
        rest = Math.floor(rest / 10000);
    }
    return groups;
}

/**
 * Full layout for any non-negative integer.
 * Glyph i is centred on its own stave at `centerX` (in cells, relative to the
 * centre of the whole figure); the figure spans [-width/2, width/2] x [0, height].
 * @returns {{glyphs: Array<{value:number, centerX:number, segments:Array}>, width:number, height:number}}
 */
export function layoutNumber(number) {
    const values = splitIntoGlyphValues(number);
    const width = values.length * GLYPH_WIDTH + (values.length - 1) * GLYPH_GAP;
    const glyphs = values.map((value, i) => ({
        value,
        centerX: -width / 2 + GLYPH_WIDTH / 2 + i * (GLYPH_WIDTH + GLYPH_GAP),
        segments: glyphSegments(value)
    }));
    return { glyphs, width, height: STAVE_HEIGHT };
}

/** All segments of a number in figure coordinates (x centred, y from the top). */
export function numberSegments(number) {
    const { glyphs } = layoutNumber(number);
    return glyphs.flatMap(g => g.segments.map(s => ({
        x1: s.x1 + g.centerX, y1: s.y1, x2: s.x2 + g.centerX, y2: s.y2
    })));
}
