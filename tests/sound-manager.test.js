import { makeMockContext } from './helpers/mock-audio.js';
import { AudioManager } from '../src/game/systems/AudioManager.js';
import { isScaleFreq, SCALE_FREQS } from '../src/game/audio/Scale.js';

function setup(cfg = { volume: 10, mute: false, toneDuration: -1 }) {
    const ctx = makeMockContext();
    global.AudioContext = jest.fn(() => ctx);
    const scene = {
        scale: { width: 800, height: 600 },
        configManager: { getAudioConfig: () => cfg },
        game: { canvas: null },
    };
    const audio = new AudioManager(scene);
    audio.engine.unlocked = true;
    const clock = { t: 1000 };
    audio.gate.now = () => clock.t;
    const obj = (id, type, x, y) => ({ id, type, x, y });
    return { ctx, audio, cfg, clock, obj };
}

describe('AudioManager sound events', () => {
    test('spawn logs a scale note, higher near the top than near the bottom', () => {
        const { audio, obj } = setup();
        audio.playSpawn(obj('a', 'emoji', 400, 60));
        audio.playSpawn(obj('b', 'emoji', 400, 560));
        const [top, bottom] = audio.debugLog();
        expect(top.event).toBe('spawn');
        expect(isScaleFreq(top.freq)).toBe(true);
        expect(top.freq).toBeGreaterThan(bottom.freq);
        expect(top.kind).toBe('emoji');
        expect(typeof top.note).toBe('string');
        expect(typeof top.t).toBe('number');
    });

    test('kind follows the object type', () => {
        const { audio, obj } = setup();
        audio.playTap(obj('a', 'smallNumbers', 100, 100));
        audio.playTap(obj('b', 'uppercaseLetters', 100, 100));
        audio.playTap(obj('c', 'shapes', 100, 100));
        expect(audio.debugLog().map((e) => e.kind)).toEqual(['number', 'letter', 'shape']);
    });

    test('drag glides through scale steps, rate-limited, only when the step changes', () => {
        const { audio, obj, clock } = setup();
        const o = obj('a', 'emoji', 400, 580);
        audio.playPickup(o);
        let steps = 0;
        // sweep 580 -> 20 over 1 second in 60 pointer-move events
        for (let i = 0; i <= 60; i++) {
            clock.t += 1000 / 60;
            o.y = 580 - (560 * i) / 60;
            audio.playDragStep(o, o.x, o.y);
        }
        const drags = audio.debugLog().filter((e) => e.event === 'dragStep');
        steps = drags.length;
        expect(steps).toBeGreaterThanOrEqual(5);
        expect(steps).toBeLessThanOrEqual(Math.floor(1000 / 85) + 1);
        expect(new Set(drags.map((d) => d.freq)).size).toBe(steps);        // all distinct
        for (let i = 1; i < drags.length; i++) expect(drags[i].freq).toBeGreaterThan(drags[i - 1].freq);
        // staying within one step plays nothing more
        clock.t += 500;
        audio.playDragStep(o, o.x, o.y);                    // a step that was rate-limited is retried, once
        const before = audio.debugLog().length;
        clock.t += 500;
        audio.playDragStep(o, o.x, o.y);
        audio.playDragStep(o, o.x, o.y + 1);
        expect(audio.debugLog().length).toBe(before);
    });

    test('drop and throw only sound after a real drag, not after a tap', () => {
        const { audio, obj, clock } = setup();
        const o = obj('a', 'emoji', 100, 100);
        audio.playDrop(o);
        expect(audio.debugLog().length).toBe(0);
        audio.playPickup(o);
        audio.playDrop(o);
        expect(audio.debugLog().map((e) => e.event)).toEqual(['pickup', 'drop']);
        clock.t += 200;
        audio.playPickup(o);
        clock.t += 200;
        audio.playThrow(o, 900);
        expect(audio.debugLog().map((e) => e.event).slice(-2)).toEqual(['pickup', 'throw']);
    });

    test('bounce volume follows strength; pop logs; same-frame pops are not stacked', () => {
        const { audio, obj, clock } = setup();
        audio.playBounce(obj('a', 'emoji', 10, 10), 0.2);
        clock.t += 500;
        audio.playBounce(obj('a', 'emoji', 10, 10), 1);
        const [b1, b2] = audio.debugLog();
        expect(b2.level).toBeGreaterThan(b1.level);
        audio.playPop(obj('a', 'emoji', 10, 10));
        audio.playPop(obj('b', 'emoji', 10, 10));
        expect(audio.debugLog().filter((e) => e.event === 'pop').length).toBe(1);
    });

    test('silenceDuring suppresses removal pops (resets and rebuilds are not events)', () => {
        const { audio, obj } = setup();
        audio.silenceDuring(() => audio.playPop(obj('a', 'emoji', 10, 10)));
        expect(audio.debugLog().length).toBe(0);
        audio.playPop(obj('a', 'emoji', 10, 10));
        expect(audio.debugLog().length).toBe(1);
    });

    test('muted: nothing is logged or sounding', () => {
        const { audio, obj, cfg } = setup();
        cfg.mute = true;
        audio.playSpawn(obj('a', 'emoji', 10, 10));
        expect(audio.debugLog().length).toBe(0);
        expect(audio.getToneCount()).toBe(0);
    });

    test('stopAllTones leaves nothing sounding; activeTones is empty', () => {
        const { audio, obj } = setup();
        for (let i = 0; i < 6; i++) audio.playSpawn(obj('o' + i, 'emoji', 10 * i, 10 * i));
        expect(audio.activeTones.size).toBeGreaterThan(0);
        audio.stopAllTones();
        expect(audio.activeTones.size).toBe(0);
        expect(audio.getToneCount()).toBe(0);
        expect(audio.hasTone('o1')).toBe(false);
    });

    test('old API names still work as shims and never start a drone', () => {
        const { audio, ctx } = setup();
        expect(() => audio.generateContinuousTone(100, 100, 'x')).not.toThrow();
        expect(audio.hasTone('x')).toBe(true);
        audio.stopTone('x');
        expect(audio.hasTone('x')).toBe(false);
        expect(() => audio.updateTonePosition(5, 5, 'x')).not.toThrow();
        ctx.currentTime = 10;
        expect(audio.getToneCount()).toBe(0);                // every note ended by itself
        for (const s of ctx.sources) expect(s.stop).toHaveBeenCalled();
    });

    test('toneDuration is ignored: notes always end on their own', () => {
        const { audio, obj, ctx } = setup({ volume: 10, mute: false, toneDuration: -1 });
        audio.playSpawn(obj('a', 'number', 10, 10));
        ctx.currentTime = 2;
        expect(audio.getToneCount()).toBe(0);
    });

    test('hiding the tab silences voices; showing it again is safe', () => {
        const { audio, obj } = setup();
        audio.playSpawn(obj('a', 'emoji', 10, 10));
        audio.onVisibility(true);
        expect(audio.getToneCount()).toBe(0);
        expect(() => audio.onVisibility(false)).not.toThrow();
    });

    test('scale frequencies cover the range', () => {
        const { audio, obj } = setup();
        audio.playSpawn(obj('a', 'emoji', 10, 0));
        audio.playSpawn(obj('b', 'emoji', 10, 600));
        const [hi, lo] = audio.debugLog();
        expect(hi.freq).toBeCloseTo(SCALE_FREQS[12], 3);
        expect(lo.freq).toBeCloseTo(SCALE_FREQS[0], 3);
    });
});
