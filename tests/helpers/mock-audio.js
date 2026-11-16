// A small recording Web Audio mock for the sound-engine unit tests.
export function makeParam(v = 0) {
    return {
        value: v,
        calls: [],
        setValueAtTime(x, t) { this.calls.push(['set', x, t]); this.value = x; return this; },
        linearRampToValueAtTime(x, t) { this.calls.push(['lin', x, t]); return this; },
        exponentialRampToValueAtTime(x, t) { this.calls.push(['exp', x, t]); return this; },
        setTargetAtTime(x, t, k) { this.calls.push(["target", x, t, k]); this.value = x; return this; },
        cancelScheduledValues(t) { this.calls.push(['cancel', t]); return this; },
    };
}

export function makeNode(extra = {}) {
    return { connect: jest.fn(function (n) { return n; }), disconnect: jest.fn(), ...extra };
}

export function makeMockContext(state = 'running') {
    const ctx = {
        state,
        currentTime: 0,
        sampleRate: 44100,
        destination: makeNode({ isDestination: true }),
        sources: [],
        resume: jest.fn(function () { ctx.state = 'running'; return Promise.resolve(); }),
        suspend: jest.fn(function () { ctx.state = 'suspended'; return Promise.resolve(); }),
        close: jest.fn(() => { ctx.state = 'closed'; return Promise.resolve(); }),
        createGain() { return makeNode({ gain: makeParam(1) }); },
        createOscillator() {
            const o = makeNode({ type: 'sine', frequency: makeParam(440), start: jest.fn(), stop: jest.fn(), onended: null });
            ctx.sources.push(o);
            return o;
        },
        createStereoPanner() { return makeNode({ pan: makeParam(0) }); },
        createBiquadFilter() { return makeNode({ type: 'lowpass', frequency: makeParam(1000), Q: makeParam(1) }); },
        createDynamicsCompressor() {
            const c = makeNode({ threshold: makeParam(), knee: makeParam(), ratio: makeParam(), attack: makeParam(), release: makeParam() });
            return c;
        },
        createBuffer(ch, len, rate) { return { length: len, sampleRate: rate, getChannelData: () => new Float32Array(len) }; },
        createBufferSource() {
            const s = makeNode({ buffer: null, loop: false, start: jest.fn(), stop: jest.fn() });
            ctx.sources.push(s);
            return s;
        },
    };
    return ctx;
}
