/**
 * Voice sources: the seam between the speech queue and whatever makes sound.
 *
 * A voice source has one method:
 *   speak(segment, callbacks) -> handle | null
 *     segment   { languageCode, words: string[], tokens: {key, role, text}[], text, rate, volume }
 *               `words` are the ordered caption words of one language; `tokens` carry
 *               stable keys (colour:Red, shape:Star, ...) so a future recorded-clip
 *               source could look clips up by key and fall back to system speech.
 *     callbacks { onStart(), onWord(index), onEnd(), onError(err) }
 *     handle    { cancel() } or null when nothing could be started
 * Today's only implementation is the browser's speechSynthesis (below).
 */
import { VoicePicker } from './VoicePicker.js';
import { tagFor } from './languageTags.js';
import { wordStartOffsets, wordIndexAt } from './wordOffsets.js';

/** Rate and volume from the speech config, validated (Android fix: always finite). */
export function readSpeechSettings(speechConfig) {
    let rate = 1.0;
    if (speechConfig && speechConfig.rate !== undefined && speechConfig.rate !== null) {
        const configRate = Number(speechConfig.rate);
        if (isFinite(configRate) && configRate > 0) {
            rate = configRate;
        } else {
            console.warn('Invalid speech rate in config:', speechConfig.rate, '- using default 1.0');
        }
    }
    let volume = 0.7;
    if (speechConfig && speechConfig.volume !== undefined && speechConfig.volume !== null) {
        const configVolume = Number(speechConfig.volume);
        if (isFinite(configVolume) && configVolume >= 0 && configVolume <= 100) {
            volume = configVolume / 100;
        } else {
            console.warn('Invalid speech volume in config:', speechConfig.volume, '- using default 70');
        }
    }
    return { rate, volume };
}

export class SystemVoiceSource {
    constructor() {
        this.picker = null;
    }

    /** True when both speechSynthesis and the utterance constructor exist. */
    static isAvailable() {
        return typeof speechSynthesis !== 'undefined' && speechSynthesis !== null &&
            typeof SpeechSynthesisUtterance === 'function';
    }

    isAvailable() {
        return SystemVoiceSource.isAvailable();
    }

    getPicker() {
        if (!this.picker) this.picker = new VoicePicker(speechSynthesis);
        return this.picker;
    }

    speak(segment, callbacks) {
        if (!this.isAvailable()) return null;
        let utterance;
        try {
            utterance = new SpeechSynthesisUtterance(segment.text);
            const tag = tagFor(segment.languageCode);
            let voice = null;
            try { voice = this.getPicker().pick(tag); } catch (error) { voice = null; }
            if (voice) utterance.voice = voice;
            utterance.lang = voice && voice.lang ? voice.lang : tag;
            utterance.rate = segment.rate;
            utterance.volume = segment.volume; // pitch is left at the platform default

            const offsets = wordStartOffsets(segment.words);
            utterance.onstart = () => callbacks.onStart && callbacks.onStart();
            utterance.onboundary = (event) => {
                if (!event || (event.name && event.name !== 'word')) return;
                const index = wordIndexAt(offsets, event.charIndex);
                if (index >= 0 && callbacks.onWord) callbacks.onWord(index);
            };
            utterance.onend = () => callbacks.onEnd && callbacks.onEnd();
            utterance.onerror = (error) => callbacks.onError && callbacks.onError(error);
        } catch (error) {
            console.warn('Could not create utterance, continuing silently:', error);
            return null;
        }

        try {
            if (speechSynthesis.paused && typeof speechSynthesis.resume === 'function') speechSynthesis.resume();
            speechSynthesis.speak(utterance);
        } catch (error) {
            console.warn('speechSynthesis.speak failed, continuing silently:', error);
            return null;
        }
        return { utterance, cancel: () => this.cancelAll() };
    }

    cancelAll() {
        try {
            if (typeof speechSynthesis !== 'undefined' && speechSynthesis && speechSynthesis.cancel) {
                speechSynthesis.cancel();
            }
        } catch (error) {
            console.warn('speechSynthesis.cancel failed:', error);
        }
    }

    /** Un-stick a synthesis the browser paused (backgrounded tab, Safari). */
    resumeIfPaused() {
        try {
            if (this.isAvailable() && speechSynthesis.paused && speechSynthesis.resume) speechSynthesis.resume();
        } catch (error) { /* ignore */ }
    }

    destroy() {
        if (this.picker) this.picker.destroy();
        this.picker = null;
    }
}
