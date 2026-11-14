/**
 * GlobeToy - a real spinning globe for toddlers.
 * Drag to spin (with momentum) and tilt; tap a country to see its flag, read
 * its name and hear it spoken. Country outlines: Natural Earth 1:110m
 * (public domain) via the `world-atlas` package.
 */
import { getGlobeData } from './globe-data.js';
import { GlobeRenderer } from './globe-render.js';
import { pickCountry } from './globe-pick.js';
import { makeView, clampTilt, wrapLon, DEG } from './globe-math.js';
import { speakText, cancelSpeech } from './toy-speech.js';

const TAP_SLOP_PX = 8;
const IDLE_BEFORE_SPIN_MS = 3500;
const SPIN_DEG_PER_MS = 6 / 1000;
const MOMENTUM_DECAY = 0.93;          // per 16.7ms frame
const MIN_VELOCITY = 0.002;           // deg/ms below which momentum stops
const INFO_MS = 5000;
const FADE_MS = 400;

export class GlobeToy {
  constructor(router, configManager = null) {
    this.router = router;
    this.configManager = configManager;
    this.container = null;
    this.renderer = null;
    this.autoSpin = true;

    this.lon = -30;
    this.lat = 20;
    this._vLon = 0; this._vLat = 0;     // momentum, deg/ms
    this._ptr = null;                    // active pointer drag state
    this._raf = 0;
    this._last = 0;
    this._dirty = false;
    this._visible = false;
    this._lastInteract = 0;
    this._sel = null;                    // { country, born, dying }
    this._infoTimer = null;
    this._countries = null;

    this._frame = (now) => this._onFrame(now);
    this._onResize = () => { this._resize(); this._requestFrame(); };
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  show() {
    if (!this._countries) this._countries = getGlobeData().countries;
    if (!this.container) {
      this.container = this._build();
      document.body.appendChild(this.container);
    }
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
    this._requestFrame();
  }

  hide() {
    this._visible = false;
    this._stopLoop();
    clearTimeout(this._infoTimer);
    this._infoTimer = null;
    this._ptr = null;
    this._vLon = this._vLat = 0;
    this._sel = null;
    if (this.infoPanel) this.infoPanel.style.opacity = '0';
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('orientationchange', this._onResize);
    cancelSpeech();
    if (this.container) this.container.style.display = 'none';
  }

  destroy() {
    this.hide();
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
    this.renderer = null;
    this.canvas = null;
    this.infoPanel = null;
  }

  /** Set the view centre (degrees). Latitude is clamped to the tilt limit. */
  setView(lon, lat) {
    this.lon = wrapLon(lon);
    this.lat = clampTilt(lat);
    this._dirty = true;
    this._requestFrame();
  }

  getView() { return { lon: this.lon, lat: this.lat }; }

  // ── DOM ────────────────────────────────────────────────────────────────────
  _build() {
    const wrap = document.createElement('div');
    wrap.id = 'globe-toy';
    wrap.style.cssText = 'position:fixed;inset:0;background:#030612;z-index:500;overflow:hidden;font-family:Arial,sans-serif;';

    const bg = document.createElement('canvas');
    bg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
    wrap.appendChild(bg);

    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;cursor:grab;touch-action:none;';
    wrap.appendChild(this.canvas);
    this.renderer = new GlobeRenderer(bg, this.canvas);

    this.infoPanel = document.createElement('div');
    this.infoPanel.setAttribute('aria-live', 'polite');
    this.infoPanel.style.cssText = `
      position:absolute;bottom:64px;left:50%;transform:translateX(-50%);
      background:rgba(0,10,30,0.88);border:1px solid rgba(255,255,255,0.22);
      border-radius:18px;padding:12px 28px;color:#fff;
      font-size:clamp(1.1rem,5vw,1.7rem);text-align:center;
      pointer-events:none;opacity:0;transition:opacity 0.3s;
      max-width:88vw;box-sizing:border-box;
    `;
    wrap.appendChild(this.infoPanel);

    const back = document.createElement('button');
    back.textContent = '← Back';
    back.style.cssText = `
      position:absolute;top:12px;left:16px;min-height:44px;min-width:44px;
      background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.3);
      color:#fff;padding:0 20px;border-radius:30px;
      cursor:pointer;font-size:0.95rem;z-index:10;font-family:Arial,sans-serif;
    `;
    back.addEventListener('click', () => this.router.navigate('/'));
    wrap.appendChild(back);

    const title = document.createElement('div');
    title.textContent = '🌍 World Globe';
    title.style.cssText = `
      position:absolute;top:22px;left:50%;transform:translateX(-50%);
      color:rgba(255,255,255,0.75);font-size:1.1rem;pointer-events:none;white-space:nowrap;
    `;
    wrap.appendChild(title);

    const hint = document.createElement('div');
    hint.textContent = 'Drag to spin the Earth  •  Tap a country!';
    hint.style.cssText = `
      position:absolute;bottom:20px;left:50%;transform:translateX(-50%);
      color:rgba(255,255,255,0.4);font-size:0.8rem;pointer-events:none;white-space:nowrap;
    `;
    wrap.appendChild(hint);

    const c = this.canvas;
    c.addEventListener('pointerdown', e => this._onDown(e));
    c.addEventListener('pointermove', e => this._onMove(e));
    c.addEventListener('pointerup', e => this._onUp(e, false));
    c.addEventListener('pointercancel', e => this._onUp(e, true));
    return wrap;
  }

  _resize() {
    if (!this.renderer) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.renderer.resize(window.innerWidth, window.innerHeight, dpr);
    this._dirty = true;
  }

  // ── Input ──────────────────────────────────────────────────────────────────
  _onDown(e) {
    if (this._ptr) return; // single pointer only
    try { this.canvas.setPointerCapture(e.pointerId); } catch (_) { /* synthetic events */ }
    this._ptr = { id: e.pointerId, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY,
                  t: performance.now(), moved: false };
    this._vLon = this._vLat = 0;
    this._lastInteract = performance.now();
  }

  _onMove(e) {
    const p = this._ptr;
    if (!p || p.id !== e.pointerId) return;
    if (!p.moved && Math.hypot(e.clientX - p.sx, e.clientY - p.sy) > TAP_SLOP_PX) p.moved = true;
    if (!p.moved) return;
    const now = performance.now();
    const dt = Math.max(1, now - p.t);
    const R = this.renderer.R;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    const cosLat = Math.max(0.5, Math.cos(this.lat / DEG));
    const dLon = -(dx / R) * DEG / cosLat;
    const dLat = (dy / R) * DEG;
    this.lon = wrapLon(this.lon + dLon);
    this.lat = clampTilt(this.lat + dLat);
    // smoothed velocity for momentum on release
    this._vLon = this._vLon * 0.5 + (dLon / dt) * 0.5;
    this._vLat = this._vLat * 0.5 + (dLat / dt) * 0.5;
    p.x = e.clientX; p.y = e.clientY; p.t = now; p.lastMove = now;
    this._lastInteract = now;
    this._dirty = true;
    this._requestFrame();
  }

  _onUp(e, cancelled) {
    const p = this._ptr;
    if (!p || p.id !== e.pointerId) return;
    this._ptr = null;
    const now = performance.now();
    this._lastInteract = now;
    if (cancelled) { this._vLon = this._vLat = 0; return; }
    if (!p.moved) {
      this._vLon = this._vLat = 0;
      this._handleTap(e.clientX, e.clientY);
    } else {
      // finger rested before lifting: no fling
      if (now - (p.lastMove || now) > 90) this._vLon = this._vLat = 0;
      this._requestFrame();
    }
  }

  // ── Tap ────────────────────────────────────────────────────────────────────
  _handleTap(clientX, clientY) {
    if (!this.renderer || !this._countries) return;
    const rect = this.canvas.getBoundingClientRect();
    const { cx, cy, R } = this.renderer;
    const nx = (clientX - rect.left - cx) / R;
    const ny = (cy - (clientY - rect.top)) / R;
    if (nx * nx + ny * ny > 1) return; // tapped space
    const hit = pickCountry(this._countries, makeView(this.lon, this.lat), nx, ny, R, 28);
    if (hit) {
      this._select(hit.country);
      this._showInfo(`${hit.country.flag} ${hit.country.name}`);
      speakText(this.configManager, hit.country.name, 1.1);
    } else {
      this._select(null);
      this._showInfo('🌊 Ocean');
      speakText(this.configManager, 'Ocean', 1.1);
    }
  }

  _select(country) {
    const now = performance.now();
    if (this._sel && this._sel.country && country !== this._sel.country) {
      this._sel = null;
    }
    if (country) this._sel = { country, born: now, dying: null };
    this._dirty = true;
    this._requestFrame();
  }

  _showInfo(text) {
    clearTimeout(this._infoTimer);
    this.infoPanel.textContent = text;
    this.infoPanel.style.opacity = '1';
    this._infoTimer = setTimeout(() => {
      this.infoPanel.style.opacity = '0';
      if (this._sel) this._sel.dying = performance.now();
      this._requestFrame();
    }, INFO_MS);
  }

  _selectionAmount(now) {
    const s = this._sel;
    if (!s) return 0;
    if (s.dying !== null) {
      const f = 1 - (now - s.dying) / FADE_MS;
      if (f <= 0) { this._sel = null; this._dirty = true; return 0; }
      return f;
    }
    const age = now - s.born;
    return Math.min(1, age / 150) * (0.85 + 0.15 * Math.sin(age / 220));
  }

  // ── Frame loop (runs only while something is moving) ──────────────────────
  _requestFrame() {
    if (this._raf || !this._visible) return;
    this._raf = requestAnimationFrame(this._frame);
  }

  _stopLoop() {
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = 0; }
  }

  _onFrame(now) {
    this._raf = 0;
    if (!this._visible || !this.renderer) return;
    const dt = this._last ? Math.min(64, now - this._last) : 16;
    this._last = now;
    let moving = false;

    if (this._ptr) {
      moving = false; // drag redraws are event-driven via _dirty
    } else if (Math.abs(this._vLon) > MIN_VELOCITY || Math.abs(this._vLat) > MIN_VELOCITY) {
      this.lon = wrapLon(this.lon + this._vLon * dt);
      this.lat = clampTilt(this.lat + this._vLat * dt);
      const decay = Math.pow(MOMENTUM_DECAY, dt / 16.67);
      this._vLon *= decay; this._vLat *= decay;
      if (Math.abs(this.lat) >= 60) this._vLat = 0;
      this._dirty = true; moving = true;
    } else {
      this._vLon = this._vLat = 0;
      if (this.autoSpin) {
        if (now - this._lastInteract > IDLE_BEFORE_SPIN_MS) {
          this.lon = wrapLon(this.lon + SPIN_DEG_PER_MS * dt);
          this._dirty = true;
        }
        moving = true; // keep ticking (cheap) until the idle delay elapses
      }
    }

    const amount = this._selectionAmount(now);
    if (this._sel) { this._dirty = true; moving = true; }

    if (this._dirty) {
      this._dirty = false;
      this.renderer.draw(makeView(this.lon, this.lat), this._countries,
        { country: this._sel ? this._sel.country : null, amount });
    }
    if (moving || this._dirty) {
      this._raf = requestAnimationFrame(this._frame);
    } else {
      this._last = 0;
    }
  }
}
