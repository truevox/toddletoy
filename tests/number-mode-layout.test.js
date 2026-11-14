import { computeAboveStackOffsets, ROW_GAP, KAKTOVIK_LIFT, CISTERCIAN_LIFT } from '../src/game/systems/NumberModeLayout.js';

describe('NumberModeLayout.computeAboveStackOffsets', () => {
    const main = 18.5; // half of a 37px numeral

    function edges(rows, offsets) {
        return rows.map(r => ({ type: r.type, top: offsets[r.type] - r.height / 2, bottom: offsets[r.type] + r.height / 2 }));
    }

    test('hearts never touch the numeral (regression: cistercian+kaktovik+binary overlapped)', () => {
        const rows = [
            { type: 'binary', height: 19 },
            { type: 'kaktovik', height: 38, lift: KAKTOVIK_LIFT },
            { type: 'cistercian', height: 37, lift: CISTERCIAN_LIFT }
        ];
        const offsets = computeAboveStackOffsets(rows, main);
        const e = edges(rows, offsets);
        // binary row bottom edge is above the numeral top edge (-main) by at least the gap (rounding tolerance 1px)
        expect(e[0].bottom).toBeLessThanOrEqual(-main - ROW_GAP + 1);
    });

    test('rows stack without overlapping each other, nearest-first', () => {
        const rows = [
            { type: 'binary', height: 19 },
            { type: 'kaktovik', height: 38, lift: KAKTOVIK_LIFT },
            { type: 'cistercian', height: 37, lift: CISTERCIAN_LIFT }
        ];
        const e = edges(rows, computeAboveStackOffsets(rows, main));
        expect(e[1].bottom).toBeLessThanOrEqual(e[0].top - ROW_GAP + 1);
        expect(e[2].bottom).toBeLessThanOrEqual(e[1].top - ROW_GAP + 1);
    });

    test('kaktovik and cistercian are lifted by their extra nudge (Phase 14)', () => {
        const withLift = computeAboveStackOffsets([{ type: 'kaktovik', height: 38, lift: KAKTOVIK_LIFT }], main);
        const noLift = computeAboveStackOffsets([{ type: 'kaktovik', height: 38 }], main);
        expect(noLift.kaktovik - withLift.kaktovik).toBe(KAKTOVIK_LIFT);
        expect(KAKTOVIK_LIFT).toBeGreaterThanOrEqual(3);
        expect(KAKTOVIK_LIFT).toBeLessThanOrEqual(5);
        expect(CISTERCIAN_LIFT).toBeGreaterThanOrEqual(5);
        expect(CISTERCIAN_LIFT).toBeLessThanOrEqual(10);
    });

    test('single row and empty input are handled', () => {
        expect(computeAboveStackOffsets([], main)).toEqual({});
        expect(computeAboveStackOffsets([{ type: 'binary', height: 20 }], main).binary).toBeLessThan(0);
    });
});
