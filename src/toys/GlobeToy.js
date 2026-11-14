/**
 * GlobeToy - a real spinning globe for toddlers.
 * Drag to spin (momentum), pinch / wheel / double-tap / buttons to zoom, tap a
 * country to fly to it, see its flag + name and hear it in each enabled
 * language. Play: Surprise me, Find it!, and a passport of visited countries.
 * Country outlines: Natural Earth 1:110m (public domain) via `world-atlas`.
 */
import { getGlobeData } from './globe-data.js';
import { GlobeRenderer } from './globe-render.js';
import { pickCountry } from './globe-pick.js';
import { makeView, clampTilt, wrapLon, unproject, angularDistance } from './globe-math.js';
import { createFly, sampleFly, clampZoom, zoomFromWheel, stepZoom, dragToDegrees, ZOOM_MIN, ZOOM_MAX } from './globe-anim.js';
import { speakText, cancelSpeech } from './toy-speech.js';
import { GlobeUI } from './globe-ui.js';
import { GestureTracker } from './globe-input.js';
import { GlobeAudio } from './globe-audio.js';
import { Particles } from './globe-fx.js';
import { layoutLabels, computeAnchors } from './globe-labels.js';
import { speakableLanguages, localisedNames } from './globe-intl.js';
import { metaFor } from './globe-meta.js';
import { GlobePlay } from './globe-play.js';

const IDLE_BEFORE_SPIN_MS = 3500;
const SPIN_DEG_PER_MS = 6 / 1000;
const MOMENTUM_DECAY = 0.93;
const MIN_VELOCITY = 0.002;
const SELECT_HOLD_MS = 12000;
const HOME_IDLE_MS = 45000;
const TAP_TOL_PX = 28;

export class GlobeToy {
  constructor(router, configManager = null) {
    this.router = router;
    this.configManager = configManager;
    this.container = null; this.renderer = null; this.ui = null; this.canvas = null; this.infoPanel = null;
    this.autoSpin = true;
    this.lon = -30; this.lat = 20; this.zoom = 1;
    this._vLon = 0; this._vLat = 0;
    this._raf = 0; this._last = 0; this._dirty = false; this._visible = false;
    this._lastInteract = 0;
    this._fly = null; this._flyEnd = 0;
    this._sel = null;               // { country, born, popAt }
    this._pulse = null;             // { country, until }
    this._timers = new Set();
    this._idle = { sel: 0, home: 0, spin: 0 };
    this._tmp = { lon: 0, lat: 0, zoom: 1 };
    this._countries = null;
    this._dragged = false; this._tapped = false;
    this.particles = new Particles();
    this.audio = new GlobeAudio(configManager);
    this.play = null;
    this._frame = now => this._onFrame(now);
    this._onResize = () => { this._resize(); this._requestFrame(); };
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  show() {
    if (!this._countries) { this._countries = getGlobeData().countries; computeAnchors(this._countries); }
    if (!this.container) this._build();
    this.container.style.display = 'block';
    if (!this._visible) {
      this._visible = true;
      window.addEventListener('resize', this._onResize);
      window.addEventListener('orientationchange', this._onResize);
    }
    this._resize();
    this._last = 0;
    this._lastInteract = performance.now() - IDLE_BEFORE_SPIN_MS + 1200;
    this._dirty = true;
    this.play.onShow();
    this._requestFrame();
  }

  hide() {
    this._visible = false;
    this._stopLoop();
    this._clearTimers();
    this._fly = null; this._sel = null; this._pulse = null;
    this._vLon = this._vLat = 0;
    this.particles.clear();
    if (this.tracker) this.tracker.reset();
    if (this.play) this.play.onHide();
    if (this.ui) { this.ui.hideCard(); this.ui.dispose(); }
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('orientationchange', this._onResize);
    cancelSpeech();
    this.audio.close();
    if (this.container) this.container.style.display = 'none';
  }

  destroy() {
    this.hide();
    this.audio.dispose();
    if (this.container && this.container.parentNode) this.container.parentNode.removeChild(this.container);
    this.container = null; this.renderer = null; this.canvas = null; this.infoPanel = null; this.ui = null; this.play = null;
  }

  setView(lon, lat) {
    this.lon = wrapLon(lon); this.lat = clampTilt(lat);
    this._dirty = true; this._requestFrame();
  }
  getView() { return { lon: this.lon, lat: this.lat, zoom: this.zoom }; }

  // ── DOM + input wiring ─────────────────────────────────────────────────────
  _build() {
    this.play = new GlobePlay(this);
    this.ui = new GlobeUI(this.play.callbacks(() => this.router.navigate('/')));
    this.container = this.ui.root;
    this.canvas = this.ui.canvas;
    this.infoPanel = this.ui.infoPanel;
    document.body.appendChild(this.container);
    this.renderer = new GlobeRenderer(this.ui.bg, this.canvas);

    this.tracker = new GestureTracker({
      onStart: () => { this._clearIdleTimers(); this._lastInteract = performance.now(); this._vLon = this._vLat = 0; this._fly = null; this.play.onUserInput(); },
      onDrag: (dx, dy, dt) => this._drag(dx, dy, dt),
      onPinch: p => { this._dragged = true; this._setZoom(this.zoom * p.ratio); this._drag(p.dx, p.dy, 16, true); },
      onTap: (x, y) => { this._tapped = true; this._handleTap(x, y); },
      onDoubleTap: (x, y) => this._doubleTap(x, y),
      onEnd: ({ fling }) => { if (!fling) this._vLon = this._vLat = 0; this._poke(); this._requestFrame(); },
    });
    const c = this.canvas;
    c.addEventListener('pointerdown', e => { try { c.setPointerCapture(e.pointerId); } catch (_) { /* synthetic */ } this.tracker.down(e); });
    c.addEventListener('pointermove', e => this.tracker.move(e));
    c.addEventListener('pointerup', e => this.tracker.up(e, false));
    c.addEventListener('pointercancel', e => this.tracker.up(e, true));
    c.addEventListener('wheel', e => {
      e.preventDefault();
      this._setZoom(zoomFromWheel(this.zoom, e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY, e.ctrlKey));
      this._poke(); this._requestFrame();
    }, { passive: false });
    this.container.addEventListener('keydown', e => this.play.onKey(e));
  }

  _resize() {
    if (!this.renderer) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = window.innerWidth, h = window.innerHeight;
    const l = this.ui.applyLayout(w, h);
    this.layout = l;
    this.renderer.resize(w, h, dpr, l.cx, l.cy, l.R);
    this.renderer.setZoom(this.zoom);
    this._dirty = true;
  }

  reducedMotion() {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (_) { return false; }
  }

  // ── Timers ─────────────────────────────────────────────────────────────────
  after(ms, fn) {
    const id = setTimeout(() => { this._timers.delete(id); if (this._visible) fn(); }, ms);
    this._timers.add(id);
    return id;
  }
  cancel(id) { if (id) { clearTimeout(id); this._timers.delete(id); } }
  _clearTimers() { for (const t of this._timers) clearTimeout(t); this._timers.clear(); this._idle = { sel: 0, home: 0, spin: 0 }; if (this.play) this.play.clearTimers(); }
  _clearIdleTimers() { for (const k of ['sel', 'home', 'spin']) { this.cancel(this._idle[k]); this._idle[k] = 0; } }

  /** Re-arm the idle timers after an interaction has finished. */
  _poke() {
    this._lastInteract = performance.now();
    this._clearIdleTimers();
    if (this._sel && !this.play.game.active) this._idle.sel = this.after(SELECT_HOLD_MS, () => this.clearSelection());
    if (this.zoom > ZOOM_MIN + 0.05 && !this.play.game.active) this._idle.home = this.after(HOME_IDLE_MS, () => this.goHome());
    this.play.armHint();
  }

  clearSelection() {
    this._sel = null; this._dirty = true;
    if (!this.play.game.active) this.ui.hideCard();
    this._lastInteract = performance.now() - IDLE_BEFORE_SPIN_MS + 1000;
    this._requestFrame();
  }

  // ── View control ───────────────────────────────────────────────────────────
  _setZoom(z) {
    this.zoom = clampZoom(z);
    if (this.renderer) this.renderer.setZoom(this.zoom);
    if (this.ui) this.ui.setZoomState(this.zoom, ZOOM_MIN, ZOOM_MAX);
    this._dirty = true;
  }

  flyTo(lon, lat, zoom = this.zoom, { dur = 600, spin = 0, onDone = null } = {}) {
    this._vLon = this._vLat = 0;
    this._lastInteract = performance.now();
    if (this.reducedMotion()) {
      this.lon = wrapLon(lon); this.lat = clampTilt(lat); this._setZoom(zoom);
      this._fly = null; this._flyEnd = performance.now();
      if (onDone) onDone();
    } else {
      this._fly = createFly({ lon: this.lon, lat: this.lat, zoom: this.zoom }, { lon, lat, zoom }, performance.now(), dur, spin);
      this._fly.onDone = onDone;
    }
    this._dirty = true; this._requestFrame();
    this._syncDebug();
  }

  goHome() { this.flyTo(this.lon, this.lat, 1, { dur: 700 }); this._lastInteract = performance.now() - IDLE_BEFORE_SPIN_MS + 700; }
  zoomStep(dir) { this.flyTo(this.lon, this.lat, stepZoom(this.zoom, dir), { dur: 260 }); }

  _drag(dx, dy, dt, noMomentum = false) {
    this._dragged = true;
    const { dLon, dLat } = dragToDegrees(dx, dy, this.renderer.R, this.zoom, this.lat);
    this.lon = wrapLon(this.lon + dLon);
    this.lat = clampTilt(this.lat + dLat);
    if (!noMomentum) {
      this._vLon = this._vLon * 0.5 + (dLon / dt) * 0.5;
      this._vLat = this._vLat * 0.5 + (dLat / dt) * 0.5;
    }
    this._lastInteract = performance.now();
    this._dirty = true; this._requestFrame();
  }

  _doubleTap(x, y) {
    const ll = this._unprojectClient(x, y);
    if (this.zoom < 2) this.flyTo(ll ? ll.lon : this.lon, ll ? ll.lat : this.lat, 2.8, { dur: 450 });
    else this.goHome();
  }

  _unprojectClient(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const { cx, cy, S } = this.renderer;
    return unproject((clientX - rect.left - cx) / S, (cy - (clientY - rect.top)) / S, makeView(this.lon, this.lat));
  }

  // ── Tap + selection ────────────────────────────────────────────────────────
  _hit(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const { cx, cy, S } = this.renderer;
    const nx = (clientX - rect.left - cx) / S, ny = (cy - (clientY - rect.top)) / S;
    if (nx * nx + ny * ny > 1) return { space: true };
    const hit = pickCountry(this._countries, makeView(this.lon, this.lat), nx, ny, S, TAP_TOL_PX);
    return hit ? { country: hit.country } : { ocean: true };
  }

  _handleTap(clientX, clientY) {
    if (!this.renderer || !this._countries) return;
    const h = this._hit(clientX, clientY);
    if (h.space) { this.play.onSpaceTap(); return; }
    if (this.play.game.active) { this.play.gameTap(h.country || null); return; }
    this._pulse = null; this.play.onFirstTap();
    if (h.country) this.selectCountry(h.country, { fly: true });
    else this.selectOcean();
  }

  /** Select a country: fly to it, pop, card, passport, sound and speech. */
  selectCountry(country, { fly = true, silent = false } = {}) {
    const now = performance.now();
    const again = this._sel && this._sel.country === country;
    const a = country.anchor;
    let popAt = now;
    if (fly && a) {
      this.flyTo(a.lon, a.lat, this.zoom, { dur: 600 });
      popAt = this._fly ? now + 560 : now;
    }
    this._sel = { country, born: now, popAt };
    const novelty = this.play.visit(country);
    const names = localisedNames(country, speakableLanguages(this.configManager));
    const meta = metaFor(country);
    const more = [];
    if (meta && meta.capital) more.push(['🏛 CAPITAL', meta.capital]);
    for (const n of names.slice(1)) more.push([n.code.toUpperCase(), n.name]);
    this.ui.showCard({ flag: country.flag, name: names[0].name, sub: meta ? meta.continent : '', isNew: novelty.isNew && !again, more });
    this.ui.announce(`${names[0].name}${meta ? ', ' + meta.continent : ''}`);
    if (!silent) {
      if (novelty.isNew && !again) this.audio.popNew(); else this.audio.pop();
      this.speakNames(names);
    }
    this.sparkle(novelty.isNew && !again);
    this._dirty = true; this._requestFrame();
    this._syncDebug();
  }

  selectOcean() {
    this._sel = null;
    this.ui.showCard({ flag: '🌊', name: 'Ocean', sub: '', more: [] });
    this.ui.announce('Ocean');
    this.audio.pop();
    speakText(this.configManager, 'Ocean', 1.1, 'en-US');
    this._dirty = true; this._requestFrame();
  }

  speakNames(names) {
    names.forEach((n, i) => speakText(this.configManager, n.name, 1.1, n.lang, i > 0));
  }

  sparkle(big) {
    const { cx, cy } = this.renderer;
    const reduced = this.reducedMotion();
    this.particles.burst(cx, cy, reduced ? 6 : big ? 36 : 14, big ? 1 : 0, big ? 0.22 : 0.14);
    this._requestFrame();
  }

  toggleMore() { this.ui.setExpanded(!this.ui.expanded); this._poke(); }

  // ── Frame loop (runs only while something is moving) ──────────────────────
  _requestFrame() {
    if (this._raf || !this._visible) return;
    this._raf = requestAnimationFrame(this._frame);
  }
  _stopLoop() { if (this._raf) { cancelAnimationFrame(this._raf); this._raf = 0; } }

  _selState(now) {
    const s = this._sel;
    if (!s) return null;
    const t = now - s.popAt;
    const amount = Math.min(1, (now - s.born) / 160);
    const scale = t > 0 && t < 450 ? 1 + 0.09 * Math.sin((Math.PI * t) / 450) : 1;
    return { country: s.country, amount, scale, active: now - s.born < 200 || t < 480 };
  }

  _onFrame(now) {
    this._raf = 0;
    if (!this._visible || !this.renderer) return;
    const dt = this._last ? Math.min(64, now - this._last) : 16;
    this._last = now;
    let moving = false;

    if (this._fly) {
      const f = this._fly;
      const done = sampleFly(f, now, this._tmp);
      this.lon = this._tmp.lon; this.lat = this._tmp.lat;
      if (Math.abs(this._tmp.zoom - this.zoom) > 1e-4) this._setZoom(this._tmp.zoom);
      this._dirty = true; moving = true;
      if (done) { this._fly = null; this._flyEnd = now; if (f.onDone) f.onDone(); }
    } else if (this.tracker.pointerCount > 0) {
      moving = false;
    } else if (Math.abs(this._vLon) > MIN_VELOCITY || Math.abs(this._vLat) > MIN_VELOCITY) {
      this.lon = wrapLon(this.lon + this._vLon * dt);
      this.lat = clampTilt(this.lat + this._vLat * dt);
      const decay = Math.pow(MOMENTUM_DECAY, dt / 16.67);
      this._vLon *= decay; this._vLat *= decay;
      if (Math.abs(this.lat) >= 60) this._vLat = 0;
      this._dirty = true; moving = true;
    } else {
      this._vLon = this._vLat = 0;
      if (this.autoSpin && !this.reducedMotion() && this.play.canSpin()) {
        const idle = now - this._lastInteract;
        if (idle > IDLE_BEFORE_SPIN_MS) {
          this.lon = wrapLon(this.lon + SPIN_DEG_PER_MS * dt * (this.zoom > 1 ? 1 / this.zoom : 1));
          this._dirty = true; moving = true;
        } else {
          this.cancel(this._idle.spin);
          this._idle.spin = this.after(IDLE_BEFORE_SPIN_MS - idle + 20, () => this._requestFrame());
        }
      }
    }

    const sel = this._selState(now);
    if (sel && sel.active) { moving = true; this._dirty = true; }
    if (this.particles.active) { this.particles.update(dt); moving = true; this._dirty = true; }
    let pulse = null;
    if (this._pulse && now < this._pulse.until) {
      pulse = { country: this._pulse.country, amount: 0.5 + 0.5 * Math.sin(now / 280) };
      moving = true; this._dirty = true;
    } else if (this._pulse) { this._pulse = null; this._dirty = true; }

    const interacting = this.tracker.pointerCount > 0 || !!this._fly || Math.abs(this._vLon) > MIN_VELOCITY || Math.abs(this._vLat) > MIN_VELOCITY;
    if (this.renderer.setQuality(interacting)) this._dirty = true;

    if (this._dirty) {
      this._dirty = false;
      const view = makeView(this.lon, this.lat);
      const r = this.renderer;
      const labels = layoutLabels({ view, S: r.S, cx: r.cx, cy: r.cy, w: r.w, h: r.h, zoom: this.zoom,
        scale: this.layout ? this.layout.labelScale : 1, countries: this._countries });
      r.draw(view, this._countries, sel, { pulse, labels, particles: this.particles });
    }
    if (moving) {
      this._raf = requestAnimationFrame(this._frame);
    } else {
      this._last = 0;
      this._syncDebug();
    }
  }

  /** Cheap state mirror for tests/devtools (written only when the view is at rest). */
  _syncDebug() {
    const d = this.container && this.container.dataset;
    if (!d) return;
    d.lon = this.lon.toFixed(2); d.lat = this.lat.toFixed(2); d.zoom = this.zoom.toFixed(2);
    d.selected = this._sel ? this._sel.country.name : '';
    d.selLon = this._sel && this._sel.country.anchor ? this._sel.country.anchor.lon.toFixed(2) : '';
    d.selLat = this._sel && this._sel.country.anchor ? this._sel.country.anchor.lat.toFixed(2) : '';
    d.game = this.play.game.active ? (this.play.game.target ? this.play.game.target.name : '') : '';
    const gt = this.play.game.active && this.play.game.target;
    d.gameLon = gt ? gt.anchor.lon.toFixed(2) : ''; d.gameLat = gt ? gt.anchor.lat.toFixed(2) : '';
    d.pulse = this._pulse ? this._pulse.country.name : '';
    d.flying = this._fly ? '1' : '0';
  }

  distanceTo(country) {
    const a = country.anchor;
    return a ? angularDistance(this.lon, this.lat, a.lon, a.lat) : Math.PI;
  }
}
