/**
 * PointerInput - turns Phaser pointers (the mouse plus up to 10 fingers) into
 * input:pointerDown / Move / Up scene events, each carrying the pointer's id.
 *
 *  - a palm (4+ close contacts landing together) becomes ONE soft touch (PalmFilter)
 *  - a mouse press echoing a touch at the same spot is dropped (EmulatedMouseFilter)
 *  - presses that start on a DOM control above the canvas (the exit button) are ignored
 *  - a pointer that vanishes (touchcancel, slid off the screen, app switch) is released
 *    as a cancelled pointer-up, so nothing is left dragging
 */
import { toLogical } from '../systems/DisplayScale.js';
import { PalmFilter } from './PalmFilter.js';
import { EmulatedMouseFilter } from './SpawnGuard.js';

export const MAX_POINTERS = 10;
const clock = () => Date.now();

export class PointerInput {
    constructor(manager) {
        this.manager = manager;
        this.scene = manager.scene;
        this.palm = new PalmFilter();
        this.echo = new EmulatedMouseFilter();
        this.active = new Map();   // id -> { x, y, touch } for every pointer whose down was (or will be) emitted
        this.timer = null;
        this.onHide = () => { if (typeof document === 'undefined' || document.hidden) this.cancelAll(); };
        this.onBlur = () => this.cancelAll();
        if (typeof document !== 'undefined') document.addEventListener('visibilitychange', this.onHide);
        if (typeof window !== 'undefined') window.addEventListener('blur', this.onBlur);
    }

    get anyDown() { return this.active.size > 0; }
    emit(name, data) { this.manager.emit(name, data); }

    onDown(pointer) {
        const p = toLogical(this.scene, pointer);
        const id = pointer.id ?? 0;
        const touch = !!pointer.wasTouch;
        const now = clock();
        this.sweep(id);
        if (this.active.has(id)) this.release(id, p, true);   // a lost pointer-up: let go of the old press first
        if (this.onExitControl(pointer)) return;
        if (touch) this.echo.noteTouch(p.x, p.y, now);
        else if (this.echo.isDuplicate(false, p.x, p.y, now)) return;

        this.active.set(id, { x: p.x, y: p.y, touch });
        this.manager.pointerIsDown = true;
        if (!touch) { this.emit('pointerDown', { x: p.x, y: p.y, id, touch }); return; }

        if (this.palm.offer({ id, x: p.x, y: p.y }, now).absorbed) return;
        if (this.palm.due(now)) { this.flush(); return; }
        if (!this.timer) this.timer = setTimeout(() => { this.timer = null; this.flush(); }, this.palm.windowMs);
    }

    onMove(pointer) {
        const id = pointer.id ?? 0;
        const rec = this.active.get(id);
        if (!rec) return;
        const p = toLogical(this.scene, pointer);
        rec.x = p.x; rec.y = p.y;
        this.sweep(id);
        if (this.palm.isMember(id)) return;
        if (this.palm.isPending(id)) { this.palm.updatePending(id, p.x, p.y); return; }
        this.emit('pointerMove', { x: p.x, y: p.y, id, touch: rec.touch });
    }

    onUp(pointer) {
        const id = pointer.id ?? 0;
        if (!this.active.has(id)) return;
        this.release(id, toLogical(this.scene, pointer), !!pointer.wasCanceled);
    }

    /** Close the palm window: a palm is one soft touch, everyone else lands as themselves. */
    flush() {
        if (this.timer) { clearTimeout(this.timer); this.timer = null; }
        const { palms, singles } = this.palm.flush(clock());
        for (const palm of palms) {
            const id = palm.ids[0];
            this.emit('pointerDown', { x: palm.x, y: palm.y, id, touch: true, palm: true });
            this.emit('pointerUp', { x: palm.x, y: palm.y, id, touch: true, palm: true });
        }
        for (const s of singles) {
            const rec = this.active.get(s.id);
            if (!rec) continue;
            this.emit('pointerDown', { x: s.x, y: s.y, id: s.id, touch: true });
            // it moved while the window was open: land where it went down, then follow it
            if (s.lx !== s.x || s.ly !== s.y) this.emit('pointerMove', { x: s.lx, y: s.ly, id: s.id, touch: true });
        }
    }

    release(id, p, cancelled) {
        const rec = this.active.get(id);
        if (!rec) return;
        if (this.palm.isPending(id)) { this.flush(); }
        const member = this.palm.isMember(id);
        this.palm.release(id);
        this.active.delete(id);
        this.manager.pointerIsDown = this.active.size > 0;
        if (member) return;
        this.emit('pointerUp', { x: p.x, y: p.y, id, touch: rec.touch, canceled: !!cancelled });
    }

    /** Release every pointer Phaser says is no longer down (a touchend we never saw). */
    sweep(exceptId) {
        const list = this.scene.input && this.scene.input.manager && this.scene.input.manager.pointers;
        if (!Array.isArray(list) || !this.active.size) return;
        for (const ptr of list) {
            if (!ptr || ptr.id === exceptId || ptr.isDown !== false || !this.active.has(ptr.id)) continue;
            this.release(ptr.id, { x: this.active.get(ptr.id).x, y: this.active.get(ptr.id).y }, true);
        }
    }

    cancelAll() {
        for (const id of Array.from(this.active.keys())) {
            const rec = this.active.get(id);
            this.release(id, { x: rec.x, y: rec.y }, true);
        }
        this.palm.reset();
    }

    /** The DOM exit button sits above the canvas: a press there must never reach the toy. */
    onExitControl(pointer) {
        const canvas = this.scene.game && this.scene.game.canvas;
        return !!(pointer.downElement && canvas && pointer.downElement !== canvas);
    }

    destroy() {
        if (this.timer) { clearTimeout(this.timer); this.timer = null; }
        if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.onHide);
        if (typeof window !== 'undefined') window.removeEventListener('blur', this.onBlur);
    }
}
