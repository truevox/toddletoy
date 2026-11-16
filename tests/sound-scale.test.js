import { SCALE_FREQS, SCALE_SIZE, noteIndexForY, noteFreq, noteName, isScaleFreq } from '../src/game/audio/Scale.js';
import { kindOfType, TIMBRES, KINDS } from '../src/game/audio/Timbres.js';

describe('pentatonic scale', () => {
    test('spans about two and a half octaves, ascending', () => {
        expect(SCALE_SIZE).toBe(13);
        for (let i = 1; i < SCALE_SIZE; i++) expect(SCALE_FREQS[i]).toBeGreaterThan(SCALE_FREQS[i - 1]);
        const octaves = Math.log2(SCALE_FREQS[SCALE_SIZE - 1] / SCALE_FREQS[0]);
        expect(octaves).toBeGreaterThan(2.2);
        expect(octaves).toBeLessThan(2.8);
    });

    test('height to note is monotonic: higher on screen is never lower in pitch', () => {
        let last = -1;
        for (let y = 600; y >= 0; y -= 3) {
            const i = noteIndexForY(y, 600);
            expect(i).toBeGreaterThanOrEqual(last);
            last = i;
        }
        expect(noteIndexForY(600, 600)).toBe(0);
        expect(noteIndexForY(0, 600)).toBe(SCALE_SIZE - 1);
    });

    test('every produced frequency is a note of C major pentatonic', () => {
        const pcs = new Set([0, 2, 4, 7, 9]);
        for (let y = -50; y <= 700; y += 7) {
            const f = noteFreq(noteIndexForY(y, 600));
            expect(isScaleFreq(f)).toBe(true);
            const semis = Math.round(12 * Math.log2(f / 261.6256)) % 12;
            expect(pcs.has((semis + 12) % 12)).toBe(true);
        }
        expect(isScaleFreq(300)).toBe(false);
    });

    test('out-of-range and bad input are clamped, never NaN', () => {
        expect(noteIndexForY(-1e9, 600)).toBe(SCALE_SIZE - 1);
        expect(noteIndexForY(1e9, 600)).toBe(0);
        expect(noteIndexForY(NaN, 600)).toBeGreaterThanOrEqual(0);
        expect(noteIndexForY(10, 0)).toBeGreaterThanOrEqual(0);
        expect(noteName(0)).toBe('C4');
        expect(noteName(5)).toBe('C5');
    });
});

describe('timbre by kind of object', () => {
    test('maps every spawn type to a kind', () => {
        expect(kindOfType('emoji')).toBe('emoji');
        expect(kindOfType('shapes')).toBe('shape');
        expect(kindOfType('smallNumbers')).toBe('number');
        expect(kindOfType('largeNumbers')).toBe('number');
        expect(kindOfType('uppercaseLetters')).toBe('letter');
        expect(kindOfType('lowercaseLetters')).toBe('letter');
        expect(kindOfType('shape')).toBe('shape');
        expect(kindOfType('number')).toBe('number');
        expect(kindOfType('letter')).toBe('letter');
        expect(kindOfType('mystery')).toBe('emoji');
        expect(kindOfType(undefined)).toBe('emoji');
    });

    test('timbres are distinct, gentle (sine/triangle only) and decay within 1.5 s', () => {
        const sigs = new Set();
        for (const k of KINDS) {
            const t = TIMBRES[k];
            expect(['sine', 'triangle']).toContain(t.wave);
            sigs.add(JSON.stringify(t.partials));
            for (const p of t.partials) expect(t.attack + p.d).toBeLessThan(1.5);
            expect(t.partials[0].r).toBe(1);
        }
        expect(sigs.size).toBe(KINDS.length);
    });
});
