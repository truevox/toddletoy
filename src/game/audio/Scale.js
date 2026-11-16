/**
 * Scale - the one musical scale the whole toy plays in.
 * C major pentatonic, C4 up to E6 (13 notes, two and a half octaves): no note clashes
 * with any other, so any sequence of taps sounds pleasant.
 */
const C4 = 261.6256;
const STEPS = [0, 2, 4, 7, 9];   // semitones within an octave
const NAMES = ['C', 'D', 'E', 'G', 'A'];
export const SCALE_SIZE = 13;

export const SCALE_FREQS = Array.from({ length: SCALE_SIZE }, (_, i) => {
    const oct = Math.floor(i / 5), semis = oct * 12 + STEPS[i % 5];
    return C4 * Math.pow(2, semis / 12);
});

/** Scale step for a screen height: bottom is the lowest note, top the highest. */
export function noteIndexForY(y, height) {
    const h = Number.isFinite(height) && height > 0 ? height : 1;
    const v = Number.isFinite(y) ? y : h / 2;
    const t = 1 - Math.min(1, Math.max(0, v / h));
    return Math.min(SCALE_SIZE - 1, Math.floor(t * SCALE_SIZE));
}

export function noteFreq(index) {
    return SCALE_FREQS[Math.min(SCALE_SIZE - 1, Math.max(0, index | 0))];
}

export function noteName(index) {
    const i = Math.min(SCALE_SIZE - 1, Math.max(0, index | 0));
    return NAMES[i % 5] + (4 + Math.floor(i / 5));
}

export function isScaleFreq(f) {
    return SCALE_FREQS.some((s) => Math.abs(s - f) < 0.01);
}
