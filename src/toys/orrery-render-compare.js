/** Drawing for the "Compare sizes" view (true relative diameters). */
import { BODIES } from './orrery-data.js';
import { getSprites, drawPlanet } from './orrery-sprites.js';
import { drawStars } from './orrery-sky.js';

const TAU = Math.PI * 2;

/**
 * C = { layout, scrollX, free:{x,y,w,h}, sel, wall, reduced }.
 * Layout world coords have y = 0 at the row centre; screen y = free centre.
 */
export function drawCompareScene(ctx, S, C) {
  const { w, h, free } = S;
  const sp = getSprites();
  ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  drawStars(ctx, S.sky, -C.scrollX * 0.5, 0, S.wall, S.reduced);
  const oy = free.y + free.h / 2, ox = free.x + C.scrollX;
  const { sun, items } = C.layout;

  // Sun limb: a huge circle, only its right edge is on screen.
  const sx = ox + sun.cx, sy = oy + sun.cy;
  const gr = ctx.createLinearGradient(sx + sun.r - 160, 0, sx + sun.r + 24, 0);
  gr.addColorStop(0, '#ff9a1a'); gr.addColorStop(0.6, '#ffc83a'); gr.addColorStop(1, '#fff2a8');
  ctx.save();
  ctx.shadowColor = 'rgba(255,190,60,.8)'; ctx.shadowBlur = 40;
  ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(sx, sy, sun.r, 0, TAU); ctx.fill();
  ctx.restore();

  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '600 14px "Trebuchet MS",Arial,sans-serif';
  ctx.fillStyle = 'rgba(60,30,0,.85)';
  ctx.fillText('☀️ Sun', ox + SUN_LABEL_X(sun), oy - free.h * 0.32);

  for (const it of items) {
    const x = ox + it.cx;
    if (x < -it.r - 80 || x > w + it.r + 80) continue;
    const b = BODIES[it.i];
    const spin = b.spinSec ? C.wall / b.spinSec : 0;
    if (sp.ok) drawPlanet(ctx, sp, it.i, x, oy, it.r, Math.PI, spin, C.wall / 28);
    else { ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(x, oy, it.r, 0, TAU); ctx.fill(); }
    const sel = C.sel === it.i;
    if (it.ring || sel) {
      const rr = Math.max(it.r + 7, 15) + (sel ? 3 : 0);
      ctx.strokeStyle = sel ? '#ffd54f' : 'rgba(255,255,255,.55)'; ctx.lineWidth = sel ? 3 : 1.6;
      ctx.beginPath(); ctx.arc(x, oy, rr, 0, TAU); ctx.stroke();
    }
    const down = it.labelRow === 0;
    const reach = Math.max(it.r * (it.i === 6 ? 2.3 : 1), 18) + 24;
    ctx.fillStyle = sel ? '#ffd54f' : '#fff';
    ctx.font = `${sel ? 700 : 600} ${it.r > 30 ? 16 : 14}px "Trebuchet MS",Arial,sans-serif`;
    ctx.fillText(b.name, x, oy + (down ? reach : -reach));
  }
}

function SUN_LABEL_X(sun) { return sun.cx + sun.r - 32; }
