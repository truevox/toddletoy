import { SpeechManager } from '../src/game/systems/SpeechManager.js';
import { wordStartOffsets, wordIndexAt } from '../src/game/speech/wordOffsets.js';
import { WordHighlighter } from '../src/game/speech/WordHighlighter.js';
import { installFakeSpeech, makeSpeechScene, makeObject, makeWord } from './speech-helpers.js';

describe('wordIndexAt', () => {
    test('maps charIndex to the word containing it', () => {
        const offsets = wordStartOffsets(['Estrella', 'roja']);
        expect(offsets).toEqual([0, 9]);
        expect([0, 3, 7, 8, 9, 12, 99].map(i => wordIndexAt(offsets, i))).toEqual([0, 0, 0, 0, 1, 1, 1]);
    });
    test('accented and multi-byte text', () => {
        const words = ['Corazón', 'amarillo'];       // ó is one UTF-16 unit
        expect(wordStartOffsets(words)).toEqual([0, 8]);
        const astral = ['A😀', 'rojo'];              // the emoji is two UTF-16 units
        const o = wordStartOffsets(astral);
        expect(o).toEqual([0, 4]);
        expect(wordIndexAt(o, 2)).toBe(0);
        expect(wordIndexAt(o, 4)).toBe(1);
        expect(wordIndexAt(wordStartOffsets(['Красный', 'Круг']), 8)).toBe(1);
        expect(wordIndexAt(wordStartOffsets(['红色圆形']), 3)).toBe(0);
    });
    test('bad input gives -1', () => {
        expect(wordIndexAt([], 0)).toBe(-1);
        expect(wordIndexAt([0], NaN)).toBe(-1);
        expect(wordIndexAt([0], -1)).toBe(-1);
    });
});

describe('WordHighlighter', () => {
    test('estimate path lights each word in turn and clears at the end', () => {
        const scene = makeSpeechScene();
        const h = new WordHighlighter(scene);
        const words = [makeWord('a'), makeWord('b')];
        h.begin({}, words, 1000);
        scene.delayed.find(t => t.delay === 0).cb();
        expect(words[0].setTint).toHaveBeenCalled();
        expect(scene.sparkle).toHaveBeenCalledTimes(1);
        h.clear();
        expect(words[0].clearTint).toHaveBeenCalled();
        expect(scene.particleManager.cleanupWordSparkles).toHaveBeenCalled();
    });
    test('a boundary takes over: pending estimate steps are cancelled', () => {
        const scene = makeSpeechScene();
        const h = new WordHighlighter(scene);
        const words = [makeWord('a'), makeWord('b')];
        h.begin({}, words, 1000);
        const timers = [...scene.delayed];
        h.onWord(1);
        expect(words[1].setTint).toHaveBeenCalled();
        expect(timers.every(t => t.removed)).toBe(true);
        timers.forEach(t => t.cb()); // even if a stale step ran, it does nothing
        expect(words[0].setTint).not.toHaveBeenCalled();
    });
    test('destroyed words are ignored safely', () => {
        const scene = makeSpeechScene();
        const h = new WordHighlighter(scene);
        const words = [makeWord('a')];
        h.begin({}, words, 500);
        words[0].active = false;
        expect(() => { h.onWord(0); h.clear(); }).not.toThrow();
    });
});

describe('boundary-driven highlighting through the manager', () => {
    let synth, scene, manager, obj;
    beforeEach(() => {
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        synth = installFakeSpeech();
        scene = makeSpeechScene();
        manager = new SpeechManager(scene);
        obj = makeObject({ value: 'Star', en: 'Star', es: 'Estrella' }, { value: 'Red', es: 'Rojo', 'en-US': 'Red' }, scene);
    });
    afterEach(() => jest.restoreAllMocks());

    test('Spanish boundaries light Estrella then roja, then everything clears at the end', () => {
        manager.speakText(obj, 'both');
        synth.spoken[0].onend();                       // on to Spanish
        const [estrella, roja] = obj.allLanguageWords[1].words;
        const u = synth.spoken[1];
        u.onboundary({ name: 'word', charIndex: 0 });
        expect(estrella.setTint).toHaveBeenCalled();
        expect(roja.setTint).not.toHaveBeenCalled();
        u.onboundary({ name: 'word', charIndex: 9 });
        expect(roja.setTint).toHaveBeenCalled();
        expect(estrella.clearTint).toHaveBeenCalled();
        u.onend();
        expect(roja.clearTint).toHaveBeenCalled();
    });
    test('sentence boundaries are ignored', () => {
        manager.speakText(obj, 'both');
        const [red] = obj.allLanguageWords[0].words;
        synth.spoken[0].onboundary({ name: 'sentence', charIndex: 4 });
        expect(manager.highlighter.usingBoundaries).toBe(false);
        expect(red).toBeDefined();
    });
    test('no boundary events: the estimate still runs', () => {
        manager.speakText(obj, 'both');
        expect(scene.delayed.length).toBeGreaterThan(0);
    });
    test('cancel and removal clear the highlight', () => {
        manager.speakText(obj, 'both');
        const [red] = obj.allLanguageWords[0].words;
        synth.spoken[0].onboundary({ name: 'word', charIndex: 0 });
        manager.objectRemoved(obj);
        expect(red.clearTint).toHaveBeenCalled();
        red.clearTint.mockClear();
        manager.speakText(makeObject({ value: 'Star', en: 'Star' }, null, scene), 'both');
        manager.cancelSpeech();
        expect(manager.highlighter.lit).toBe(-1);
    });
});
