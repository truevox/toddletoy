/**
 * SoftPhysics - per-tick controller: keeps object bodies apart, throws and bounces
 * released drags, and keeps the screen from over-filling. It moves objects only
 * through movementManager.setObjectPosition (logical px) and sleeps when nothing moves.
 *
 * Per-object state lives on obj.__soft (see Separation.js for the body shape).
 */
import { viewSize } from './DisplayScale.js';
import { defaultKeepOutRects, getObjectExtents } from '../../positioning/BoundsClamp.js';
import { resolvePair, endBody, EASE_K, MAX_PUSH_SPEED, EDGE_MARGIN, PAIR_GAP, ENGAGE_GAP, penetration } from './Separation.js';
import { enforceCapacity } from './ScreenCapacity.js';
import { DragSamples, stepGlide, MAX_THROW_SPEED } from './ThrowMotion.js';

const NEWBORN_MS = 600, NEWBORN_MOB = 0.25, DROP_MOB = 0.35;
const STILL_TICKS = 12, HEARTBEAT_MS = 1000, FAST_MEASURE_MS = 1000, MEASURE_EVERY = 100;
const MAX_DT = 0.05;
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export class SoftPhysics {
    constructor(scene) {
        this.scene = scene;
        this.ctx = { width: 0, height: 0, keepOut: null, margin: EDGE_MARGIN, k: EASE_K, maxSpeed: MAX_PUSH_SPEED };
        this.samples = new DragSamples();
        this.vel = { vx: 0, vy: 0 };
        this.prevDragged = null;
        this.lastT = 0; this.lastN = -1; this.capacityUntil = 0;
        this.awake = true; this.stillTicks = 0; this.dirty = false; this.lastBeat = 0;
        this.sizeW = 0; this.sizeH = 0; this.seq = 0;
        this.reduced = false;
        this.keepOut = { x: 0, y: 0, width: 0, height: 0 };

        const mq = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
        this.reduced = !!(mq && mq.matches);
        this.onMq = (e) => { this.reduced = !!e.matches; };
        if (mq && mq.addEventListener) mq.addEventListener('change', this.onMq);
        this.mq = mq;

        this.onMove = () => {
            const d = scene.draggedObject;
            if (d && d.active) this.samples.push(now(), d.x, d.y);
        };
        if (scene.events && scene.events.on) {
            scene.events.on('input:pointerMove', this.onMove);
            if (scene.events.once) scene.events.once('shutdown', () => this.destroy());
        }
    }

    wake() { this.awake = true; this.stillTicks = 0; }

    maxObjects() {
        const adv = this.scene.configManager && this.scene.configManager.config && this.scene.configManager.config.advanced;
        const m = adv && Number(adv.maxObjects);
        return Number.isFinite(m) && m > 0 ? m : 0;
    }

    refreshCtx() {
        const { width, height } = viewSize(this.scene);
        const c = this.ctx;
        c.width = width; c.height = height;
        const ko = Array.isArray(this.scene.keepOutRects) ? this.scene.keepOutRects : defaultKeepOutRects({ width, height });
        const k = ko[0];
        if (k) { this.keepOut.x = k.x; this.keepOut.y = k.y; this.keepOut.width = k.width; this.keepOut.height = k.height; c.keepOut = this.keepOut; }
        else c.keepOut = null;
        c.k = this.reduced ? 30 : EASE_K;
        c.maxSpeed = this.reduced ? 1500 : MAX_PUSH_SPEED;
        if (width !== this.sizeW || height !== this.sizeH) { this.sizeW = width; this.sizeH = height; this.wake(); }
    }

    measure(obj, s, t) {
        const e = getObjectExtents(obj);
        if (!e) return false;
        const changed = Math.abs(e.left - s.l) > 1 || Math.abs(e.right - s.r) > 1 || Math.abs(e.top - s.t) > 1 || Math.abs(e.bottom - s.b) > 1;
        s.l = e.left; s.r = e.right; s.t = e.top; s.b = e.bottom;
        s.measuredAt = t;
        return changed;
    }

    stateFor(obj, t) {
        let s = obj.__soft;
        if (s) return s;
        const fresh = this.scene.lastSpawnTime && Date.now() - this.scene.lastSpawnTime < 400;
        s = obj.__soft = { x: obj.x, y: obj.y, l: -1, r: 1, t: -1, b: 1, mob: 1, fixed: false, seq: this.seq++,
            vx: 0, vy: 0, moved: false, absX: 0, absY: 0, netX: 0, netY: 0, biasX: 0, biasY: 0, born: t, measuredAt: -1e9, lowMobUntil: fresh ? t + NEWBORN_MS : 0, lowMob: NEWBORN_MOB };
        if (!this.measure(obj, s, t)) { /* keep defaults when unmeasurable (mocks) */ }
        this.wake();
        return s;
    }

    /** Called once per scene update. */
    update() {
        const scene = this.scene;
        const objs = scene.objects;
        if (!objs || !scene.movementManager) return;
        const t = now();
        let dt = this.lastT ? (t - this.lastT) / 1000 : 1 / 60;
        this.lastT = t;
        dt = Math.min(Math.max(dt, 0.001), MAX_DT);
        if (scene.gridMode && scene.gridMode.enabled) { this.clearVelocities(); return; }

        const n = objs.length;
        if (n === 0) { this.samples.clear(); this.prevDragged = null; this.lastN = 0; return; }

        this.refreshCtx();
        this.trackDrag(t);

        let beat = false;
        if (t - this.lastBeat > HEARTBEAT_MS) { beat = true; this.lastBeat = t; }
        for (let i = 0; i < n; i++) {
            const o = objs[i];
            if (!o || !o.active) continue;
            const s = this.stateFor(o, t);
            if (!this.awake) {
                if (Math.abs(o.x - s.x) > 0.01 || Math.abs(o.y - s.y) > 0.01) this.wake();
            }
            const young = t - s.born < FAST_MEASURE_MS;
            if ((this.awake && young && t - s.measuredAt > MEASURE_EVERY) || beat) {
                if (this.measure(o, s, t)) this.wake();
            }
        }

        if (n !== this.lastN) { this.lastN = n; this.capacityUntil = t + 1000; this.wake(); }
        if (t < this.capacityUntil) {
            if (enforceCapacity(scene, this.ctx.width, this.ctx.height, this.maxObjects()) > 0) { this.lastN = scene.objects.length; this.wake(); }
        }
        if (!this.awake) return;
        this.step(dt, t);
    }

    trackDrag(t) {
        const d = this.scene.draggedObject || null;
        if (d !== this.prevDragged) {
            const prev = this.prevDragged;
            this.wake();
            if (prev && prev.active && prev.__soft) {
                this.samples.push(t, prev.x, prev.y);
                const s = prev.__soft;
                s.lowMobUntil = t + NEWBORN_MS; s.lowMob = DROP_MOB;
                this.samples.velocity(t, this.vel);
                if (!this.reduced && (this.vel.vx || this.vel.vy)) { s.vx = this.vel.vx; s.vy = this.vel.vy; s.x = prev.x; s.y = prev.y; }
                else { s.vx = 0; s.vy = 0; }
                if (!(this.vel.vx || this.vel.vy)) this.save(); // a plain drop: stopDragging already saved
            }
            this.samples.clear();
            if (d) this.samples.push(t, d.x, d.y);
            this.prevDragged = d;
        } else if (d) {
            this.samples.push(t, d.x, d.y);
        }
    }

    step(dt, t) {
        const objs = this.scene.objects, n = objs.length, mm = this.scene.movementManager, ctx = this.ctx;
        let activity = 0;
        for (let i = 0; i < n; i++) {
            const o = objs[i], s = o.__soft;
            if (!s || !o.active) continue;
            s.moved = false;
            s.x = o.x; s.y = o.y;
            s.fixed = o === this.scene.draggedObject || (mm.hasMovingObject && mm.hasMovingObject(o.id));
            s.mob = t < s.lowMobUntil ? s.lowMob : 1;
            if (s.fixed) { s.vx = 0; s.vy = 0; }
            else if (s.vx !== 0 || s.vy !== 0) {
                const hit = stepGlide(ctx, s, dt);
                activity += 1;
                if (hit > 150 && this.scene.objectMotion && this.scene.objectMotion.bump) this.scene.objectMotion.bump(o, Math.min(1, hit / MAX_THROW_SPEED));
            }
        }
        for (let i = 0; i < n; i++) {
            const a = objs[i] && objs[i].__soft;
            if (!a || !objs[i].active) continue;
            for (let j = i + 1; j < n; j++) {
                const b = objs[j] && objs[j].__soft;
                if (!b || !objs[j].active) continue;
                const moved = resolvePair(ctx, a, b, dt);
                if (moved > 0.01) {
                    activity += moved;
                    if (moved / dt > 300 && this.scene.objectMotion && this.scene.objectMotion.bump) {
                        this.scene.objectMotion.bump(a.moved ? objs[i] : objs[j], 0.4);
                    }
                }
            }
        }
        for (let i = 0; i < n; i++) {
            const o = objs[i], s = o.__soft;
            if (s) endBody(s);
            if (!s || !o.active || !s.moved) continue;
            if (Math.abs(s.x - o.x) > 1e-6 || Math.abs(s.y - o.y) > 1e-6) {
                mm.setObjectPosition(o, s.x, s.y);
                this.dirty = true;
            }
        }
        if (activity > 0.01) this.stillTicks = 0;
        else if (++this.stillTicks >= STILL_TICKS && !this.scene.draggedObject) {
            this.awake = false;
            this.save();
        }
    }

    save() {
        if (!this.dirty) return;
        this.dirty = false;
        if (this.scene.saveGameState) this.scene.saveGameState();
    }

    clearVelocities() {
        const objs = this.scene.objects || [];
        for (let i = 0; i < objs.length; i++) { const s = objs[i] && objs[i].__soft; if (s) { s.vx = 0; s.vy = 0; } }
        this.samples.clear();
        this.prevDragged = null;
    }

    reset() { this.clearVelocities(); this.lastN = -1; this.wake(); }

    destroy() {
        if (this.scene.events && this.scene.events.off) this.scene.events.off('input:pointerMove', this.onMove);
        if (this.mq && this.mq.removeEventListener) this.mq.removeEventListener('change', this.onMq);
        this.clearVelocities();
    }
}

export { PAIR_GAP, ENGAGE_GAP, penetration };
