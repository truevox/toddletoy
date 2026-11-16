// Fake Web Speech API for unit tests: records utterances, lets a test fire events by hand.
export function installFakeSpeech(voices = []) {
    const listeners = {};
    const synth = {
        spoken: [],
        voices,
        paused: false,
        speak: jest.fn(function (u) { synth.spoken.push(u); }),
        cancel: jest.fn(),
        resume: jest.fn(function () { synth.paused = false; }),
        getVoices: jest.fn(() => synth.voices),
        addEventListener: jest.fn((name, fn) => { (listeners[name] = listeners[name] || []).push(fn); }),
        removeEventListener: jest.fn(),
        fire(name) { (listeners[name] || []).forEach(fn => fn()); }
    };
    global.speechSynthesis = synth;
    global.SpeechSynthesisUtterance = function (text) { this.text = text; };
    return synth;
}

export function makeSpeechScene({ languages = ['en', 'es'], mute = false } = {}) {
    const delayed = [];
    const sparkle = jest.fn();
    return {
        delayed,
        sparkle,
        objects: [],
        configManager: {
            getSpeechConfig: () => ({ mute, rate: 1, volume: 70 }),
            getConfig: () => ({ languages: { enabled: languages.map(code => ({ code })) } })
        },
        time: { delayedCall: jest.fn((delay, cb) => { const t = { delay, cb, remove: jest.fn(() => { t.removed = true; }) }; delayed.push(t); return t; }) },
        particleManager: { cleanupWordSparkles: jest.fn(), createWordSparkleEffect: sparkle },
        updateObjectTouchTime: jest.fn()
    };
}

export function makeWord(text) {
    return { text, active: true, setTint: jest.fn(), clearTint: jest.fn() };
}

/** A shape object with caption words for each language, built from the real grammar. */
export function makeObject(shape, colour, scene, languages = ['en', 'es']) {
    const { buildColorizedLabel } = require('../src/game/utils/localization.js');
    const itemData = { ...shape, color: colour };
    return {
        itemData,
        allLanguageWords: languages.map(code => ({
            languageCode: code,
            words: buildColorizedLabel(itemData, code).split(' ').map(makeWord)
        }))
    };
}
