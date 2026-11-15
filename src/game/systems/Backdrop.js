/**
 * Backdrop: a soft multi-stop gradient with a few huge, blurry colour blobs
 * drifting slowly over it, shown BEHIND the (transparent) game canvas.
 *
 * It is painted into a tiny 2D canvas (about 1/8 of the screen) a dozen times
 * a second and stretched over the game container by CSS; the stretch is the
 * blur. That keeps it out of the WebGL frame entirely: drawn inside the game
 * canvas it cost ~24 ms a frame under software rendering, and as animated CSS
 * layers ~14 ms; this way it costs well under a millisecond and does not get
 * more expensive when the game renders at device resolution.
 */
import { PALETTES, DEFAULT_PALETTE, hexToRgb, shiftHue } from './BackdropPalettes.js';

export const BACKDROP_CLASS = 'tt-backdrop';
export const REDRAW_MS = 80;        // ~12 repaints a second is plenty for slow drift
const HUE_DRIFT_S = 160;            // full there-and-back hue cycle
const BLOB_SIZE_FACTOR = 1.3;
const MAX_SIDE = 224;               // longest side of the small canvas, px
const SPRITE = 64;                  // blob sprite size, px
const TAU = Math.PI * 2;

function prefersReducedMotion() {
    try {
        return Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) {
        return false;
    }
}

/** `?backdrop=aquarium|dawn|twilight` (or localStorage `toddletoy-backdrop`) picks a palette, for comparing looks. */
function urlPalette() {
    try {
        return new URLSearchParams(window.location.search).get('backdrop')
            || window.localStorage.getItem('toddletoy-backdrop');
    } catch (e) {
        return null;
    }
}

const css = (hex) => `rgb(${hexToRgb(hex).join(',')})`;
const cssA = (hex, a) => `rgba(${hexToRgb(hex).join(',')},${a})`;

export function gradientCss(stops, hueShift = 0) {
    const parts = stops.map(([at, hex]) => `${css(hueShift ? shiftHue(hex, hueShift) : hex)} ${Math.round(at * 100)}%`);
    return `linear-gradient(165deg, ${parts.join(', ')})`;
}

/**
 * Where a blob is at time `t` seconds: centre (fractions of the screen),
 * scale and alpha. Pure, so the motion bounds can be unit-tested.
 */
export function blobState(def, index, t) {
    const phase = Math.sin(index * 2.4); // blobs start at different points of their drift
    const drift = phase * Math.cos(TAU * t / def.period);
    const breathe = (1 - Math.cos(TAU * t / (def.period * 1.4))) / 2; // 0..1
    return {
        x: def.x + def.dx * drift,
        y: def.y + def.dy * drift,
        scale: 1 + 0.18 * breathe,
        alpha: def.alpha * (1 - 0.3 * breathe), // never below 70% of the designed alpha
    };
}

/** 0..1: how much of the hue-shifted gradient shows at time `t` seconds. */
export function hueMix(t) {
    return (1 - Math.cos(TAU * t / HUE_DRIFT_S)) / 2;
}

function safeContext(canvas) {
    try { return canvas.getContext('2d'); } catch (e) { return null; }
}

export class Backdrop {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.palette = PALETTES[options.palette || urlPalette()] || PALETTES[DEFAULT_PALETTE];
        this.reducedMotion = options.reducedMotion ?? prefersReducedMotion();
        this.container = options.container || null;
        this.root = null;
        this.ctx = null;
        this.sprites = [];
        this.time = 0;       // seconds of animation
        this.sinceDraw = 0;  // ms since the last repaint
        this.animating = false;
        this.destroyed = false;
        this.onShutdown = () => this.destroy();
        this.onResize = () => this.resize();
        this.onUpdate = (_time, delta) => {
            this.sinceDraw += delta;
            if (this.sinceDraw < REDRAW_MS) return;
            this.time += this.sinceDraw / 1000;
            this.draw();
        };
    }

    create() {
        const container = this.container
            || this.scene?.game?.canvas?.parentElement
            || (typeof document !== 'undefined' ? document.getElementById('game-container') : null);
        if (!container) return this; // headless / unit-test scenes: nothing to draw on
        this.container = container;
        // a restarted scene must not stack a second backdrop
        container.querySelectorAll(`.${BACKDROP_CLASS}`).forEach((el) => el.remove());

        const { palette } = this;
        const root = document.createElement('canvas');
        root.className = BACKDROP_CLASS;
        root.setAttribute('aria-hidden', 'true');
        root.dataset.palette = palette.name;
        Object.assign(root.style, {
            position: 'absolute', left: '0', top: '0', width: '100%', height: '100%',
            zIndex: '0', pointerEvents: 'none', objectFit: 'fill',
            backgroundColor: css(palette.base),
        });
        root.style.backgroundImage = gradientCss(palette.stops); // shown if 2D canvas is unavailable
        this.root = root;
        this.ctx = safeContext(root);
        if (this.ctx) this.sprites = palette.blobs.map((b) => this.makeSprite(b.color));
        container.insertBefore(root, container.firstChild);
        this.resize();

        this.scene?.events?.once?.('shutdown', this.onShutdown);
        this.scene?.scale?.on?.('resize', this.onResize);
        if (!this.reducedMotion && this.ctx) {
            this.scene?.events?.on?.('update', this.onUpdate); // scene updates stop while it is paused
            this.animating = true;
        }
        return this;
    }

    /** A soft round blob in one colour, drawn once and reused every frame. */
    makeSprite(hex) {
        const c = document.createElement('canvas');
        c.width = c.height = SPRITE;
        const g = safeContext(c);
        if (!g) return null;
        const r = SPRITE / 2;
        const grad = g.createRadialGradient(r, r, 0, r, r, r);
        grad.addColorStop(0, css(hex));
        grad.addColorStop(0.3, cssA(hex, 0.72));
        grad.addColorStop(0.62, cssA(hex, 0.28));
        grad.addColorStop(1, cssA(hex, 0));
        g.fillStyle = grad;
        g.fillRect(0, 0, SPRITE, SPRITE);
        return c;
    }

    makeGradient(w, h, hueShift) {
        // 165deg, like the CSS fallback: mostly top to bottom, leaning right to left
        const dx = Math.sin(165 * Math.PI / 180) * w / 2, dy = -Math.cos(165 * Math.PI / 180) * h / 2;
        const grad = this.ctx.createLinearGradient(w / 2 - dx, h / 2 - dy, w / 2 + dx, h / 2 + dy);
        for (const [at, hex] of this.palette.stops) grad.addColorStop(at, css(hueShift ? shiftHue(hex, hueShift) : hex));
        return grad;
    }

    /** Match the small canvas to the container's shape, then repaint. */
    resize() {
        if (this.destroyed || !this.root) return;
        const cw = this.container.clientWidth || this.scene?.scale?.width || 4;
        const ch = this.container.clientHeight || this.scene?.scale?.height || 3;
        const k = MAX_SIDE / Math.max(cw, ch);
        const w = Math.max(2, Math.round(cw * k)), h = Math.max(2, Math.round(ch * k));
        if (w !== this.root.width || h !== this.root.height || !this.gradient) {
            this.root.width = w;
            this.root.height = h;
            if (this.ctx) {
                this.gradient = this.makeGradient(w, h, 0);
                this.gradientAlt = this.makeGradient(w, h, this.palette.hueShift);
            }
        }
        this.draw();
    }

    draw() {
        this.sinceDraw = 0;
        const { ctx, root, palette } = this;
        if (!ctx) return;
        const w = root.width, h = root.height;
        ctx.globalAlpha = 1;
        ctx.fillStyle = this.gradient;
        ctx.fillRect(0, 0, w, h);
        const mix = hueMix(this.time);
        if (mix > 0.004) {
            ctx.globalAlpha = mix;
            ctx.fillStyle = this.gradientAlt;
            ctx.fillRect(0, 0, w, h);
        }
        const big = Math.max(w, h);
        for (let i = 0; i < palette.blobs.length; i++) {
            const sprite = this.sprites[i];
            if (!sprite) continue;
            const s = blobState(palette.blobs[i], i, this.time);
            const size = big * palette.blobs[i].size * BLOB_SIZE_FACTOR * s.scale;
            ctx.globalAlpha = s.alpha;
            ctx.drawImage(sprite, s.x * w - size / 2, s.y * h - size / 2, size, size);
        }
        ctx.globalAlpha = 1;
    }

    destroy() {
        if (this.destroyed) return;
        this.destroyed = true;
        this.animating = false;
        this.scene?.events?.off?.('shutdown', this.onShutdown);
        this.scene?.events?.off?.('update', this.onUpdate);
        this.scene?.scale?.off?.('resize', this.onResize);
        this.root?.remove();
        this.root = this.ctx = this.gradient = this.gradientAlt = null;
        this.sprites = [];
    }
}
