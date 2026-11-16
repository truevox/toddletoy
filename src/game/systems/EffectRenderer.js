import { sizes } from './DisplayScale.js';
import { BurstPool } from './BurstPool.js';

/**
 * EffectRenderer - Handles specialized visual effects rendering
 * Manages cleanup effects, spawn bursts, and fallback graphics
 */
export class EffectRenderer {
    constructor(scene) {
        this.scene = scene;
        this.transient = new Set(); // fallback trail graphics awaiting their fade-out
        this.pool = new BurstPool(scene); // pooled spawn/pop bursts
    }

    /** Soft ring plus pieces in opts.color (0xRRGGBB); opts.kind 'shape' gives stars/diamonds. */
    createSpawnBurst(x, y, opts) {
        this.pool.spawn(x, y, opts);
    }

    /** Quick "pop" for an object going away: bright ring snap plus a few pieces. */
    createCleanupParticleEffect(x, y, opts) {
        this.pool.pop(x, y, opts);
    }

    createFallbackTrail(object) {
        const graphics = this.scene.add.graphics();
        this.transient.add(graphics);
        graphics.fillStyle(0xff6b6b);
        graphics.fillCircle(object.x, object.y, 3 * sizes(this.scene).k);
        
        this.scene.tweens.add({
            targets: graphics,
            alpha: 0,
            duration: 200,
            onComplete: () => this.release(graphics)
        });
    }

    destroy() {
        this.pool.destroy();
        this.transient.forEach((g) => { try { g.destroy(); } catch (e) { /* gone */ } });
        this.transient.clear();
    }

    /** Remove every burst piece and fallback graphic right now. */
    clear() {
        this.pool.clear();
        this.transient.forEach((g) => { try { g.destroy(); } catch (e) { /* gone */ } });
        this.transient.clear();
    }

    /** Destroy a burst graphic and stop tracking it. */
    release(graphics) {
        this.transient.delete(graphics);
        if (graphics && graphics.destroy) graphics.destroy();
    }
}
