/**
 * GamepadInput - every connected pad (up to four) drives its own cursor.
 *
 * A stick or the d-pad moves the pad's cursor smoothly (time-based, dead zone, clamped to the
 * screen and clear of the exit button). A face button is a finger: pressing it sends a pointer-down
 * at the cursor, moving while it is held sends pointer-moves, letting go sends a pointer-up. The scene
 * therefore handles it exactly like a touch: empty space spawns, a quick press on an object is a tap,
 * holding and moving drags it and a fast release throws it. Events carry `id: 'pad<n>'` (also `pointerId`), `touch: false`.
 *
 * Nothing is polled until a pad is connected (gamepadconnected, or a pad already present at start).
 */
import { viewWidth, viewHeight, sizes } from '../systems/DisplayScale.js';
import { defaultKeepOutRects } from '../../positioning/BoundsClamp.js';
import { GamepadCursors } from './GamepadCursors.js';

export const MAX_PADS = 4;
export const DEAD_ZONE = 0.18;          // radial, on each stick
export const SPEED_PER_SEC = 0.9;       // screen short-edge lengths per second at full tilt
export const MAX_FRAME_MS = 50;         // a stalled frame must not teleport the cursor
export const IDLE_MS = 5000;            // cursor starts fading after this long unused
export const FADE_OUT_MS = 600;
export const FADE_IN_MS = 120;
export const FACE_BUTTONS = [0, 1, 2, 3];
export const DPAD = { up: 12, down: 13, left: 14, right: 15 };
export const CURSOR_RADIUS_OF_GLYPH = 0.3;
export const MIN_CURSOR_RADIUS = 20;

/** Radial dead zone: inside it nothing, outside it rescaled so the edge of the zone is zero. */
export function applyDeadZone(x, y, zone = DEAD_ZONE) {
    const m = Math.hypot(x, y);
    if (!(m > zone)) return { x: 0, y: 0 };
    const k = (Math.min(m, 1) - zone) / (1 - zone) / m;
    return { x: x * k, y: y * k };
}

const isDown = (b) => !!b && (b.pressed === true || (typeof b.value === 'number' && b.value > 0.5));

export class GamepadInput {
    /**
     * @param {Object} scene
     * @param {(name:string, data:Object)=>void} emit - InputManager.emit
     * @param {{now?:()=>number, nav?:Object, target?:EventTarget, reducedMotion?:()=>boolean, createView?:()=>Object}} [options]
     */
    constructor(scene, emit, options = {}) {
        this.scene = scene;
        this.emit = emit;
        this.now = options.now || (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()));
        this.nav = options.nav || (typeof navigator !== 'undefined' ? navigator : null);
        this.createView = options.createView || (() => new GamepadCursors(scene));
        this.reducedMotion = options.reducedMotion || this.makeReducedMotion();
        this.view = null;
        this.pads = new Map();      // index -> pad state, only for pads that are connected
        this.paused = false;
        this.lastT = 0;

        this.onConnected = (e) => this.connect(e && e.gamepad);
        this.onDisconnected = (e) => this.disconnect(e && e.gamepad && e.gamepad.index);
        this.target = options.target || (typeof window !== 'undefined' ? window : null);
        if (this.target) {
            this.target.addEventListener('gamepadconnected', this.onConnected);
            this.target.addEventListener('gamepaddisconnected', this.onDisconnected);
        }
        // pads that were already connected before the page looked
        this.list().forEach((p, i) => { if (p && p.connected !== false) this.connect({ index: i }); });
    }

    makeReducedMotion() {
        const mq = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
        return () => !!(mq && mq.matches);
    }

    list() {
        try {
            const l = this.nav && this.nav.getGamepads ? this.nav.getGamepads() : null;
            return l ? Array.from(l) : [];
        } catch (e) {
            return [];
        }
    }

    /** True while there is anything to poll. */
    get active() { return this.pads.size > 0; }

    /** Cursor state for a pad, or null when that pad is not connected. */
    cursor(index) {
        const p = this.pads.get(index);
        return p ? { x: p.x, y: p.y, alpha: p.alpha, visible: p.alpha > 0, pressed: p.held } : null;
    }

    cursorRadius() {
        return Math.max(MIN_CURSOR_RADIUS, sizes(this.scene).glyph * CURSOR_RADIUS_OF_GLYPH);
    }

    connect(gamepad) {
        const index = gamepad && gamepad.index;
        if (!Number.isInteger(index) || index < 0 || index >= MAX_PADS || this.pads.has(index)) return;
        const w = viewWidth(this.scene), h = viewHeight(this.scene), r = this.cursorRadius();
        const start = this.clampPoint(w / 2 + (index - (MAX_PADS - 1) / 2) * r * 3, h / 2);
        this.pads.set(index, { index, x: start.x, y: start.y, alpha: 0, lastActive: -Infinity, held: false, down: [] });
    }

    disconnect(index) {
        const p = this.pads.get(index);
        if (!p) return;
        this.release(p);
        this.pads.delete(index);
        if (this.view) this.view.remove(index);
    }

    /** Where a cursor may be: on screen, not under the exit button. */
    clampPoint(x, y) {
        const w = viewWidth(this.scene), h = viewHeight(this.scene), r = this.cursorRadius();
        let cx = Math.min(Math.max(x, r), Math.max(r, w - r));
        let cy = Math.min(Math.max(y, r), Math.max(r, h - r));
        const rects = Array.isArray(this.scene.keepOutRects) ? this.scene.keepOutRects : defaultKeepOutRects({ width: w, height: h });
        rects.forEach((k) => {
            if (cx > k.x - r && cx < k.x + k.width + r && cy > k.y - r && cy < k.y + k.height + r) {
                const left = cx - (k.x - r), down = (k.y + k.height + r) - cy;
                if (left <= down) cx = k.x - r; else cy = k.y + k.height + r;
            }
        });
        return { x: cx, y: cy };
    }

    payload(p, extra) {
        return { x: p.x, y: p.y, id: `pad${p.index}`, pointerId: `pad${p.index}`, touch: false, source: 'gamepad', pad: p.index, ...extra };
    }

    /** Let go of a held button (pad lost, toy covered): the scene sees the finger lift. */
    release(p) {
        if (!p.held) return;
        p.held = false;
        this.emit('pointerUp', this.payload(p));
    }

    setPaused(paused) {
        this.paused = !!paused;
        if (!this.paused) { this.lastT = 0; return; }
        this.pads.forEach((p) => { this.release(p); p.down = []; p.alpha = 0; });
        if (this.view) this.view.hideAll();
    }

    /** Viewport changed: keep each cursor at the same relative place. */
    handleResize(previous) {
        const w = viewWidth(this.scene), h = viewHeight(this.scene);
        this.pads.forEach((p) => {
            if (previous && previous.width > 0 && previous.height > 0) { p.x *= w / previous.width; p.y *= h / previous.height; }
            else { p.x = w / 2; p.y = h / 2; }
            const c = this.clampPoint(p.x, p.y);
            p.x = c.x; p.y = c.y;
        });
        if (this.view) this.view.setRadius(this.cursorRadius());
    }

    /** Once per frame. Does nothing, and asks the browser nothing, while no pad is connected. */
    update() {
        if (this.pads.size === 0 || this.paused) return;
        const t = this.now();
        const dt = this.lastT ? Math.min(MAX_FRAME_MS, Math.max(0, t - this.lastT)) : 16;
        this.lastT = t;

        const list = this.list();
        this.pads.forEach((p, index) => {
            const pad = list[index];
            if (!pad || pad.connected === false) { this.disconnect(index); return; }
            this.step(p, pad, dt, t);
        });
        if (this.pads.size === 0) this.lastT = 0;
    }

    step(p, pad, dt, t) {
        const axis = (n) => Number(pad.axes && pad.axes[n]) || 0;
        const btn = (n) => isDown(pad.buttons && pad.buttons[n]);

        // movement: both sticks and the d-pad
        const l = applyDeadZone(axis(0), axis(1)), r = applyDeadZone(axis(2), axis(3));
        let vx = l.x + r.x + (btn(DPAD.right) ? 1 : 0) - (btn(DPAD.left) ? 1 : 0);
        let vy = l.y + r.y + (btn(DPAD.down) ? 1 : 0) - (btn(DPAD.up) ? 1 : 0);
        const m = Math.hypot(vx, vy);
        if (m > 1) { vx /= m; vy /= m; }
        let moved = false;
        if (m > 0) {
            const speed = SPEED_PER_SEC * Math.min(viewWidth(this.scene), viewHeight(this.scene)) * dt / 1000;
            const c = this.clampPoint(p.x + vx * speed, p.y + vy * speed);
            moved = Math.abs(c.x - p.x) > 1e-6 || Math.abs(c.y - p.y) > 1e-6;
            p.x = c.x; p.y = c.y;
            p.lastActive = t;
        }
        if (moved && p.held) this.emit('pointerMove', this.payload(p));

        // buttons: any edge shows the cursor; a face button is a finger
        const count = pad.buttons ? pad.buttons.length : 0;
        let faces = 0;
        for (let i = 0; i < count; i++) {
            const now = btn(i);
            const isDpad = i >= DPAD.up && i <= DPAD.right; // movement, handled above
            if (now !== !!p.down[i] && !isDpad) p.lastActive = t;
            p.down[i] = now;
            if (now && FACE_BUTTONS.includes(i)) faces++;
        }
        if (!p.held && faces > 0) {
            p.held = true;
            p.lastActive = t;
            this.emit('pointerDown', this.payload(p));
        } else if (p.held && faces === 0) {
            p.held = false;
            p.lastActive = t;
            this.emit('pointerUp', this.payload(p));
        }

        this.fade(p, dt, t);
    }

    /** Cursor appears on use and fades when idle; with reduced motion it just appears and disappears. */
    fade(p, dt, t) {
        const want = t - p.lastActive < IDLE_MS ? 1 : 0;
        const before = p.alpha;
        if (this.reducedMotion()) p.alpha = want;
        else p.alpha = want ? Math.min(1, p.alpha + dt / FADE_IN_MS) : Math.max(0, p.alpha - dt / FADE_OUT_MS);
        if (p.alpha <= 0 && before <= 0) return;
        if (!this.view) this.view = this.createView();
        this.view.update(p.index, { x: p.x, y: p.y, alpha: p.alpha, pressed: p.held, radius: this.cursorRadius() });
    }

    destroy() {
        if (this.target) {
            this.target.removeEventListener('gamepadconnected', this.onConnected);
            this.target.removeEventListener('gamepaddisconnected', this.onDisconnected);
        }
        this.pads.forEach((p) => this.release(p));
        this.pads.clear();
        if (this.view) { this.view.destroy(); this.view = null; }
    }
}
