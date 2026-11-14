/**
 * Canvas renderer for the globe toy: orthographic sphere with ocean shading,
 * graticule, country fills clipped properly at the horizon, and a static
 * starfield/atmosphere background that is only painted on resize.
 */
import { RAD } from './globe-math.js';

const TWO_PI = Math.PI * 2;
const ARC_STEP = 4 * RAD;            // limb arc resolution
const OUTLINE = 'rgba(14, 34, 66, 0.72)';

export class GlobeRenderer {
  constructor(bgCanvas, canvas) {
    this.bg = bgCanvas;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.w = 0; this.h = 0; this.dpr = 1;
    this.cx = 0; this.cy = 0; this.R = 0; this.zoom = 1; this.S = 0; this.visAng = Math.PI / 2;
    this._X = new Float32Array(1024);
    this._Y = new Float32Array(1024);
    this._Z = new Float32Array(1024);
    this._grat = null;
  }

  /** Size both canvases (CSS px + dpr) and repaint the static background. */
  resize(w, h, dpr, cx = w / 2, cy = h / 2, R = Math.max(40, 0.43 * Math.min(w, h))) {
    this.w = w; this.h = h; this.dpr = dpr;
    for (const c of [this.bg, this.canvas]) {
      c.width = Math.max(1, Math.round(w * dpr));
      c.height = Math.max(1, Math.round(h * dpr));
    }
    this.cx = cx; this.cy = cy; this.R = R;
    this.setZoom(this.zoom);
    this._paintBackground();
  }

  /** Effective on-screen globe radius and the angular radius of what the screen can see. */
  setZoom(z) {
    this.zoom = z;
    this.S = this.R * z;
    const far = Math.max(Math.hypot(this.cx, this.cy), Math.hypot(this.w - this.cx, this.cy),
      Math.hypot(this.cx, this.h - this.cy), Math.hypot(this.w - this.cx, this.h - this.cy));
    this.visAng = far >= this.S ? Math.PI / 2 : Math.min(Math.PI / 2, Math.asin(far / this.S) + 0.02);
  }

  _paintBackground() {
    const ctx = this.bg.getContext('2d');
    if (!ctx) return;
    const { w, h, cx, cy, R, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = ctx.createRadialGradient(cx, cy, R * 0.5, cx, cy, Math.hypot(w, h) / 2);
    g.addColorStop(0, '#0d1f45');
    g.addColorStop(1, '#030612');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // Deterministic stars
    let seed = 1234567;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    const count = Math.round((w * h) / 2600);
    for (let i = 0; i < count; i++) {
      const x = rnd() * w, y = rnd() * h, r = rnd() * 1.1 + 0.25, a = 0.25 + rnd() * 0.65;
      ctx.fillStyle = `rgba(255,255,255,${a.toFixed(2)})`;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TWO_PI); ctx.fill();
    }
  }

  /**
   * Draw one frame.
   * @param sel   { country, amount, scale, glow } highlighted country (or null)
   * @param extra { pulse: {country, amount}, labels: {items, n}, particles }
   */
  draw(view, countries, sel, extra) {
    const ctx = this.ctx;
    const { w, h, cx, cy, S, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Thin atmosphere glow
    if (S < 4000) {
      const halo = ctx.createRadialGradient(cx, cy, S * 0.97, cx, cy, S * 1.12);
      halo.addColorStop(0, 'rgba(120,190,255,0.5)');
      halo.addColorStop(0.4, 'rgba(90,155,240,0.16)');
      halo.addColorStop(1, 'rgba(60,120,220,0)');
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(cx, cy, S * 1.12, 0, TWO_PI); ctx.fill();
    }

    const ocean = ctx.createRadialGradient(cx - S * 0.3, cy - S * 0.35, S * 0.1, cx, cy, S);
    ocean.addColorStop(0, '#3a9ad8');
    ocean.addColorStop(0.6, '#1f6fb0');
    ocean.addColorStop(1, '#123f7a');
    ctx.fillStyle = ocean;
    ctx.beginPath(); ctx.arc(cx, cy, S, 0, TWO_PI); ctx.fill();

    this._drawGraticule(view, 0.14);

    ctx.lineJoin = 'round';
    const dx = view.cp * view.cl, dy = view.cp * view.sl, dz = view.sp;
    for (const c of countries) {
      if (!this._countryMaybeVisible(c, dx, dy, dz)) continue;
      this._paintCountry(c, view, dx, dy, dz, c.colour, 0, 1);
    }
    if (extra && extra.pulse && extra.pulse.country && extra.pulse.amount > 0.01) {
      this._paintCountry(extra.pulse.country, view, dx, dy, dz, null, extra.pulse.amount * 0.55, 1 + 0.03 * extra.pulse.amount);
    }
    if (sel && sel.country && sel.amount > 0.01) {
      this._paintCountry(sel.country, view, dx, dy, dz, null, sel.amount, sel.scale || 1);
    }

    const limb = ctx.createRadialGradient(cx, cy, S * 0.55, cx, cy, S);
    limb.addColorStop(0, 'rgba(5,20,50,0)');
    limb.addColorStop(0.8, 'rgba(5,20,50,0.18)');
    limb.addColorStop(1, 'rgba(3,10,35,0.62)');
    ctx.fillStyle = limb;
    ctx.beginPath(); ctx.arc(cx, cy, S, 0, TWO_PI); ctx.fill();
    const spec = ctx.createRadialGradient(cx - S * 0.38, cy - S * 0.42, 0, cx - S * 0.38, cy - S * 0.42, S * 0.7);
    spec.addColorStop(0, 'rgba(255,255,255,0.16)');
    spec.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = spec;
    ctx.beginPath(); ctx.arc(cx, cy, S, 0, TWO_PI); ctx.fill();

    if (extra) {
      if (extra.labels) this._drawLabels(extra.labels);
      if (extra.particles) extra.particles.draw(ctx);
    }
  }

  _drawLabels({ items, n }) {
    const ctx = this.ctx;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    for (let i = 0; i < n; i++) {
      const o = items[i];
      ctx.globalAlpha = o.alpha;
      ctx.font = `${o.kind === 'ocean' ? 'italic 600' : '700'} ${o.size.toFixed(1)}px system-ui,Arial,sans-serif`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = o.kind === 'ocean' ? 'rgba(10,40,90,0.7)' : 'rgba(10,25,55,0.75)';
      ctx.strokeText(o.text, o.x, o.y);
      ctx.fillStyle = o.kind === 'ocean' ? '#cfe8ff' : '#ffffff';
      ctx.fillText(o.text, o.x, o.y);
    }
    ctx.globalAlpha = 1;
  }

  _countryMaybeVisible(c, dx, dy, dz) {
    const lim = this.visAng;
    for (const r of c.rings) {
      const k = r.cap, a = k.radius + lim;
      if (a >= Math.PI || k.x * dx + k.y * dy + k.z * dz > Math.cos(a)) return true;
    }
    return false;
  }

  _ringVisible(k, dx, dy, dz) {
    const a = k.radius + this.visAng;
    return a >= Math.PI || k.x * dx + k.y * dy + k.z * dz > Math.cos(a);
  }

  /** highlight>0 paints the glowing selected style; scale pops it about its own centre. */
  _paintCountry(c, view, dx, dy, dz, colour, highlight, scale) {
    const ctx = this.ctx;
    const popped = highlight > 0 && scale !== 1 && c.anchor;
    if (popped) {
      const { cl, sl, cp, sp } = view, a = c.anchor;
      const t = a.x * cl + a.y * sl;
      const px = this.cx + this.S * (a.y * cl - a.x * sl), py = this.cy - this.S * (cp * a.z - sp * t);
      ctx.save(); ctx.translate(px, py); ctx.scale(scale, scale); ctx.translate(-px, -py);
    }
    ctx.beginPath();
    let any = false;
    for (const r of c.rings) {
      if (!this._ringVisible(r.cap, dx, dy, dz)) continue;
      if (this._traceRing(r, view, false)) any = true;
    }
    if (!any) { if (popped) ctx.restore(); return; }
    if (colour) {
      ctx.fillStyle = colour;
      ctx.fill('evenodd');
    } else {
      ctx.fillStyle = `rgba(255,255,255,${(0.6 * Math.min(1, highlight)).toFixed(3)})`;
      ctx.fill('evenodd');
    }
    ctx.beginPath();
    for (const r of c.rings) {
      if (!this._ringVisible(r.cap, dx, dy, dz)) continue;
      this._traceRing(r, view, true);
    }
    if (colour) {
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1;
    } else {
      ctx.shadowColor = 'rgba(255,230,90,0.95)'; ctx.shadowBlur = 14;
      ctx.strokeStyle = `rgba(255,240,130,${Math.min(1, highlight).toFixed(3)})`;
      ctx.lineWidth = 2.6;
    }
    ctx.stroke();
    if (!colour) { ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; }
    if (popped) ctx.restore();
  }

  _ensure(n) {
    if (this._X.length < n) {
      const m = Math.max(n, this._X.length * 2);
      this._X = new Float32Array(m); this._Y = new Float32Array(m); this._Z = new Float32Array(m);
    }
  }

  /**
   * Add a ring to the current path, clipped to the visible hemisphere.
   * Fill mode closes the shape along the limb; stroke mode emits only the
   * real boundary edges as open polylines.
   * Returns true if any part of the ring is visible.
   */
  _traceRing(ring, view, strokeMode) {
    const n = ring.n, v = ring.vec;
    this._ensure(n);
    const X = this._X, Y = this._Y, Z = this._Z;
    const { cl, sl, cp, sp } = view;
    let first = -1, minZ = Infinity;
    for (let i = 0; i < n; i++) {
      const ux = v[3 * i], uy = v[3 * i + 1], uz = v[3 * i + 2];
      const a = ux * cl + uy * sl;
      X[i] = uy * cl - ux * sl;
      Y[i] = cp * uz - sp * a;
      const z = sp * uz + cp * a;
      Z[i] = z;
      if (z < minZ) minZ = z;
      if (first < 0 && z >= 0) first = i;
    }
    if (first < 0) return false;
    const ctx = this.ctx, cx = this.cx, cy = this.cy, R = this.S;

    if (minZ >= 0) {
      ctx.moveTo(cx + R * X[0], cy - R * Y[0]);
      for (let i = 1; i < n; i++) ctx.lineTo(cx + R * X[i], cy - R * Y[i]);
      ctx.closePath();
      return true;
    }

    // Start from a visible vertex so the walk ends back in the visible state.
    ctx.moveTo(cx + R * X[first], cy - R * Y[first]);
    let exX = 0, exY = 0;
    for (let k = 1; k <= n; k++) {
      const a = (first + k - 1) % n, b = (first + k) % n;
      const za = Z[a], zb = Z[b];
      if (za >= 0 && zb >= 0) {
        ctx.lineTo(cx + R * X[b], cy - R * Y[b]);
      } else if (za >= 0) {
        // leaving the visible hemisphere
        const t = za / (za - zb);
        let ix = X[a] + t * (X[b] - X[a]), iy = Y[a] + t * (Y[b] - Y[a]);
        const l = Math.hypot(ix, iy) || 1;
        ix /= l; iy /= l;
        ctx.lineTo(cx + R * ix, cy - R * iy);
        exX = ix; exY = iy;
      } else if (zb >= 0) {
        // re-entering
        const t = za / (za - zb);
        let ix = X[a] + t * (X[b] - X[a]), iy = Y[a] + t * (Y[b] - Y[a]);
        const l = Math.hypot(ix, iy) || 1;
        ix /= l; iy /= l;
        if (strokeMode) {
          ctx.moveTo(cx + R * ix, cy - R * iy);
        } else {
          this._limbArc(exX, exY, ix, iy, ring.hole);
        }
        ctx.lineTo(cx + R * X[b], cy - R * Y[b]);
      }
    }
    if (!strokeMode) ctx.closePath();
    return true;
  }

  /** Walk the limb from exit point to entry point so the visible part of the polygon stays closed on the correct side. */
  _limbArc(ex, ey, nx, ny, hole) {
    const ctx = this.ctx, cx = this.cx, cy = this.cy, R = this.S;
    const aE = Math.atan2(ey, ex), aN = Math.atan2(ny, nx);
    // Exterior rings: walk clockwise on screen (angle decreasing); holes the other way.
    let delta = hole ? aN - aE : aE - aN;
    delta = ((delta % TWO_PI) + TWO_PI) % TWO_PI;
    // A ring that merely grazes the horizon can produce exit/entry points a hair
    // "out of order"; that is a tiny backwards arc, not a full lap of the limb.
    if (delta > TWO_PI - 0.35) delta -= TWO_PI;
    if (Math.abs(delta) < 1e-6) return;
    const steps = Math.max(1, Math.ceil(Math.abs(delta) / ARC_STEP));
    const dir = hole ? 1 : -1;
    for (let s = 1; s <= steps; s++) {
      const ang = aE + dir * delta * (s / steps);
      ctx.lineTo(cx + R * Math.cos(ang), cy - R * Math.sin(ang));
    }
  }

  _buildGraticule() {
    const lines = [];
    for (let lat = -60; lat <= 60; lat += 30) {
      const pts = [];
      for (let lon = -180; lon <= 180; lon += 6) pts.push([lon, lat]);
      lines.push(pts);
    }
    for (let lon = -180; lon < 180; lon += 30) {
      const pts = [];
      for (let lat = -90; lat <= 90; lat += 6) pts.push([lon, lat]);
      lines.push(pts);
    }
    this._grat = lines.map(pts => {
      const arr = new Float32Array(pts.length * 3);
      pts.forEach(([lon, lat], i) => {
        const phi = lat * RAD, lam = lon * RAD, c = Math.cos(phi);
        arr[3 * i] = c * Math.cos(lam); arr[3 * i + 1] = c * Math.sin(lam); arr[3 * i + 2] = Math.sin(phi);
      });
      return arr;
    });
  }

  _drawGraticule(view, alpha) {
    if (!this._grat) this._buildGraticule();
    const ctx = this.ctx, { cx, cy } = this, R = this.S;
    const { cl, sl, cp, sp } = view;
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (const arr of this._grat) {
      let pen = false;
      for (let i = 0; i < arr.length; i += 3) {
        const ux = arr[i], uy = arr[i + 1], uz = arr[i + 2];
        const a = ux * cl + uy * sl;
        const z = sp * uz + cp * a;
        if (z < 0) { pen = false; continue; }
        const x = cx + R * (uy * cl - ux * sl), y = cy - R * (cp * uz - sp * a);
        if (pen) ctx.lineTo(x, y); else { ctx.moveTo(x, y); pen = true; }
      }
    }
    ctx.stroke();
  }
}
