/**
 * Orbit-view scene drawing. All state arrives in one persistent object `S`
 * (owned by OrreryToy) so nothing is allocated per frame.
 */
import { BODIES, PLANET_COUNT, EARTH_INDEX } from './orrery-data.js';
import { getSprites, drawPlanet, drawSun, drawMoon } from './orrery-sprites.js';
import { drawStars, drawBelt, cometPosition, drawComet, drawShooter, stepAndDrawParticles } from './orrery-sky.js';

const TAU = Math.PI * 2;
const MOON_PERIOD_YEARS = 0.16; // ~2x slower than real so it stays readable
const comet = { x: 0, y: 0 };

function orbitLines(ctx, S) {
  const { view, cam } = S, s = view.base * cam.z;
  const cx = view.cx - cam.fx * s, cy = view.cy - cam.fy * s;
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = 'rgba(170,190,255,.16)';
  ctx.beginPath();
  for (let i = 1; i <= PLANET_COUNT; i++) {
    if (i === S.sel || i === S.hintOrbit) continue;
    ctx.moveTo(cx + BODIES[i].orbitR * s, cy);
    ctx.arc(cx, cy, BODIES[i].orbitR * s, 0, TAU);
  }
  ctx.stroke();
  const hot = (i, a, w) => {
    ctx.strokeStyle = `rgba(255,236,160,${a})`; ctx.lineWidth = w;
    ctx.beginPath(); ctx.arc(cx, cy, BODIES[i].orbitR * s, 0, TAU); ctx.stroke();
  };
  if (S.sel > 0) { hot(S.sel, 0.28, 7); hot(S.sel, 0.85, 2.2); }
  if (S.hintOrbit > 0) {
    const k = S.reduced ? 1 : 0.6 + 0.4 * Math.sin(S.wall * 5);
    hot(S.hintOrbit, 0.3 * k, 9); hot(S.hintOrbit, 0.95 * k, 2.6);
  }
}

function pulseRing(ctx, x, y, r, wall, reduced, color = 'rgba(255,255,255,') {
  const k = reduced ? 0.5 : (wall * 1.1) % 1;
  ctx.strokeStyle = `${color}${(0.9 * (1 - k)).toFixed(2)})`; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(x, y, r * (1.25 + k * 1.1) + 4, 0, TAU); ctx.stroke();
}

export function drawOrbitScene(ctx, S, dt) {
  const { view, cam, w, h } = S;
  const sp = getSprites();
  const s = view.base * cam.z;
  ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  drawStars(ctx, S.sky, -cam.fx * s, -cam.fy * s, S.wall, S.reduced);
  if (!S.reduced) { drawShooter(ctx, S.shooter); }
  orbitLines(ctx, S);
  drawBelt(ctx, S.belt, view, cam, S.t, s);

  if (!S.reduced) { cometPosition(S.t, comet); drawComet(ctx, view, cam, s, comet, null); }

  // Sun
  const sx = S.px[0], sy = S.py[0], sr = S.pr[0];
  if (sp.ok) drawSun(ctx, sp, sx, sy, sr, S.wall);
  else { ctx.fillStyle = '#ffd54f'; ctx.beginPath(); ctx.arc(sx, sy, sr * 1.4, 0, TAU); ctx.fill(); }
  if (S.sel === 0) pulseRing(ctx, sx, sy, sr * 2.2, S.wall, S.reduced, 'rgba(255,236,160,');

  for (let i = 1; i <= PLANET_COUNT; i++) {
    const x = S.px[i], y = S.py[i], r = S.pr[i];
    if (x < -r * 3 - 40 || y < -r * 3 - 40 || x > w + r * 3 + 40 || y > h + r * 3 + 40) continue;
    const b = BODIES[i];
    if (i === S.sel && sp.ok) {
      const g = r * 3.4; ctx.globalAlpha = 0.8;
      ctx.drawImage(sp.bodies[i].glow, x - g, y - g, g * 2, g * 2); ctx.globalAlpha = 1;
    }
    const light = Math.atan2(sy - y, sx - x);
    if (sp.ok) {
      drawPlanet(ctx, sp, i, x, y, r, light, S.t * (24 / (b.spinSec || 1)), S.t * 24 / 28);
    } else {
      ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
    if (i === EARTH_INDEX && sp.ok) {
      const ma = (TAU * S.t) / MOON_PERIOD_YEARS, mr = r * 1.9 + 3;
      const mx = x + Math.cos(ma) * mr, my = y - Math.sin(ma) * mr;
      ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, mr, 0, TAU); ctx.stroke();
      drawMoon(ctx, sp, mx, my, Math.max(2, r * 0.27), Math.atan2(sy - my, sx - mx));
    }
    if (i === S.pulse) pulseRing(ctx, x, y, r, S.wall, S.reduced);
    if (i === S.sel && !S.reduced) pulseRing(ctx, x, y, r * 0.8, S.wall + 0.5, false, 'rgba(255,236,160,');
  }

  if (S.ghost && S.ghost.on) {
    const g = S.ghost;
    ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.beginPath(); ctx.arc(g.x, g.y, 30, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.arc(g.x, g.y, 15, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(S.px[0], S.py[0], g.rad, g.a0, g.a, g.a < g.a0); ctx.stroke();
  }
  if (!S.reduced) stepAndDrawParticles(ctx, S.particles, dt);
}
