import { viewWidth, viewHeight } from './DisplayScale.js'
import { AudioEngine } from '../audio/AudioEngine.js'
import { EventGate } from '../audio/EventGate.js'
import { EventLog } from '../audio/EventLog.js'
import { makeSound } from '../audio/SoundRecipes.js'
import { noteIndexForY } from '../audio/Scale.js'
import { kindOfType } from '../audio/Timbres.js'

/**
 * AudioManager - the facade the scene talks to for sound.
 * Short, enveloped, pentatonic notes (height = pitch, kind of object = timbre) and a
 * handful of event sounds; see src/game/audio/. Nothing drones, so `audio.toneDuration`
 * from older configs is kept but ignored.
 */
export class AudioManager {
    constructor(scene) {
        this.scene = scene;
        this.engine = new AudioEngine({ getConfig: () => this.audioConfig() });
        this.gate = new EventGate();
        this.log = new EventLog(64);
        this.drags = new Map();    // obj id -> { obj, idx, moved } for every dragged object being heard (one per finger)
        this.quiet = 0;            // >0 while removals are not events (reset, rebuild)
        this.onVis = () => this.onVisibility(typeof document !== 'undefined' && document.hidden);
        if (typeof document !== 'undefined') document.addEventListener('visibilitychange', this.onVis);
    }

    audioConfig() {
        const cm = this.scene && this.scene.configManager;
        return (cm && cm.getAudioConfig && cm.getAudioConfig()) || { volume: 10, mute: false };
    }

    // ---- compatibility surface -------------------------------------------------

    get audioContext() { return this.engine.ctx; }

    /** Voices currently sounding (id -> voice). Notes end by themselves, so this is normally tiny. */
    get activeTones() { return this.engine.voiceMap(); }

    async resumeAudioContext() { this.engine.unlock(); }

    // ---- events ----------------------------------------------------------------

    position(obj, x, y) {
        const px = Number.isFinite(x) ? x : obj && obj.x, py = Number.isFinite(y) ? y : obj && obj.y;
        const w = viewWidth(this.scene), h = viewHeight(this.scene);
        return {
            idx: noteIndexForY(py, h),
            pan: Math.min(0.5, Math.max(-0.5, ((Number.isFinite(px) ? px : w / 2) / w - 0.5))),
        };
    }

    fire(event, obj, x, y, strength) {
        try {
            const cfg = this.audioConfig();
            if (cfg.mute) return null;
            const { idx, pan } = this.position(obj, x, y);
            const kind = kindOfType(obj && obj.type);
            if (!this.gate.allow(event, obj && obj.id, kind + idx)) return null;
            const spec = makeSound(event, { kind, noteIndex: idx, strength, pan });
            const voice = this.engine.play(spec, obj ? obj.id : null);
            this.log.add({ event, kind, note: spec.note, freq: spec.freq, level: spec.level, t: this.gate.now(), played: !!voice });
            return voice;
        } catch (error) {
            console.warn('Error playing sound:', error);
            return null;
        }
    }

    playSpawn(obj, x, y) { return this.fire('spawn', obj, x, y); }
    playTap(obj, x, y) { return this.fire('tap', obj, x, y); }

    playPickup(obj) {
        this.drags.set(obj.id, { obj, idx: this.position(obj).idx, moved: true });
        return this.fire('pickup', obj);
    }

    /** Called on every pointer move while dragging: a soft note whenever the object crosses a scale step. */
    playDragStep(obj, x, y) {
        const d = this.drags.get(obj.id);
        if (!d || d.obj !== obj) return null;
        const idx = this.position(obj, x, y).idx;
        if (idx === d.idx) return null;
        const voice = this.fire('dragStep', obj, x, y);
        if (voice || this.audioConfig().mute) d.idx = idx;      // a rate-limited step is retried on the next move
        return voice;
    }

    /** Drag released slowly. Silent unless the press really turned into a drag (a tap is not a drop). */
    playDrop(obj) {
        if (!this.endDrag(obj)) return null;
        return this.fire('drop', obj);
    }

    playThrow(obj) {
        if (!this.endDrag(obj)) return null;
        return this.fire('throw', obj);
    }

    endDrag(obj) {
        const d = this.drags.get(obj.id);
        if (!d || d.obj !== obj || !d.moved) return false;
        this.drags.delete(obj.id);
        return true;
    }

    playBounce(obj, strength = 1) { return this.fire('bounce', obj, undefined, undefined, strength); }

    playPop(obj) {
        if (this.quiet > 0 || !obj) return null;
        this.drags.delete(obj.id);
        this.engine.stopOwner(obj.id);
        return this.fire('pop', obj);
    }

    /** Run fn with removal pops off (resets and rebuilds are not something the child did). */
    silenceDuring(fn) {
        this.quiet++;
        try { return fn(); } finally { this.quiet--; }
    }

    debugLog() { return this.log.list(); }

    // ---- shims for the old continuous-tone API (now short notes) -------------------

    generateContinuousTone(x, y, objId) {
        return this.fire('spawn', { id: objId, type: 'emoji', x, y }, x, y);
    }

    updateTonePosition(x, y, objId) {
        const o = { id: objId, type: 'emoji', x, y };
        const d = this.drags.get(objId);
        if (!d) this.drags.set(objId, { obj: o, idx: this.position(o).idx, moved: false });
        else d.obj = o;
        return this.playDragStep(o, x, y);
    }

    stopTone(objId) { this.engine.stopOwner(objId); }
    stopAllTones() { this.drags.clear(); this.engine.stopAll(); }
    hasTone(objId) { return this.engine.hasOwner(objId); }
    getToneCount() { return this.engine.voiceCount(); }

    // ---- lifecycle ---------------------------------------------------------------

    /** Tab hidden: silence now and suspend; shown: resume. Notes are short, so nothing can stick. */
    onVisibility(hidden) {
        if (hidden) this.engine.suspend();
        else this.engine.resume();
    }

    destroy() {
        if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.onVis);
        this.drags.clear();
        this.engine.destroy();
    }
}
