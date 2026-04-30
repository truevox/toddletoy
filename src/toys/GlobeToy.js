/**
 * GlobeToy - Spinnable flat world map for toddlers
 * Swipe to spin; tap a country to hear its name and see its flag.
 */

import { COUNTRIES, COUNTRY_BY_ID } from './globe-countries.js';

// ── GlobeToy class ────────────────────────────────────────────────────────────
export class GlobeToy {
  constructor(router, configManager = null) {
    this.router        = router;
    this.configManager = configManager;
    this.container = null;
    this.canvas    = null;
    this.ctx       = null;
    this.hitCanvas = null;
    this.hitCtx    = null;

    this.lonOff    = -10;   // start with Atlantic roughly centred
    this.velDeg    = 0;     // momentum in degrees per frame
    this.rafId     = null;

    this._ptrs       = {};  // active pointers
    this._lastPtrX   = null;
    this._lastPtrT   = null;
    this._dragging   = false;

    this._resizeH    = null;
    this._infoTimer  = null;
    this.selectedId  = null;

    // Projection cache: keyed by poly array reference, stores typed arrays for xs/ys
    this._polyCache  = new WeakMap();
    this._cacheH     = 0;   // canvas height when ys were last computed
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  show() {
    if (!this.container) {
      this.container = this._build();
      document.body.appendChild(this.container);
    }
    this.container.style.display = 'block';
    this._render();
  }

  hide() {
    if (this.container) this.container.style.display = 'none';
    this._stopLoop();
  }

  destroy() {
    this._stopLoop();
    if (this._resizeH) window.removeEventListener('resize', this._resizeH);
    if (this.container && this.container.parentNode)
      this.container.parentNode.removeChild(this.container);
    this.container = null;
  }

  // ── DOM construction ───────────────────────────────────────────────────────
  _build() {
    const wrap = document.createElement('div');
    wrap.id = 'globe-toy';
    wrap.style.cssText = 'position:fixed;inset:0;background:#0a1628;z-index:500;overflow:hidden;font-family:Arial,sans-serif;';

    // Main canvas
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;cursor:grab;touch-action:none;';
    wrap.appendChild(this.canvas);

    // Offscreen hit canvas (never attached to DOM)
    this.hitCanvas = document.createElement('canvas');
    this.hitCtx    = this.hitCanvas.getContext('2d', { willReadFrequently: true });

    this._syncSize();
    this.ctx = this.canvas.getContext('2d');

    // Info panel
    this.infoPanel = document.createElement('div');
    this.infoPanel.style.cssText = `
      position:absolute;bottom:64px;left:50%;transform:translateX(-50%);
      background:rgba(0,10,30,0.88);border:1px solid rgba(255,255,255,0.22);
      border-radius:18px;padding:12px 28px;color:#fff;
      font-size:clamp(1.1rem,5vw,1.7rem);text-align:center;
      pointer-events:none;opacity:0;transition:opacity 0.3s;
      white-space:nowrap;max-width:90vw;
    `;
    wrap.appendChild(this.infoPanel);

    // Back button
    const back = document.createElement('button');
    back.textContent = '← Back';
    back.style.cssText = `
      position:absolute;top:16px;left:16px;
      background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.3);
      color:#fff;padding:9px 20px;border-radius:30px;
      cursor:pointer;font-size:0.95rem;z-index:10;font-family:Arial,sans-serif;
    `;
    back.addEventListener('click', () => this.router.navigate('/'));
    wrap.appendChild(back);

    // Title
    const title = document.createElement('div');
    title.textContent = '🌍 World Globe';
    title.style.cssText = `
      position:absolute;top:18px;left:50%;transform:translateX(-50%);
      color:rgba(255,255,255,0.75);font-size:1.1rem;pointer-events:none;white-space:nowrap;
    `;
    wrap.appendChild(title);

    // Hint
    const hint = document.createElement('div');
    hint.textContent = 'Swipe to spin  •  Tap a country!';
    hint.style.cssText = `
      position:absolute;bottom:20px;left:50%;transform:translateX(-50%);
      color:rgba(255,255,255,0.3);font-size:0.8rem;pointer-events:none;white-space:nowrap;
    `;
    wrap.appendChild(hint);

    // Pointer events
    this.canvas.addEventListener('pointerdown',  e => this._onDown(e));
    this.canvas.addEventListener('pointermove',  e => this._onMove(e));
    this.canvas.addEventListener('pointerup',    e => this._onUp(e));
    this.canvas.addEventListener('pointercancel',e => this._onUp(e));

    // Resize
    this._resizeH = () => { this._syncSize(); this._render(); };
    window.addEventListener('resize', this._resizeH);

    return wrap;
  }

  _syncSize() {
    const w = window.innerWidth, h = window.innerHeight;
    if (this.canvas)    { this.canvas.width = w;    this.canvas.height = h; }
    if (this.hitCanvas) { this.hitCanvas.width = w; this.hitCanvas.height = h; }
  }

  // ── Projection helpers ─────────────────────────────────────────────────────
  _px(lon, W) {
    return (((lon - this.lonOff + 180) % 360 + 360) % 360) / 360 * W;
  }
  _py(lat, H) {
    return (90 - lat) / 180 * H;
  }

  // ── Drawing ────────────────────────────────────────────────────────────────
  _render() {
    const { canvas, ctx, hitCanvas, hitCtx } = this;
    const W = canvas.width, H = canvas.height;

    // Invalidate y-cache when canvas height changes
    if (H !== this._cacheH) {
      this._polyCache = new WeakMap();
      this._cacheH = H;
    }

    // Ocean background
    ctx.fillStyle = '#1a6fa8';
    ctx.fillRect(0, 0, W, H);
    hitCtx.fillStyle = '#000000';
    hitCtx.fillRect(0, 0, W, H);

    // Latitude grid lines (subtle)
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let lat = -60; lat <= 60; lat += 30) {
      const y = this._py(lat, H);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1.5;
    const eq = this._py(0, H);
    ctx.beginPath(); ctx.moveTo(0, eq); ctx.lineTo(W, eq); ctx.stroke();
    ctx.restore();

    // Draw countries using cached projections
    COUNTRIES.forEach(country => {
      const isSelected = this.selectedId === country.id;
      const fill    = isSelected ? '#ffffff' : country.color;
      const hitFill = `rgb(${country.id},0,0)`;

      country.polys.forEach(poly => {
        const proj = this._project(poly, W, H);
        this._drawProjected(ctx,    proj, W, fill,    'rgba(0,0,0,0.35)', 0.6);
        this._drawProjected(hitCtx, proj, W, hitFill, null,               0);
      });
    });
  }

  // Returns (and caches) a {xs, ys, count} projection for a poly at current lonOff.
  // ys are stable across frames (only depend on H); xs recomputed each frame (depend on lonOff).
  _project(poly, W, H) {
    let entry = this._polyCache.get(poly);
    if (!entry) {
      const n = poly.length;
      entry = {
        lons: new Float32Array(n),
        ys:   new Float32Array(n),
        xs:   new Float32Array(n),
        count: n,
      };
      for (let i = 0; i < n; i++) {
        entry.lons[i] = poly[i][0];
        entry.ys[i]   = this._py(poly[i][1], H);
      }
      this._polyCache.set(poly, entry);
    }

    // Recompute xs (lonOff changes every frame during spin)
    const { lons, xs, ys, count } = entry;
    for (let i = 0; i < count; i++) xs[i] = this._px(lons[i], W);

    // Seam repair
    for (let i = 1; i < count; i++) {
      const dx = xs[i] - xs[i - 1];
      if (dx >  W / 2) xs[i] -= W;
      if (dx < -W / 2) xs[i] += W;
    }

    return { xs, ys, count };
  }

  _drawProjected(ctx, { xs, ys, count }, W, fillStyle, strokeStyle, lineWidth) {
    ctx.fillStyle = fillStyle;
    if (strokeStyle && lineWidth > 0) {
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth   = lineWidth;
    }

    for (const dx of [0, W, -W]) {
      ctx.beginPath();
      ctx.moveTo(xs[0] + dx, ys[0]);
      for (let i = 1; i < count; i++) ctx.lineTo(xs[i] + dx, ys[i]);
      ctx.closePath();
      ctx.fill();
      if (strokeStyle && lineWidth > 0) ctx.stroke();
    }
  }

  // ── Pointer handling ───────────────────────────────────────────────────────
  _onDown(e) {
    this.canvas.setPointerCapture(e.pointerId);
    this._ptrs[e.pointerId] = e.clientX;
    this._lastPtrX = e.clientX;
    this._lastPtrT = performance.now();
    this._dragging  = false;
    this.velDeg     = 0;
    this._stopLoop();
  }

  _onMove(e) {
    if (!(e.pointerId in this._ptrs)) return;
    const dx = e.clientX - this._lastPtrX;
    if (Math.abs(dx) > 2) this._dragging = true;
    const degPerPx = 360 / this.canvas.width;
    const dlon = -dx * degPerPx;

    // Estimate velocity (degrees/ms → converted to degrees/frame at ~60fps)
    const now = performance.now();
    const dt  = now - this._lastPtrT;
    if (dt > 0) this.velDeg = (dlon / dt) * (1000 / 60);

    this.lonOff     += dlon;
    this._lastPtrX   = e.clientX;
    this._lastPtrT   = now;
    this._ptrs[e.pointerId] = e.clientX;
    this._render();
  }

  _onUp(e) {
    if (!(e.pointerId in this._ptrs)) return;
    delete this._ptrs[e.pointerId];

    if (!this._dragging) {
      this._handleTap(e.clientX, e.clientY);
    } else if (Math.abs(this.velDeg) > 0.1) {
      this._startMomentum();
    }
    this._dragging = false;
  }

  _startMomentum() {
    const loop = () => {
      this.velDeg *= 0.93;
      this.lonOff += this.velDeg;
      this._render();
      if (Math.abs(this.velDeg) > 0.05) {
        this.rafId = requestAnimationFrame(loop);
      } else {
        this.rafId = null;
      }
    };
    this.rafId = requestAnimationFrame(loop);
  }

  _stopLoop() {
    if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
  }

  // ── Hit detection ──────────────────────────────────────────────────────────
  _handleTap(cx, cy) {
    const rect  = this.canvas.getBoundingClientRect();
    const cW    = this.hitCanvas.width;
    const cH    = this.hitCanvas.height;
    if (!rect.width || !rect.height || !cW || !cH) return;

    const sx    = cW / rect.width;
    const sy    = cH / rect.height;
    const x     = Math.max(0, Math.min(cW - 1, Math.round((cx - rect.left) * sx)));
    const y     = Math.max(0, Math.min(cH - 1, Math.round((cy - rect.top)  * sy)));

    const px    = this.hitCtx.getImageData(x, y, 1, 1).data;
    const id    = px[0];  // R channel = country id (0 = ocean)

    if (id > 0 && COUNTRY_BY_ID[id]) {
      const country = COUNTRY_BY_ID[id];
      this.selectedId = id;
      this._render();
      const flag = this._flag(country.code);
      this._showInfo(`${flag} ${country.name}`);
      this._speak(country.name);
    } else {
      this.selectedId = null;
      this._render();
    }
  }

  // ── Info panel ─────────────────────────────────────────────────────────────
  _showInfo(text) {
    clearTimeout(this._infoTimer);
    this.infoPanel.textContent = text;
    this.infoPanel.style.opacity = '1';
    this._infoTimer = setTimeout(() => {
      this.infoPanel.style.opacity = '0';
      this.selectedId = null;
      this._render();
    }, 5000);
  }

  // ── Utilities ──────────────────────────────────────────────────────────────
  _flag(code) {
    return String.fromCodePoint(
      ...code.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0))
    );
  }

  _speak(text) {
    if (!window.speechSynthesis) return;
    const cfg = this.configManager?.getSpeechConfig?.() ?? {};
    if (cfg.mute) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate   = typeof cfg.rate   === 'number' ? cfg.rate   : 0.85;
    u.volume = typeof cfg.volume === 'number' ? cfg.volume / 100 : 1;
    u.pitch  = 1.1;
    window.speechSynthesis.speak(u);
  }
}
