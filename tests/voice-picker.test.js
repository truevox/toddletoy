import { VoicePicker, chooseVoice } from '../src/game/speech/VoicePicker.js';
import { SpeechManager } from '../src/game/systems/SpeechManager.js';
import { installFakeSpeech, makeSpeechScene, makeObject } from './speech-helpers.js';

const v = (name, lang, extra = {}) => ({ name, lang, localService: false, default: false, ...extra });

describe('chooseVoice', () => {
    test('exact locale beats same language', () => {
        const voices = [v('gb', 'en-GB'), v('us', 'en-US')];
        expect(chooseVoice(voices, 'en-US').name).toBe('us');
    });
    test('same language is the fallback when the locale is missing', () => {
        const voices = [v('mx', 'es-MX'), v('us', 'en-US')];
        expect(chooseVoice(voices, 'es-ES').name).toBe('mx');
    });
    test('localService preferred, then platform default, within a tier', () => {
        expect(chooseVoice([v('net', 'en-US'), v('local', 'en-US', { localService: true })], 'en-US').name).toBe('local');
        expect(chooseVoice([v('a', 'en-US'), v('def', 'en-US', { default: true })], 'en-US').name).toBe('def');
        expect(chooseVoice([v('def', 'en-US', { default: true }), v('local', 'en-US', { localService: true })], 'en-US').name).toBe('local');
    });
    test('an exact non-local voice still beats a local same-language voice', () => {
        const voices = [v('gb', 'en-GB', { localService: true }), v('us', 'en-US')];
        expect(chooseVoice(voices, 'en-US').name).toBe('us');
    });
    test('underscore tags and the legacy Indonesian code match', () => {
        expect(chooseVoice([v('x', 'en_US')], 'en-US').name).toBe('x');
        expect(chooseVoice([v('id', 'in-ID')], 'id-ID').name).toBe('id');
    });
    test('none available gives null, never throws', () => {
        expect(chooseVoice([], 'en-US')).toBeNull();
        expect(chooseVoice([v('us', 'en-US')], 'eo')).toBeNull();
        expect(chooseVoice(undefined, 'en-US')).toBeNull();
    });
});

describe('VoicePicker caching and late voices', () => {
    test('caches a pick, and an empty list is not cached', () => {
        const synth = installFakeSpeech([]);
        const picker = new VoicePicker(synth);
        expect(picker.pick('en-US')).toBeNull();
        synth.voices = [v('us', 'en-US')];
        expect(picker.pick('en-US').name).toBe('us'); // retried, voices arrived
        synth.getVoices.mockClear();
        picker.pick('en-US');
        expect(synth.getVoices).not.toHaveBeenCalled(); // cached
    });
    test('voiceschanged clears the cache', () => {
        const synth = installFakeSpeech([v('gb', 'en-GB')]);
        const picker = new VoicePicker(synth);
        expect(picker.pick('en-US').name).toBe('gb');
        synth.voices = [v('us', 'en-US'), v('gb', 'en-GB')];
        synth.fire('voiceschanged');
        expect(picker.pick('en-US').name).toBe('us');
    });
    test('a throwing or missing speech API is survived', () => {
        const picker = new VoicePicker({ getVoices: () => { throw new Error('x'); } });
        expect(picker.pick('en-US')).toBeNull();
        expect(new VoicePicker(null).pick('en-US')).toBeNull();
    });
});

describe('utterance voice selection through the manager', () => {
    beforeEach(() => {
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => jest.restoreAllMocks());

    test('sets voice and its lang when found, lang only when not', () => {
        const spanish = v('es', 'es-MX', { localService: true });
        const synth = installFakeSpeech([spanish]);
        const scene = makeSpeechScene();
        const manager = new SpeechManager(scene);
        const obj = makeObject({ value: 'Star', en: 'Star', es: 'Estrella' }, { value: 'Red', es: 'Rojo', 'en-US': 'Red' }, scene);
        manager.speakText(obj, 'both');
        const first = synth.spoken[0];
        expect(first.voice).toBeUndefined();
        expect(first.lang).toBe('en-US');
        synth.spoken[0].onend();
        expect(synth.spoken[1].voice).toBe(spanish);
        expect(synth.spoken[1].lang).toBe('es-MX');
    });
});
