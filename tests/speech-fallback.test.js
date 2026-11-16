// SpeechManager must degrade gracefully when the Web Speech API is missing or throws:
// never throw, never leave isSpeaking stuck, still run the highlight animation.
import { SpeechManager } from '../src/game/systems/SpeechManager.js';

function makeScene() {
    const delayed = [];
    const word = { active: true, setTint: jest.fn(), clearTint: jest.fn() };
    return {
        delayed,
        word,
        configManager: null,
        time: { delayedCall: jest.fn((delay, cb) => { delayed.push({ delay, cb }); }) },
        particleManager: { cleanupWordSparkles: jest.fn(), createWordSparkleEffect: jest.fn() },
        updateObjectTouchTime: jest.fn()
    };
}

function makeObj(scene) {
    return {
        itemData: { type: 'emoji', value: 'Dog', emoji: '🐶', en: 'Dog' },
        allLanguageWords: [{ languageCode: 'en', words: [scene.word] }]
    };
}

describe('SpeechManager graceful degradation', () => {
    const originalSynth = global.speechSynthesis;
    const originalUtterance = global.SpeechSynthesisUtterance;
    let warn, error, log;

    beforeEach(() => {
        jest.useFakeTimers();
        warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        error = jest.spyOn(console, 'error').mockImplementation(() => {});
        log = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        global.speechSynthesis = originalSynth;
        global.SpeechSynthesisUtterance = originalUtterance;
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    test('no speechSynthesis and no utterance constructor: does not throw and releases the lock', () => {
        delete global.speechSynthesis;
        delete global.SpeechSynthesisUtterance;
        const scene = makeScene();
        const manager = new SpeechManager(scene);
        const obj = makeObj(scene);

        expect(() => manager.speakText(obj, 'both')).not.toThrow();
        // Highlight animation still scheduled
        expect(scene.time.delayedCall).toHaveBeenCalled();
        expect(manager.getIsSpeaking()).toBe(true); // lock held for the estimated duration
        jest.advanceTimersByTime(20000);
        expect(manager.getIsSpeaking()).toBe(false);
        expect(manager.getCurrentSpeakingObject()).toBeNull();
        expect(scene.particleManager.cleanupWordSparkles).toHaveBeenCalled();
    });

    test('can speak again after a silent utterance (toy stays playable)', () => {
        delete global.speechSynthesis;
        delete global.SpeechSynthesisUtterance;
        const scene = makeScene();
        const manager = new SpeechManager(scene);
        const obj = makeObj(scene);
        for (let i = 0; i < 3; i++) {
            manager.speakText(obj, 'en');
            jest.advanceTimersByTime(20000);
            expect(manager.getIsSpeaking()).toBe(false);
        }
    });

    test('speechSynthesis.speak throwing does not stick isSpeaking', () => {
        global.speechSynthesis = { speak: jest.fn(() => { throw new Error('boom'); }), cancel: jest.fn() };
        global.SpeechSynthesisUtterance = jest.fn(function (text) { this.text = text; });
        const scene = makeScene();
        const manager = new SpeechManager(scene);
        expect(() => manager.speakText(makeObj(scene), 'en')).not.toThrow();
        jest.advanceTimersByTime(20000);
        expect(manager.getIsSpeaking()).toBe(false);
    });

    test('speechSynthesis.cancel throwing is swallowed', () => {
        global.speechSynthesis = { speak: jest.fn(), cancel: jest.fn(() => { throw new Error('nope'); }) };
        global.SpeechSynthesisUtterance = jest.fn(function (text) { this.text = text; });
        const scene = makeScene();
        const manager = new SpeechManager(scene);
        const obj = makeObj(scene);
        manager.speakText(obj, 'en');
        expect(() => manager.speakText(obj, 'en')).not.toThrow();
        expect(() => manager.cancelSpeech()).not.toThrow();
        expect(manager.getIsSpeaking()).toBe(false);
    });

    test('normal path still speaks and unlocks on utterance end', () => {
        global.speechSynthesis = { speak: jest.fn(), cancel: jest.fn() };
        global.SpeechSynthesisUtterance = jest.fn(function (text) { this.text = text; });
        const scene = makeScene();
        const manager = new SpeechManager(scene);
        manager.speakText(makeObj(scene), 'en');
        expect(global.speechSynthesis.speak).toHaveBeenCalledTimes(1);
        const utterance = global.speechSynthesis.speak.mock.calls[0][0];
        utterance.onend();
        expect(manager.getIsSpeaking()).toBe(false);
    });

    test('a stale watchdog from a finished request does not unlock the next one', () => {
        global.speechSynthesis = { speak: jest.fn(), cancel: jest.fn() };
        global.SpeechSynthesisUtterance = jest.fn(function (text) { this.text = text; });
        const scene = makeScene();
        const manager = new SpeechManager(scene);
        const first = makeObj(scene);
        const second = makeObj(scene);
        manager.speakText(first, 'en');
        const firstUtterance = global.speechSynthesis.speak.mock.calls[0][0];
        jest.advanceTimersByTime(500);
        manager.speakText(second, 'en'); // queued: the word being spoken is not cut off
        expect(global.speechSynthesis.speak).toHaveBeenCalledTimes(1);
        expect(global.speechSynthesis.cancel).not.toHaveBeenCalled();
        firstUtterance.onend(); // first finishes: second starts
        expect(global.speechSynthesis.speak).toHaveBeenCalledTimes(2);
        // the first request's watchdog would fire here; the second utterance has not ended yet
        jest.advanceTimersByTime(1000);
        expect(manager.getIsSpeaking()).toBe(true);
        expect(manager.getCurrentSpeakingObject()).toBe(second);
    });
});
