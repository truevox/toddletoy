/**
 * PointerRegistry - one record per finger (or the mouse): where it went down, what it is
 * dragging, and whether its press is still a possible tap. Pure data, no Phaser.
 */
export const TAP_SLOP = 10;      // logical px a press may wander and still be a tap
export const TAP_MAX_MS = 350;   // longest press that still counts as a tap

export class PointerRegistry {
    constructor() {
        this.records = new Map();
        this.seq = 0;
        this.released = new WeakMap();   // obj -> { t, cancelled } of its last release
    }

    get size() { return this.records.size; }
    anyDown() { return this.records.size > 0; }
    has(id) { return this.records.has(id); }
    get(id) { return this.records.get(id); }
    ids() { return Array.from(this.records.keys()); }

    begin(id, x, y, t, touch = false) {
        const rec = {
            id, x, y, downX: x, downY: y, t, touch,
            obj: null, dragSeq: 0,
            moved: false, revoiced: false, pickedUp: false
        };
        this.records.set(id, rec);
        return rec;
    }

    /** Forget a pointer (its drag, if any, is released first). */
    end(id) {
        const rec = this.records.get(id);
        if (!rec) return undefined;
        this.records.delete(id);
        return rec;
    }

    startDrag(id, obj) {
        const rec = this.records.get(id);
        if (!rec || !obj || rec.obj || this.isObjectDragged(obj)) return false;
        rec.obj = obj;
        rec.dragSeq = ++this.seq;
        return true;
    }

    /** End a pointer's drag; returns the object it held (or null). */
    stopDrag(id, { cancelled = false, t = 0 } = {}) {
        const rec = this.records.get(id);
        if (!rec || !rec.obj) return null;
        const obj = rec.obj;
        rec.obj = null;
        this.released.set(obj, { t, cancelled });
        return obj;
    }

    isObjectDragged(obj) {
        for (const rec of this.records.values()) if (rec.obj === obj) return true;
        return false;
    }

    /** Dragged objects, oldest drag first. */
    draggedObjects() {
        const list = [];
        for (const rec of this.records.values()) if (rec.obj) list.push(rec);
        list.sort((a, b) => a.dragSeq - b.dragSeq);
        return list.map(rec => rec.obj);
    }

    latestDragged() {
        const list = this.draggedObjects();
        return list.length ? list[list.length - 1] : null;
    }

    /** The object went away (popped, cleaned up): whoever held it holds nothing now. */
    dropObject(obj) {
        for (const rec of this.records.values()) if (rec.obj === obj) rec.obj = null;
    }

    clearDrags() {
        for (const rec of this.records.values()) rec.obj = null;
    }

    clear() { this.records.clear(); }

    wasCancelled(obj) { const r = this.released.get(obj); return !!(r && r.cancelled); }
    releaseTime(obj) { const r = this.released.get(obj); return r ? r.t : 0; }
}

/** Update a press with a move; true while it can still be a tap. Once a drag, always a drag. */
export function trackMove(rec, x, y, now) {
    rec.x = x; rec.y = y;
    if (rec.moved) return false;
    if (Math.hypot(x - rec.downX, y - rec.downY) > TAP_SLOP || now - rec.t >= TAP_MAX_MS) rec.moved = true;
    return !rec.moved;
}

/** Is releasing here, now, the end of a tap? */
export function isTapRelease(rec, x, y, now) {
    if (rec.moved || now - rec.t >= TAP_MAX_MS) return false;
    if (Number.isFinite(x) && Number.isFinite(y) && Math.hypot(x - rec.downX, y - rec.downY) > TAP_SLOP) return false;
    return true;
}
