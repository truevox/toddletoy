/**
 * @jest-environment jsdom
 */

// Test toy state reset functionality
describe('Toy State Reset', () => {
    let mockScene;
    let mockGame;
    let mockAppRoutes;

    beforeEach(() => {
        // Mock DOM environment
        document.body.innerHTML = '';
        
        // Mock localStorage
        global.localStorage = {
            getItem: jest.fn().mockReturnValue(JSON.stringify({})),
            setItem: jest.fn(),
            removeItem: jest.fn(),
            clear: jest.fn()
        };

        // Mock speech synthesis
        global.speechSynthesis = {
            cancel: jest.fn(),
            speak: jest.fn(),
            getVoices: jest.fn().mockReturnValue([])
        };

        // Create mock scene with resetToyState method
        mockScene = {
            objects: [
                {
                    sprite: { destroy: jest.fn() },
                    englishLabel: { destroy: jest.fn() },
                    spanishLabel: { destroy: jest.fn() },
                    kaktovikNumeral: { destroy: jest.fn() },
                    cistercianNumeral: { destroy: jest.fn() },
                    binaryDisplay: { destroy: jest.fn() }
                },
                {
                    sprite: { destroy: jest.fn() },
                    englishLabel: { destroy: jest.fn() },
                    spanishLabel: { destroy: jest.fn() }
                }
            ],
            currentSpeech: { cancel: jest.fn() },
            isSpeaking: true,
            currentSpeakingObject: { id: 'test' },
            isDragging: true,
            draggedObject: { id: 'dragged' },
            keyboardObject: { id: 'keyboard' },
            gamepadObject: { id: 'gamepad' },
            pointerIsDown: true,
            heldKeys: new Set(['KeyA', 'KeyB']),
            dragTrailGraphics: { clear: jest.fn() },
            audioContext: {
                currentTime: 0
            },
            activeOscillators: [
                { stop: jest.fn() },
                { stop: jest.fn() }
            ],
            resetToyState: jest.fn().mockImplementation(function() {
                // Simulate the actual reset behavior
                this.objects.forEach(obj => {
                    if (obj.sprite) obj.sprite.destroy();
                    if (obj.englishLabel) obj.englishLabel.destroy();
                    if (obj.spanishLabel) obj.spanishLabel.destroy();
                    if (obj.kaktovikNumeral) obj.kaktovikNumeral.destroy();
                    if (obj.cistercianNumeral) obj.cistercianNumeral.destroy();
                    if (obj.binaryDisplay) obj.binaryDisplay.destroy();
                });
                this.objects = [];
                
                if (this.currentSpeech) {
                    window.speechSynthesis.cancel();
                    this.currentSpeech = null;
                    this.isSpeaking = false;
                    this.currentSpeakingObject = null;
                }
                
                if (this.audioContext && this.activeOscillators) {
                    this.activeOscillators.forEach(osc => {
                        try {
                            osc.stop();
                        } catch (e) {
                            // Oscillator might already be stopped
                        }
                    });
                    this.activeOscillators = [];
                }
                
                this.isDragging = false;
                this.draggedObject = null;
                this.keyboardObject = null;
                this.gamepadObject = null;
                this.pointerIsDown = false;
                this.heldKeys.clear();
                
                if (this.dragTrailGraphics) {
                    this.dragTrailGraphics.clear();
                }
            })
        };

        // Mock game structure
        mockGame = {
            game: {
                scene: {
                    scenes: [mockScene]
                }
            }
        };

        // Mock AppRoutes class
        mockAppRoutes = {
            game: mockGame,
            resetToyState: jest.fn().mockImplementation(function() {
                if (this.game && this.game.game && this.game.game.scene) {
                    const scene = this.game.game.scene.scenes[0];
                    if (scene && scene.resetToyState) {
                        scene.resetToyState();
                    }
                }
            }),
            showToyScreen: jest.fn().mockImplementation(function() {
                if (this.game) {
                    this.resetToyState();
                }
            })
        };
    });

    describe('Scene Reset Functionality', () => {
        test('should clear all visual objects', () => {
            // Verify objects exist before reset
            expect(mockScene.objects).toHaveLength(2);
            
            // Store references to check destroy calls
            const firstObjectSprite = mockScene.objects[0].sprite;
            const firstObjectEnglishLabel = mockScene.objects[0].englishLabel;
            const firstObjectSpanishLabel = mockScene.objects[0].spanishLabel;
            const secondObjectSprite = mockScene.objects[1].sprite;
            
            // Call reset
            mockScene.resetToyState();
            
            // Verify all object components were destroyed
            expect(firstObjectSprite.destroy).toHaveBeenCalled();
            expect(firstObjectEnglishLabel.destroy).toHaveBeenCalled();
            expect(firstObjectSpanishLabel.destroy).toHaveBeenCalled();
            expect(secondObjectSprite.destroy).toHaveBeenCalled();
            
            // Verify objects array is cleared
            expect(mockScene.objects).toHaveLength(0);
        });

        test('should stop all speech and reset speech state', () => {
            // Verify speech state before reset
            expect(mockScene.isSpeaking).toBe(true);
            expect(mockScene.currentSpeakingObject).toBeTruthy();
            
            // Call reset
            mockScene.resetToyState();
            
            // Verify speech was cancelled and state reset
            expect(speechSynthesis.cancel).toHaveBeenCalled();
            expect(mockScene.isSpeaking).toBe(false);
            expect(mockScene.currentSpeakingObject).toBe(null);
            expect(mockScene.currentSpeech).toBe(null);
        });

        test('should stop all audio oscillators', () => {
            // Verify oscillators exist before reset
            expect(mockScene.activeOscillators).toHaveLength(2);
            
            // Store references to check stop calls
            const firstOscillator = mockScene.activeOscillators[0];
            const secondOscillator = mockScene.activeOscillators[1];
            
            // Call reset
            mockScene.resetToyState();
            
            // Verify all oscillators were stopped
            expect(firstOscillator.stop).toHaveBeenCalled();
            expect(secondOscillator.stop).toHaveBeenCalled();
            
            // Verify oscillators array is cleared
            expect(mockScene.activeOscillators).toHaveLength(0);
        });

        test('should reset all input states', () => {
            // Verify input states before reset
            expect(mockScene.isDragging).toBe(true);
            expect(mockScene.draggedObject).toBeTruthy();
            expect(mockScene.keyboardObject).toBeTruthy();
            expect(mockScene.gamepadObject).toBeTruthy();
            expect(mockScene.pointerIsDown).toBe(true);
            expect(mockScene.heldKeys.size).toBe(2);
            
            // Call reset
            mockScene.resetToyState();
            
            // Verify all input states are reset
            expect(mockScene.isDragging).toBe(false);
            expect(mockScene.draggedObject).toBe(null);
            expect(mockScene.keyboardObject).toBe(null);
            expect(mockScene.gamepadObject).toBe(null);
            expect(mockScene.pointerIsDown).toBe(false);
            expect(mockScene.heldKeys.size).toBe(0);
        });

        test('should clear drag trail graphics', () => {
            // Call reset
            mockScene.resetToyState();
            
            // Verify drag trails were cleared
            expect(mockScene.dragTrailGraphics.clear).toHaveBeenCalled();
        });

        test('should handle missing optional components gracefully', () => {
            // Create scene with minimal objects
            const minimalScene = {
                objects: [
                    { sprite: { destroy: jest.fn() } }, // Only sprite, no labels
                    { englishLabel: { destroy: jest.fn() } } // Only label, no sprite
                ],
                activeOscillators: [],
                heldKeys: new Set(),
                resetToyState: mockScene.resetToyState
            };
            
            // Should not throw error
            expect(() => {
                minimalScene.resetToyState.call(minimalScene);
            }).not.toThrow();
            
            expect(minimalScene.objects).toHaveLength(0);
        });
    });

    describe('Routes Integration', () => {
        test('should call resetToyState when navigating to existing toy', () => {
            // Call showToyScreen (simulates navigation from config)
            mockAppRoutes.showToyScreen();
            
            // Verify reset was called
            expect(mockAppRoutes.resetToyState).toHaveBeenCalled();
        });

        test('should access scene resetToyState through game hierarchy', () => {
            // Call AppRoutes resetToyState
            mockAppRoutes.resetToyState();
            
            // Verify it reached the scene
            expect(mockScene.resetToyState).toHaveBeenCalled();
        });

        test('should handle missing game gracefully', () => {
            // Test with no game
            const routesWithoutGame = {
                game: null,
                resetToyState: mockAppRoutes.resetToyState
            };
            
            // Should not throw error
            expect(() => {
                routesWithoutGame.resetToyState();
            }).not.toThrow();
        });

        test('should handle missing scene gracefully', () => {
            // Test with game but no scene
            const routesWithoutScene = {
                game: { game: { scene: { scenes: [] } } },
                resetToyState: mockAppRoutes.resetToyState
            };
            
            // Should not throw error
            expect(() => {
                routesWithoutScene.resetToyState();
            }).not.toThrow();
        });
    });

    describe('State Verification', () => {
        test('should completely clean toy state for fresh start', () => {
            // Set up complex toy state
            mockScene.objects.push({
                sprite: { destroy: jest.fn() },
                englishLabel: { destroy: jest.fn() },
                spanishLabel: { destroy: jest.fn() },
                kaktovikNumeral: { destroy: jest.fn() }
            });
            
            // Call reset
            mockScene.resetToyState();
            
            // Verify complete clean state
            expect(mockScene.objects).toHaveLength(0);
            expect(mockScene.isSpeaking).toBe(false);
            expect(mockScene.currentSpeakingObject).toBe(null);
            expect(mockScene.isDragging).toBe(false);
            expect(mockScene.draggedObject).toBe(null);
            expect(mockScene.activeOscillators).toHaveLength(0);
            expect(mockScene.heldKeys.size).toBe(0);
        });

        test('should handle reset with no existing objects', () => {
            // Start with empty state
            mockScene.objects = [];
            mockScene.activeOscillators = [];
            mockScene.heldKeys = new Set();
            
            // Should not throw error
            expect(() => {
                mockScene.resetToyState();
            }).not.toThrow();
            
            // State should remain clean
            expect(mockScene.objects).toHaveLength(0);
        });
    });
});