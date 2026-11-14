/**
 * Procedural planet textures (no image assets). Each painter fills a square
 * D x D tile that wraps horizontally so it can drift as the planet spins.
 */

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeLayer(w, h) {
  try {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
    const g = c.getContext('2d');
    return g ? { c, g } : null;
  } catch (_) { return null; }
}

const TAU = Math.PI * 2;
const R = (rnd, a, b) => a + rnd() * (b - a);

/** Run fn at x and its wrapped copies so features cross the tile edge. */
function wrap(D, x, ext, fn) {
  fn(x);
  if (x - ext < 0) fn(x + D);
  if (x + ext > D) fn(x - D);
}

function vGradient(g, D, stops) {
  const gr = g.createLinearGradient(0, 0, 0, D);
  stops.forEach(([o, c]) => gr.addColorStop(o, c));
  g.fillStyle = gr;
  g.fillRect(0, 0, D, D);
}

function streaks(g, D, rnd, n, colors, maxH = 5) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = colors[i % colors.length];
    g.fillRect(0, R(rnd, 0, D), D, R(rnd, 1, maxH));
  }
}

function puffs(g, D, rnd, n, colors, rx, ry) {
  for (let i = 0; i < n; i++) {
    const y = R(rnd, 0.05, 0.95) * D, w = R(rnd, rx * 0.5, rx), h = R(rnd, ry * 0.5, ry);
    wrap(D, rnd() * D, w, x => {
      g.save(); g.translate(x, y); g.scale(1, h / w);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, w);
      gr.addColorStop(0, colors[i % colors.length]); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, w, 0, TAU); g.fill(); g.restore();
    });
  }
}

function blob(g, D, rnd, cx, cy, size, fill) {
  const n = 11, pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU, rr = size * R(rnd, 0.55, 1.15);
    pts.push([Math.cos(a) * rr * 1.25, Math.sin(a) * rr]);
  }
  wrap(D, cx, size * 1.6, x => {
    g.beginPath();
    for (let i = 0; i <= n; i++) {
      const p = pts[i % n], q = pts[(i + 1) % n];
      const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
      if (i === 0) g.moveTo(x + mx, cy + my); else g.quadraticCurveTo(x + p[0], cy + p[1], x + mx, cy + my);
    }
    g.closePath(); g.fillStyle = fill; g.fill();
  });
}

function spot(g, D, x, y, rx, ry, c0, c1) {
  g.save(); g.translate(x, y); g.scale(1, ry / rx);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx);
  gr.addColorStop(0, c0); gr.addColorStop(0.7, c0); gr.addColorStop(1, c1);
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rx, 0, TAU); g.fill(); g.restore();
}

export const PAINTERS = {
  mercury(g, D, rnd) {
    vGradient(g, D, [[0, '#a9a49e'], [1, '#85817c']]);
    puffs(g, D, rnd, 30, ['rgba(70,66,62,.35)', 'rgba(200,196,190,.3)'], D * 0.09, D * 0.07);
    for (let i = 0; i < 34; i++) {
      const x = rnd() * D, y = R(rnd, 0.08, 0.92) * D, r = R(rnd, 3, D * 0.07);
      wrap(D, x, r, xx => {
        g.beginPath(); g.arc(xx, y, r, 0, TAU); g.fillStyle = 'rgba(60,57,54,.38)'; g.fill();
        g.beginPath(); g.arc(xx - r * 0.18, y - r * 0.18, r * 0.92, 0, TAU);
        g.strokeStyle = 'rgba(225,220,212,.5)'; g.lineWidth = Math.max(1, r * 0.16); g.stroke();
      });
    }
  },
  venus(g, D, rnd) {
    vGradient(g, D, [[0, '#f4e2b4'], [0.5, '#ecd096'], [1, '#e2c28a']]);
    for (let i = 0; i < 26; i++) {
      const y = R(rnd, 0, D), x = rnd() * D;
      g.lineWidth = R(rnd, 6, 20); g.lineCap = 'round';
      g.strokeStyle = i % 2 ? 'rgba(255,250,228,.38)' : 'rgba(196,146,84,.24)';
      wrap(D, x, D * 0.45, xx => {
        g.beginPath(); g.moveTo(xx, y);
        g.bezierCurveTo(xx + D * 0.15, y + R(rnd, -22, 22), xx + D * 0.3, y + R(rnd, -22, 22), xx + D * 0.45, y + R(rnd, -12, 12));
        g.stroke();
      });
    }
  },
  earthLand(g, D, rnd) {
    vGradient(g, D, [[0, '#2f6fd6'], [0.5, '#2a82e6'], [1, '#2f6fd6']]);
    puffs(g, D, rnd, 10, ['rgba(120,190,255,.35)'], D * 0.2, D * 0.1);
    const land = ['#4c9a48', '#58a64d', '#3f8a40'];
    [[0.18, 0.38, 0.1], [0.3, 0.62, 0.08], [0.55, 0.32, 0.12], [0.62, 0.64, 0.07], [0.82, 0.42, 0.09], [0.4, 0.5, 0.05]]
      .forEach(([fx, fy, fs], i) => {
        blob(g, D, rnd, fx * D, fy * D, fs * D, land[i % 3]);
        blob(g, D, rnd, fx * D + 3, fy * D + 2, fs * D * 0.45, 'rgba(176,150,84,.7)');
      });
    const cap = g.createLinearGradient(0, 0, 0, D);
    cap.addColorStop(0, 'rgba(255,255,255,.95)'); cap.addColorStop(0.1, 'rgba(255,255,255,0)');
    cap.addColorStop(0.9, 'rgba(255,255,255,0)'); cap.addColorStop(1, 'rgba(255,255,255,.95)');
    g.fillStyle = cap; g.fillRect(0, 0, D, D);
  },
  earthClouds(g, D, rnd) {
    puffs(g, D, rnd, 26, ['rgba(255,255,255,.85)', 'rgba(255,255,255,.65)'], D * 0.14, D * 0.04);
  },
  mars(g, D, rnd) {
    vGradient(g, D, [[0, '#cf5c37'], [0.5, '#c4502e'], [1, '#b24526']]);
    puffs(g, D, rnd, 14, ['rgba(110,40,24,.45)'], D * 0.16, D * 0.1);
    puffs(g, D, rnd, 8, ['rgba(238,150,100,.4)'], D * 0.14, D * 0.08);
    spot(g, D, D * 0.5, 0, D * 0.34, D * 0.1, 'rgba(250,246,238,.97)', 'rgba(250,246,238,0)');
    spot(g, D, D * 0.5, D, D * 0.2, D * 0.05, 'rgba(250,246,238,.85)', 'rgba(250,246,238,0)');
  },
  jupiter(g, D, rnd) {
    vGradient(g, D, [[0, '#cfae86'], [0.08, '#b9784a'], [0.17, '#f1e3c8'], [0.27, '#bb7e50'], [0.37, '#f3e6cc'],
      [0.47, '#d49a62'], [0.56, '#f6ead2'], [0.65, '#c4825a'], [0.75, '#ecd6b0'], [0.85, '#c88c5c'], [1, '#d3b58c']]);
    streaks(g, D, rnd, 46, ['rgba(255,255,255,.12)', 'rgba(120,70,40,.12)'], 4);
    puffs(g, D, rnd, 22, ['rgba(255,244,224,.35)', 'rgba(150,90,56,.28)'], D * 0.1, D * 0.03);
    spot(g, D, D * 0.55, D * 0.63, D * 0.14, D * 0.085, '#c44f36', 'rgba(232,170,140,.9)');
  },
  saturn(g, D, rnd) {
    vGradient(g, D, [[0, '#d9c387'], [0.12, '#ecd9a0'], [0.28, '#cfb26e'], [0.42, '#f1e2b4'], [0.58, '#d8be7c'],
      [0.72, '#ecd8a0'], [0.86, '#cdb272'], [1, '#d6c286']]);
    streaks(g, D, rnd, 34, ['rgba(255,255,255,.12)', 'rgba(140,100,40,.1)'], 3);
  },
  uranus(g, D, rnd) {
    vGradient(g, D, [[0, '#a6eef0'], [0.5, '#86e0e6'], [1, '#9aeaee']]);
    streaks(g, D, rnd, 14, ['rgba(255,255,255,.1)', 'rgba(60,160,176,.08)'], 6);
  },
  neptune(g, D, rnd) {
    vGradient(g, D, [[0, '#3e66cf'], [0.5, '#3358bf'], [1, '#2a4aa8']]);
    streaks(g, D, rnd, 22, ['rgba(130,170,255,.12)', 'rgba(20,40,110,.12)'], 4);
    spot(g, D, D * 0.38, D * 0.45, D * 0.11, D * 0.065, '#1a2f84', 'rgba(26,47,132,0)');
    puffs(g, D, rnd, 5, ['rgba(255,255,255,.55)'], D * 0.09, D * 0.015);
  },
  moon(g, D, rnd) {
    vGradient(g, D, [[0, '#cfcfcf'], [1, '#a2a2a2']]);
    for (let i = 0; i < 9; i++) {
      g.beginPath(); g.arc(rnd() * D, rnd() * D, R(rnd, D * 0.04, D * 0.12), 0, TAU);
      g.fillStyle = 'rgba(90,90,90,.35)'; g.fill();
    }
  },
};

/** Paint a tile; returns canvas or null when canvas is unavailable. */
export function paintTile(name, D, seed) {
  const L = makeLayer(D, D);
  if (!L) return null;
  try { PAINTERS[name](L.g, D, mulberry32(seed)); } catch (_) { /* leave partial */ }
  return L.c;
}

/** Bake a tile into a circular disc sprite (for planets that do not spin). */
export function bakeDisc(tile, D) {
  const L = makeLayer(D, D);
  if (!L || !tile) return null;
  L.g.save(); L.g.beginPath(); L.g.arc(D / 2, D / 2, D / 2, 0, TAU); L.g.clip();
  L.g.drawImage(tile, 0, 0); L.g.restore();
  return L.c;
}
