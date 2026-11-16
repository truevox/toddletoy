import { makeMockContext } from './helpers/mock-audio.js';
import { volumeToGain } from '../src/game/audio/Volume.js';
import { buildVoice } from '../src/game/audio/VoiceBuilder.js';
import { makeSound, EVENTS } from '../src/game/audio/SoundRecipes.js';
import { AudioEngine, MAX_VOICES } from '../src/game/audio/AudioEngine.js';
import { EventLog } from '../src/game/audio/EventLog.js';
import { EventGate } from '../src/game/audio/EventGate.js';
import { isScaleFreq } from '../src/game/audio/Scale.js';

describe('volume mapping', () => {
    test('0 is silent, monotonic, default is soft but audible, 100 is capped', () => {
        expect(volumeToGain(0)).toBe(0);
        let last = 0;
        for (let v = 1; v <= 100; v++) { const g = volumeToGain(v); expect(g).toBeGreaterThan(last); last = g; }
        expect(volumeToGain(10)).toBeGreaterThan(0.3);
        expect(volumeToGain(10)).toBeLessThan(0.5);
        expect(volumeToGain(100)).toBeLessThanOrEqual(1.7);
        expect(volumeToGain(500)).toBe(volumeToGain(100));
        expect(volumeToGain('x')).toBeGreaterThan(0);
        expect(volumeToGain(-5)).toBe(0);
    });
});

describe('sound recipes', () => {
    test('note-based events use scale frequencies and carry their kind', () => {
        for (const ev of ['spawn', 'tap', 'dragStep']) {
            for (const kind of ['emoji', 'letter', 'number', 'shape']) {
                const s = makeSound(ev, { kind, noteIndex: 4, pan: 0 });
                expect(s.kind).toBe(kind);
                expect(isScaleFreq(s.freq)).toBe(true);
                expect(s.parts.length).toBeGreaterThan(0);
            }
        }
    });

    test('every event is short, finite and ends well inside 1.5 s', () => {
        for (const ev of EVENTS) {
            for (const kind of ['emoji', 'number']) {
                const s = makeSound(ev, { kind, noteIndex: 7, strength: 1, pan: 0.3 });
                expect(s.dur).toBeGreaterThan(0.05);
                expect(s.dur).toBeLessThan(1.5);
                expect(s.level).toBeGreaterThan(0);
                for (const p of s.parts) expect(Number.isFinite(p.gain)).toBe(true);
            }
        }
    });

    test('bounce gets louder with impact strength; tap is brighter than spawn', () => {
        const soft = makeSound('bounce', { kind: 'emoji', noteIndex: 3, strength: 0.1 });
        const hard = makeSound('bounce', { kind: 'emoji', noteIndex: 3, strength: 1 });
        expect(hard.level).toBeGreaterThan(soft.level);
        const up = (s) => s.parts.filter((p) => p.t === 'partial' && p.ratio > 1).reduce((a, p) => a + p.gain, 0);
        expect(up(makeSound('tap', { kind: 'emoji', noteIndex: 3 }))).toBeGreaterThan(up(makeSound('spawn', { kind: 'emoji', noteIndex: 3 })));
    });
});

describe('voice builder', () => {
    test('builds enveloped oscillators that all stop by the end time', () => {
        const ctx = makeMockContext();
        const spec = makeSound('spawn', { kind: 'number', noteIndex: 5, pan: 0.2 });
        const v = buildVoice(ctx, ctx.destination, spec, 0.01);
        expect(v.endTime).toBeCloseTo(0.01 + spec.dur, 3);
        const oscs = ctx.sources.filter((s) => s.frequency);
        expect(oscs.length).toBeGreaterThanOrEqual(3);
        for (const o of ctx.sources) {
            expect(o.start).toHaveBeenCalled();
            expect(o.stop).toHaveBeenCalled();
            expect(o.stop.mock.calls[0][0]).toBeLessThanOrEqual(v.endTime + 0.001);
        }
    });
});

describe('engine', () => {
    let ctx, cfg, engine;
    beforeEach(() => {
        ctx = makeMockContext();
        cfg = { volume: 10, mute: false };
        global.AudioContext = jest.fn(() => ctx);
        engine = new AudioEngine({ getConfig: () => cfg, gestureTarget: null });
        engine.unlocked = true;
    });
    afterEach(() => { engine.destroy(); });
    const spec = (i = 4, ev = 'spawn') => makeSound(ev, { kind: 'emoji', noteIndex: i, pan: 0 });

    test('no AudioContext exists until it is asked for after a gesture', () => {
        const e2 = new AudioEngine({ getConfig: () => cfg, gestureTarget: null });
        expect(global.AudioContext).not.toHaveBeenCalled();
        expect(e2.ctx).toBeNull();
        expect(e2.play(spec())).toBeNull();            // no gesture yet: nothing created, nothing played
        expect(global.AudioContext).not.toHaveBeenCalled();
        e2.unlock();
        expect(global.AudioContext).toHaveBeenCalledTimes(1);
        e2.destroy();
    });

    test('unlocks once on the first gesture and stops listening', () => {
        const target = new EventTarget();
        const e2 = new AudioEngine({ getConfig: () => cfg, gestureTarget: target });
        target.dispatchEvent(new Event('pointerdown'));
        expect(global.AudioContext).toHaveBeenCalledTimes(1);
        expect(ctx.state).toBe('running');
        target.dispatchEvent(new Event('keydown'));
        target.dispatchEvent(new Event('pointerdown'));
        expect(global.AudioContext).toHaveBeenCalledTimes(1);
        e2.destroy();
    });

    test('master chain: voices -> master gain -> compressor -> destination', () => {
        engine.play(spec());
        expect(engine.master.connect).toHaveBeenCalledWith(engine.limiter);
        expect(engine.limiter.connect).toHaveBeenCalledWith(engine.clip);
        expect(engine.clip.connect).toHaveBeenCalledWith(ctx.destination);
        expect(engine.master.gain.value).toBeCloseTo(volumeToGain(10), 5);
    });

    test('mute silences immediately and plays nothing; unmuting restores', () => {
        engine.play(spec());
        expect(engine.voiceCount()).toBe(1);
        cfg.mute = true;
        expect(engine.play(spec())).toBeNull();
        expect(engine.voiceCount()).toBe(0);
        expect(engine.master.gain.value).toBe(0);
        cfg.mute = false;
        expect(engine.play(spec())).not.toBeNull();
        expect(engine.master.gain.value).toBeGreaterThan(0);
    });

    test('volume changes are picked up live', () => {
        engine.play(spec());
        cfg.volume = 60;
        engine.play(spec(5));
        expect(engine.master.gain.value).toBeCloseTo(volumeToGain(60), 5);
    });

    test('polyphony is capped; the oldest low-priority voice is stolen first', () => {
        const ids = [];
        for (let i = 0; i < MAX_VOICES + 8; i++) {
            ctx.currentTime += 0.001;
            const v = engine.play(spec(i % 13, 'dragStep'));
            ids.push(v.id);
            expect(engine.voiceCount()).toBeLessThanOrEqual(MAX_VOICES);
        }
        expect(engine.voiceCount()).toBe(MAX_VOICES);
        expect(engine.hasVoice(ids[0])).toBe(false);
        expect(engine.hasVoice(ids[ids.length - 1])).toBe(true);
    });

    test('a high-priority newcomer steals a low-priority voice, not the other way round', () => {
        const low = engine.play(spec(1, 'bounce'));
        for (let i = 0; i < MAX_VOICES - 1; i++) { ctx.currentTime += 0.001; engine.play(spec(2, 'spawn')); }
        ctx.currentTime += 0.001;
        engine.play(spec(3, 'spawn'));
        expect(engine.hasVoice(low.id)).toBe(false);
    });

    test('finished voices are purged by time', () => {
        engine.play(spec());
        expect(engine.voiceCount()).toBe(1);
        ctx.currentTime = 5;
        expect(engine.voiceCount()).toBe(0);
    });

    test('stopAll silences every voice at once', () => {
        for (let i = 0; i < 5; i++) engine.play(spec(i));
        engine.stopAll();
        expect(engine.voiceCount()).toBe(0);
        for (const o of ctx.sources) expect(o.stop).toHaveBeenCalled();
    });

    test('a suspended context drops the note instead of queueing it', () => {
        ctx.state = 'suspended';
        expect(engine.play(spec())).toBeNull();
        expect(ctx.resume).toHaveBeenCalled();
    });

    test('destroy closes the context', () => {
        engine.play(spec());
        engine.destroy();
        expect(ctx.close).toHaveBeenCalled();
        expect(engine.ctx).toBeNull();
    });
});

describe('event log', () => {
    test('is a ring buffer of the most recent entries, newest last', () => {
        const log = new EventLog(5);
        for (let i = 0; i < 9; i++) log.add({ event: 'e' + i });
        const items = log.list();
        expect(items.map((x) => x.event)).toEqual(['e4', 'e5', 'e6', 'e7', 'e8']);
        log.clear();
        expect(log.list()).toEqual([]);
    });
});

describe('event gate (de-duplication and rate limits)', () => {
    test('drag steps are rate limited; other events have their own gaps', () => {
        let t = 0;
        const gate = new EventGate(() => t);
        expect(gate.allow('dragStep', 'a', 3)).toBe(true);
        t = 20; expect(gate.allow('dragStep', 'a', 4)).toBe(false);
        t = 120; expect(gate.allow('dragStep', 'a', 4)).toBe(true);
        t = 121; expect(gate.allow('tap', 'a', 4)).toBe(true);
    });
    test('the same event in the same frame is not stacked; a bounce per object has a cooldown', () => {
        let t = 0;
        const gate = new EventGate(() => t);
        expect(gate.allow('pop', 'a', 2)).toBe(true);
        t = 5; expect(gate.allow('pop', 'b', 2)).toBe(false);
        t = 100; expect(gate.allow('pop', 'b', 2)).toBe(true);
        expect(gate.allow('bounce', 'a', 2)).toBe(true);
        t = 200; expect(gate.allow('bounce', 'a', 2)).toBe(false);
        expect(gate.allow('bounce', 'b', 2)).toBe(true);
    });
});
