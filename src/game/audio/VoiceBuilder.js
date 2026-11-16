/**
 * VoiceBuilder - builds the Web Audio nodes for one sound spec on any context
 * (the live AudioContext or an OfflineAudioContext, so tests render the same code).
 * Every source has its own attack/decay envelope and a scheduled stop: nothing drones.
 */
const FLOOR = 0.0001;
const noiseBuffers = new WeakMap();

function noiseBufferFor(ctx) {
    let buf = noiseBuffers.get(ctx);
    if (!buf) {
        const n = Math.floor(ctx.sampleRate * 0.5);
        buf = ctx.createBuffer(1, n, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
        noiseBuffers.set(ctx, buf);
    }
    return buf;
}

function envelope(ctx, part, t0, limit) {
    const g = ctx.createGain();
    const a = part.attack, d = part.decay;
    g.gain.setValueAtTime(FLOOR, t0);
    g.gain.linearRampToValueAtTime(Math.max(FLOOR, part.gain), t0 + a);
    g.gain.exponentialRampToValueAtTime(FLOOR, t0 + a + d);
    return { g, stopAt: Math.min(limit, t0 + a + d + 0.02) };
}

function ramp(param, points, t0, len) {
    param.setValueAtTime(points[0][1], t0);
    for (let i = 1; i < points.length; i++) param.exponentialRampToValueAtTime(points[i][1], t0 + points[i][0] * len);
}

/**
 * @returns {{ out: GainNode, sources: AudioScheduledSourceNode[], endTime: number, stop(now:number): void }}
 */
export function buildVoice(ctx, dest, spec, when) {
    const out = ctx.createGain();
    out.gain.value = spec.level;
    if (spec.pan && ctx.createStereoPanner) {
        const p = ctx.createStereoPanner();
        p.pan.value = spec.pan;
        out.connect(p);
        p.connect(dest);
    } else {
        out.connect(dest);
    }
    const endTime = when + spec.dur;
    const sources = [];

    for (const part of spec.parts) {
        const t0 = when + (part.delay || 0);
        const { g, stopAt } = envelope(ctx, part, t0, endTime);
        let src;
        if (part.t === 'noise') {
            src = ctx.createBufferSource();
            src.buffer = noiseBufferFor(ctx);
            src.loop = true;
            const f = ctx.createBiquadFilter();
            f.type = part.filter.type;
            f.Q.value = part.filter.q;
            ramp(f.frequency, part.filter.points, t0, part.decay);
            src.connect(f);
            f.connect(g);
        } else {
            src = ctx.createOscillator();
            src.type = part.wave || 'sine';
            if (part.t === 'sweep') ramp(src.frequency, part.points, t0, part.decay);
            else src.frequency.setValueAtTime(part.freq, t0);
            src.connect(g);
        }
        g.connect(out);
        src.start(t0);
        src.stop(stopAt);
        sources.push(src);
    }

    return {
        out, sources, endTime,
        /** Fade out quickly (no click) and stop every source. */
        stop(now) {
            try {
                out.gain.cancelScheduledValues(now);
                out.gain.setTargetAtTime(0, now, 0.01);
                for (const s of sources) s.stop(now + 0.06);
            } catch (e) { /* already stopped */ }
        },
    };
}
