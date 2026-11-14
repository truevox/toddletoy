/**
 * Pointer gesture recogniser for the globe: drag, two-finger pinch, tap and
 * double-tap. Pure of DOM (takes plain {pointerId, clientX, clientY} records and
 * an injectable clock) so it is unit-testable.
 */
import { pinchGeometry } from './globe-anim.js';

export const TAP_SLOP_PX = 8;
export const TAP_SLOP_TOUCH_PX = 11;
export const DOUBLE_TAP_MS = 320;
export const DOUBLE_TAP_PX = 28;
const REST_MS = 90;

export class GestureTracker {
  constructor(h, now = () => performance.now()) {
    this.h = h;
    this.now = now;
    this.ptrs = new Map();
    this.g = null;
    this.lastTap = null;
  }

  get pointerCount() { return this.ptrs.size; }

  reset() { this.ptrs.clear(); this.g = null; this.lastTap = null; }

  down(e) {
    if (this.ptrs.size >= 2 || this.ptrs.has(e.pointerId)) return;
    const t = this.now();
    this.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY });
    if (this.ptrs.size === 1) {
      this.g = { t0: t, lastMove: t, moved: false, multi: false, slop: e.pointerType === 'touch' ? TAP_SLOP_TOUCH_PX : TAP_SLOP_PX };
      if (this.h.onStart) this.h.onStart();
    } else {
      this.g.moved = true; this.g.multi = true;
      const [a, b] = [...this.ptrs.values()];
      const geo = pinchGeometry(a.x, a.y, b.x, b.y);
      this.g.dist = geo.dist; this.g.mx = geo.mx; this.g.my = geo.my;
    }
  }

  move(e) {
    const p = this.ptrs.get(e.pointerId);
    if (!p || !this.g) return;
    const t = this.now();
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (this.ptrs.size >= 2) {
      const [a, b] = [...this.ptrs.values()];
      const geo = pinchGeometry(a.x, a.y, b.x, b.y);
      const ratio = this.g.dist > 0 ? geo.dist / this.g.dist : 1;
      this.h.onPinch({ ratio, dx: geo.mx - this.g.mx, dy: geo.my - this.g.my, mx: geo.mx, my: geo.my });
      this.g.dist = geo.dist; this.g.mx = geo.mx; this.g.my = geo.my; this.g.lastMove = t;
      return;
    }
    if (!this.g.moved) {
      if (Math.hypot(e.clientX - p.sx, e.clientY - p.sy) <= this.g.slop) return;
      this.g.moved = true;
      this.h.onDrag(e.clientX - p.sx, e.clientY - p.sy, Math.max(1, t - this.g.t0));
      this.g.lastMove = t;
      return;
    }
    this.h.onDrag(dx, dy, Math.max(1, t - this.g.lastMove));
    this.g.lastMove = t;
  }

  up(e, cancelled = false) {
    const p = this.ptrs.get(e.pointerId);
    if (!p || !this.g) return;
    this.ptrs.delete(e.pointerId);
    const t = this.now();
    if (this.ptrs.size > 0) return; // pinch -> one finger left: keep gesture alive, no tap
    const g = this.g;
    this.g = null;
    if (cancelled) { this.h.onEnd({ fling: false }); return; }
    if (!g.moved) {
      const lt = this.lastTap;
      const dbl = lt && t - lt.t <= DOUBLE_TAP_MS && Math.hypot(e.clientX - lt.x, e.clientY - lt.y) <= DOUBLE_TAP_PX;
      this.lastTap = dbl ? null : { t, x: e.clientX, y: e.clientY };
      this.h.onTap(e.clientX, e.clientY);
      if (dbl) this.h.onDoubleTap(e.clientX, e.clientY);
      this.h.onEnd({ fling: false });
    } else {
      this.h.onEnd({ fling: !g.multi && t - g.lastMove <= REST_MS });
    }
  }
}
