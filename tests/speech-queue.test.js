import { SpeechManager } from '../src/game/systems/SpeechManager.js';
import { SpeechQueue } from '../src/game/speech/SpeechQueue.js';
import { installFakeSpeech, makeSpeechScene, makeObject } from './speech-helpers.js';

const star = { value: 'Star', en: 'Star', es: 'Estrella' };
const circle = { value: 'Circle', en: 'Circle', es: 'Círculo' };
const red = { value: 'Red', es: 'Rojo', 'en-US': 'Red' };

describe('SpeechQueue (pure rules)', () => {
    test('first request starts, later ones wait, third drops the oldest waiting', () => {
        const q = new SpeechQueue(2);
        const [a, b, c, d] = ['a', 'b', 'c', 'd'].map(obj => ({ obj }));
        expect(q.enqueue(a).start).toBe(true);
        expect(q.enqueue(b)).toEqual({ start: false, dropped: [] });
        expect(q.enqueue(c).dropped).toEqual([]);
        expect(q.enqueue(d).dropped).toEqual([b]);
        expect(q.waiting).toEqual([c, d]);
        expect(q.advance()).toBe(c);
    });
    test('the speaking or waiting object is never queued twice', () => {
        const q = new SpeechQueue(2);
        q.enqueue({ obj: 'a' });
        q.enqueue({ obj: 'b' });
        expect(q.enqueue({ obj: 'a' }).duplicate).toBe(true);
        expect(q.enqueue({ obj: 'b' }).duplicate).toBe(true);
        expect(q.waiting).toHaveLength(1);
    });
    test('removeWaiting and clear', () => {
        const q = new SpeechQueue(2);
        q.enqueue({ obj: 'a' }); q.enqueue({ obj: 'b' });
        expect(q.removeWaiting('b')).toBe(true);
        expect(q.removeWaiting('zzz')).toBe(false);
        q.clear();
        expect(q.current).toBeNull();
        expect(q.waiting).toEqual([]);
    });
});

describe('SpeechManager queue behaviour', () => {
    let synth, scene, manager;
    const spokenTexts = () => synth.spoken.map(u => u.text);
    const englishOnly = () => { scene.configManager.getConfig = () => ({ languages: { enabled: [{ code: 'en' }] } }); };
    const finish = () => synth.spoken[synth.spoken.length - 1].onend();

    beforeEach(() => {
        jest.useFakeTimers();
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        synth = installFakeSpeech();
        scene = makeSpeechScene();
        manager = new SpeechManager(scene);
    });
    afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

    test('a new request does not interrupt the word being spoken', () => {
        const a = makeObject(star, red, scene);
        const b = makeObject(circle, red, scene);
        manager.speakText(a, 'both');
        manager.speakText(b, 'both');
        expect(synth.cancel).not.toHaveBeenCalled();
        expect(spokenTexts()).toEqual(['Red Star']);
        finish();                                     // English of a
        expect(spokenTexts()).toEqual(['Red Star', 'Estrella roja']);
        finish();                                     // Spanish of a: now b starts
        expect(spokenTexts()).toEqual(['Red Star', 'Estrella roja', 'Red Circle']);
        expect(manager.getCurrentSpeakingObject()).toBe(b);
    });

    test('at most two wait: the oldest waiting is dropped', () => {
        const objs = [1, 2, 3, 4].map(() => makeObject(star, red, scene, ['en']));
        scene.configManager.getConfig = () => ({ languages: { enabled: [{ code: 'en' }] } });
        objs.forEach(o => manager.speakText(o, 'both'));
        expect(manager.getWaitingObjects()).toEqual([objs[2], objs[3]]);
        finish(); finish(); finish();
        expect(synth.spoken).toHaveLength(3); // objs 0, 2, 3 (obj 1 dropped)
        expect(synth.cancel).not.toHaveBeenCalled();
    });

    test('re-requesting the speaking or a waiting object adds nothing', () => {
        const a = makeObject(star, red, scene);
        const b = makeObject(circle, red, scene);
        manager.speakText(a, 'both');
        manager.speakText(b, 'both');
        manager.speakText(a, 'both');
        manager.speakText(b, 'both');
        expect(manager.getWaitingObjects()).toEqual([b]);
    });

    test('removed while waiting: dropped from the queue', () => {
        englishOnly();
        const a = makeObject(star, red, scene, ['en']);
        const b = makeObject(circle, red, scene, ['en']);
        manager.speakText(a, 'both'); manager.speakText(b, 'both');
        manager.objectRemoved(b);
        expect(manager.getWaitingObjects()).toEqual([]);
        finish();
        expect(manager.getIsSpeaking()).toBe(false);
    });

    test('removed while speaking: current language finishes, the rest is skipped', () => {
        const a = makeObject(star, red, scene);
        const b = makeObject(circle, red, scene);
        manager.speakText(a, 'both'); manager.speakText(b, 'both');
        manager.objectRemoved(a);
        expect(synth.cancel).not.toHaveBeenCalled();
        finish(); // English of a ends; Spanish is skipped, b starts
        expect(spokenTexts()).toEqual(['Red Star', 'Red Circle']);
    });

    test('a request for an object that is already gone is skipped', () => {
        englishOnly();
        const a = makeObject(star, red, scene, ['en']);
        const b = makeObject(circle, red, scene, ['en']);
        manager.speakText(a, 'both'); manager.speakText(b, 'both');
        b.active = false;
        finish();
        expect(manager.getIsSpeaking()).toBe(false);
    });

    test('cancelSpeech clears the current word, the queue and the highlight', () => {
        const a = makeObject(star, red, scene);
        const b = makeObject(circle, red, scene);
        manager.speakText(a, 'both'); manager.speakText(b, 'both');
        manager.cancelSpeech();
        expect(synth.cancel).toHaveBeenCalled();
        expect(manager.getIsSpeaking()).toBe(false);
        expect(manager.getWaitingObjects()).toEqual([]);
        synth.spoken[0].onend(); // late event of the cancelled utterance changes nothing
        expect(synth.spoken).toHaveLength(1);
    });

    test('watchdog: an utterance that never ends cannot jam the queue', () => {
        englishOnly();
        const a = makeObject(star, red, scene, ['en']);
        const b = makeObject(circle, red, scene, ['en']);
        manager.speakText(a, 'both'); manager.speakText(b, 'both');
        jest.advanceTimersByTime(60000);
        expect(spokenTexts()).toEqual(['Red Star', 'Red Circle']);
        jest.advanceTimersByTime(60000);
        expect(manager.getIsSpeaking()).toBe(false);
    });

    test('an error event moves on instead of stalling', () => {
        const a = makeObject(star, red, scene);
        manager.speakText(a, 'both');
        synth.spoken[0].onerror({ error: 'synthesis-failed' });
        expect(spokenTexts()).toEqual(['Red Star', 'Estrella roja']);
    });

    test('visibility returning resumes a paused synthesis', () => {
        manager.speakText(makeObject(star, red, scene), 'both');
        synth.paused = true;
        Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
        expect(synth.resume).toHaveBeenCalled();
    });

    test('utterances carry the grammar-ordered text, config rate and volume, no pitch', () => {
        manager.speakText(makeObject(star, red, scene), 'both');
        const u = synth.spoken[0];
        expect(u.rate).toBe(1);
        expect(u.volume).toBeCloseTo(0.7);
        expect(u.pitch).toBeUndefined();
        expect(u.lang).toBe('en-US');
    });

    test('muted: nothing is spoken or queued', () => {
        scene = makeSpeechScene({ mute: true });
        manager = new SpeechManager(scene);
        manager.speakText(makeObject(star, red, scene), 'both');
        expect(synth.spoken).toHaveLength(0);
    });
});
