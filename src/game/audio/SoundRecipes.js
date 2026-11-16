/**
 * SoundRecipes - turns an event into a sound spec: a few enveloped parts (partials, pitch
 * sweeps, filtered noise) for the voice builder. Pure data, no Web Audio here.
 *
 * Part shapes (all times in seconds, relative to the voice start):
 *   { t:'partial', wave, freq, ratio, gain, attack, decay, delay }
 *   { t:'sweep',   wave, points:[[0..1, Hz], ...], gain, attack, decay, delay }   (decay = sweep length)
 *   { t:'noise',   filter:{ type, points, q }, gain, attack, decay, delay }
 */
import { noteFreq, noteName } from './Scale.js';
import { TIMBRES } from './Timbres.js';

export const EVENTS = ['spawn', 'tap', 'pickup', 'dragStep', 'drop', 'throw', 'bounce', 'pop'];
const PRIORITY = { spawn: 3, tap: 3, pop: 3, pickup: 2, drop: 2, throw: 2, bounce: 1, dragStep: 1 };
const MAX_PARTIAL_HZ = 9000;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** The kind's pluck: partials of the note. bright lifts the upper partials; decayScale shortens it. */
export function noteParts(kind, freq, { bright = false, decayScale = 1 } = {}) {
    const tb = TIMBRES[kind] || TIMBRES.emoji;
    const parts = [];
    tb.partials.forEach((p, i) => {
        const f = freq * p.r;
        if (f > MAX_PARTIAL_HZ) return;
        parts.push({
            t: 'partial', wave: i === 0 ? tb.wave : (p.wave || 'sine'), freq: f, ratio: p.r,
            gain: p.g * (bright && p.r > 1 ? 1.8 : 1), attack: tb.attack, decay: p.d * decayScale,
        });
    });
    return parts;
}

const sweep = (wave, points, gain, attack, decay, delay = 0) => ({ t: 'sweep', wave, points, gain, attack, decay, delay });
const noise = (type, points, q, gain, attack, decay, delay = 0) => ({ t: 'noise', filter: { type, points, q }, gain, attack, decay, delay });

function build(event, ctx, level, parts) {
    const end = parts.reduce((m, p) => Math.max(m, (p.delay || 0) + p.attack + p.decay), 0);
    return {
        event, kind: ctx.kind, noteIndex: ctx.noteIndex, note: noteName(ctx.noteIndex), freq: noteFreq(ctx.noteIndex),
        pan: ctx.pan, priority: PRIORITY[event] || 1, level, parts, dur: end + 0.02,
    };
}

export function makeSound(event, opts = {}) {
    const ctx = {
        kind: opts.kind || 'emoji', noteIndex: opts.noteIndex | 0,
        strength: clamp(Number.isFinite(opts.strength) ? opts.strength : 1, 0, 1),
        pan: clamp(Number.isFinite(opts.pan) ? opts.pan : 0, -1, 1),
    };
    const f = noteFreq(ctx.noteIndex);
    switch (event) {
        case 'spawn': // the object's note plus a tiny soft pop
            return build(event, ctx, 0.5, [...noteParts(ctx.kind, f),
                noise('lowpass', [[0, 1800], [1, 900]], 0.7, 0.5, 0.002, 0.03)]);
        case 'tap': // the same note again, a little brighter
            return build(event, ctx, 0.48, noteParts(ctx.kind, f, { bright: true }));
        case 'dragStep': // a soft, short xylophone step under the finger
            return build(event, ctx, 0.3, noteParts(ctx.kind, f, { decayScale: 0.5 }));
        case 'pickup': // small upward blip (a fifth up)
            return build(event, ctx, 0.35, [sweep('sine', [[0, f], [1, f * 1.5]], 1, 0.006, 0.11)]);
        case 'drop': // soft low thud
            return build(event, ctx, 0.55, [sweep('sine', [[0, 150], [1, 55]], 1, 0.004, 0.16),
                noise('lowpass', [[0, 500], [1, 300]], 0.7, 0.35, 0.003, 0.04)]);
        case 'throw': // whoosh and an octave sweep up
            return build(event, ctx, 0.4, [noise('bandpass', [[0, 500], [1, 2800]], 1.5, 0.7, 0.04, 0.2),
                sweep('sine', [[0, f], [1, f * 2]], 0.5, 0.02, 0.2)]);
        case 'bounce': { // soft boing, louder with impact
            const b = Math.max(130, f / 2);
            return build(event, ctx, 0.25 + 0.4 * ctx.strength, [
                sweep('sine', [[0, b * 1.4], [0.25, b * 0.75], [1, b]], 1, 0.005, 0.22),
                sweep('sine', [[0, b * 2.8], [0.25, b * 1.5], [1, b * 2]], 0.2, 0.005, 0.15)]);
        }
        case 'pop': // cute descending pop
            return build(event, ctx, 0.45, [sweep('sine', [[0, f * 1.6], [1, f * 0.55]], 1, 0.003, 0.14),
                noise('highpass', [[0, 2000], [1, 2000]], 0.7, 0.25, 0.002, 0.02)]);
        default:
            return build('tap', ctx, 0.4, noteParts(ctx.kind, f));
    }
}
