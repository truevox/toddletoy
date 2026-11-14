/**
 * OrreryToy - Flat animated solar system for toddlers
 * Shows all 8 planets orbiting the Sun; tap any to hear its name.
 */
import { orreryLayout, planetDrawRadius, planetPosition, pickNearest, hitSun } from './orrery-math.js';
import { speakText, cancelSpeech } from './toy-speech.js';

export class OrreryToy {
    constructor(router, configManager = null) {
        this.router = router;
        this.configManager = configManager;
        this.container = null;
        this.canvas = null;
        this.ctx = null;
        this.rafId = null;
        this.stars = [];
        this.selectedIdx = null;
        this.labelTimer = null;
        this._visible = false;
        this._elapsedMs = 0;
        this._lastNow = 0;
        this._w = 0; this._h = 0; this._dpr = 1;
        this._loop = (now) => this._tick(now);
        this._resizeHandler = () => {
            this._syncCanvasSize();
            this._generateStars();
        };
    }

    // ── Planet catalogue ─────────────────────────────────────────────────────
    static get PLANETS() {
        return [
            { name: 'Mercury', emoji: '⚫', bodyColor: '#9E9E9E', glowColor: '#bdbdbd', radius: 5,  orbitR: 72,  periodS: 3,   startDeg: 0,   fact: 'Smallest planet!' },
            { name: 'Venus',   emoji: '🟡', bodyColor: '#E8C97F', glowColor: '#ffd54f', radius: 9,  orbitR: 104, periodS: 5,   startDeg: 60,  fact: 'Hottest planet!' },
            { name: 'Earth',   emoji: '🌍', bodyColor: '#4A90D9', glowColor: '#64b5f6', radius: 10, orbitR: 143, periodS: 8,   startDeg: 150, fact: 'Our home!' },
            { name: 'Mars',    emoji: '🔴', bodyColor: '#D2553D', glowColor: '#ef9a9a', radius: 7,  orbitR: 182, periodS: 13,  startDeg: 240, fact: 'The red planet!' },
            { name: 'Jupiter', emoji: '🟠', bodyColor: '#C88B3A', glowColor: '#ffb74d', radius: 22, orbitR: 233, periodS: 20,  startDeg: 45,  fact: 'Biggest planet!' },
            { name: 'Saturn',  emoji: '🪐', bodyColor: '#E4CC6B', glowColor: '#fff176', radius: 18, orbitR: 274, periodS: 30,  startDeg: 200, fact: 'Has beautiful rings!' },
            { name: 'Uranus',  emoji: '🔵', bodyColor: '#7DE8E8', glowColor: '#80deea', radius: 13, orbitR: 309, periodS: 45,  startDeg: 310, fact: 'Spins on its side!' },
            { name: 'Neptune', emoji: '🫙', bodyColor: '#4C7EC4', glowColor: '#90caf9', radius: 12, orbitR: 340, periodS: 60,  startDeg: 130, fact: 'Furthest planet!' },
        ];
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────
    show() {
        if (!this.container) {
            this.container = this._build();
            document.body.appendChild(this.container);
        }
        this.container.style.display = 'block';
        if (!this._visible) {
            this._visible = true;
            window.addEventListener('resize', this._resizeHandler);
            window.addEventListener('orientationchange', this._resizeHandler);
        }
        this._syncCanvasSize();
        this._generateStars();
        this._lastNow = 0;
        this._startLoop();
    }

    hide() {
        this._visible = false;
        this._stopLoop();
        clearTimeout(this.labelTimer);
        this.labelTimer = null;
        this.selectedIdx = null;
        if (this.infoPanel) this.infoPanel.style.opacity = '0';
        window.removeEventListener('resize', this._resizeHandler);
        window.removeEventListener('orientationchange', this._resizeHandler);
        cancelSpeech();
        if (this.container) this.container.style.display = 'none';
    }

    destroy() {
        this.hide();
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.container = null;
        this.canvas = null;
        this.ctx = null;
        this.infoPanel = null;
    }

    // ── DOM construction ──────────────────────────────────────────────────────
    _build() {
        const wrap = document.createElement('div');
        wrap.id = 'orrery-toy';
        wrap.style.cssText = 'position:fixed;inset:0;background:#000010;z-index:500;overflow:hidden;';

        this.canvas = document.createElement('canvas');
        this.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;touch-action:none;';
        wrap.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        // Info panel (shown when planet tapped)
        this.infoPanel = document.createElement('div');
        this.infoPanel.style.cssText = `
            position:absolute; bottom:70px; left:50%; transform:translateX(-50%);
            background:rgba(0,0,20,0.85); border:1px solid rgba(255,255,255,0.25);
            border-radius:18px; padding:14px 32px; color:#fff;
            font-size:clamp(1rem,4vw,1.5rem); text-align:center;
            pointer-events:none; opacity:0; transition:opacity 0.3s;
            max-width:90vw; box-sizing:border-box;
        `;
        wrap.appendChild(this.infoPanel);

        // Back button (>= 44px tall touch target)
        const back = document.createElement('button');
        back.textContent = '← Back';
        back.style.cssText = `
            position:absolute; top:12px; left:16px; min-height:44px; min-width:44px;
            background:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.3);
            color:#fff; padding:0 20px; border-radius:30px;
            cursor:pointer; font-size:0.95rem; z-index:10;
            font-family:Arial,sans-serif;
        `;
        back.addEventListener('click', () => this.router.navigate('/'));
        wrap.appendChild(back);

        const title = document.createElement('div');
        title.textContent = '☀️ Solar System';
        title.style.cssText = `
            position:absolute; top:22px; left:50%; transform:translateX(-50%);
            color:rgba(255,255,255,0.7); font-size:1.1rem;
            pointer-events:none; white-space:nowrap; font-family:Arial,sans-serif;
        `;
        wrap.appendChild(title);

        const hint = document.createElement('div');
        hint.textContent = 'Tap a planet!';
        hint.style.cssText = `
            position:absolute; bottom:20px; left:50%; transform:translateX(-50%);
            color:rgba(255,255,255,0.3); font-size:0.85rem;
            pointer-events:none; font-family:Arial,sans-serif;
        `;
        wrap.appendChild(hint);

        this.canvas.addEventListener('pointerdown', e => this._handleTap(e.clientX, e.clientY));
        return wrap;
    }

    _syncCanvasSize() {
        if (!this.canvas) return;
        this._dpr = Math.min(2, window.devicePixelRatio || 1);
        this._w = window.innerWidth; this._h = window.innerHeight;
        this.canvas.width = Math.max(1, Math.round(this._w * this._dpr));
        this.canvas.height = Math.max(1, Math.round(this._h * this._dpr));
    }

    _generateStars() {
        this.stars = [];
        const count = Math.round((this._w * this._h) / 3000);
        for (let i = 0; i < count; i++) {
            this.stars.push({
                x: Math.random() * this._w,
                y: Math.random() * this._h,
                r: Math.random() * 1.4 + 0.3,
                phase: Math.random() * Math.PI * 2,
            });
        }
    }

    // ── Animation loop ────────────────────────────────────────────────────────
    _startLoop() {
        if (this.rafId || !this._visible) return;
        this.rafId = requestAnimationFrame(this._loop);
    }

    _tick(now) {
        this.rafId = null;
        if (!this._visible) return;
        if (this._lastNow) this._elapsedMs += Math.min(100, now - this._lastNow);
        this._lastNow = now;
        this._draw(this._elapsedMs);
        this.rafId = requestAnimationFrame(this._loop);
    }

    _stopLoop() {
        if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
    }

    // ── Drawing ───────────────────────────────────────────────────────────────
    _items(ms) {
        const layout = orreryLayout(this._w, this._h);
        const t = ms / 1000;
        const items = OrreryToy.PLANETS.map(p => {
            const pos = planetPosition(p, t, layout);
            return { x: pos.x, y: pos.y, r: planetDrawRadius(p.radius, layout.scale) };
        });
        return { layout, items, t };
    }

    _draw(ms) {
        const { ctx } = this;
        if (!ctx) return;
        const W = this._w, H = this._h;
        const planets = OrreryToy.PLANETS;
        const { layout, items, t } = this._items(ms);
        const { cx, cy, scale } = layout;

        ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);

        this.stars.forEach(s => {
            const alpha = 0.45 + 0.45 * Math.sin(t * 0.8 + s.phase);
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,255,255,${alpha})`;
            ctx.fill();
        });

        // Orbit rings
        ctx.save();
        ctx.setLineDash([4, 8]);
        planets.forEach((p, i) => {
            ctx.beginPath();
            ctx.arc(cx, cy, p.orbitR * scale, 0, Math.PI * 2);
            ctx.strokeStyle = this.selectedIdx === i ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.1)';
            ctx.lineWidth = 1;
            ctx.stroke();
        });
        ctx.setLineDash([]);
        ctx.restore();

        // Sun
        const sunPulse = layout.sunR + 4 * Math.min(1, scale) * Math.sin(t * 1.5);
        const sunGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, sunPulse * 2.2);
        sunGrad.addColorStop(0,   '#FFFFFF');
        sunGrad.addColorStop(0.25,'#FFF176');
        sunGrad.addColorStop(0.5, '#FFD600');
        sunGrad.addColorStop(0.75,'#FF8C00');
        sunGrad.addColorStop(1,   'rgba(255,140,0,0)');
        ctx.beginPath();
        ctx.arc(cx, cy, sunPulse * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = sunGrad;
        ctx.fill();

        planets.forEach((p, i) => {
            const { x: px, y: py, r } = items[i];
            const selected = this.selectedIdx === i;

            if (selected) {
                const g = ctx.createRadialGradient(px, py, r, px, py, r * 3.5);
                g.addColorStop(0, p.glowColor + 'CC');
                g.addColorStop(1, 'transparent');
                ctx.beginPath();
                ctx.arc(px, py, r * 3.5, 0, Math.PI * 2);
                ctx.fillStyle = g;
                ctx.fill();
            }

            const bodyGrad = ctx.createRadialGradient(px - r * 0.3, py - r * 0.3, r * 0.1, px, py, r);
            bodyGrad.addColorStop(0, p.glowColor);
            bodyGrad.addColorStop(1, p.bodyColor);
            ctx.beginPath();
            ctx.arc(px, py, r, 0, Math.PI * 2);
            ctx.fillStyle = bodyGrad;
            ctx.fill();

            if (p.name === 'Saturn') {
                ctx.save();
                ctx.translate(px, py);
                ctx.scale(1, 0.35);
                ctx.beginPath();
                ctx.arc(0, 0, r * 2.2, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(228,204,107,0.55)';
                ctx.lineWidth = r * 0.55;
                ctx.stroke();
                ctx.restore();
            }

            if (selected) {
                ctx.font = `${r * 2}px serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(p.emoji, px, py);
            }
        });
    }

    // ── Interaction ───────────────────────────────────────────────────────────
    _handleTap(clientX, clientY) {
        try {
            if (!this.canvas) return;
            const rect = this.canvas.getBoundingClientRect();
            const x = clientX - rect.left, y = clientY - rect.top;
            const { layout, items } = this._items(this._elapsedMs);
            const planets = OrreryToy.PLANETS;

            const idx = pickNearest(items, x, y, 28);
            if (idx >= 0) {
                const p = planets[idx];
                this.selectedIdx = idx;
                this._showInfo(`${p.emoji} ${p.name} — ${p.fact}`);
                speakText(this.configManager, p.name, 1.15);
            } else if (hitSun(layout, x, y)) {
                this.selectedIdx = null;
                this._showInfo('☀️ The Sun — Our star!');
                speakText(this.configManager, 'The Sun', 1.15);
            }
        } catch (err) {
            console.warn('OrreryToy tap failed:', err);
        }
    }

    _showInfo(text) {
        clearTimeout(this.labelTimer);
        this.infoPanel.textContent = text;
        this.infoPanel.style.opacity = '1';
        this.labelTimer = setTimeout(() => {
            if (this.infoPanel) this.infoPanel.style.opacity = '0';
            this.selectedIdx = null;
        }, 5000);
    }
}
