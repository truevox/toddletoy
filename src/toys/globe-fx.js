/**
 * Cheap particle effects (sparkles, stars, confetti) in a fixed pool, so no
 * per-frame allocation. Pure state + a draw(ctx) helper.
 */
const COLOURS = ['#ffe36e', '#ff9ec4', '#8fe3ff', '#b6f58a', '#ffffff', '#c4a8ff'];
const SIZE = 110;

export class Particles {
  constructor() {
    this.p = Array.from({ length: SIZE }, () => ({ on: false, x: 0, y: 0, vx: 0, vy: 0, age: 0, life: 1, size: 3, c: '#fff', kind: 0, rot: 0, vr: 0 }));
    this.active = 0;
    this._cursor = 0;
  }

  /** kind: 0 sparkle dot, 1 star, 2 confetti. */
  burst(x, y, count, kind = 0, speed = 0.18, rng = Math.random) {
    for (let i = 0; i < count; i++) {
      const p = this.p[this._cursor];
      this._cursor = (this._cursor + 1) % SIZE;
      const a = rng() * Math.PI * 2, s = speed * (0.4 + rng() * 0.9);
      p.on = true; p.x = x; p.y = y;
      p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s - (kind === 2 ? speed * 0.6 : 0);
      p.age = 0; p.life = 600 + rng() * 700; p.size = (kind === 0 ? 2 : 4) + rng() * 3;
      p.c = COLOURS[(rng() * COLOURS.length) | 0]; p.kind = kind;
      p.rot = rng() * 6.28; p.vr = (rng() - 0.5) * 0.02;
    }
    this._recount();
  }

  _recount() { let n = 0; for (const p of this.p) if (p.on) n++; this.active = n; }

  update(dt) {
    let n = 0;
    for (const p of this.p) {
      if (!p.on) continue;
      p.age += dt;
      if (p.age >= p.life) { p.on = false; continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += (p.kind === 2 ? 0.0004 : 0.00012) * dt;
      p.vx *= 0.995; p.rot += p.vr * dt;
      n++;
    }
    this.active = n;
    return n;
  }

  clear() { for (const p of this.p) p.on = false; this.active = 0; }

  draw(ctx) {
    if (!this.active) return;
    for (const p of this.p) {
      if (!p.on) continue;
      const k = 1 - p.age / p.life;
      ctx.globalAlpha = Math.min(1, k * 1.6);
      ctx.fillStyle = p.c;
      if (p.kind === 2) {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); ctx.restore();
      } else if (p.kind === 1) {
        const r = p.size * (0.6 + 0.4 * k);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - r); ctx.lineTo(p.x + r * 0.3, p.y - r * 0.3); ctx.lineTo(p.x + r, p.y);
        ctx.lineTo(p.x + r * 0.3, p.y + r * 0.3); ctx.lineTo(p.x, p.y + r); ctx.lineTo(p.x - r * 0.3, p.y + r * 0.3);
        ctx.lineTo(p.x - r, p.y); ctx.lineTo(p.x - r * 0.3, p.y - r * 0.3); ctx.closePath(); ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * k, 0, 6.2832); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}
