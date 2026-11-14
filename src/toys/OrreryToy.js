/**
 * OrreryToy - a playable solar system for small children.
 * Orbit view (drag to spin time, tap planets, zoom), Compare-sizes view and a
 * gentle "Find it!" game. Heavy lifting lives in orrery-* modules; this class
 * owns the lifecycle, the frame loop, layout and input wiring.
 */
import { BODIES, PLANET_COUNT } from './orrery-data.js';
import { TimeController, worldPosition, scrubAngleDelta } from './orrery-time.js';
import {
  createCamera, fitScale, scaleOf, bodyRadiusPx, stepCamera, stepView, zoomAbout, panBy,
  MAX_FOLLOW_ZOOM, MAX_ZOOM,
} from './orrery-camera.js';
import { layoutMode, freeRect, sideWidth, stripHeight, estimateBottomH, TOP_H } from './orrery-layout.js';
import { pickNearest } from './orrery-math.js';
import { makeStars, makeBelt, makeShooter, stepShooter, makeParticles } from './orrery-sky.js';
import { drawOrbitScene } from './orrery-render.js';
import { drawCompareScene } from './orrery-render-compare.js';
import { getSprites } from './orrery-sprites.js';
import { buildUI, layoutStrip, setSpeedUi } from './orrery-ui.js';
import { GestureTracker } from './orrery-gesture.js';
import { Chimes } from './orrery-audio.js';
import { createGame } from './orrery-game.js';
import { cancelSpeech } from './toy-speech.js';
import { actions } from './orrery-actions.js';

const _w = { x: 0, y: 0 };

export class OrreryToy {
  constructor(router, configManager = null) {
    this.router = router;
    this.configManager = configManager;
    this.container = null;
    this.canvas = null;
    this.ctx = null;
    this.infoPanel = null;
    this.rafId = null;
    this._visible = false;
    this._lastNow = 0;
    this._wall = 0;
    this._mq = null;
    this.time = new TimeController(false);
    this.cam = createCamera();
    this.view = { cx: 0, cy: 0, base: 1, w: 0, h: 0 };
    this.viewTarget = { cx: 0, cy: 0, base: 1 };
    this.free = { x: 0, y: 0, w: 0, h: 0 };
    this.mode = 'orbit';       // 'orbit' | 'compare'
    this.sel = -1;             // body index (0 = Sun) or -1
    this.expanded = false;
    this.game = createGame();
    this.chimes = new Chimes(configManager);
    this.timers = new Set();
    this.hinted = { dragged: false, tapped: false };
    this.cmp = { layout: null, scrollX: 0, zoom: 1, e: 12 };
    this.S = {
      w: 0, h: 0, dpr: 1, view: this.view, cam: this.cam, t: 0, wall: 0, sel: -1, hintOrbit: -1, pulse: -1,
      reduced: false, sky: null, belt: makeBelt(), shooter: makeShooter(), particles: makeParticles(),
      px: new Float64Array(9), py: new Float64Array(9), pr: new Float64Array(9),
      ghost: { on: false, x: 0, y: 0, rad: 0, a0: 0, a: 0 }, free: this.free,
    };
    this._pick = Array.from({ length: PLANET_COUNT }, () => ({ x: 0, y: 0, r: 0 }));
    this._loop = now => this._tick(now);
    this._resizeHandler = () => this._relayout(true);
    this._keyHandler = e => this._onKey(e);
    this.gesture = new GestureTracker({
      onTap: (x, y) => this._tapAt(x, y),
      onDoubleTap: (x, y) => this._doubleTap(x, y),
      onDragStart: () => this._dragStart(),
      onDrag: (x, y, px, py, t) => this._drag(x, y, px, py, t),
      onDragEnd: () => this._dragEnd(),
      onPinch: p => this._pinch(p),
    });
    this._lastDragT = 0;
  }

  static get PLANETS() {
    return BODIES.slice(1).map(b => ({ name: b.name, bodyColor: b.color, orbitR: b.orbitR, radius: b.r, periodS: b.periodYears * 24 }));
  }

  get reduced() {
    try { return !!(this._mq && this._mq.matches); } catch (_) { return false; }
  }

  /** Planet index 0..7 (Mercury..Neptune) or null (none / the Sun). */
  get selectedIdx() { return this.sel > 0 ? this.sel - 1 : null; }

  // ── Lifecycle ───────────────────────────────────────────────────────────
  show() {
    if (!this.container) {
      this._mq = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
      this.ui = buildUI(this._handlers());
      this.container = this.ui.root;
      this.canvas = this.ui.canvas;
      this.ctx = this.canvas.getContext('2d');
      this.infoPanel = this.ui.card;
      this._bindCanvas();
      document.body.appendChild(this.container);
    }
    this.container.style.display = 'block';
    if (!this._visible) {
      this._visible = true;
      window.addEventListener('resize', this._resizeHandler);
      window.addEventListener('orientationchange', this._resizeHandler);
      window.addEventListener('keydown', this._keyHandler);
      this._wall0 = 0;
    }
    if (this.reduced && this.time.speedIndex > 0 && !this._reducedApplied) { this.time.speedIndex = 0; this._reducedApplied = true; }
    getSprites();
    this.S.sky = null;
    this._relayout(true);
    setSpeedUi(this.ui, this.time.speedIndex, this.time.paused);
    this._lastNow = 0;
    this._startLoop();
  }

  hide() {
    this._visible = false;
    this._stopLoop();
    this.timers.forEach(t => clearTimeout(t));
    this.timers.clear();
    window.removeEventListener('resize', this._resizeHandler);
    window.removeEventListener('orientationchange', this._resizeHandler);
    window.removeEventListener('keydown', this._keyHandler);
    this.gesture.reset();
    if (this.time.dragging) this.time.endScrub();
    if (this.ui) this._resetState();
    this.chimes.close();
    cancelSpeech();
    if (this.container) this.container.style.display = 'none';
  }

  destroy() {
    this.hide();
    if (this.container && this.container.parentNode) this.container.parentNode.removeChild(this.container);
    this.container = null; this.canvas = null; this.ctx = null; this.infoPanel = null; this.ui = null;
  }

  // ── Layout ──────────────────────────────────────────────────────────────
  _relayout(snap = false) {
    if (!this.canvas) return;
    const w = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight);
    const S = this.S, ui = this.ui;
    const mode = layoutMode(w, h);
    ui.root.dataset.mode = mode;
    const side = sideWidth(w);
    ui.root.style.setProperty('--side', `${side}px`);
    const rows = layoutStrip(ui, mode === 'portrait' ? w : w - side);
    let m;
    if (mode === 'portrait') {
      const measured = ui.dock.getBoundingClientRect().height;
      m = { topH: TOP_H + this._safeTop(), bottomH: measured > 20 ? measured : estimateBottomH(w, !ui.card.hidden || !ui.game.hidden, this.expanded) };
    } else {
      const sh = ui.strip.getBoundingClientRect().height;
      m = { sideW: side, stripH: (sh > 20 ? sh : stripHeight(rows)) + 8 };
    }
    Object.assign(this.free, freeRect(mode, w, h, m));
    const f = this.free;
    this._mode = mode;
    this.viewTarget.cx = f.x + f.w / 2;
    this.viewTarget.cy = f.y + f.h / 2 + (mode === 'portrait' ? 0 : 6);
    this.viewTarget.base = fitScale(f.w, f.h);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (S.w !== w || S.h !== h || S.dpr !== dpr) {
      S.w = w; S.h = h; S.dpr = dpr;
      this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr);
      S.sky = makeStars(w, h);
    }
    if (!S.sky) S.sky = makeStars(w, h);
    this.view.w = w; this.view.h = h;
    if (snap || this.view.base === 1) Object.assign(this.view, { cx: this.viewTarget.cx, cy: this.viewTarget.cy, base: this.viewTarget.base });
    if (this.mode === 'compare') this._compareSetup(false);
    this._refollow();
  }

  _safeTop() {
    try { return parseFloat(getComputedStyle(this.container).getPropertyValue('--sat')) || 0; } catch (_) { return 0; }
  }

  // ── Loop ────────────────────────────────────────────────────────────────
  _startLoop() {
    if (this.rafId || !this._visible) return;
    this.rafId = requestAnimationFrame(this._loop);
  }

  _stopLoop() {
    if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
  }

  _tick(now) {
    this.rafId = null;
    if (!this._visible) return;
    const dtMs = this._lastNow ? Math.min(100, now - this._lastNow) : 16;
    this._lastNow = now;
    this._frame(dtMs, now);
    this.rafId = requestAnimationFrame(this._loop);
  }

  _frame(dtMs, now) {
    const dt = dtMs / 1000, S = this.S, reduced = this.reduced;
    this._wall += dt;
    S.wall = this._wall; S.reduced = reduced;
    this.time.step(dt);
    S.t = this.time.t;
    this._refollow();
    stepCamera(this.cam, dtMs, reduced);
    stepView(this.view, this.viewTarget, dtMs, reduced);
    if (!reduced) stepShooter(S.shooter, dt, S.w, S.h);
    this._hintsFrame(now);
    if (!this.ctx) return;
    if (this.mode === 'compare') {
      S.free = this.free;
      this._compareFrame();
    } else {
      this._computePositions();
      drawOrbitScene(this.ctx, S, dt);
    }
  }

  _compareFrame() {
    const C = this.cmp;
    drawCompareScene(this.ctx, this.S, { layout: C.layout, scrollX: C.scrollX, sel: this.sel, wall: this._wall, reduced: this.reduced });
  }

  _computePositions() {
    const S = this.S, view = this.view, cam = this.cam, s = scaleOf(view, cam);
    for (let i = 0; i < 9; i++) {
      if (i === 0) { _w.x = 0; _w.y = 0; } else worldPosition(BODIES[i], this.time.t, _w);
      S.px[i] = view.cx + (_w.x - cam.fx) * s;
      S.py[i] = view.cy + (_w.y - cam.fy) * s;
      S.pr[i] = bodyRadiusPx(BODIES[i], s);
    }
  }

  /** While following, keep the camera target glued to the planet. */
  _refollow() {
    const c = this.cam;
    if (c.follow < 0) return;
    worldPosition(BODIES[c.follow], this.time.t, _w);
    c.tx = _w.x; c.ty = _w.y;
  }

  /** Test/debug helper: current planet screen positions (client px). */
  _items() {
    this._computePositions();
    const S = this.S;
    const items = [];
    for (let i = 1; i <= PLANET_COUNT; i++) items.push({ x: S.px[i], y: S.py[i], r: S.pr[i] });
    return { layout: this.view, items, t: this.time.t };
  }

  _pickAt(x, y) {
    this._computePositions();
    const S = this.S;
    for (let i = 1; i <= PLANET_COUNT; i++) { const p = this._pick[i - 1]; p.x = S.px[i]; p.y = S.py[i]; p.r = S.pr[i]; }
    const k = pickNearest(this._pick, x, y, 28);
    if (k >= 0) return k + 1;
    return Math.hypot(x - S.px[0], y - S.py[0]) <= Math.max(36, S.pr[0] * 1.5) ? 0 : -1;
  }

  // ── Input ───────────────────────────────────────────────────────────────
  _bindCanvas() {
    const c = this.canvas;
    const pos = e => { const r = c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    c.addEventListener('pointerdown', e => {
      try { c.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
      const [x, y] = pos(e); this.gesture.down(e.pointerId, x, y, e.timeStamp);
    });
    c.addEventListener('pointermove', e => { const [x, y] = pos(e); this.gesture.move(e.pointerId, x, y, e.timeStamp); });
    c.addEventListener('pointerup', e => { const [x, y] = pos(e); this.gesture.up(e.pointerId, x, y, e.timeStamp); });
    c.addEventListener('pointercancel', e => this.gesture.cancel(e.pointerId));
    c.addEventListener('wheel', e => {
      e.preventDefault();
      const [x, y] = pos(e);
      this._zoomBy(Math.exp(-e.deltaY * (e.deltaMode ? 0.05 : 0.0016)), x, y);
    }, { passive: false });
  }

  /** Tap in canvas coordinates (client coords are accepted for tests). */
  _handleTap(clientX, clientY) {
    try {
      if (!this.canvas) return;
      const r = this.canvas.getBoundingClientRect();
      this._tapAt(clientX - r.left, clientY - r.top);
    } catch (err) { console.warn('OrreryToy tap failed:', err); }
  }

  _dragStart() {
    this._lastDragT = 0;
    if (this.mode !== 'orbit') return;
    this.time.beginScrub();
    this.hinted.dragged = true;
  }

  _drag(x, y, px, py, t) {
    if (this.mode === 'compare') { this._compareScroll(x - px); return; }
    const S = this.S, dt = this._lastDragT ? (t - this._lastDragT) / 1000 : 0.016;
    this._lastDragT = t;
    const gain = 0.45 * Math.min(S.w, S.h);
    const d = scrubAngleDelta(px, py, x, y, S.px[0], S.py[0], gain);
    this.time.scrub(d, dt);
  }

  _dragEnd() { if (this.time.dragging) this.time.endScrub(); }

  _pinch(p) {
    if (this.mode === 'compare') { this._compareZoom(p.scale, p.cx); this._compareScroll(p.dx); return; }
    this._zoomBy(p.scale, p.cx, p.cy);
    if (this.cam.follow < 0) panBy(this.view, this.cam, p.dx, p.dy);
  }

  _zoomBy(factor, x, y) {
    if (this.mode === 'compare') { this._compareZoom(factor, x); return; }
    const cam = this.cam;
    if (cam.follow >= 0) cam.tz = Math.min(MAX_FOLLOW_ZOOM, Math.max(1, cam.tz * factor));
    else zoomAbout(this.view, cam, x, y, factor, MAX_ZOOM);
  }

  _onKey(e) { return actions.onKey(this, e); }
  _handlers() { return actions.handlers(this); }
  _tapAt(x, y) { return actions.tapAt(this, x, y); }
  _doubleTap(x, y) { return actions.doubleTap(this, x, y); }
  _hintsFrame(now) { return actions.hintsFrame(this, now); }
  _resetState() { return actions.resetState(this); }
  _compareSetup(reset) { return actions.compareSetup(this, reset); }
  _compareScroll(dx) { return actions.compareScroll(this, dx); }
  _compareZoom(k, cx) { return actions.compareZoom(this, k, cx); }
}
