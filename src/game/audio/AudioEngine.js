/**
 * AudioEngine - one lazily created AudioContext, unlocked once on the first user gesture,
 * a master chain (voices -> master gain -> limiter -> destination) and a capped voice pool.
 * Nothing here knows about the game: it plays sound specs.
 */
import { buildVoice } from './VoiceBuilder.js';
import { volumeToGain } from './Volume.js';

export const MAX_VOICES = 12;
const GESTURES = ['pointerdown', 'keydown', 'touchend'];
const START_DELAY = 0.005;

export class AudioEngine {
    /**
     * @param {{ getConfig: () => {volume:number, mute:boolean}, gestureTarget?: EventTarget|null }} opts
     */
    constructor({ getConfig, gestureTarget } = {}) {
        this.getConfig = getConfig || (() => ({}));
        this.ctx = null;
        this.master = null;
        this.limiter = null;
        this.unlocked = false;
        this.voices = new Map();
        this.nextId = 1;
        this.lastGain = null;
        this.target = gestureTarget === undefined ? (typeof window !== 'undefined' ? window : null) : gestureTarget;
        this.onGesture = () => this.unlock();
        if (this.target) for (const g of GESTURES) this.target.addEventListener(g, this.onGesture, { capture: true, passive: true });
    }

    stopListening() {
        if (!this.target) return;
        for (const g of GESTURES) this.target.removeEventListener(g, this.onGesture, { capture: true });
        this.target = null;
    }

    /** First user gesture: create the context and resume it. Safe to call again. */
    unlock() {
        this.unlocked = true;
        const ctx = this.ensure();
        if (!ctx) return null;
        if (ctx.state === 'running') this.stopListening();
        else if (ctx.resume) {
            try { Promise.resolve(ctx.resume()).then(() => { if (this.ctx && this.ctx.state === 'running') this.stopListening(); }, () => {}); } catch (e) { /* ignore */ }
        }
        return ctx;
    }

    canCreate() {
        if (this.unlocked) return true;
        return typeof navigator !== 'undefined' && !!(navigator.userActivation && navigator.userActivation.hasBeenActive);
    }

    ensure() {
        if (this.ctx) return this.ctx;
        if (!this.canCreate()) return null;
        try {
            const Ctor = typeof AudioContext !== 'undefined' ? AudioContext : (typeof webkitAudioContext !== 'undefined' ? webkitAudioContext : null);
            if (!Ctor) return null;
            const ctx = new Ctor();
            const master = ctx.createGain();
            master.gain.value = volumeToGain((this.getConfig() || {}).volume);
            const limiter = ctx.createDynamicsCompressor();
            limiter.threshold.value = -14;
            limiter.knee.value = 12;
            limiter.ratio.value = 8;
            limiter.attack.value = 0.002;
            limiter.release.value = 0.2;
            master.connect(limiter);
            limiter.connect(ctx.destination);
            this.ctx = ctx; this.master = master; this.limiter = limiter;
            this.lastGain = master.gain.value;
        } catch (error) {
            console.warn('Web Audio API not supported or failed to initialize:', error);
            this.ctx = null;
        }
        return this.ctx;
    }

    /** Follow the volume and mute settings (live, on every note). Returns true when sound is allowed. */
    applyConfig() {
        const cfg = this.getConfig() || {};
        const target = cfg.mute ? 0 : volumeToGain(cfg.volume);
        if (this.master && this.ctx && target !== this.lastGain) {
            const now = this.ctx.currentTime;
            this.master.gain.cancelScheduledValues(now);
            if (target === 0) this.master.gain.value = 0;               // mute is immediate
            else this.master.gain.setTargetAtTime(target, now, 0.015);
            this.lastGain = target;
        }
        if (cfg.mute) { this.stopAll(); return false; }
        return true;
    }

    purge() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        for (const [id, v] of this.voices) if (v.end <= now) this.voices.delete(id);
    }

    voiceCount() { this.purge(); return this.voices.size; }
    hasVoice(id) { this.purge(); return this.voices.has(id); }
    hasOwner(owner) { this.purge(); for (const v of this.voices.values()) if (v.owner === owner) return true; return false; }
    voiceMap() { this.purge(); return this.voices; }

    /** Make room for a voice of `priority`: steal the oldest voice of the lowest priority. False if it should be dropped. */
    makeRoom(priority) {
        if (this.voices.size < MAX_VOICES) return true;
        let victim = null;
        for (const v of this.voices.values()) {
            if (!victim || v.priority < victim.priority || (v.priority === victim.priority && v.start < victim.start)) victim = v;
        }
        if (!victim || victim.priority > priority) return false;
        this.stopVoice(victim);
        return true;
    }

    stopVoice(v) {
        this.voices.delete(v.id);
        v.handle.stop(this.ctx ? this.ctx.currentTime : 0);
    }

    stopOwner(owner) {
        for (const v of [...this.voices.values()]) if (v.owner === owner) this.stopVoice(v);
    }

    /** Play a sound spec. Returns the voice record, or null when muted, locked, suspended or dropped. */
    play(spec, owner = null) {
        if (!this.applyConfig() && !this.ctx) return null;
        const cfg = this.getConfig() || {};
        if (cfg.mute) return null;
        const ctx = this.ensure();
        if (!ctx) return null;
        if (ctx.state !== 'running') {            // never queue notes on a suspended context: they would all fire at once
            try { if (ctx.resume) Promise.resolve(ctx.resume()).catch(() => {}); } catch (e) { /* ignore */ }
            return null;
        }
        this.applyConfig();
        this.purge();
        if (!this.makeRoom(spec.priority)) return null;
        const start = ctx.currentTime + START_DELAY;
        const handle = buildVoice(ctx, this.master, spec, start);
        const voice = { id: this.nextId++, owner, priority: spec.priority, start, end: handle.endTime, event: spec.event, handle };
        this.voices.set(voice.id, voice);
        return voice;
    }

    /** Silence everything at once. */
    stopAll() {
        for (const v of [...this.voices.values()]) this.stopVoice(v);
        this.voices.clear();
    }

    suspend() {
        this.stopAll();
        if (this.ctx && this.ctx.state === 'running' && this.ctx.suspend) {
            try { Promise.resolve(this.ctx.suspend()).catch(() => {}); } catch (e) { /* ignore */ }
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended' && this.ctx.resume) {
            try { Promise.resolve(this.ctx.resume()).catch(() => {}); } catch (e) { /* ignore */ }
        }
    }

    destroy() {
        this.stopListening();
        this.stopAll();
        const ctx = this.ctx;
        this.ctx = null; this.master = null; this.limiter = null;
        if (ctx && ctx.close) {
            try { Promise.resolve(ctx.close()).catch(() => {}); } catch (e) { /* ignore */ }
        }
    }
}
