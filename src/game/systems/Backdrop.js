/**
 * Backdrop: a soft multi-stop gradient with a few huge, blurry colour blobs
 * drifting slowly over it, drawn inside the Phaser scene below everything.
 *
 * Textures are generated once; motion is tweens on a handful of images
 * (no per-frame work, no allocations). Sizes come from the scene's scale size
 * so it covers the canvas at any resolution, and `resize()` re-lays it out.
 */
import { PALETTES, DEFAULT_PALETTE } from './BackdropPalettes.js';
import { createGradientTexture, createBlobTexture } from './BackdropTextures.js';

export const BACKDROP_DEPTH = -10000;
const HUE_DRIFT_MS = 80000;

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
        this.gradient = null;
        this.gradientAlt = null;
        this.blobs = [];
        this.tweens = [];
        this.width = 0;
        this.height = 0;
        this.destroyed = false;
        this.onResize = (gameSize) => this.resize(gameSize?.width, gameSize?.height);
        this.onShutdown = () => this.destroy();
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

        this.gradient = this.addImage(gradKey, BACKDROP_DEPTH);
        this.gradientAlt = this.addImage(altKey, BACKDROP_DEPTH + 1);
        this.gradientAlt.setAlpha(0);
        this.blobs = palette.blobs.map((b, i) => {
            const img = this.addImage(blobKey, BACKDROP_DEPTH + 2 + i);
            img.setTint(b.color);
            img.setAlpha(b.alpha);
            return { img, def: b };
        });

        this.layout();
        scene.scale?.on?.('resize', this.onResize);
        scene.events?.once?.('shutdown', this.onShutdown);
        return this;
    }

    addImage(key, depth) {
        const img = this.scene.add.image(0, 0, key);
        img.setDepth(depth);
        img.setScrollFactor?.(0);
        return img;
    }

    /** Re-fit everything to the current scene size and (re)start the motion. */
    layout(w = this.scene.scale?.width || 0, h = this.scene.scale?.height || 0) {
        this.width = w;
        this.height = h;
        this.stopMotion();
        for (const g of [this.gradient, this.gradientAlt]) {
            g.setOrigin(0, 0);
            g.setPosition(0, 0);
            g.setDisplaySize(w, h);
        }
        const big = Math.max(w, h);
        this.blobs.forEach(({ img, def }, i) => {
            img.setOrigin(0.5, 0.5);
            img.setDisplaySize(big * def.size * 1.15, big * def.size * 1.15);
            const phase = Math.sin(i * 2.4); // start blobs at different points of their drift
            img.setPosition(def.x * w + def.dx * w * phase, def.y * h + def.dy * h * phase);
            img.setAlpha(def.alpha);
        });
        if (!this.reducedMotion) this.startMotion();
    }

    startMotion() {
        const tweens = this.scene.tweens;
        if (!tweens) return;
        const w = this.width, h = this.height;
        this.blobs.forEach(({ img, def }, i) => {
            const phase = Math.sin(i * 2.4);
            const baseSize = img.displayWidth;
            this.tweens.push(tweens.add({
                targets: img,
                x: def.x * w - def.dx * w * phase,
                y: def.y * h - def.dy * h * phase,
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
    }

    stopMotion() {
        for (const t of this.tweens) t.remove ? t.remove() : t.stop?.();
        this.tweens.length = 0;
    }

    /** Cover the canvas after a resize; sizes default to the scene's scale size. */
    resize(width, height) {
        if (this.destroyed || !this.gradient) return;
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
        for (const img of [this.gradient, this.gradientAlt, ...this.blobs.map((b) => b.img)]) img?.destroy?.();
        this.gradient = this.gradientAlt = null;
        this.blobs = [];
        for (const k of this.keys) if (this.scene.textures?.exists(k)) this.scene.textures.remove(k);
        this.keys = [];
    }
}
