/**
 * Backdrop: a soft multi-stop gradient with a few huge, blurry colour blobs
 * drifting slowly over it, drawn inside the Phaser scene below everything.
 *
 * Cost control: the gradient and blobs are composited into a small render
 * texture (a quarter of the screen size, redrawn ~20x a second) which is then
 * stretched over the canvas as ONE image. The bilinear upscale is the blur,
 * and the GPU only ever fills the screen once instead of ~10 times.
 *
 * Textures are generated once; motion is tweens on a handful of detached
 * images (no per-frame allocations). Everything is sized from the scene's
 * scale size, and `resize()` re-lays it out.
 */
import { PALETTES, DEFAULT_PALETTE } from './BackdropPalettes.js';
import { createGradientTexture, createBlobTexture } from './BackdropTextures.js';

export const BACKDROP_DEPTH = -10000;
const HUE_DRIFT_MS = 80000;
const RT_SCALE = 0.25;      // render texture size relative to the screen
const REDRAW_MS = 50;       // 20 redraws per second is plenty for slow drift
const BLOB_SIZE_FACTOR = 1.3;
const EDGE_BLEED = 3;     // px of overscan on every side

let instanceCounter = 0;

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

export class Backdrop {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.palette = PALETTES[options.palette || urlPalette()] || PALETTES[DEFAULT_PALETTE];
        this.reducedMotion = options.reducedMotion ?? prefersReducedMotion();
        this.id = ++instanceCounter;
        this.keys = [];
        this.layer = null;       // the one visible image: a render texture stretched over the canvas
        this.gradient = null;    // detached sources drawn into the layer
        this.gradientAlt = null;
        this.blobs = [];
        this.sources = [];       // draw order, reused every redraw
        this.tweens = [];
        this.width = 0;
        this.height = 0;
        this.sinceDraw = 0;
        this.destroyed = false;
        this.onResize = (gameSize) => this.resize(gameSize?.width, gameSize?.height);
        this.onShutdown = () => this.destroy();
        this.onUpdate = (time, delta) => {
            this.sinceDraw += delta;
            if (this.sinceDraw >= REDRAW_MS) this.redraw();
        };
    }

    create() {
        const { scene, palette } = this;
        const key = (name) => {
            const k = `backdrop-${this.id}-${name}`;
            this.keys.push(k);
            return k;
        };
        const gradKey = key('grad');
        const altKey = key('grad-alt');
        const blobKey = key('blob');
        createGradientTexture(scene, gradKey, palette.stops);
        createGradientTexture(scene, altKey, palette.stops, palette.hueShift);
        createBlobTexture(scene, blobKey);

        const w = scene.scale?.width || 1, h = scene.scale?.height || 1;
        const [rw, rh] = this.layerSize(w, h);
        this.layer = scene.add.renderTexture(0, 0, rw, rh);
        this.layer.setOrigin(0, 0);
        this.layer.setDepth(BACKDROP_DEPTH);
        this.layer.setScrollFactor?.(0);

        this.gradient = this.makeSource(gradKey);
        this.gradientAlt = this.makeSource(altKey);
        this.gradientAlt.setAlpha(0);
        this.blobs = palette.blobs.map((b) => {
            const img = this.makeSource(blobKey);
            img.setTint(b.color);
            img.setAlpha(b.alpha);
            return { img, def: b };
        });
        this.sources = [this.gradient, this.gradientAlt, ...this.blobs.map((b) => b.img)];

        this.layout(w, h);
        scene.scale?.on?.('resize', this.onResize);
        scene.events?.once?.('shutdown', this.onShutdown);
        return this;
    }

    makeSource(key) {
        // detached from the display list: only ever drawn into the layer
        return this.scene.make.image({ key, add: false });
    }

    layerSize(w, h) {
        return [Math.max(2, Math.ceil(w * RT_SCALE)), Math.max(2, Math.ceil(h * RT_SCALE))];
    }

    /** Re-fit everything to the given screen size and (re)start the motion. */
    layout(w = this.scene.scale?.width || 0, h = this.scene.scale?.height || 0) {
        this.width = w;
        this.height = h;
        this.stopMotion();
        const [rw, rh] = this.layerSize(w, h);
        this.layer.resize(rw, rh);
        // overscan by a few px so edge texels (bilinear clamp) never show as a rim
        this.layer.setPosition(-EDGE_BLEED, -EDGE_BLEED);
        this.layer.setScale((w + 2 * EDGE_BLEED) / rw, (h + 2 * EDGE_BLEED) / rh);

        for (const g of [this.gradient, this.gradientAlt]) {
            g.setOrigin(0, 0);
            g.setPosition(0, 0);
            g.setDisplaySize(rw, rh);
        }
        const big = Math.max(rw, rh);
        this.blobs.forEach(({ img, def }, i) => {
            img.setOrigin(0.5, 0.5);
            img.setDisplaySize(big * def.size * BLOB_SIZE_FACTOR, big * def.size * BLOB_SIZE_FACTOR);
            const phase = Math.sin(i * 2.4); // start blobs at different points of their drift
            img.setPosition(def.x * rw + def.dx * rw * phase, def.y * rh + def.dy * rh * phase);
            img.setAlpha(def.alpha);
        });
        this.gradientAlt.setAlpha(0);
        this.redraw();
        if (!this.reducedMotion) this.startMotion(rw, rh);
    }

    redraw() {
        this.sinceDraw = 0;
        const layer = this.layer;
        layer.beginDraw();
        layer.batchDraw(this.sources);
        layer.endDraw();
    }

    startMotion(rw, rh) {
        const tweens = this.scene.tweens;
        if (!tweens) return;
        this.blobs.forEach(({ img, def }, i) => {
            const phase = Math.sin(i * 2.4);
            const baseSize = img.displayWidth;
            this.tweens.push(tweens.add({
                targets: img,
                x: def.x * rw - def.dx * rw * phase,
                y: def.y * rh - def.dy * rh * phase,
                duration: def.period * 1000 / 2,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1,
            }));
            // slow breathing: size and brightness, never below ~70% of the designed alpha
            this.tweens.push(tweens.add({
                targets: img,
                displayWidth: baseSize * 1.18,
                displayHeight: baseSize * 1.18,
                alpha: def.alpha * 0.7,
                duration: def.period * 700,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1,
            }));
        });
        this.tweens.push(tweens.add({
            targets: this.gradientAlt,
            alpha: 1,
            duration: HUE_DRIFT_MS,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1,
        }));
        this.scene.events?.on?.('update', this.onUpdate);
    }

    stopMotion() {
        for (const t of this.tweens) t.remove ? t.remove() : t.stop?.();
        this.tweens.length = 0;
        this.scene.events?.off?.('update', this.onUpdate);
    }

    /** Cover the canvas after a resize; sizes default to the scene's scale size. */
    resize(width, height) {
        if (this.destroyed || !this.layer) return;
        const scale = this.scene.scale;
        const w = width || scale?.width || 0, h = height || scale?.height || 0;
        if (w === this.width && h === this.height) return;
        this.layout(w, h);
    }

    destroy() {
        if (this.destroyed) return;
        this.destroyed = true;
        this.stopMotion();
        this.scene.scale?.off?.('resize', this.onResize);
        this.scene.events?.off?.('shutdown', this.onShutdown);
        for (const o of [this.layer, ...this.sources]) o?.destroy?.();
        this.layer = this.gradient = this.gradientAlt = null;
        this.blobs = [];
        this.sources = [];
        for (const k of this.keys) if (this.scene.textures?.exists(k)) this.scene.textures.remove(k);
        this.keys = [];
    }
}
