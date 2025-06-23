describe('Particle Effects', () => {
    let game;
    let mockAdd;
    let mockParticleEmitter;

    beforeEach(() => {
        // Mock Phaser particle emitter
        mockParticleEmitter = {
            setPosition: jest.fn().mockReturnThis(),
            setConfig: jest.fn().mockReturnThis(),
            explode: jest.fn().mockReturnThis(),
            start: jest.fn().mockReturnThis(),
            stop: jest.fn().mockReturnThis(),
            destroy: jest.fn()
        };

        // Mock Phaser graphics and tweens
        const mockGraphics = {
            fillStyle: jest.fn().mockReturnThis(),
            fillCircle: jest.fn().mockReturnThis(),
            destroy: jest.fn()
        };

        const mockTweens = {
            add: jest.fn().mockImplementation((config) => {
                // Simulate immediate completion for testing
                if (config.onComplete) {
                    setTimeout(config.onComplete, 0);
                }
            })
        };

        // Mock Phaser scene add methods
        mockAdd = {
            particles: jest.fn().mockReturnValue({
                createEmitter: jest.fn().mockReturnValue(mockParticleEmitter)
            }),
            graphics: jest.fn().mockReturnValue(mockGraphics),
            text: jest.fn().mockReturnValue({
                setOrigin: jest.fn().mockReturnThis()
            })
        };

        // Create game instance with particle implementation
        game = {
            add: mockAdd,
            tweens: mockTweens,
            objects: [],
            particleEmitters: new Map(),
            createParticleEffect: function(x, y, objId) {
                try {
                    const particles = this.add.particles(x, y, 'particle', {
                        speed: { min: 50, max: 150 },
                        scale: { start: 0.5, end: 0 },
                        blendMode: 'ADD',
                        lifespan: 300
                    });
                    
                    this.particleEmitters.set(objId, particles);
                    
                    setTimeout(() => {
                        this.cleanupParticles(objId);
                    }, 1000);
                    
                    return particles;
                } catch (error) {
                    return this.createFallbackEffect(x, y, objId);
                }
            },
            createSpawnBurst: function(x, y) {
                try {
                    const graphics = this.add.graphics();
                    const colors = [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0xf9ca24, 0xf0932b, 0xeb4d4b, 0x6c5ce7];
                    
                    for (let i = 0; i < 8; i++) {
                        const angle = (i / 8) * Math.PI * 2;
                        const distance = 30 + Math.random() * 20;
                        const particleX = x + Math.cos(angle) * distance;
                        const particleY = y + Math.sin(angle) * distance;
                        
                        const color = colors[Math.floor(Math.random() * colors.length)];
                        graphics.fillStyle(color);
                        graphics.fillCircle(particleX, particleY, 3 + Math.random() * 3);
                    }
                    
                    this.tweens.add({
                        targets: graphics,
                        alpha: 0,
                        duration: 500,
                        ease: 'Power2',
                        onComplete: () => {
                            graphics.destroy();
                        }
                    });
                    
                } catch (error) {
                    console.warn('Error creating spawn burst:', error);
                }
            },
            createFallbackEffect: function(x, y, objId) {
                const graphics = this.add.graphics();
                graphics.fillStyle(0xffffff);
                graphics.fillCircle(x, y, 20);
                
                this.tweens.add({
                    targets: graphics,
                    alpha: 0,
                    scaleX: 2,
                    scaleY: 2,
                    duration: 300,
                    onComplete: () => {
                        graphics.destroy();
                        this.particleEmitters.delete(objId);
                    }
                });
                
                this.particleEmitters.set(objId, graphics);
                return graphics;
            },
            cleanupParticles: function(objId) {
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
        };
    });

    test('should create particle effect and store emitter reference', () => {
        const result = game.createParticleEffect(100, 200, 'obj1');
        
        expect(mockAdd.particles).toHaveBeenCalledWith(100, 200, 'particle', expect.any(Object));
        expect(game.particleEmitters.has('obj1')).toBe(true);
        expect(result).toBeDefined();
    });

    test('should create colorful spawn burst with graphics', () => {
        game.createSpawnBurst(150, 250);
        
        expect(mockAdd.graphics).toHaveBeenCalled();
        expect(game.tweens.add).toHaveBeenCalledWith(expect.objectContaining({
            alpha: 0,
            duration: 500,
            ease: 'Power2'
        }));
    });

    test('should cleanup particle emitters', () => {
        // First create an effect
        game.createParticleEffect(200, 300, 'obj1');
        expect(game.particleEmitters.has('obj1')).toBe(true);
        
        // Then clean it up
        game.cleanupParticles('obj1');
        expect(game.particleEmitters.has('obj1')).toBe(false);
    });

    test('should handle missing emitter gracefully in cleanup', () => {
        // Should not throw when cleaning up non-existent emitter
        expect(() => {
            game.cleanupParticles('nonexistent');
        }).not.toThrow();
    });

    test('should create fallback effect when particles fail', () => {
        // Force particles to fail by making add.particles throw
        mockAdd.particles.mockImplementationOnce(() => {
            throw new Error('Particles not available');
        });
        
        const result = game.createParticleEffect(100, 200, 'obj1');
        
        expect(mockAdd.graphics).toHaveBeenCalled();
        expect(game.particleEmitters.has('obj1')).toBe(true);
    });
});