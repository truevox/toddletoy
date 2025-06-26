/**
 * @jest-environment jsdom
 */

// Mock Phaser
const mockParticleEmitter = {
    setPosition: jest.fn(),
    setAlpha: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    explode: jest.fn(),
    destroy: jest.fn()
};

const mockParticleManager = {
    createEmitter: jest.fn(() => mockParticleEmitter)
};

const mockScene = {
    add: {
        particles: jest.fn(() => mockParticleManager),
        text: jest.fn(() => ({
            setOrigin: jest.fn(() => ({
                setTint: jest.fn(() => ({
                    setScale: jest.fn(() => ({}))
                }))
            }))
        }))
    },
    time: {
        addEvent: jest.fn()
    }
};

global.Phaser = {
    Scene: class Scene {},
    Game: class Game {},
    AUTO: 'AUTO',
    ParticleUtils: {
        EmitterOp: {
            OnEmit: jest.fn()
        }
    }
};

// Create mock game with trail functionality
const createMockGameWithTrails = () => {
    return {
        scene: mockScene,
        currentObject: {
            x: 100,
            y: 100,
            emoji: '🟦',
            trailEmitter: null,
            isBeingDragged: false,
            trailActive: false
        },
        
        startDragTrail: jest.fn((object) => {
            if (!object.trailEmitter) {
                object.trailEmitter = mockScene.add.particles(0, 0, 'particle', {
                    scale: { start: 0.3, end: 0 },
                    speed: { min: 20, max: 40 },
                    lifespan: 300,
                    blendMode: 'ADD',
                    tint: [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0xf7b731, 0x5f27cd]
                });
                object.trailEmitter = mockParticleEmitter;
            }
            object.trailEmitter.setPosition(object.x, object.y);
            object.trailEmitter.start();
            object.trailActive = true;
            object.isBeingDragged = true;
        }),
        
        updateDragTrail: jest.fn((object, x, y) => {
            if (object.trailActive && object.trailEmitter) {
                object.trailEmitter.setPosition(x, y);
                // Don't set object position here - let moveObjectTo handle it
            }
        }),
        
        stopDragTrail: jest.fn((object) => {
            if (object.trailEmitter && object.trailActive) {
                object.trailEmitter.stop();
                object.trailActive = false;
                object.isBeingDragged = false;
                
                // Fade out trail over 500ms
                mockScene.time.addEvent({
                    delay: 500,
                    callback: () => {
                        if (object.trailEmitter) {
                            object.trailEmitter.destroy();
                            object.trailEmitter = null;
                        }
                    }
                });
            }
        })
    };
};

describe('Drag Trails Visual Effects', () => {
    let mockGame;
    
    beforeEach(() => {
        mockGame = createMockGameWithTrails();
        jest.clearAllMocks();
    });
    
    describe('Trail Creation', () => {
        test('should create trail emitter when drag starts', () => {
            const object = mockGame.currentObject;
            
            mockGame.startDragTrail(object);
            
            expect(mockGame.startDragTrail).toHaveBeenCalledWith(object);
            expect(object.trailActive).toBe(true);
            expect(object.isBeingDragged).toBe(true);
            expect(mockParticleEmitter.setPosition).toHaveBeenCalledWith(100, 100);
            expect(mockParticleEmitter.start).toHaveBeenCalled();
        });
        
        test('should not create duplicate trail emitters', () => {
            const object = mockGame.currentObject;
            object.trailEmitter = mockParticleEmitter;
            
            mockGame.startDragTrail(object);
            
            expect(mockScene.add.particles).not.toHaveBeenCalled();
            expect(object.trailActive).toBe(true);
        });
    });
    
    describe('Trail Updates', () => {
        test('should update trail position during drag', () => {
            const object = mockGame.currentObject;
            mockGame.startDragTrail(object);
            
            mockGame.updateDragTrail(object, 200, 250);
            
            expect(mockGame.updateDragTrail).toHaveBeenCalledWith(object, 200, 250);
            expect(mockParticleEmitter.setPosition).toHaveBeenCalledWith(200, 250);
            // Object position is handled by moveObjectTo, not updateDragTrail
        });
        
        test('should not update trail if not active', () => {
            const object = mockGame.currentObject;
            object.trailActive = false;
            
            mockGame.updateDragTrail(object, 200, 250);
            
            expect(mockParticleEmitter.setPosition).not.toHaveBeenCalledWith(200, 250);
        });
        
        test('should not update trail if no emitter exists', () => {
            const object = mockGame.currentObject;
            object.trailEmitter = null;
            object.trailActive = true;
            
            mockGame.updateDragTrail(object, 200, 250);
            
            expect(mockParticleEmitter.setPosition).not.toHaveBeenCalled();
        });
    });
    
    describe('Trail Cleanup', () => {
        test('should stop trail when drag ends', () => {
            const object = mockGame.currentObject;
            object.trailEmitter = mockParticleEmitter;
            object.trailActive = true;
            
            mockGame.stopDragTrail(object);
            
            expect(mockGame.stopDragTrail).toHaveBeenCalledWith(object);
            expect(mockParticleEmitter.stop).toHaveBeenCalled();
            expect(object.trailActive).toBe(false);
            expect(object.isBeingDragged).toBe(false);
        });
        
        test('should schedule trail emitter destruction', () => {
            const object = mockGame.currentObject;
            object.trailEmitter = mockParticleEmitter;
            object.trailActive = true;
            
            mockGame.stopDragTrail(object);
            
            expect(mockScene.time.addEvent).toHaveBeenCalledWith({
                delay: 500,
                callback: expect.any(Function)
            });
        });
        
        test('should destroy emitter after fade delay', () => {
            const object = mockGame.currentObject;
            object.trailEmitter = mockParticleEmitter;
            object.trailActive = true;
            
            mockGame.stopDragTrail(object);
            
            // Simulate the delayed callback
            const delayedCallback = mockScene.time.addEvent.mock.calls[0][0].callback;
            delayedCallback();
            
            expect(mockParticleEmitter.destroy).toHaveBeenCalled();
            expect(object.trailEmitter).toBe(null);
        });
        
        test('should not stop trail if not active', () => {
            const object = mockGame.currentObject;
            object.trailActive = false;
            
            mockGame.stopDragTrail(object);
            
            expect(mockParticleEmitter.stop).not.toHaveBeenCalled();
        });
    });
    
    describe('Integration with Drag Events', () => {
        test('should maintain trail during continuous drag', () => {
            const object = mockGame.currentObject;
            
            // Start drag
            mockGame.startDragTrail(object);
            expect(object.trailActive).toBe(true);
            
            // Move during drag
            mockGame.updateDragTrail(object, 150, 175);
            expect(mockParticleEmitter.setPosition).toHaveBeenCalledWith(150, 175);
            
            // Continue moving
            mockGame.updateDragTrail(object, 200, 200);
            expect(mockParticleEmitter.setPosition).toHaveBeenCalledWith(200, 200);
            
            // End drag
            mockGame.stopDragTrail(object);
            expect(object.trailActive).toBe(false);
        });
        
        test('should handle multiple rapid position updates', () => {
            const object = mockGame.currentObject;
            mockGame.startDragTrail(object);
            
            const positions = [
                [110, 110], [120, 120], [130, 125], [140, 135], [150, 140]
            ];
            
            positions.forEach(([x, y]) => {
                mockGame.updateDragTrail(object, x, y);
            });
            
            expect(mockParticleEmitter.setPosition).toHaveBeenCalledTimes(6); // 1 start + 5 updates
            expect(mockParticleEmitter.setPosition).toHaveBeenLastCalledWith(150, 140);
        });
    });
    
    describe('Trail Visual Properties', () => {
        test('should configure trail with proper visual effects', () => {
            const object = mockGame.currentObject;
            
            mockGame.startDragTrail(object);
            
            // Check that particles are configured with expected properties
            expect(mockScene.add.particles).toHaveBeenCalledWith(0, 0, 'particle', 
                expect.objectContaining({
                    scale: { start: 0.3, end: 0 },
                    speed: { min: 20, max: 40 },
                    lifespan: 300,
                    blendMode: 'ADD',
                    tint: expect.any(Array)
                })
            );
        });
        
        test('should use colorful tints for trail particles', () => {
            const object = mockGame.currentObject;
            
            mockGame.startDragTrail(object);
            
            // particles.add(x, y, key, config) - config is at index 3
            const particleConfig = mockScene.add.particles.mock.calls[0][3];
            expect(particleConfig.tint).toEqual([0xff6b6b, 0x4ecdc4, 0x45b7d1, 0xf7b731, 0x5f27cd]);
        });
    });
});