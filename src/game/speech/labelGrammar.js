/**
 * Label grammar: how "colour + noun" is written in each language.
 * A small table (order, gender, feminine colour forms) drives the result, so
 * captions and speech always say the same natural phrase.
 * This module has no imports on purpose: callers resolve the words, it arranges them.
 */

/** 'adj-noun' (Red Circle), 'noun-adj' (Círculo rojo), 'joined' (红色圆形, no space). */
export const WORD_ORDER = {
    en: 'adj-noun', es: 'noun-adj', fr: 'noun-adj', pt: 'noun-adj', id: 'noun-adj',
    ar: 'noun-adj', tlh: 'noun-adj',
    hi: 'adj-noun', bn: 'adj-noun', ru: 'adj-noun', eo: 'adj-noun', jbo: 'adj-noun',
    zh: 'joined'
};

/** Languages written "Sentence case": first word capital, the colour lower-case. */
const SENTENCE_CASE = new Set(['es', 'fr', 'pt']);

/** Gender of the thing named, for languages that agree the colour with it. */
const GENDER = {
    es: { letter: 'f', number: 'm', feminineShapes: ['Star'] },
    fr: { letter: 'm', number: 'm', feminineShapes: ['Star'] },
    pt: { letter: 'm', number: 'm', feminineShapes: ['Star'] }
};

/** Feminine colour forms, keyed by the English colour value. Missing = invariant. */
const FEMININE_COLOURS = {
    es: { Red: 'Roja', Yellow: 'Amarilla', Purple: 'Morada', Black: 'Negra', White: 'Blanca' },
    fr: { Blue: 'Bleue', Green: 'Verte', Purple: 'Violette', Black: 'Noire', White: 'Blanche', Gray: 'Grise' },
    pt: { Red: 'Vermelha', Yellow: 'Amarela', Purple: 'Roxa', Black: 'Preta', White: 'Branca' }
};

export function baseLanguage(code) {
    return String(code || 'en').toLowerCase().split(/[-_]/)[0];
}

export function orderFor(code) {
    return WORD_ORDER[baseLanguage(code)] || 'adj-noun';
}

/** 'shape' | 'letter' | 'number' | 'emoji' from the item data's own fields. */
export function detectKind(data) {
    if (!data) return 'emoji';
    if (typeof data.value === 'number' || data.type === 'number') return 'number';
    if (data.case === 'upper' || data.case === 'lower' || data.type === 'letter') return 'letter';
    if (data.emoji || data.type === 'emoji') return 'emoji';
    return 'shape';
}

function genderOf(lang, kind, nounKey) {
    const rules = GENDER[lang];
    if (!rules) return 'm';
    if (kind === 'letter') return rules.letter;
    if (kind === 'number') return rules.number;
    return rules.feminineShapes.includes(nounKey) ? 'f' : 'm';
}

function agreeColour(lang, colorKey, colorWord, gender) {
    if (gender !== 'f') return colorWord;
    const forms = FEMININE_COLOURS[lang];
    return (forms && forms[colorKey]) || colorWord;
}

function lowerFirst(word) {
    return word ? word.charAt(0).toLowerCase() + word.slice(1) : word;
}

/**
 * Ordered word tokens for a label, each with a stable key so a recorded clip
 * could later be looked up by key (colour:Red, shape:Star, letter:A, number:5, emoji:🐶).
 * `text` is the display/speech string after agreement and capitalisation.
 * @param {{kind:string, nounKey:string, noun:string, colorKey:string, colorWord:string}} parts
 * @returns {{key:string, role:'colour'|'noun', text:string}[]}
 */
export function composeLabelTokens(parts, languageCode) {
    const lang = baseLanguage(languageCode);
    const { kind, nounKey, noun } = parts;
    const nounToken = noun ? { key: `${kind}:${nounKey || noun}`, role: 'noun', text: noun } : null;
    if (!parts.colorWord) return nounToken ? [nounToken] : [];

    const gender = genderOf(lang, kind, nounKey);
    let colour = agreeColour(lang, parts.colorKey, parts.colorWord, gender);
    if (SENTENCE_CASE.has(lang) && nounToken) colour = lowerFirst(colour);
    const colourToken = { key: `colour:${parts.colorKey || parts.colorWord}`, role: 'colour', text: colour };
    if (!nounToken) return [colourToken];
    return orderFor(lang) === 'noun-adj' ? [nounToken, colourToken] : [colourToken, nounToken];
}

/** How tokens are glued into the label string (Chinese runs a colour and a non-Latin noun together). */
export function joinTokens(tokens, languageCode) {
    if (tokens.length === 2 && orderFor(languageCode) === 'joined' && !/^[\x00-\x7f]/.test(tokens[1].text)) {
        return tokens[0].text + tokens[1].text;
    }
    return tokens.map(t => t.text).join(' ');
}

/** The label string; its caption words are getLabelWords(label). */
export function composeLabel(parts, languageCode) {
    return joinTokens(composeLabelTokens(parts, languageCode), languageCode);
}

/** The caption splits on single spaces: one Text per word. */
export function getLabelWords(text) {
    return text ? text.split(' ') : [];
}
