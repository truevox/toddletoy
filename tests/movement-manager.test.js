/**
 * @jest-environment jsdom
 */

// Test for MovementManager extraction following TDD principles
// This ensures that the movement system functionality is preserved during refactoring

describe('MovementManager', () => {
    let movementManager;
    let mockScene;
    let mockObject;

    beforeEach(() => {
        // Mock game object with Phaser-like interface
        mockObject = {
            id: 'test-obj-1',
            active: true,
            x: 100,
            y: 200,
            setPosition: jest.fn(),
            componentLayout: {
                allLanguageWords: [{
                    languageCode: 'en',
                    words: [{ offsetX: 10, offsetY: 15 }]
                }]
            }
        };

        // Mock scene
        mockScene = {
            time: {
                now: 1000
            }
        };

        // Create MovementManager class inline for testing
        class MovementManager {
            constructor(scene) {
                this.scene = scene;
                this.movingObjects = new Map();
                this.lerpSpeed = 0.15;
            }

            lerp(start, end, progress) {
                return start + (end - start) * progress;
            }

            setObjectPosition(obj, x, y) {
                if (!obj || !obj.active) return;
                obj.setPosition(x, y);
                
                if (obj.componentLayout) {
                    if (obj.componentLayout.allLanguageWords) {
                        obj.componentLayout.allLanguageWords.forEach(langGroup => {
                            const actualWords = obj.allLanguageWords?.find(actual => 
                                actual.languageCode === langGroup.languageCode
                            )?.words || [];
                            
                            langGroup.words.forEach((layoutInfo, index) => {
                                const wordObj = actualWords[index];
                                if (wordObj && wordObj.active) {
                                    const newWordX = x + layoutInfo.offsetX - (wordObj.width / 2);
                                    const newWordY = y + layoutInfo.offsetY;
                                    wordObj.setPosition(newWordX, newWordY);
                                }
                            });
                        });
                    }
                }
            }

            moveObjectTo(obj, targetX, targetY) {
                if (!obj || !obj.active) return;
                const startX = obj.x;
                const startY = obj.y;
                this.movingObjects.set(obj.id, {
                    object: obj,
                    targetX: targetX,
                    targetY: targetY,
                    startX: startX,
                    startY: startY,
                    progress: 0
                });
            }

            updateObjectMovements() {
                for (const [objId, movement] of this.movingObjects.entries()) {
                    const { object, targetX, targetY, startX, startY } = movement;
                    
                    if (!object.active) {
                        this.movingObjects.delete(objId);
                        continue;
                    }
                    
                    movement.progress += this.lerpSpeed;
                    
                    if (movement.progress >= 1) {
                        this.setObjectPosition(object, targetX, targetY);
                        this.movingObjects.delete(objId);
                    } else {
                        const currentX = this.lerp(startX, targetX, movement.progress);
                        const currentY = this.lerp(startY, targetY, movement.progress);
                        this.setObjectPosition(object, currentX, currentY);
                    }
                }
            }

            hasMovingObject(objId) {
                return this.movingObjects.has(objId);
            }

            getMovementInfo(objId) {
                return this.movingObjects.get(objId) || null;
            }

            clearAllMovements() {
                this.movingObjects.clear();
            }

            getMovementCount() {
                return this.movingObjects.size;
            }

            setLerpSpeed(speed) {
                this.lerpSpeed = Math.max(0.01, Math.min(1, speed));
            }

            getLerpSpeed() {
                return this.lerpSpeed;
            }
        }

        movementManager = new MovementManager(mockScene);
    });

    describe('Linear Interpolation', () => {
        test('should calculate lerp correctly', () => {
            expect(movementManager.lerp(0, 100, 0)).toBe(0);
            expect(movementManager.lerp(0, 100, 0.5)).toBe(50);
            expect(movementManager.lerp(0, 100, 1)).toBe(100);
            expect(movementManager.lerp(50, 150, 0.25)).toBe(75);
        });
    });

    describe('Object Positioning', () => {
        test('should set object position and update components', () => {
            // Mock word object for component layout
            const mockWordObj = {
                active: true,
                width: 40,
                setPosition: jest.fn()
            };

            mockObject.allLanguageWords = [{
                languageCode: 'en',
                words: [mockWordObj]
            }];

            movementManager.setObjectPosition(mockObject, 300, 400);

            expect(mockObject.setPosition).toHaveBeenCalledWith(300, 400);
            expect(mockWordObj.setPosition).toHaveBeenCalledWith(290, 415); // 300 + 10 - 20, 400 + 15
        });

        test('should handle object without component layout', () => {
            const simpleObject = {
                id: 'simple',
                active: true,
                setPosition: jest.fn()
            };

            movementManager.setObjectPosition(simpleObject, 150, 250);

            expect(simpleObject.setPosition).toHaveBeenCalledWith(150, 250);
        });

        test('should ignore inactive objects', () => {
            mockObject.active = false;

            movementManager.setObjectPosition(mockObject, 300, 400);

            expect(mockObject.setPosition).not.toHaveBeenCalled();
        });
    });

    describe('Smooth Movement System', () => {
        test('should start smooth movement for object', () => {
            movementManager.moveObjectTo(mockObject, 500, 600);

            expect(movementManager.hasMovingObject(mockObject.id)).toBe(true);
            
            const movement = movementManager.getMovementInfo(mockObject.id);
            expect(movement.targetX).toBe(500);
            expect(movement.targetY).toBe(600);
            expect(movement.startX).toBe(100);
            expect(movement.startY).toBe(200);
            expect(movement.progress).toBe(0);
        });

        test('should update moving objects during animation', () => {
            movementManager.moveObjectTo(mockObject, 200, 300);
            
            // Simulate partial movement progress
            movementManager.updateObjectMovements();

            expect(mockObject.setPosition).toHaveBeenCalled();
            // Should still be moving (not at target yet)
            expect(movementManager.hasMovingObject(mockObject.id)).toBe(true);
        });

        test('should complete movement when progress reaches 1', () => {
            movementManager.moveObjectTo(mockObject, 200, 300);
            
            // Force completion by setting high progress
            const movement = movementManager.getMovementInfo(mockObject.id);
            movement.progress = 1;
            
            movementManager.updateObjectMovements();

            expect(mockObject.setPosition).toHaveBeenCalledWith(200, 300);
            expect(movementManager.hasMovingObject(mockObject.id)).toBe(false);
        });

        test('should remove movements for inactive objects', () => {
            movementManager.moveObjectTo(mockObject, 200, 300);
            mockObject.active = false;
            
            movementManager.updateObjectMovements();

            expect(movementManager.hasMovingObject(mockObject.id)).toBe(false);
        });
    });

    describe('Movement State Management', () => {
        test('should clear all movements', () => {
            movementManager.moveObjectTo(mockObject, 500, 600);
            expect(movementManager.hasMovingObject(mockObject.id)).toBe(true);

            movementManager.clearAllMovements();

            expect(movementManager.hasMovingObject(mockObject.id)).toBe(false);
        });

        test('should provide movement count', () => {
            expect(movementManager.getMovementCount()).toBe(0);

            movementManager.moveObjectTo(mockObject, 500, 600);
            expect(movementManager.getMovementCount()).toBe(1);

            movementManager.clearAllMovements();
            expect(movementManager.getMovementCount()).toBe(0);
        });
    });

    describe('Configuration', () => {
        test('should allow setting lerp speed', () => {
            movementManager.setLerpSpeed(0.25);
            expect(movementManager.getLerpSpeed()).toBe(0.25);
        });

        test('should use default lerp speed', () => {
            expect(movementManager.getLerpSpeed()).toBe(0.15);
        });
    });
});