/**
 * OrreryToy - Flat animated solar system for toddlers
 * Shows all 8 planets orbiting the Sun; tap any to hear its name.
 */
export class OrreryToy {
    constructor(router) {
        this.router = router;
        this.container = null;
        this.canvas = null;
        this.ctx = null;
        this.offscreen = null; // for hit-detection
        this.offCtx = null;
        this.rafId = null;
        this.startTime = null;
        this.stars = [];
        this.selectedIdx = null;
        this.labelTimer = null;
        this._resizeHandler = null;
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
        this.startTime = performance.now();
        this._startLoop();
    }

    hide() {
        if (this.container) this.container.style.display = 'none';
        this._stopLoop();
    }

    destroy() {
        this._stopLoop();
        if (this._resizeHandler) window.removeEventListener('resize', this._resizeHandler);
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.container = null;
    }

    // ── DOM construction ──────────────────────────────────────────────────────
    _build() {
        const wrap = document.createElement('div');
        wrap.id = 'orrery-toy';
        wrap.style.cssText = 'position:fixed;inset:0;background:#000010;z-index:500;overflow:hidden;';

        // Main canvas
        this.canvas = document.createElement('canvas');
        this.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
        wrap.appendChild(this.canvas);

        // Offscreen canvas for hit detection
        this.offscreen = document.createElement('canvas');
        this.offCtx = this.offscreen.getContext('2d');

        this._syncCanvasSize();
        this.ctx = this.canvas.getContext('2d');
        this._generateStars();

        // Info panel (shown when planet tapped)
        this.infoPanel = document.createElement('div');
        this.infoPanel.style.cssText = `
            position:absolute; bottom:70px; left:50%; transform:translateX(-50%);
            background:rgba(0,0,20,0.85); border:1px solid rgba(255,255,255,0.25);
            border-radius:18px; padding:14px 32px; color:#fff;
            font-size:clamp(1rem,4vw,1.5rem); text-align:center;
            pointer-events:none; opacity:0; transition:opacity 0.3s;
            white-space:nowrap; max-width:90vw;
        `;
        wrap.appendChild(this.infoPanel);

        // Back button
        const back = document.createElement('button');
        back.textContent = '← Back';
        back.style.cssText = `
            position:absolute; top:16px; left:16px;
            background:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.3);
            color:#fff; padding:9px 20px; border-radius:30px;
            cursor:pointer; font-size:0.95rem; z-index:10;
            font-family:Arial,sans-serif;
        `;
        back.addEventListener('click', () => this.router.navigate('/'));
        wrap.appendChild(back);

        // Title
        const title = document.createElement('div');
        title.textContent = '☀️ Solar System';
        title.style.cssText = `
            position:absolute; top:18px; left:50%; transform:translateX(-50%);
            color:rgba(255,255,255,0.7); font-size:1.1rem;
            pointer-events:none; white-space:nowrap; font-family:Arial,sans-serif;
        `;
        wrap.appendChild(title);

        // Hint
        const hint = document.createElement('div');
        hint.textContent = 'Tap a planet!';
        hint.style.cssText = `
            position:absolute; bottom:20px; left:50%; transform:translateX(-50%);
            color:rgba(255,255,255,0.3); font-size:0.85rem;
            pointer-events:none; font-family:Arial,sans-serif;
        `;
        wrap.appendChild(hint);

        // Input events
        this.canvas.addEventListener('pointerdown', e => this._handleTap(e.clientX, e.clientY));

        // Resize
        this._resizeHandler = () => {
            this._syncCanvasSize();
            this._generateStars();
        };
        window.addEventListener('resize', this._resizeHandler);

        return wrap;
    }

    _syncCanvasSize() {
        const w = window.innerWidth, h = window.innerHeight;
        this.canvas.width = w; this.canvas.height = h;
        this.offscreen.width = w; this.offscreen.height = h;
    }

    _generateStars() {
        this.stars = [];
        const count = Math.round((this.canvas.width * this.canvas.height) / 3000);
        for (let i = 0; i < count; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                r: Math.random() * 1.4 + 0.3,
                phase: Math.random() * Math.PI * 2,
            });
        }
    }

    // ── Animation loop ────────────────────────────────────────────────────────
    _startLoop() {
        const loop = (now) => {
            this.rafId = requestAnimationFrame(loop);
            this._draw(now - (this.startTime || now));
        };
        this.rafId = requestAnimationFrame(loop);
    }

    _stopLoop() {
        if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
    }

    // ── Drawing ───────────────────────────────────────────────────────────────
    _draw(ms) {
        const { ctx, canvas } = this;
        const W = canvas.width, H = canvas.height;
        const cx = W / 2, cy = H / 2;
        const planets = OrreryToy.PLANETS;

        // Scale so outermost orbit fits
        const maxOrbit = planets[planets.length - 1].orbitR;
        const scale = (Math.min(W, H) * 0.44) / maxOrbit;

        ctx.clearRect(0, 0, W, H);

        // Stars
        const t = ms / 1000;
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
        planets.forEach(p => {
            ctx.beginPath();
            ctx.arc(cx, cy, p.orbitR * scale, 0, Math.PI * 2);
            ctx.strokeStyle = this.selectedIdx !== null && planets[this.selectedIdx] === p
                ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.1)';
            ctx.lineWidth = 1;
            ctx.stroke();
        });
        ctx.setLineDash([]);
        ctx.restore();

        // Sun
        const sunPulse = 28 + 4 * Math.sin(t * 1.5);
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

        // Offscreen hit canvas
        const oc = this.offCtx;
        oc.clearRect(0, 0, W, H);

        // Planets
        planets.forEach((p, i) => {
            const angle = (p.startDeg * Math.PI / 180) + (Math.PI * 2 / p.periodS) * t;
            const px = cx + Math.cos(angle) * p.orbitR * scale;
            const py = cy + Math.sin(angle) * p.orbitR * scale;
            const r = p.radius;
            const selected = this.selectedIdx === i;

            // Glow for selected
            if (selected) {
                const g = ctx.createRadialGradient(px, py, r, px, py, r * 3.5);
                g.addColorStop(0, p.glowColor + 'CC');
                g.addColorStop(1, 'transparent');
                ctx.beginPath();
                ctx.arc(px, py, r * 3.5, 0, Math.PI * 2);
                ctx.fillStyle = g;
                ctx.fill();
            }

            // Planet body
            const bodyGrad = ctx.createRadialGradient(px - r * 0.3, py - r * 0.3, r * 0.1, px, py, r);
            bodyGrad.addColorStop(0, p.glowColor);
            bodyGrad.addColorStop(1, p.bodyColor);
            ctx.beginPath();
            ctx.arc(px, py, r, 0, Math.PI * 2);
            ctx.fillStyle = bodyGrad;
            ctx.fill();

            // Saturn rings
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

            // Planet emoji label (small, appears beside planet)
            if (selected) {
                ctx.font = `${r * 2}px serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(p.emoji, px, py);
            }

            // Hit offscreen: each planet gets a unique solid color
            const hitColor = `rgb(${i + 1},0,0)`;
            oc.beginPath();
            oc.arc(px, py, Math.max(r + 6, 20), 0, Math.PI * 2);
            oc.fillStyle = hitColor;
            oc.fill();
        });
    }

    // ── Interaction ───────────────────────────────────────────────────────────
    _handleTap(cx, cy) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = (cx - rect.left) * scaleX;
        const y = (cy - rect.top) * scaleY;

        const px = this.offCtx.getImageData(Math.round(x), Math.round(y), 1, 1).data;
        const idx = px[0] - 1; // R channel encodes planet index + 1

        const planets = OrreryToy.PLANETS;
        if (idx >= 0 && idx < planets.length) {
            this.selectedIdx = idx;
            const p = planets[idx];
            this._showInfo(`${p.emoji} ${p.name} — ${p.fact}`);
            this._speak(p.name);
        } else {
            // Tapped Sun?
            const W = this.canvas.width, H = this.canvas.height;
            const dx = x - W / 2, dy = y - H / 2;
            const maxOrbit = planets[planets.length - 1].orbitR;
            const scale = (Math.min(W, H) * 0.44) / maxOrbit;
            if (Math.hypot(dx, dy) < 30 * scale) {
                this.selectedIdx = null;
                this._showInfo('☀️ The Sun — Our star!');
                this._speak('The Sun');
            }
        }
    }

    _showInfo(text) {
        clearTimeout(this.labelTimer);
        this.infoPanel.textContent = text;
        this.infoPanel.style.opacity = '1';
        this.labelTimer = setTimeout(() => {
            this.infoPanel.style.opacity = '0';
            this.selectedIdx = null;
        }, 5000);
    }

    _speak(text) {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 0.85; u.pitch = 1.15;
        window.speechSynthesis.speak(u);
    }
}
