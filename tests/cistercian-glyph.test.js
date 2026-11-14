import {
    digitSegments, positionedDigitSegments, glyphSegments, glyphDigits, splitIntoGlyphValues,
    layoutNumber, numberSegments, STAVE_HEIGHT, GLYPH_WIDTH, GLYPH_GAP
} from '../src/game/systems/CistercianGlyph.js';

const S = (x1, y1, x2, y2) => ({ x1, y1, x2, y2 });

// Order- and direction-insensitive comparison of segment lists
const norm = (segs) => segs
    .map(s => {
        const a = [s.x1, s.y1], b = [s.x2, s.y2];
        const [p, q] = (a[0] < b[0] || (a[0] === b[0] && a[1] <= b[1])) ? [a, b] : [b, a];
        return `${p[0]},${p[1]}-${q[0]},${q[1]}`;
    })
    .sort();

const expectSegs = (actual, expected) => expect(norm(actual)).toEqual(norm(expected));

// The definition, written out independently for units (cell x 0..1 outward, y 0..1 down)
const TOP = S(0, 0, 1, 0);
const BOTTOM = S(0, 1, 1, 1);
const DOWN = S(0, 0, 1, 1);
const UP = S(0, 1, 1, 0);
const OUTER = S(1, 0, 1, 1);
const UNITS = {
    1: [TOP],
    2: [BOTTOM],
    3: [DOWN],
    4: [UP],
    5: [TOP, UP],
    6: [OUTER],
    7: [TOP, OUTER],
    8: [BOTTOM, OUTER],
    9: [TOP, BOTTOM, OUTER]
};
const H = STAVE_HEIGHT;
const mirrorX = (s) => S(-s.x1, s.y1, -s.x2, s.y2);
const flipY = (s) => S(s.x1, H - s.y1, s.x2, H - s.y2);
const AS = {
    units: (s) => s,
    tens: mirrorX,
    hundreds: flipY,
    thousands: (s) => flipY(mirrorX(s))
};

describe('Cistercian glyph model', () => {
    test('dimensions: stave 3 cells so upper and lower cells never touch', () => {
        expect(STAVE_HEIGHT).toBe(3);
        expect(GLYPH_WIDTH).toBe(2);
        expect(STAVE_HEIGHT).toBeGreaterThan(2);
    });

    describe('each digit 1-9 in each of the four positions', () => {
        for (const position of ['units', 'tens', 'hundreds', 'thousands']) {
            for (let digit = 1; digit <= 9; digit++) {
                test(`digit ${digit} at ${position}`, () => {
                    expectSegs(positionedDigitSegments(digit, position), UNITS[digit].map(AS[position]));
                });
            }
        }
    });

    test('mirroring and flipping move strokes to the right corners', () => {
        // digit 1 = a top stroke: units upper-right, tens upper-left, hundreds lower-right, thousands lower-left
        expectSegs(positionedDigitSegments(1, 'units'), [S(0, 0, 1, 0)]);
        expectSegs(positionedDigitSegments(1, 'tens'), [S(0, 0, -1, 0)]);
        expectSegs(positionedDigitSegments(1, 'hundreds'), [S(0, 3, 1, 3)]);
        expectSegs(positionedDigitSegments(1, 'thousands'), [S(0, 3, -1, 3)]);
    });

    test('digit shapes in the units cell match the written definition', () => {
        expectSegs(digitSegments(1), [S(0, 0, 1, 0)]);
        expectSegs(digitSegments(2), [S(0, 1, 1, 1)]);
        expectSegs(digitSegments(3), [S(0, 0, 1, 1)]);
        expectSegs(digitSegments(4), [S(0, 1, 1, 0)]);
        expectSegs(digitSegments(6), [S(1, 0, 1, 1)]);
        expect(digitSegments(0)).toEqual([]);
    });

    test('composite digits are unions of their parts', () => {
        const u = (d) => norm(digitSegments(d));
        const union = (...ds) => [...new Set(ds.flatMap(u))].sort();
        expect(u(5)).toEqual(union(1, 4));
        expect(u(7)).toEqual(union(1, 6));
        expect(u(8)).toEqual(union(2, 6));
        expect(u(9)).toEqual(union(1, 2, 6));
        expect(u(9)).toEqual(union(7, 8));
    });

    test('digits other than 0-9 are rejected', () => {
        expect(() => digitSegments(10)).toThrow(RangeError);
        expect(() => positionedDigitSegments(1, 'millions')).toThrow(RangeError);
    });

    describe('whole glyphs', () => {
        test('0 is the bare stave', () => {
            expectSegs(glyphSegments(0), [S(0, 0, 0, 3)]);
        });

        test('every glyph starts with the full stave', () => {
            [1, 10, 100, 1000, 1993, 9999].forEach(n => {
                expectSegs(glyphSegments(n).slice(0, 1), [S(0, 0, 0, 3)]);
            });
        });

        test('1993: 1000 lower-left, 900 lower-right, 90 upper-left, 3 upper-right', () => {
            expectSegs(glyphSegments(1993), [
                S(0, 0, 0, 3),
                ...[1].map(() => AS.thousands(TOP)),
                ...[TOP, BOTTOM, OUTER].map(AS.hundreds),
                ...[TOP, BOTTOM, OUTER].map(AS.tens),
                DOWN
            ]);
            expect(glyphDigits(1993)).toEqual({ units: 3, tens: 9, hundreds: 9, thousands: 1 });
        });

        test('9999 is four boxes with the stave', () => {
            const expected = [S(0, 0, 0, 3)];
            for (const p of ['units', 'tens', 'hundreds', 'thousands']) {
                expected.push(...[TOP, BOTTOM, OUTER].map(AS[p]));
            }
            expectSegs(glyphSegments(9999), expected);
        });

        test('digits are independent: a glyph is the union of its positions', () => {
            [10, 305, 4027, 8814, 6060].forEach(n => {
                const d = glyphDigits(n);
                const expected = [S(0, 0, 0, 3)];
                for (const p of ['units', 'tens', 'hundreds', 'thousands']) {
                    if (d[p]) expected.push(...UNITS[d[p]].map(AS[p]));
                }
                expectSegs(glyphSegments(n), expected);
            });
        });

        test('no segment leaves the glyph bounding box (x -1..1, y 0..3), for every value 0-9999', () => {
            for (let n = 0; n <= 9999; n++) {
                for (const s of glyphSegments(n)) {
                    for (const v of [s.x1, s.x2]) expect(v >= -1 && v <= 1).toBe(true);
                    for (const v of [s.y1, s.y2]) expect(v >= 0 && v <= 3).toBe(true);
                }
            }
        });

        test('values outside a single glyph are rejected by glyphSegments', () => {
            expect(() => glyphSegments(10000)).toThrow(RangeError);
            expect(() => glyphSegments(-1)).toThrow(RangeError);
            expect(() => glyphSegments(1.5)).toThrow(RangeError);
        });
    });

    describe('multi-glyph numbers', () => {
        test('grouping by four decimal digits, most significant first', () => {
            expect(splitIntoGlyphValues(0)).toEqual([0]);
            expect(splitIntoGlyphValues(9999)).toEqual([9999]);
            expect(splitIntoGlyphValues(10000)).toEqual([1, 0]);
            expect(splitIntoGlyphValues(12345)).toEqual([1, 2345]);
            expect(splitIntoGlyphValues(100000)).toEqual([10, 0]);
            expect(splitIntoGlyphValues(123456789)).toEqual([1, 2345, 6789]);
        });

        test('12345 is two glyphs, 1 on the left and 2345 on the right, with a gap', () => {
            const layout = layoutNumber(12345);
            expect(layout.glyphs.map(g => g.value)).toEqual([1, 2345]);
            expect(layout.width).toBe(2 * GLYPH_WIDTH + GLYPH_GAP);
            const [left, right] = layout.glyphs;
            expect(right.centerX - left.centerX).toBe(GLYPH_WIDTH + GLYPH_GAP);
            // clear gap between the outer edges of adjacent glyphs
            expect((right.centerX - 1) - (left.centerX + 1)).toBe(GLYPH_GAP);
            expect(GLYPH_GAP).toBeGreaterThan(0);
            expectSegs(left.segments, glyphSegments(1));
            expectSegs(right.segments, glyphSegments(2345));
        });

        test('100000 is glyph 10 then glyph 0 (bare stave)', () => {
            const layout = layoutNumber(100000);
            expect(layout.glyphs.map(g => g.value)).toEqual([10, 0]);
            expectSegs(layout.glyphs[1].segments, [S(0, 0, 0, 3)]);
            expectSegs(layout.glyphs[0].segments, glyphSegments(10));
        });

        test('three groups are laid out left to right, centred overall', () => {
            const layout = layoutNumber(123456789);
            expect(layout.glyphs).toHaveLength(3);
            const xs = layout.glyphs.map(g => g.centerX);
            expect(xs[0]).toBeLessThan(xs[1]);
            expect(xs[1]).toBeLessThan(xs[2]);
            expect(xs[0] + xs[2]).toBeCloseTo(0);
            expect(layout.width).toBe(3 * GLYPH_WIDTH + 2 * GLYPH_GAP);
        });

        test('combined segments stay inside the figure box', () => {
            [12345, 100000, 987654321].forEach(n => {
                const { width, height } = layoutNumber(n);
                numberSegments(n).forEach(s => {
                    [s.x1, s.x2].forEach(x => expect(Math.abs(x)).toBeLessThanOrEqual(width / 2 + 1e-9));
                    [s.y1, s.y2].forEach(y => expect(y >= 0 && y <= height).toBe(true));
                });
            });
        });

        test('glyphs do not overlap each other', () => {
            const { glyphs } = layoutNumber(98765432);
            for (let i = 1; i < glyphs.length; i++) {
                expect(glyphs[i].centerX - 1).toBeGreaterThan(glyphs[i - 1].centerX + 1);
            }
        });

        test('non-numeric and negative input falls back to the bare stave', () => {
            expect(splitIntoGlyphValues(-5)).toEqual([0]);
            expect(splitIntoGlyphValues(NaN)).toEqual([0]);
        });
    });
});
