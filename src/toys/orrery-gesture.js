/**
 * Pointer gesture classifier: tap, double-tap, one-finger drag (scrub) and
 * two-finger pinch/pan. DOM-free: feed it down/move/up with plain numbers.
 */
export const SLOP = 9;
export const TAP_MS = 500;
export const DOUBLE_MS = 320;
export const DOUBLE_DIST = 34;

export class GestureTracker {
  constructor(h = {}) {
    this.h = h;
    this.ptr = new Map();
    this.state = 'idle'; // idle | pending | drag | pinch | ignore
    this.lastTap = null;
    this._d = 0; this._mx = 0; this._my = 0;
  }

  reset() {
    if (this.state === 'drag') this.h.onDragEnd?.();
    if (this.state === 'pinch') this.h.onPinchEnd?.();
    this.ptr.clear(); this.state = 'idle'; this.lastTap = null;
  }

  _pair() {
    const [a, b] = [...this.ptr.values()];
    this._d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
    this._mx = (a.x + b.x) / 2; this._my = (a.y + b.y) / 2;
  }

  down(id, x, y, t) {
    this.ptr.set(id, { x, y, sx: x, sy: y, t });
    if (this.ptr.size === 1) { this.state = 'pending'; return; }
    if (this.ptr.size === 2) {
      if (this.state === 'drag') this.h.onDragEnd?.();
      this.state = 'pinch';
      this._pair();
      this.lastTap = null;
      this.h.onPinchStart?.(this._mx, this._my);
    }
  }

  move(id, x, y, t) {
    const p = this.ptr.get(id);
    if (!p) return;
    const px = p.x, py = p.y;
    p.x = x; p.y = y;
    if (this.state === 'pinch' && this.ptr.size === 2) {
      const od = this._d, omx = this._mx, omy = this._my;
      this._pair();
      this.h.onPinch?.({ cx: this._mx, cy: this._my, scale: this._d / od, dx: this._mx - omx, dy: this._my - omy });
      return;
    }
    if (this.state === 'pending' && Math.hypot(x - p.sx, y - p.sy) > SLOP) {
      this.state = 'drag';
      this.h.onDragStart?.(p.sx, p.sy, t);
      this.h.onDrag?.(x, y, p.sx, p.sy, t);
    } else if (this.state === 'drag') {
      this.h.onDrag?.(x, y, px, py, t);
    }
  }

  up(id, x, y, t) {
    const p = this.ptr.get(id);
    this.ptr.delete(id);
    if (!p) return;
    if (this.state === 'pinch') {
      if (this.ptr.size < 2) { this.state = 'ignore'; this.h.onPinchEnd?.(); }
    } else if (this.state === 'drag') {
      this.state = 'idle'; this.h.onDragEnd?.();
    } else if (this.state === 'pending') {
      this.state = 'idle';
      if (t - p.t <= TAP_MS && Math.hypot(x - p.sx, y - p.sy) <= SLOP) {
        const lt = this.lastTap;
        const dbl = lt && t - lt.t <= DOUBLE_MS && Math.hypot(x - lt.x, y - lt.y) <= DOUBLE_DIST;
        this.h.onTap?.(x, y);
        if (dbl) { this.h.onDoubleTap?.(x, y); this.lastTap = null; } else this.lastTap = { x, y, t };
      }
    }
    if (this.ptr.size === 0 && this.state === 'ignore') this.state = 'idle';
  }

  cancel(id) {
    if (!this.ptr.has(id)) return;
    this.ptr.delete(id);
    if (this.state === 'drag') this.h.onDragEnd?.();
    if (this.state === 'pinch' && this.ptr.size < 2) this.h.onPinchEnd?.();
    this.state = this.ptr.size ? 'ignore' : 'idle';
  }
}
