// AudioManager must not throw when the Web Audio API is missing or its constructor throws.
import { AudioManager } from '../src/game/systems/AudioManager.js';

describe('AudioManager without Web Audio', () => {
    const originalAudioContext = global.AudioContext;
    const originalWebkit = global.webkitAudioContext;

    afterEach(() => {
        global.AudioContext = originalAudioContext;
        global.webkitAudioContext = originalWebkit;
        jest.restoreAllMocks();
    });

    const scene = { scale: { width: 800, height: 600 }, configManager: null };

    test('missing AudioContext: every public call is a safe no-op', () => {
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        delete global.AudioContext;
        delete global.webkitAudioContext;
        const audio = new AudioManager(scene);
        expect(audio.audioContext).toBeNull();
        expect(audio.generateContinuousTone(10, 10, 'a')).toBeNull();
        expect(() => audio.updateTonePosition(5, 5, 'a')).not.toThrow();
        expect(() => audio.stopTone('a')).not.toThrow();
        expect(() => audio.stopAllTones()).not.toThrow();
        expect(() => audio.destroy()).not.toThrow();
    });

    test('AudioContext constructor throwing is swallowed', () => {
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        global.AudioContext = function () { throw new Error('NotSupportedError'); };
        let audio;
        expect(() => { audio = new AudioManager(scene); }).not.toThrow();
        expect(audio.generateContinuousTone(10, 10, 'a')).toBeNull();
    });
});
