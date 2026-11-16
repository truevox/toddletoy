/** Maps a speech boundary `charIndex` onto the caption word being spoken. */

/** Start offset of each word when the words are joined with single spaces. */
export function wordStartOffsets(words) {
    const offsets = [];
    let at = 0;
    words.forEach(word => {
        offsets.push(at);
        at += word.length + 1;
    });
    return offsets;
}

/** Index of the word containing `charIndex` (UTF-16 units, as JS strings and the Web Speech API use). */
export function wordIndexAt(offsets, charIndex) {
    if (!offsets.length || !Number.isFinite(charIndex) || charIndex < 0) return -1;
    let index = 0;
    for (let i = 0; i < offsets.length; i++) {
        if (offsets[i] <= charIndex) index = i; else break;
    }
    return index;
}
