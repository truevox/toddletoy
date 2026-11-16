/**
 * ObjectMotion - makes sandbox glyphs feel alive: pop-in, idle breathing and
 * bobbing, tap reactions, drag lift/tilt, bumps and pop-out ghosts.
 *
 * Contract: it NEVER changes obj.x / obj.y or caption / number-row positions of
 * a live object. It owns the glyph's scale, angle and visual lift (see
 * motion/GlyphPose.js): final glyph scale = (baseScale * gridFitScale) x the
 * motion factors, written in one place (applyPose) every tick.
 * Per-object state lives on obj.motionState; the tick allocates nothing.
 */
import { isDragged } from '../input/dragAccess.js';
import {
    newPose, resetPose, popInPose, captionAlpha, idlePose, reactKind, reactPose, bumpPose,
    dragTilt, DRAG_LIFT, POP_IN_MS, REACT_MS, BUMP_MS
} from './motion/MotionMath.js';
import { applyPose, glyphSize } from './motion/GlyphPose.js';
import { setCaptionAlpha, collectDisplayObjects } from './motion/CaptionFade.js';
import { MotionGhosts } from './motion/MotionGhosts.js';

const TAU = Math.PI * 2;

export class ObjectMotion {
    constructor(scene) {
        this.scene = scene;
        this.clock = 0;
        this.idleEnabled = true; // tests switch this off to measure exact rest poses
        this.reduced = false;
        this.ghosts = new MotionGhosts();
        this.acc = newPose();
        this.tmp = newPose();
        this.watchReducedMotion();
        if (scene && scene.events && scene.events.once) scene.events.once('shutdown', () => this.clearGhosts());
    }

    watchReducedMotion() {
        try {
            const mq = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
            if (!mq) return;
            this.reduced = !!mq.matches;
            this._mq = mq;
            this._onMq = (e) => { this.reduced = !!e.matches; };
            if (mq.addEventListener) mq.addEventListener('change', this._onMq);
        } catch (e) { /* no media queries: motion stays on */ }
    }

    stateOf(obj, fresh = false) {
        let s = obj.motionState;
        if (!s) {
            s = obj.motionState = {
                phase: Math.random() * TAU,
                period: 3 + Math.random() * 2, // seconds
                popMs: -1, popFresh: false,
                reactMs: -1, reactKind: 'emoji',
                bumpMs: -1, bumpStrength: 0,
                dragF: 0, tilt: 0, lastX: obj.x,
                idleW: fresh ? 0 : 1
            };
        }
        return s;
    }

    // ---- public API (safe on any object) ----

    /** Start the spawn pop. First applied on the next tick, after layout fitting. */
    popIn(obj) {
        if (!obj) return;
        const s = this.stateOf(obj, true);
        s.popMs = 0; s.popFresh = true; s.idleW = 0;
        s.reactMs = -1;
    }

    /** Tap reaction, by kind. Restarts if already playing. */
    react(obj) {
        if (!obj) return;
        const s = this.stateOf(obj);
        s.reactMs = 0;
        s.reactKind = reactKind(obj.type);
    }

    /** Quick squash for an edge or neighbour hit; strength 0..1. */
    bump(obj, strength = 1) {
        if (!obj || this.reduced) return;
        const s = this.stateOf(obj);
        s.bumpMs = 0;
        s.bumpStrength = Number.isFinite(strength) ? strength : 1;
    }

    /** Remove with a pop-out (scene.removeObject hands the visuals to a ghost). */
    popOut(obj) {
        if (obj && this.scene.removeObject) this.scene.removeObject(obj);
    }

    /** Take over an already-removed object's visuals and animate them out. */
    releaseToGhost(obj) {
        if (!obj) return false;
        const size = glyphSize(obj) || 60;
        const items = collectDisplayObjects(obj);
        delete obj.motionState;
        this.ghosts.add(items, size, this.reduced);
        return true;
    }

    clearGhosts() { this.ghosts.clear(); }

    // ---- tick ----

    update(time, delta) {
        // A slow frame must not make animations crawl (or jump): motion up to 100 ms/frame, ghosts up to 200
        const raw = Number.isFinite(delta) && delta > 0 ? delta : (Number.isFinite(delta) ? 0 : 16);
        const dt = raw > 100 ? 100 : raw;
        this.clock += dt;
        this.ghosts.update(raw > 200 ? 200 : raw);
        const objs = this.scene && this.scene.objects;
        if (!objs) return;
        for (let i = 0; i < objs.length; i++) {
            const obj = objs[i];
            if (obj && obj.active !== false) this.step(obj, dt);
        }
    }

    step(obj, dt) {
        const s = this.stateOf(obj);
        const acc = resetPose(this.acc);
        const t = this.tmp;
        const reduced = this.reduced;
        const dragged = isDragged(this.scene, obj);
        const size = glyphSize(obj);

        // drag lift and tilt (smoothed)
        s.dragF += ((dragged ? 1 : 0) - s.dragF) * (1 - Math.exp(-dt / 70));
        if (!dragged && s.dragF < 0.002) s.dragF = 0;
        const vx = dt > 0 ? (obj.x - s.lastX) / dt * 1000 : 0;
        s.lastX = obj.x;
        const tiltTarget = dragged && !reduced ? dragTilt(vx) : 0;
        s.tilt += (tiltTarget - s.tilt) * (1 - Math.exp(-dt / 90));
        if (!dragged && Math.abs(s.tilt) < 0.02) s.tilt = 0;
        const lift = 1 + DRAG_LIFT * s.dragF;
        acc.sx *= lift; acc.sy *= lift; acc.angle += s.tilt;
        if (dragged) s.reactMs = -1;

        // pop-in
        let popping = false;
        if (s.popMs >= 0) {
            if (s.popFresh) s.popFresh = false; else s.popMs += dt;
            if (popInPose(s.popMs, reduced, t)) {
                s.popMs = -1;
                setCaptionAlpha(obj, 1);
            } else {
                popping = true;
                acc.sx *= t.sx; acc.sy *= t.sy; acc.alpha = t.alpha;
                setCaptionAlpha(obj, reduced ? t.alpha : captionAlpha(s.popMs));
            }
        }

        // tap reaction
        let reacting = false;
        if (s.reactMs >= 0) {
            s.reactMs += dt;
            const dur = reduced ? 220 : REACT_MS;
            if (reactPose(s.reactKind, s.reactMs / dur, reduced, t)) {
                reacting = true;
                acc.sx *= t.sx; acc.sy *= t.sy; acc.angle += t.angle; acc.lift += t.lift;
            } else s.reactMs = -1;
        }

        // bump
        if (s.bumpMs >= 0) {
            s.bumpMs += dt;
            if (bumpPose(s.bumpMs / BUMP_MS, s.bumpStrength, t)) {
                acc.sx *= t.sx; acc.sy *= t.sy;
            } else s.bumpMs = -1;
        }

        // idle life, eased in once nothing else is happening
        const idleOn = this.idleEnabled && !reduced && !dragged && !popping && !reacting;
        s.idleW += ((idleOn ? 1 : 0) - s.idleW) * (1 - Math.exp(-dt / 250));
        if (!idleOn && (s.idleW < 0.002 || !this.idleEnabled || reduced)) s.idleW = 0;
        if (s.idleW > 0) {
            idlePose(this.clock / 1000, s.phase, s.period, s.idleW, t);
            acc.sx *= t.sx; acc.sy *= t.sy; acc.lift += t.lift;
        }

        applyPose(obj, acc, acc.lift * size);
    }

    destroy() {
        this.clearGhosts();
        if (this._mq && this._mq.removeEventListener && this._onMq) this._mq.removeEventListener('change', this._onMq);
    }
}

export { POP_IN_MS };
