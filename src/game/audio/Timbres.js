/**
 * Timbres - one gentle, fully synthesised voice per kind of object.
 * A timbre is a set of sine partials (ratio to the note, relative gain, decay in seconds)
 * with a fast attack; nothing is a raw square or saw, nothing sustains.
 */
export const KINDS = ['emoji', 'letter', 'number', 'shape'];

export const TIMBRES = {
    // soft marimba / kalimba pluck: a quick fourth-octave partial that dies fast
    emoji:  { wave: 'sine', attack: 0.008, partials: [{ r: 1, g: 1, d: 0.6 }, { r: 4, g: 0.28, d: 0.14 }, { r: 9.2, g: 0.06, d: 0.05 }] },
    // warm triangle pluck
    letter: { wave: 'triangle', attack: 0.012, partials: [{ r: 1, g: 1, d: 0.55 }, { r: 2, g: 0.22, d: 0.3, wave: 'sine' }] },
    // small bell: a couple of inharmonic partials, the longest ring
    number: { wave: 'sine', attack: 0.005, partials: [{ r: 1, g: 1, d: 1.0 }, { r: 2.76, g: 0.32, d: 0.55 }, { r: 5.4, g: 0.14, d: 0.28 }, { r: 8.9, g: 0.05, d: 0.12 }] },
    // rounder, hollow tone: fundamental plus odd harmonics only
    shape:  { wave: 'sine', attack: 0.014, partials: [{ r: 1, g: 1, d: 0.5 }, { r: 3, g: 0.22, d: 0.3 }, { r: 5, g: 0.07, d: 0.15 }] },
};

// obj.type holds the singular names (emoji, shape, number, letter); the plural spawn types are accepted too
const KIND_OF_TYPE = {
    emoji: 'emoji',
    shape: 'shape',
    number: 'number',
    letter: 'letter',
    shapes: 'shape',
    smallNumbers: 'number',
    largeNumbers: 'number',
    uppercaseLetters: 'letter',
    lowercaseLetters: 'letter',
};

export function kindOfType(type) {
    return KIND_OF_TYPE[type] || 'emoji';
}
