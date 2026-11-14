/**
 * NumberModeLayout - non-overlapping vertical stack for the rows drawn above
 * a number's main numeral (binary hearts, Kaktovik, Cistercian).
 *
 * Rows are measured, not guessed: each row starts a fixed gap above the top
 * edge of the row beneath it, so rows can never touch the numeral or each other
 * regardless of font metrics or screen scale.
 */

// Extra upward nudge (px) on top of the base gap. CLAUDE-TODO Phase 14:
// Kaktovik sits 3-5px higher and Cistercian 5-10px higher than the old layout.
export const KAKTOVIK_LIFT = 4;
export const CISTERCIAN_LIFT = 7;
export const ROW_GAP = 6;

/**
 * @param {Array<{type:string,height:number,lift?:number}>} rows - ordered from nearest the numeral upwards
 * @param {number} mainHalfHeight - half the height of the main numeral
 * @param {number} [gap] - minimum gap between stacked edges
 * @returns {Object<string, number>} type -> Y offset of the row's CENTRE relative to the numeral centre (negative = above)
 */
export function computeAboveStackOffsets(rows, mainHalfHeight, gap = ROW_GAP) {
    const offsets = {};
    let cursor = Math.max(0, mainHalfHeight) + gap; // distance above the numeral centre where the next row's bottom edge goes

    rows.forEach(row => {
        const height = Math.max(0, row.height || 0);
        const lift = row.lift || 0;
        const bottomEdge = cursor + lift;
        offsets[row.type] = -Math.round(bottomEdge + height / 2);
        cursor = bottomEdge + height + gap;
    });

    return offsets;
}
