import { EffectRenderer } from './EffectRenderer.js';

/**
 * ParticleManager - Handles all particle effects including spawn bursts, drag trails, and word sparkles
 * Provides unified particle system management with fallback options
 */
export class ParticleManager {
    constructor(scene) {
        this.scene = scene;
        this.particleEmitters = new Map();
        this.dragTrails = new Map();
        this.sparkleEmitters = new Map();
        this.effectRenderer = new EffectRenderer(scene);
        
        this.initParticleSystem();
    }

    initParticleSystem() {
        // Create particle texture if not already available
        if (!this.scene.textures.exists('particle')) {
            this.createParticleTexture();
        }
    }

    createParticleTexture() {
        // Create a simple white circle texture for particles
        const graphics = this.scene.add.graphics();
        graphics.fillStyle(0xffffff);
        graphics.fillCircle(8, 8, 8);
        graphics.generateTexture('particle', 16, 16);
        graphics.destroy();
        console.log('Particle texture created by ParticleManager');
    }

    createParticleEffect(x, y, objId) {
        try {
            // Create a simple particle system using Phaser graphics
            const particles = this.scene.add.particles(x, y, 'particle', {
                speed: { min: 50, max: 150 },
                scale: { start: 0.5, end: 0 },
                blendMode: 'ADD',
                lifespan: 300
            });

            // Store reference for cleanup
            this.particleEmitters.set(objId, particles);

            // Auto-cleanup after animation
            setTimeout(() => {
                this.cleanupParticles(objId);
            }, 1000);

            return particles;
        } catch (error) {
            // Fallback: create simple visual effect with graphics
            return this.effectRenderer.createFallbackEffect(x, y, objId, this.particleEmitters);
        }
    }

    createSpawnBurst(x, y) {
        return this.effectRenderer.createSpawnBurst(x, y);
    }

    createFallbackEffect(x, y, objId) {
        return this.effectRenderer.createFallbackEffect(x, y, objId, this.particleEmitters);
    }

    cleanupParticles(objId) {
        const emitter = this.particleEmitters.get(objId);
        if (emitter) {
            try {
                emitter.destroy();
            } catch (error) {
                // Emitter may already be destroyed
            }
            this.particleEmitters.delete(objId);
        }
    }

    startDragTrail(object) {
        if (!object || this.dragTrails.has(object.id)) {
            // Reuse existing trail if available
            const existingTrail = this.dragTrails.get(object.id);
            if (existingTrail) {
                existingTrail.setPosition(object.x, object.y);
                existingTrail.start();
                object.trailActive = true;
                object.isBeingDragged = true;
                return;
            }
        }
        
        try {
            // Create trail particle emitter using the particle texture
            const trailEmitter = this.scene.add.particles(0, 0, 'particle', {
                scale: { start: 0.3, end: 0 },
                speed: { min: 20, max: 40 },
                lifespan: 300,
                blendMode: 'ADD',
                tint: [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0xf7b731, 0x5f27cd]
            });
            
            trailEmitter.setPosition(object.x, object.y);
            trailEmitter.start();
            
            // Store trail emitter
            this.dragTrails.set(object.id, trailEmitter);
            object.trailEmitter = trailEmitter;
            object.trailActive = true;
            object.isBeingDragged = true;
        } catch (error) {
            console.warn('Error creating drag trail:', error);
            // Fallback to simple graphics trail
            this.effectRenderer.createFallbackTrail(object);
        }
    }
    
    createFallbackTrail(object) {
        return this.effectRenderer.createFallbackTrail(object);
    }
    
    updateDragTrail(object, x, y) {
        if (!object || !object.trailActive) return;
        
        const trailEmitter = this.dragTrails.get(object.id);
        if (trailEmitter) {
            trailEmitter.setPosition(x, y);
        }
    }
    
    stopDragTrail(object) {
        if (!object) return;
        
        const trailEmitter = this.dragTrails.get(object.id);
        if (trailEmitter && object.trailActive) {
            trailEmitter.stop();
            object.trailActive = false;
            object.isBeingDragged = false;
            
            // Schedule destruction after fade-out
            this.scene.time.addEvent({
                delay: 500,
                callback: () => {
                    if (trailEmitter) {
                        trailEmitter.destroy();
                        this.dragTrails.delete(object.id);
                        object.trailEmitter = null;
                    }
                }
            });
        }
    }

    createWordSparkleEffect(wordObj, duration = 1000) {
        if (!wordObj) return null;
        
        try {
            // Create sparkle particle emitter around the word
            const sparkleEmitter = this.scene.add.particles(wordObj.x, wordObj.y, 'particle', {
                scale: { start: 0.8, end: 0.1 },
                speed: { min: 50, max: 100 },
                lifespan: duration * 0.8, // Sparkles last most of the word duration
                frequency: 30, // Emit every 30ms for continuous effect
                quantity: 2, // 2 particles per emission
                blendMode: 'ADD',
                tint: [0xFFD700, 0xFFFFAA, 0xFFF8DC, 0xFFFF00, 0xFFFACD], // Gold/yellow sparkle colors
                emitZone: {
                    type: 'edge',
                    source: new Phaser.Geom.Rectangle(
                        -wordObj.width/2 - 10, 
                        -wordObj.height/2 - 10, 
                        wordObj.width + 20, 
                        wordObj.height + 20
                    ),
                    quantity: 8 // 8 points around the word boundary
                }
            });
            
            // Position the emitter at the word location
            sparkleEmitter.setPosition(wordObj.x + wordObj.width/2, wordObj.y);
            
            // Start the effect
            sparkleEmitter.start();
            
            // Auto-cleanup after duration
            this.scene.time.delayedCall(duration, () => {
                if (sparkleEmitter && sparkleEmitter.destroy) {
                    sparkleEmitter.destroy();
                }
            });
            
            return sparkleEmitter;
        } catch (error) {
            console.error('Error creating word sparkle effect:', error);
            return null;
        }
    }

    triggerWordSparkles(obj, wordIndex) {
        if (!obj || !obj.englishWords || !obj.englishWords[wordIndex]) {
            return false;
        }
        
        const wordObj = obj.englishWords[wordIndex];
        const sparkleEmitter = this.createWordSparkleEffect(wordObj);
        
        // Store the emitter for cleanup
        if (!obj.sparkleEmitters) {
            obj.sparkleEmitters = new Map();
        }
        obj.sparkleEmitters.set(wordIndex, sparkleEmitter);
        
        return sparkleEmitter !== null;
    }
    
    cleanupWordSparkles(obj) {
        if (!obj || !obj.sparkleEmitters) return;
        
        obj.sparkleEmitters.forEach((emitter, wordIndex) => {
            if (emitter && emitter.destroy) {
                emitter.destroy();
            }
        });
        obj.sparkleEmitters.clear();
    }

    createCleanupParticleEffect(x, y) {
        return this.effectRenderer.createCleanupParticleEffect(x, y);
    }

    // Cleanup all particle systems
    destroy() {
        // Clean up all particle emitters
        this.particleEmitters.forEach(emitter => {
            if (emitter && emitter.destroy) {
                emitter.destroy();
            }
        });
        this.particleEmitters.clear();

        // Clean up all drag trails
        this.dragTrails.forEach(trail => {
            if (trail && trail.destroy) {
                trail.destroy();
            }
        });
        this.dragTrails.clear();

        // Clean up sparkle emitters
        this.sparkleEmitters.forEach(emitter => {
            if (emitter && emitter.destroy) {
                emitter.destroy();
            }
        });
        this.sparkleEmitters.clear();

        // Clean up effect renderer
        if (this.effectRenderer) {
            this.effectRenderer.destroy();
        }
    }
}