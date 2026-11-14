/**
 * Cached offscreen sprites for the orrery: planets (with spin tiles), Sun,
 * rings split into back/front halves, terminator shading and glows.
 * Built once, shared; per-frame drawing is just a few drawImage calls.
 */
import { paintTile, bakeDisc, makeLayer } from './orrery-paint.js';
import { BODIES } from './orrery-data.js';

const TAU = Math.PI * 2;
const D = 256;      // planet tile size
const R0 = 100;     // disc radius inside ring sprites

const RINGS = {
  6: { inner: 1.3, outer: 2.3, tilt: -0.38, squash: 0.3, alpha: 1,
    stops: [[0, 'rgba(120,100,70,.0)'], [0.05, 'rgba(176,150,104,.55)'], [0.3, 'rgba(226,204,150,.95)'], [0.5, 'rgba(238,220,170,.98)'],
      [0.56, 'rgba(60,50,40,.15)'], [0.62, 'rgba(226,206,156,.85)'], [0.85, 'rgba(206,184,134,.8)'], [1, 'rgba(190,168,120,0)']] },
  7: { inner: 1.55, outer: 1.85, tilt: 1.45, squash: 0.2, alpha: 0.5,
    stops: [[0, 'rgba(200,240,244,0)'], [0.3, 'rgba(210,244,248,.7)'], [0.7, 'rgba(180,230,238,.6)'], [1, 'rgba(180,230,238,0)']] },
};

const PAINT = { 1: 'mercury', 2: 'venus', 3: 'earthLand', 4: 'mars', 5: 'jupiter', 6: 'saturn', 7: 'uranus', 8: 'neptune' };

function buildShade() {
  const L = makeLayer(D, D);
  if (!L) return null;
  const g = L.g, c = D / 2;
  g.save(); g.beginPath(); g.arc(c, c, c, 0, TAU); g.clip();
  // Lit side is +x. Deliberately gentler than true Lambert shading: seen from
  // above, a physically lit planet is half black, which reads as dingy rather
  // than friendly. The terminator sits well past the middle and the night side
  // keeps plenty of ambient light so every planet's colour stays recognisable.
  const lam = g.createLinearGradient(0, 0, D, 0);
  for (let i = 0; i <= 10; i++) {
    const u = (i / 10) * 2 - 1;
    const I = 0.45 + 0.55 * Math.pow(Math.max(0, (u + 0.7) / 1.7), 0.8);
    lam.addColorStop(i / 10, `rgba(2,4,22,${(0.8 * (1 - I)).toFixed(3)})`);
  }
  g.fillStyle = lam; g.fillRect(0, 0, D, D);
  const limb = g.createRadialGradient(c, c, c * 0.55, c, c, c);
  limb.addColorStop(0, 'rgba(0,0,10,0)'); limb.addColorStop(1, 'rgba(0,0,10,.42)');
  g.fillStyle = limb; g.fillRect(0, 0, D, D);
  g.restore();
  return L.c;
}

function buildRing(cfg) {
  const side = Math.round(2 * cfg.outer * R0), c = side / 2;
  const make = front => {
    const L = makeLayer(side, side);
    if (!L) return null;
    const g = L.g;
    g.translate(c, c); g.rotate(cfg.tilt);
    g.beginPath(); g.rect(-c * 2, front ? 0 : -c * 2, c * 4, c * 2); g.clip();
    g.scale(1, cfg.squash);
    const gr = g.createRadialGradient(0, 0, cfg.inner * R0, 0, 0, cfg.outer * R0);
    cfg.stops.forEach(([o, col]) => gr.addColorStop(o, col));
    g.fillStyle = gr; g.globalAlpha = cfg.alpha;
    g.beginPath(); g.arc(0, 0, cfg.outer * R0, 0, TAU); g.arc(0, 0, cfg.inner * R0, 0, TAU, true); g.fill('evenodd');
    return L.c;
  };
  return { back: make(false), front: make(true), outer: cfg.outer };
}

function radial(size, stops) {
  const L = makeLayer(size, size);
  if (!L) return null;
  const c = size / 2, gr = L.g.createRadialGradient(c, c, 0, c, c, c);
  stops.forEach(([o, col]) => gr.addColorStop(o, col));
  L.g.fillStyle = gr; L.g.fillRect(0, 0, size, size);
  return L.c;
}

function buildRays(n, inner, len, width, alpha) {
  const S = 512, L = makeLayer(S, S);
  if (!L) return null;
  const g = L.g, c = S / 2;
  g.translate(c, c);
  for (let i = 0; i < n; i++) {
    g.save(); g.rotate((i / n) * TAU);
    const gr = g.createLinearGradient(inner, 0, len, 0);
    gr.addColorStop(0, `rgba(255,214,90,${alpha})`); gr.addColorStop(1, 'rgba(255,170,40,0)');
    g.fillStyle = gr; g.beginPath();
    g.moveTo(inner, -width); g.lineTo(len, 0); g.lineTo(inner, width); g.closePath(); g.fill();
    g.restore();
  }
  return L.c;
}

function buildSun() {
  return {
    corona: radial(512, [[0, 'rgba(255,240,170,.95)'], [0.2, 'rgba(255,200,70,.55)'], [0.45, 'rgba(255,140,30,.18)'], [1, 'rgba(255,100,0,0)']]),
    rays1: buildRays(14, 60, 250, 22, 0.55),
    rays2: buildRays(22, 55, 215, 11, 0.45),
    core: radial(256, [[0, '#ffffff'], [0.4, '#fff3a8'], [0.8, '#ffd23c'], [0.94, '#ffb020'], [1, 'rgba(255,170,30,0)']]),
  };
}

let cache = null;

export function resetSprites() { cache = null; }

export function getSprites() {
  if (cache) return cache;
  const probe = makeLayer(4, 4);
  if (!probe) { cache = { ok: false, bodies: [], shade: null, sun: null }; return cache; }
  const bodies = [{}];
  for (let i = 1; i <= 8; i++) {
    const b = BODIES[i];
    const tile = paintTile(PAINT[i], D, 1000 + i * 77);
    const spin = b.spinSec !== 0;
    const e = { tile, spin, disc: spin ? null : bakeDisc(tile, D), ring: RINGS[i] ? buildRing(RINGS[i]) : null };
    if (i === 3) e.clouds = paintTile('earthClouds', D, 4242);
    e.glow = radial(128, [[0.35, b.color + 'cc'], [0.6, b.color + '44'], [1, b.color + '00']]);
    bodies.push(e);
  }
  const moonTile = paintTile('moon', 96, 99);
  cache = { ok: true, bodies, shade: buildShade(), sun: buildSun(), moon: bakeDisc(moonTile, 96),
    sunGlow: radial(128, [[0.3, 'rgba(255,225,120,.9)'], [1, 'rgba(255,200,60,0)']]) };
  return cache;
}

function drawSpin(ctx, tile, x, y, r, phase) {
  const w = r * 2, p = (((phase % 1) + 1) % 1) * w;
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
  ctx.drawImage(tile, x - r - p, y - r, w + 1, w);
  ctx.drawImage(tile, x - r - p + w, y - r, w + 1, w);
  ctx.restore();
}

/**
 * Draw a planet. lightAngle = screen direction from the planet to the Sun.
 * phase: texture turns (spin); cloudPhase for Earth's clouds.
 */
export function drawPlanet(ctx, sp, i, x, y, r, lightAngle, phase = 0, cloudPhase = 0) {
  const e = sp.bodies[i];
  const ring = e.ring;
  if (ring && ring.back) {
    const s = ring.outer * r;
    ctx.drawImage(ring.back, x - s, y - s, s * 2, s * 2);
  }
  if (e.spin) drawSpin(ctx, e.tile, x, y, r, phase); else ctx.drawImage(e.disc, x - r, y - r, r * 2, r * 2);
  if (e.clouds) drawSpin(ctx, e.clouds, x, y, r, cloudPhase);
  if (sp.shade) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(lightAngle);
    ctx.drawImage(sp.shade, -r, -r, r * 2, r * 2);
    ctx.restore();
  }
  if (ring && ring.front) {
    const s = ring.outer * r;
    ctx.drawImage(ring.front, x - s, y - s, s * 2, s * 2);
  }
}

export function drawSun(ctx, sp, x, y, r, wall) {
  const s = sp.sun, br = 1 + 0.045 * Math.sin(wall * 1.3);
  const put = (img, size, rot, alpha) => {
    if (!img) return;
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.rotate(rot);
    ctx.drawImage(img, -size / 2, -size / 2, size, size); ctx.restore();
  };
  put(s.corona, r * 6.2 * br, 0, 1);
  put(s.rays1, r * 5.2 * br, wall * 0.05, 0.9);
  put(s.rays2, r * 4.2 * (2 - br), -wall * 0.04, 0.9);
  put(s.core, r * 2.15, 0, 1);
}

export function drawMoon(ctx, sp, x, y, r, lightAngle) {
  ctx.drawImage(sp.moon, x - r, y - r, r * 2, r * 2);
  if (sp.shade) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(lightAngle);
    ctx.drawImage(sp.shade, -r, -r, r * 2, r * 2); ctx.restore();
  }
}

/** Draw a body's little portrait into a small canvas context (strip, cards). */
export function drawPortrait(ctx, i, size) {
  const sp = getSprites();
  ctx.clearRect(0, 0, size, size);
  const c = size / 2;
  if (!sp.ok) { ctx.fillStyle = BODIES[i].color; ctx.beginPath(); ctx.arc(c, c, c * 0.7, 0, TAU); ctx.fill(); return; }
  if (i === 0) { drawSun(ctx, sp, c, c, size * 0.2, 0); return; }
  const ringK = sp.bodies[i].ring ? sp.bodies[i].ring.outer : 1;
  const r = (c * 0.92) / (i === 6 ? ringK * 0.95 : i === 7 ? 1.2 : 1);
  drawPlanet(ctx, sp, i, c, c, r, -2.4, 0.15, 0.1);
}
