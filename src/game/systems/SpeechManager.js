/**
 * SpeechManager: the facade the scene calls to voice an object.
 *
 * Requests go through a short queue (SpeechQueue): a new tap never cuts off the
 * word being spoken; at most two requests wait, the oldest is dropped (latest wins).
 * Each language of a request is one "segment" handed to a voice source
 * (SystemVoiceSource today; see speech/SystemVoiceSource.js for the interface), which
 * reports start, per-word progress and end. A watchdog guarantees the queue never jams.
 */
import { buildColorizedLabel, getLocalizedString } from '../utils/localization.js';
import { composeLabelTokens, detectKind, getLabelWords, joinTokens } from '../speech/labelGrammar.js';
import { SpeechQueue } from '../speech/SpeechQueue.js';
import { WordHighlighter } from '../speech/WordHighlighter.js';
import { SystemVoiceSource, readSpeechSettings } from '../speech/SystemVoiceSource.js';

const MAX_WAITING = 2;

export class SpeechManager {
    constructor(scene) {
        this.scene = scene;
        this.queue = new SpeechQueue(MAX_WAITING);
        this.highlighter = new WordHighlighter(scene);
        this.source = new SystemVoiceSource();
        this.session = null;          // the request being spoken: { request, index, skipRest, token }
        this.currentSpeech = null;    // handle of the segment in flight (null when silent)
        this.isSpeaking = false;
        this.currentSpeakingObject = null;
        this.currentLanguage = null;
        this.currentLanguageCodes = [];
        this.speechTimeoutId = null;  // watchdog / silent pacing timer
        this.tokenCounter = 0;        // guards late callbacks of finished segments

        this.onVisibilityChange = () => {
            if (typeof document !== 'undefined' && document.visibilityState === 'visible') this.source.resumeIfPaused();
        };
        if (typeof document !== 'undefined' && document.addEventListener) {
            document.addEventListener('visibilitychange', this.onVisibilityChange);
        }
        this.initSpeech();
    }

    initSpeech() {
        if (!this.isSpeechAvailable()) {
            console.warn('Speech synthesis not supported in this browser - toy will run silently');
            return;
        }
        console.log('Speech synthesis initialized');
    }

    isSpeechAvailable() {
        return SystemVoiceSource.isAvailable();
    }

    // ---- requests -------------------------------------------------------------------

    speakText(obj, language = 'en') {
        if (!obj || !obj.itemData) {
            console.warn('Invalid object for speech');
            return;
        }
        const speechConfig = this.scene.configManager ? this.scene.configManager.getSpeechConfig() : null;
        if (speechConfig && speechConfig.mute) return;

        // Reset auto-cleanup timer when object is voiced
        if (this.scene.updateObjectTouchTime) this.scene.updateObjectTouchTime(obj);

        // Already speaking or waiting: a repeat tap must not add a duplicate
        if (this.queue.has(obj)) return;

        try {
            const request = { obj, segments: this.buildSegments(obj, language), language };
            if (request.segments.length === 0) return;
            const result = this.queue.enqueue(request);
            if (result.start) this.startRequest(request);
        } catch (error) {
            console.error('Speech failed, continuing silently:', error);
            this.finishRequest();
        }
    }

    /** One segment per language: ordered tokens and the label words for the caption. */
    buildSegments(obj, language) {
        const data = obj.itemData;
        const config = this.scene.configManager ? this.scene.configManager.getConfig() : null;
        const enabled = config?.languages?.enabled || [{ code: 'en' }];
        const codes = (language === 'both' || language === 'all') ? enabled.map(l => l.code) : [language];
        const fallbackValue = data.value !== undefined && data.value !== null ? String(data.value) : '';
        const segments = [];
        codes.forEach(code => {
            const tokens = this.tokensFor(data, code);
            let text = joinTokens(tokens, code);
            if (!text || !text.trim()) text = buildColorizedLabel(data, 'en') || fallbackValue;
            if (!text) return;
            segments.push({ languageCode: code, tokens, text, words: getLabelWords(text) });
        });
        return segments;
    }

    tokensFor(data, code) {
        const noun = getLocalizedString(data, code) || getLocalizedString(data, 'en') ||
            (data.value !== undefined && data.value !== null ? String(data.value) : '');
        let colorWord = '';
        if (data.color) colorWord = getLocalizedString(data.color, code) || getLocalizedString(data.color, 'en');
        return composeLabelTokens({
            kind: detectKind(data),
            nounKey: data.value !== undefined && data.value !== null ? String(data.value) : '',
            noun,
            colorKey: data.color ? String(data.color.value || getLocalizedString(data.color, 'en')) : '',
            colorWord
        }, code);
    }

    // ---- playback -------------------------------------------------------------------

    startRequest(request) {
        this.session = { request, index: 0, skipRest: false };
        this.isSpeaking = true;
        this.currentSpeakingObject = request.obj;
        this.currentLanguage = request.language === 'both' || request.language === 'all' ? 'multilingual' : request.language;
        this.currentLanguageCodes = request.segments.map(s => s.languageCode);
        this.playSegment(this.session);
    }

    playSegment(session) {
        if (session !== this.session) return;
        if (session.index >= session.request.segments.length || session.skipRest) {
            this.finishRequest();
            return;
        }
        const segment = session.request.segments[session.index];
        const token = ++this.tokenCounter;
        const alive = () => token === this.tokenCounter && session === this.session;
        let ended = false;
        const endSegment = () => {
            if (ended || !alive()) return;
            ended = true;
            this.clearWatchdog();
            this.currentSpeech = null;
            this.highlighter.clear();
            session.index++;
            this.playSegment(session);
        };

        const { rate, volume } = readSpeechSettings(this.scene.configManager ? this.scene.configManager.getSpeechConfig() : null);
        const estimate = (segment.text.length * 100 + 500) / Math.max(rate, 0.25);
        this.highlighter.begin(session.request.obj, this.captionWords(session.request.obj, segment.languageCode), estimate);

        let handle = null;
        try {
            handle = this.source.speak({ ...segment, rate, volume }, {
                onStart: () => {},
                onWord: (index) => { if (alive()) this.highlighter.onWord(index); },
                onEnd: endSegment,
                onError: (error) => {
                    console.warn('Speech error:', error && error.error ? error.error : error);
                    endSegment(); // keep going even on error
                }
            });
        } catch (error) {
            console.warn('Voice source failed, continuing silently:', error);
            handle = null;
        }
        this.currentSpeech = handle;

        // Watchdog: some browsers never fire `end`. With no sound at all this paces the silent highlight.
        const limit = handle ? estimate * 2 + 2000 : estimate;
        this.clearWatchdog();
        this.speechTimeoutId = setTimeout(() => {
            if (!alive()) return;
            if (handle) {
                console.warn('Speech watchdog fired: no end event, moving on');
                try { handle.cancel(); } catch (error) { /* ignore */ }
            }
            endSegment();
        }, limit);
    }

    captionWords(obj, code) {
        const group = obj.allLanguageWords && obj.allLanguageWords.find(g => g.languageCode === code);
        return group && group.words ? group.words : [];
    }

    clearWatchdog() {
        if (this.speechTimeoutId) {
            clearTimeout(this.speechTimeoutId);
            this.speechTimeoutId = null;
        }
    }

    /** The current request is done (or abandoned): unlock and start the next waiting one. */
    finishRequest() {
        this.tokenCounter++;
        this.clearWatchdog();
        this.highlighter.clear();
        this.session = null;
        this.currentSpeech = null;
        this.isSpeaking = false;
        this.currentSpeakingObject = null;
        let next = this.queue.advance();
        while (next && this.isGone(next.obj)) next = this.queue.advance();
        if (next) this.startRequest(next);
    }

    isGone(obj) {
        return !obj || obj.active === false;
    }

    /**
     * Called when an object is removed (popped, cleaned up, reset). Waiting: dropped.
     * Speaking: the current language finishes, the remaining languages are skipped.
     */
    objectRemoved(obj) {
        if (!obj) return;
        this.queue.removeWaiting(obj);
        if (this.session && this.session.request.obj === obj) {
            this.session.skipRest = true;
            this.highlighter.clear(); // its captions are going away
        }
    }

    // ---- state ----------------------------------------------------------------------

    getIsSpeaking() { return this.isSpeaking; }

    getCurrentSpeakingObject() { return this.currentSpeakingObject; }

    getCurrentLanguage() { return this.currentLanguage; }

    isObjectSpeaking(obj) { return this.currentSpeakingObject === obj; }

    /** Waiting requests, oldest first (for tests and debugging). */
    getWaitingObjects() { return this.queue.waiting.map(r => r.obj); }

    /** Stop everything immediately: the current word, the queue, the highlight. */
    cancelSpeech() {
        const hadSound = !!this.currentSpeech;
        this.tokenCounter++;
        this.session = null;
        this.queue.clear();
        this.clearWatchdog();
        this.highlighter.clear();
        if (hadSound || this.isSpeaking) this.source.cancelAll();
        this.currentSpeech = null;
        this.isSpeaking = false;
        this.currentSpeakingObject = null;
    }

    destroy() {
        this.cancelSpeech();
        if (typeof document !== 'undefined' && document.removeEventListener) {
            document.removeEventListener('visibilitychange', this.onVisibilityChange);
        }
        this.source.destroy();
        this.currentLanguageCodes = [];
    }
}
