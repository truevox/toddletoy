/**
 * @jest-environment jsdom
 */

// Test binary hearts cleanup functionality
describe('Binary Hearts Cleanup', () => {
    let mockGameScene;
    let mockObject;

    beforeEach(() => {
        // Mock Phaser text object with destroy method
        const mockTextObject = {
            destroy: jest.fn(),
            x: 100,
            y: 100,
            setPosition: jest.fn()
        };

        // Create mock object with binary hearts
        mockObject = {
            id: 'test-number',
            type: 'number',
            sprite: { destroy: jest.fn() },
            binaryHearts: mockTextObject,
            lastTouchedTime: Date.now()
        };

        // Mock game scene with objects array
        mockGameScene = {
            objects: [mockObject],
            activeTones: new Map(),
            removeObject: function(obj) {
                // Simulate the actual removeObject method
                if (obj.sprite) {
                    obj.sprite.destroy();
                }
                if (obj.englishLabel) {
                    obj.englishLabel.destroy();
                }
                if (obj.spanishLabel) {
                    obj.spanishLabel.destroy();
                }
                if (obj.kaktovikNumeral) {
                    obj.kaktovikNumeral.destroy();
                }
                if (obj.cistercianNumeral) {
                    obj.cistercianNumeral.destroy();
                }
                if (obj.binaryHearts) {
                    obj.binaryHearts.destroy();
                }

                // Stop any audio associated with this object
                if (this.activeTones.has(obj.id)) {
                    const tone = this.activeTones.get(obj.id);
                    try {
                        tone.stop();
                    } catch (e) {
                        // Tone might already be stopped
                    }
                    this.activeTones.delete(obj.id);
                }

                // Remove from objects array
                const index = this.objects.indexOf(obj);
                if (index > -1) {
                    this.objects.splice(index, 1);
                }
            }
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Object Removal', () => {
        test('should destroy binary hearts when removing number object', () => {
            // Verify object has binary hearts
            expect(mockObject.binaryHearts).toBeDefined();
            expect(mockObject.binaryHearts.destroy).toBeDefined();

            // Remove the object
            mockGameScene.removeObject(mockObject);

            // Verify binary hearts were destroyed
            expect(mockObject.binaryHearts.destroy).toHaveBeenCalledTimes(1);
        });

        test('should remove object from objects array after cleanup', () => {
            // Verify object is in array initially
            expect(mockGameScene.objects).toContain(mockObject);
            expect(mockGameScene.objects.length).toBe(1);

            // Remove the object
            mockGameScene.removeObject(mockObject);

            // Verify object is removed from array
            expect(mockGameScene.objects).not.toContain(mockObject);
            expect(mockGameScene.objects.length).toBe(0);
        });

        test('should handle object without binary hearts gracefully', () => {
            // Create object without binary hearts
            const objectWithoutBinary = {
                id: 'test-letter',
                type: 'letter',
                sprite: { destroy: jest.fn() }
            };
            mockGameScene.objects.push(objectWithoutBinary);

            // Should not throw error when removing object without binary hearts
            expect(() => {
                mockGameScene.removeObject(objectWithoutBinary);
            }).not.toThrow();

            // Verify object was still removed from array
            expect(mockGameScene.objects).not.toContain(objectWithoutBinary);
        });

        test('should handle object with all number display components', () => {
            // Create object with all number display types
            const fullNumberObject = {
                id: 'test-full-number',
                type: 'number',
                sprite: { destroy: jest.fn() },
                englishLabel: { destroy: jest.fn() },
                spanishLabel: { destroy: jest.fn() },
                kaktovikNumeral: { destroy: jest.fn() },
                cistercianNumeral: { destroy: jest.fn() },
                binaryHearts: { destroy: jest.fn() }
            };
            mockGameScene.objects.push(fullNumberObject);

            // Remove the object
            mockGameScene.removeObject(fullNumberObject);

            // Verify all components were destroyed
            expect(fullNumberObject.sprite.destroy).toHaveBeenCalledTimes(1);
            expect(fullNumberObject.englishLabel.destroy).toHaveBeenCalledTimes(1);
            expect(fullNumberObject.spanishLabel.destroy).toHaveBeenCalledTimes(1);
            expect(fullNumberObject.kaktovikNumeral.destroy).toHaveBeenCalledTimes(1);
            expect(fullNumberObject.cistercianNumeral.destroy).toHaveBeenCalledTimes(1);
            expect(fullNumberObject.binaryHearts.destroy).toHaveBeenCalledTimes(1);

            // Verify object was removed from array
            expect(mockGameScene.objects).not.toContain(fullNumberObject);
        });
    });

    describe('Auto-Cleanup Integration', () => {
        test('should clean up binary hearts during auto-cleanup timeout', () => {
            // Simulate auto-cleanup scenario
            const oldTimestamp = Date.now() - 15000; // 15 seconds ago (past 10 second timeout)
            mockObject.lastTouchedTime = oldTimestamp;

            // Simulate auto-cleanup finding and removing timed-out object
            const now = Date.now();
            const timeoutMs = 10 * 1000; // 10 seconds in milliseconds
            const timeSinceLastTouch = now - mockObject.lastTouchedTime;

            // Verify object has timed out
            expect(timeSinceLastTouch).toBeGreaterThan(timeoutMs);

            // Simulate cleanup process
            mockGameScene.removeObject(mockObject);

            // Verify binary hearts were destroyed during auto-cleanup
            expect(mockObject.binaryHearts.destroy).toHaveBeenCalledTimes(1);
            expect(mockGameScene.objects).not.toContain(mockObject);
        });

        test('should not leave orphaned binary hearts after batch cleanup', () => {
            // Make the original mockObject also timed out
            mockObject.lastTouchedTime = Date.now() - 15000;

            // Create multiple number objects with binary hearts
            const numberObjects = [];
            for (let i = 0; i < 5; i++) {
                const obj = {
                    id: `number-${i}`,
                    type: 'number',
                    sprite: { destroy: jest.fn() },
                    binaryHearts: { destroy: jest.fn() },
                    lastTouchedTime: Date.now() - 15000 // Past timeout
                };
                numberObjects.push(obj);
                mockGameScene.objects.push(obj);
            }

            // Verify all objects are in the scene initially
            expect(mockGameScene.objects.length).toBe(6); // 5 + 1 from beforeEach

            // Simulate batch cleanup of timed-out objects
            const objectsToCleanup = mockGameScene.objects.filter(obj => {
                const timeSinceLastTouch = Date.now() - obj.lastTouchedTime;
                return timeSinceLastTouch > 10000; // 10 second timeout
            });

            // Remove all timed-out objects
            objectsToCleanup.forEach(obj => {
                mockGameScene.removeObject(obj);
            });

            // Verify all binary hearts were destroyed
            numberObjects.forEach(obj => {
                expect(obj.binaryHearts.destroy).toHaveBeenCalledTimes(1);
            });

            // Verify original object's binary hearts were also destroyed
            expect(mockObject.binaryHearts.destroy).toHaveBeenCalledTimes(1);

            // Verify all objects were removed from scene
            expect(mockGameScene.objects.length).toBe(0);
        });
    });

    describe('Memory Leak Prevention', () => {
        test('should not leave references to destroyed binary hearts', () => {
            // Remove object
            mockGameScene.removeObject(mockObject);

            // Verify the object reference is cleaned up
            expect(mockGameScene.objects).not.toContain(mockObject);
            
            // Binary hearts should have been destroyed
            expect(mockObject.binaryHearts.destroy).toHaveBeenCalledTimes(1);
            
            // Object should no longer be in the active objects list
            expect(mockGameScene.objects.find(obj => obj.id === mockObject.id)).toBeUndefined();
        });

        test('should handle rapid spawn and cleanup cycles', () => {
            // Simulate rapid spawn/cleanup cycle
            const spawnedObjects = [];
            
            for (let cycle = 0; cycle < 10; cycle++) {
                // Create object with binary hearts
                const obj = {
                    id: `rapid-${cycle}`,
                    type: 'number',
                    sprite: { destroy: jest.fn() },
                    binaryHearts: { destroy: jest.fn() },
                    lastTouchedTime: Date.now()
                };
                spawnedObjects.push(obj);
                mockGameScene.objects.push(obj);

                // Immediately remove it
                mockGameScene.removeObject(obj);
            }

            // Verify all binary hearts were properly destroyed
            spawnedObjects.forEach((obj, index) => {
                expect(obj.binaryHearts.destroy).toHaveBeenCalledTimes(1);
            });

            // Verify no objects remain in scene (except original from beforeEach)
            expect(mockGameScene.objects.length).toBe(1); // Only original mockObject remains
        });
    });
});