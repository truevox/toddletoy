/**
 * Background life: parallax starfield, twinkles, asteroid belt, comet,
 * shooting stars and a capped particle pool. Pure data + small draw helpers;
 * nothing allocates per frame except short-lived gradients for streaks.
 */
import { mulberry32 } from './orrery-paint.js';
import { BELT_INNER, BELT_OUTER } from './orrery-data.js';

const TAU = Math.PI * 2;
export const MAX_PARTICLES = 48;

export function makeStars(w, h, seed = 7) {
  const rnd = mulberry32(seed);
  const area = w * h;
  const layers = [
    { k: 0.02, size: 1, alpha: 0.5, n: Math.round(area / 5200) },
    { k: 0.05, size: 1.4, alpha: 0.7, n: Math.round(area / 12000) },
    { k: 0.1, size: 2, alpha: 0.9, n: Math.round(area / 36000) },
  ].map(L => {
    const xs = new Float32Array(L.n), ys = new Float32Array(L.n);
    for (let i = 0; i < L.n; i++) { xs[i] = rnd() * w; ys[i] = rnd() * h; }
    return { ...L, xs, ys };
  });
  const tw = [];
  for (let i = 0; i < 16; i++) tw.push({ x: rnd() * w, y: rnd() * h, ph: rnd() * TAU, sp: 0.6 + rnd() * 1.4, s: 2 + rnd() * 2 });
  return { w, h, layers, tw };
}

export function drawStars(ctx, sky, offX, offY, wall, reduced) {
  const { w, h } = sky;
  for (const L of sky.layers) {
    ctx.fillStyle = `rgba(255,255,255,${L.alpha})`;
    const ox = offX * L.k, oy = offY * L.k;
    for (let i = 0; i < L.xs.length; i++) {
      const x = (((L.xs[i] + ox) % w) + w) % w, y = (((L.ys[i] + oy) % h) + h) % h;
      ctx.fillRect(x, y, L.size, L.size);
    }
  }
  for (const s of sky.tw) {
    const a = reduced ? 0.7 : 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(wall * s.sp + s.ph));
    ctx.fillStyle = `rgba(255,252,235,${a.toFixed(2)})`;
    const x = (((s.x + offX * 0.08) % w) + w) % w, y = (((s.y + offY * 0.08) % h) + h) % h;
    ctx.fillRect(x - s.s, y - 0.5, s.s * 2, 1);
    ctx.fillRect(x - 0.5, y - s.s, 1, s.s * 2);
  }
}

// ── asteroid belt ───────────────────────────────────────────────────────────
export function makeBelt(n = 150, seed = 11) {
  const rnd = mulberry32(seed);
  const a = new Float32Array(n), r = new Float32Array(n), s = new Float32Array(n);
  for (let i = 0; i < n; i++) { a[i] = rnd() * TAU; r[i] = BELT_INNER + rnd() * (BELT_OUTER - BELT_INNER); s[i] = 0.5 + rnd() * 0.9; }
  return { a, r, s, n };
}

const BELT_PERIOD_YEARS = 4.6;

export function drawBelt(ctx, belt, view, cam, tYears, scale) {
  const rot = (TAU * tYears) / BELT_PERIOD_YEARS, cr = Math.cos(rot), sr = Math.sin(rot);
  const px = Math.max(1, Math.min(2.6, scale * 1.6));
  ctx.fillStyle = 'rgba(190,178,160,.7)';
  for (let i = 0; i < belt.n; i++) {
    const ca = Math.cos(belt.a[i]) * belt.r[i], sa = -Math.sin(belt.a[i]) * belt.r[i];
    const wx = ca * cr + sa * sr, wy = -ca * sr + sa * cr;
    const x = view.cx + (wx - cam.fx) * scale, y = view.cy + (wy - cam.fy) * scale;
    if (x < -4 || y < -4 || x > view.w + 4 || y > view.h + 4) continue;
    const q = px * belt.s[i];
    ctx.fillRect(x - q / 2, y - q / 2, q, q);
  }
}

// ── comet on an eccentric path (a=260, e=0.6) ───────────────────────────────
const COMET = { a: 260, e: 0.6, period: 13, m0: 4.2, omega: -0.7 };

export function cometPosition(tYears, out) {
  const M = COMET.m0 + (TAU * tYears) / COMET.period;
  let E = M;
  for (let i = 0; i < 6; i++) E -= (E - COMET.e * Math.sin(E) - M) / (1 - COMET.e * Math.cos(E));
  const x = COMET.a * (Math.cos(E) - COMET.e), y = COMET.a * Math.sqrt(1 - COMET.e * COMET.e) * Math.sin(E);
  const co = Math.cos(COMET.omega), so = Math.sin(COMET.omega);
  out.x = x * co - y * so; out.y = x * so + y * co;
  return out;
}

export function drawComet(ctx, view, cam, scale, p, tmp) {
  const d = Math.hypot(p.x, p.y);
  const x = view.cx + (p.x - cam.fx) * scale, y = view.cy + (p.y - cam.fy) * scale;
  const len = Math.max(14, Math.min(120, (320 - d) * 0.55) * Math.min(1.6, scale * 1.4));
  if (d > 330) return;
  const ux = p.x / d, uy = p.y / d; // away from the Sun
  const g = ctx.createLinearGradient(x, y, x + ux * len, y + uy * len);
  g.addColorStop(0, 'rgba(190,230,255,.85)'); g.addColorStop(1, 'rgba(190,230,255,0)');
  ctx.strokeStyle = g; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(2, 4 * Math.min(1.5, scale * 1.3));
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + ux * len, y + uy * len); ctx.stroke();
  ctx.fillStyle = '#eaf7ff'; ctx.beginPath(); ctx.arc(x, y, Math.max(2, 3 * Math.min(1.6, scale * 1.3)), 0, TAU); ctx.fill();
  if (tmp) tmp.x = x;
}

// ── shooting star ───────────────────────────────────────────────────────────
export function makeShooter() { return { on: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, next: 8 }; }

export function stepShooter(s, dt, w, h, rnd = Math.random) {
  if (s.on) {
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
    if (s.life <= 0) { s.on = false; s.next = 12 + rnd() * 16; }
    return;
  }
  s.next -= dt;
  if (s.next <= 0) {
    s.on = true; s.life = 0.8;
    s.x = rnd() * w * 0.7; s.y = rnd() * h * 0.35;
    const sp = 420 + rnd() * 160, a = 0.45 + rnd() * 0.3;
    s.vx = Math.cos(a) * sp; s.vy = Math.sin(a) * sp;
  }
}

export function drawShooter(ctx, s) {
  if (!s.on) return;
  const k = Math.min(1, s.life / 0.8), tx = s.x - s.vx * 0.12, ty = s.y - s.vy * 0.12;
  const g = ctx.createLinearGradient(s.x, s.y, tx, ty);
  g.addColorStop(0, `rgba(255,255,255,${k})`); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(tx, ty); ctx.stroke();
}

// ── particles (stars) ───────────────────────────────────────────────────────
export function makeParticles() {
  const arr = [];
  for (let i = 0; i < MAX_PARTICLES; i++) arr.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, hue: 50, size: 6 });
  return arr;
}

export function burst(pool, x, y, n, rnd = Math.random) {
  let made = 0;
  for (let i = 0; i < pool.length && made < n; i++) {
    const p = pool[i];
    if (p.on) continue;
    const a = rnd() * TAU, sp = 70 + rnd() * 190;
    p.on = true; p.x = x; p.y = y; p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp - 40;
    p.max = p.life = 0.7 + rnd() * 0.6; p.hue = 38 + rnd() * 40; p.size = 4 + rnd() * 6;
    made++;
  }
  return made;
}

function star(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.45 : r, a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
  }
  ctx.closePath(); ctx.fill();
}

export function stepAndDrawParticles(ctx, pool, dt) {
  for (let i = 0; i < pool.length; i++) {
    const p = pool[i];
    if (!p.on) continue;
    p.life -= dt;
    if (p.life <= 0) { p.on = false; continue; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 160 * dt; p.vx *= 0.985;
    ctx.fillStyle = `hsla(${p.hue},100%,70%,${(p.life / p.max).toFixed(2)})`;
    star(ctx, p.x, p.y, p.size);
  }
}

export function activeParticles(pool) {
  let n = 0;
  for (let i = 0; i < pool.length; i++) if (pool[i].on) n++;
  return n;
}
