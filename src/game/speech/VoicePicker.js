/**
 * VoicePicker: best available speech voice per language tag, cached.
 * Order: exact locale, then same language; inside each tier prefer localService
 * voices (offline, quick to start), then the platform default, then the first.
 * Chrome loads voices asynchronously, so the cache is dropped on `voiceschanged`
 * and an empty voice list is never cached.
 */

/** Legacy codes some platforms (Android) use for the same language. */
const LANGUAGE_ALIASES = { id: ['in'], he: ['iw'], fil: ['tl'] };

function normaliseTag(tag) {
    return String(tag || '').toLowerCase().replace('_', '-');
}

function languageOf(tag) {
    return normaliseTag(tag).split('-')[0];
}

function rank(list) {
    return list.find(v => v.localService && v.default) ||
        list.find(v => v.localService) ||
        list.find(v => v.default) ||
        list[0] || null;
}

/** Choose from a voice list without any caching (exported for tests). */
export function chooseVoice(voices, tag) {
    if (!Array.isArray(voices) || voices.length === 0 || !tag) return null;
    const wanted = normaliseTag(tag);
    const lang = languageOf(tag);
    const exact = voices.filter(v => normaliseTag(v.lang) === wanted);
    if (exact.length) return rank(exact);
    const accepted = [lang, ...(LANGUAGE_ALIASES[lang] || [])];
    const sameLanguage = voices.filter(v => accepted.includes(languageOf(v.lang)));
    return rank(sameLanguage);
}

export class VoicePicker {
    constructor(synth = (typeof speechSynthesis !== 'undefined' ? speechSynthesis : null)) {
        this.synth = synth;
        this.cache = new Map();
        this.onVoicesChanged = () => this.cache.clear();
        try {
            if (synth && typeof synth.addEventListener === 'function') {
                synth.addEventListener('voiceschanged', this.onVoicesChanged);
            }
            this.getVoices(); // nudges Chrome into loading its voice list
        } catch (error) {
            console.warn('Voice list unavailable:', error);
        }
    }

    getVoices() {
        try {
            const voices = this.synth && typeof this.synth.getVoices === 'function' ? this.synth.getVoices() : [];
            return Array.isArray(voices) ? voices : Array.from(voices || []);
        } catch (error) {
            return [];
        }
    }

    /** Best voice for a BCP-47 tag, or null (then the caller sets `lang` only). */
    pick(tag) {
        const key = normaliseTag(tag);
        if (this.cache.has(key)) return this.cache.get(key);
        const voices = this.getVoices();
        const voice = chooseVoice(voices, tag);
        if (voices.length > 0) this.cache.set(key, voice);
        return voice;
    }

    destroy() {
        try {
            if (this.synth && typeof this.synth.removeEventListener === 'function') {
                this.synth.removeEventListener('voiceschanged', this.onVoicesChanged);
            }
        } catch (error) { /* ignore */ }
        this.cache.clear();
    }
}
