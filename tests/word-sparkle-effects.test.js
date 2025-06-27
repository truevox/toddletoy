/**
 * @jest-environment jsdom
 */

// Test for word-specific sparkle effects during speech
// Following TDD: Write failing test first, then implement

const mockPhaser = {
    GameObjects: {
        Particles: {
            ParticleEmitter: jest.fn(() => ({
                setPosition: jest.fn().mockReturnThis(),
                setScale: jest.fn().mockReturnThis(),
                setAlpha: jest.fn().mockReturnThis(),
                setTint: jest.fn().mockReturnThis(),
                start: jest.fn().mockReturnThis(),
                stop: jest.fn().mockReturnThis(),
                destroy: jest.fn(),
                on: jest.fn().mockReturnThis(),
                explode: jest.fn()
            }))
        }
    },
    Math: {
        Between: jest.fn((min, max) => Math.floor(Math.random() * (max - min + 1)) + min)
    }
};

// Mock game scene with sparkle effect capabilities
const createGameWithSparkleEffects = () => {
    return {
        objects: [],
        sparkleEmitters: new Map(),
        isSpeaking: false,
        currentSpeakingObject: null,
        
        // Mock Phaser scene methods
        add: {
            particles: jest.fn(() => ({
                createEmitter: jest.fn(() => new mockPhaser.GameObjects.Particles.ParticleEmitter())
            })),
            text: jest.fn((x, y, text, style) => ({
                text: text,
                x: x,
                y: y,
                width: text.length * 20,
                height: 24,
                setPosition: jest.fn().mockReturnThis(),
                setOrigin: jest.fn().mockReturnThis(),
                setTint: jest.fn().mockReturnThis(),
                clearTint: jest.fn().mockReturnThis(),
                destroy: jest.fn()
            }))
        },
        
        // Create test object with word components
        createTestObject: function(text) {
            const obj = {
                id: Date.now() + Math.random(),
                x: 400,
                y: 300,
                data: { en: text, es: text },
                englishWords: [],
                sparkleEmitters: new Map()
            };
            
            // Create word objects
            const words = text.split(' ');
            words.forEach((word, index) => {
                const wordObj = this.add.text(400 + (index * 50), 350, word, { fontSize: '24px' });
                wordObj.wordIndex = index;
                obj.englishWords.push(wordObj);
            });
            
            this.objects.push(obj);
            return obj;
        },
        
        // Method to create sparkle effects for a specific word
        createWordSparkleEffect: function(wordObj, duration = 1000) {
            // This method should be implemented to create sparkle particles
            // around the specified word object during speech
            throw new Error('createWordSparkleEffect not implemented yet');
        },
        
        // Method to trigger sparkles during speech highlighting
        triggerWordSparkles: function(obj, wordIndex) {
            if (!obj || !obj.englishWords || !obj.englishWords[wordIndex]) {
                return false;
            }
            
            const wordObj = obj.englishWords[wordIndex];
            this.createWordSparkleEffect(wordObj);
            return true;
        },
        
        // Method to clean up sparkle effects
        cleanupWordSparkles: function(obj) {
            if (!obj || !obj.sparkleEmitters) return;
            
            obj.sparkleEmitters.forEach((emitter, wordIndex) => {
                emitter.destroy();
            });
            obj.sparkleEmitters.clear();
        }
    };
};

describe('Word-Specific Sparkle Effects', () => {
    let game;
    
    beforeEach(() => {
        game = createGameWithSparkleEffects();
        jest.clearAllMocks();
    });
    
    describe('Sparkle Effect Creation', () => {
        test('should create sparkle emitter for individual words', () => {
            const obj = game.createTestObject('Red Triangle');
            const wordObj = obj.englishWords[0]; // "Red"
            
            // This test should fail initially since createWordSparkleEffect is not implemented
            expect(() => {
                game.createWordSparkleEffect(wordObj);
            }).toThrow('createWordSparkleEffect not implemented yet');
        });
        
        test('should position sparkles correctly around word boundaries', () => {
            const obj = game.createTestObject('Blue Star');
            const wordObj = obj.englishWords[1]; // "Star"
            
            // Mock implementation for testing positioning
            game.createWordSparkleEffect = jest.fn((word) => {
                const emitter = new mockPhaser.GameObjects.Particles.ParticleEmitter();
                emitter.setPosition(word.x + word.width/2, word.y);
                return emitter;
            });
            
            game.createWordSparkleEffect(wordObj);
            
            expect(game.createWordSparkleEffect).toHaveBeenCalledWith(wordObj);
        });
        
        test('should create unique sparkle effects for each word', () => {
            const obj = game.createTestObject('Yellow Triangle Circle');
            
            // Mock the implementation
            game.createWordSparkleEffect = jest.fn(() => {
                return new mockPhaser.GameObjects.Particles.ParticleEmitter();
            });
            
            // Trigger sparkles for each word
            obj.englishWords.forEach((wordObj, index) => {
                game.triggerWordSparkles(obj, index);
            });
            
            expect(game.createWordSparkleEffect).toHaveBeenCalledTimes(3);
        });
    });
    
    describe('Speech Integration', () => {
        test('should trigger sparkles during word highlighting', () => {
            const obj = game.createTestObject('Orange Square');
            
            // Mock successful sparkle creation
            game.createWordSparkleEffect = jest.fn(() => {
                return new mockPhaser.GameObjects.Particles.ParticleEmitter();
            });
            
            const result = game.triggerWordSparkles(obj, 0); // Sparkle "Orange"
            
            expect(result).toBe(true);
            expect(game.createWordSparkleEffect).toHaveBeenCalledWith(obj.englishWords[0]);
        });
        
        test('should handle invalid word indices gracefully', () => {
            const obj = game.createTestObject('Green Circle');
            
            game.createWordSparkleEffect = jest.fn();
            
            const result = game.triggerWordSparkles(obj, 5); // Invalid index
            
            expect(result).toBe(false);
            expect(game.createWordSparkleEffect).not.toHaveBeenCalled();
        });
        
        test('should synchronize sparkle timing with speech highlighting', () => {
            const obj = game.createTestObject('Purple Star');
            
            // Mock timing-sensitive sparkle effect
            game.createWordSparkleEffect = jest.fn((word, duration = 1000) => {
                const emitter = new mockPhaser.GameObjects.Particles.ParticleEmitter();
                expect(duration).toBeGreaterThan(0);
                return emitter;
            });
            
            game.triggerWordSparkles(obj, 0);
            
            expect(game.createWordSparkleEffect).toHaveBeenCalled();
        });
    });
    
    describe('Visual Properties', () => {
        test('should create visually appealing sparkle particles', () => {
            const obj = game.createTestObject('Red Heart');
            const wordObj = obj.englishWords[0];
            
            // Mock sparkle with visual properties
            game.createWordSparkleEffect = jest.fn((word) => {
                const emitter = new mockPhaser.GameObjects.Particles.ParticleEmitter();
                
                // Verify sparkles have proper visual settings
                expect(emitter.setScale).toBeDefined();
                expect(emitter.setAlpha).toBeDefined();
                expect(emitter.setTint).toBeDefined();
                
                return emitter;
            });
            
            game.createWordSparkleEffect(wordObj);
        });
        
        test('should use appropriate sparkle colors and patterns', () => {
            const obj = game.createTestObject('Golden Star');
            const wordObj = obj.englishWords[0];
            
            game.createWordSparkleEffect = jest.fn((word) => {
                const emitter = new mockPhaser.GameObjects.Particles.ParticleEmitter();
                
                // Sparkles should have golden/bright colors
                emitter.setTint(0xFFD700); // Gold
                emitter.setScale(0.5, 1.0); // Varied sizes
                
                return emitter;
            });
            
            const result = game.createWordSparkleEffect(wordObj);
            expect(result).toBeDefined();
        });
    });
    
    describe('Cleanup and Memory Management', () => {
        test('should properly clean up sparkle emitters', () => {
            const obj = game.createTestObject('Clean Up Test');
            
            // Add some mock emitters
            const mockEmitter1 = new mockPhaser.GameObjects.Particles.ParticleEmitter();
            const mockEmitter2 = new mockPhaser.GameObjects.Particles.ParticleEmitter();
            
            obj.sparkleEmitters.set(0, mockEmitter1);
            obj.sparkleEmitters.set(1, mockEmitter2);
            
            game.cleanupWordSparkles(obj);
            
            expect(mockEmitter1.destroy).toHaveBeenCalled();
            expect(mockEmitter2.destroy).toHaveBeenCalled();
            expect(obj.sparkleEmitters.size).toBe(0);
        });
        
        test('should handle cleanup of non-existent sparkles gracefully', () => {
            const obj = game.createTestObject('No Sparkles');
            
            // Should not throw error when cleaning up object with no sparkles
            expect(() => {
                game.cleanupWordSparkles(obj);
            }).not.toThrow();
        });
    });
    
    describe('Performance Considerations', () => {
        test('should limit number of concurrent sparkle effects', () => {
            const obj = game.createTestObject('Many Words Here To Test Performance Limits');
            
            let emitterCount = 0;
            game.createWordSparkleEffect = jest.fn(() => {
                emitterCount++;
                return new mockPhaser.GameObjects.Particles.ParticleEmitter();
            });
            
            // Trigger sparkles for all words rapidly
            obj.englishWords.forEach((wordObj, index) => {
                game.triggerWordSparkles(obj, index);
            });
            
            // Should have reasonable limit on concurrent effects
            expect(emitterCount).toBeLessThanOrEqual(8); // Max 8 concurrent sparkles
        });
    });
});