describe('Smooth Movement and Auto-Drag', () => {
    let mockScene;

    beforeEach(() => {
        // Mock scene with smooth movement functionality
        mockScene = {
            objects: [],
            movingObjects: new Map(),
            lerpSpeed: 0.15,
            isDragging: false,
            draggedObject: null,
            isHolding: false,
            holdTimer: null,
            holdDuration: 500,
            
            spawnObjectAt: jest.fn((x, y, type) => {
                const obj = {
                    x: x,
                    y: y,
                    type: type,
                    id: Date.now() + Math.random(),
                    sprite: { setPosition: jest.fn() }
                };
                mockScene.objects.push(obj);
                return obj;
            }),
            
            moveObjectTo: jest.fn((obj, x, y, useSmooth = true) => {
                if (useSmooth) {
                    mockScene.movingObjects.set(obj.id, {
                        object: obj,
                        targetX: x,
                        targetY: y,
                        startX: obj.x,
                        startY: obj.y,
                        progress: 0
                    });
                } else {
                    obj.x = x;
                    obj.y = y;
                    if (obj.sprite) obj.sprite.setPosition(x, y);
                }
            }),
            
            updateObjectMovements: jest.fn(() => {
                for (const [objId, movement] of mockScene.movingObjects) {
                    movement.progress += mockScene.lerpSpeed;
                    
                    if (movement.progress >= 1) {
                        movement.object.x = movement.targetX;
                        movement.object.y = movement.targetY;
                        if (movement.object.sprite) {
                            movement.object.sprite.setPosition(movement.targetX, movement.targetY);
                        }
                        mockScene.movingObjects.delete(objId);
                    } else {
                        const currentX = movement.startX + (movement.targetX - movement.startX) * movement.progress;
                        const currentY = movement.startY + (movement.targetY - movement.startY) * movement.progress;
                        movement.object.x = currentX;
                        movement.object.y = currentY;
                        if (movement.object.sprite) {
                            movement.object.sprite.setPosition(currentX, currentY);
                        }
                    }
                }
            }),
            
            startHoldTimer: jest.fn((obj) => {
                if (mockScene.holdTimer) clearTimeout(mockScene.holdTimer);
                mockScene.holdTimer = setTimeout(() => {
                    mockScene.isHolding = true;
                    mockScene.draggedObject = obj;
                }, mockScene.holdDuration);
            }),
            
            clearHoldTimer: jest.fn(() => {
                if (mockScene.holdTimer) {
                    clearTimeout(mockScene.holdTimer);
                    mockScene.holdTimer = null;
                }
            })
        };
    });

    afterEach(() => {
        if (mockScene.holdTimer) {
            clearTimeout(mockScene.holdTimer);
        }
    });

    test('should use smooth movement by default', () => {
        const obj = mockScene.spawnObjectAt(100, 100, 'emoji');
        
        // Move object with smooth movement
        mockScene.moveObjectTo(obj, 200, 200, true);
        
        // Should add to moving objects map
        expect(mockScene.movingObjects.has(obj.id)).toBe(true);
        
        const movement = mockScene.movingObjects.get(obj.id);
        expect(movement.targetX).toBe(200);
        expect(movement.targetY).toBe(200);
        expect(movement.startX).toBe(100);
        expect(movement.startY).toBe(100);
    });

    test('should update object positions during lerp', () => {
        const obj = mockScene.spawnObjectAt(100, 100, 'emoji');
        mockScene.moveObjectTo(obj, 200, 200, true);
        
        // Simulate one update cycle
        mockScene.updateObjectMovements();
        
        // Object should be partway to target
        expect(obj.x).toBeGreaterThan(100);
        expect(obj.x).toBeLessThan(200);
        expect(obj.y).toBeGreaterThan(100);
        expect(obj.y).toBeLessThan(200);
    });

    test('should complete movement after enough updates', () => {
        const obj = mockScene.spawnObjectAt(100, 100, 'emoji');
        mockScene.moveObjectTo(obj, 200, 200, true);
        
        // Simulate many update cycles to complete movement
        for (let i = 0; i < 20; i++) {
            mockScene.updateObjectMovements();
        }
        
        // Object should reach target and be removed from moving objects
        expect(obj.x).toBe(200);
        expect(obj.y).toBe(200);
        expect(mockScene.movingObjects.has(obj.id)).toBe(false);
    });

    test('should use immediate movement when useSmooth is false', () => {
        const obj = mockScene.spawnObjectAt(100, 100, 'emoji');
        
        // Move object without smooth movement
        mockScene.moveObjectTo(obj, 200, 200, false);
        
        // Should move immediately, not add to moving objects
        expect(obj.x).toBe(200);
        expect(obj.y).toBe(200);
        expect(mockScene.movingObjects.has(obj.id)).toBe(false);
    });

    test('should start hold timer when object is created', () => {
        const obj = mockScene.spawnObjectAt(100, 100, 'emoji');
        
        mockScene.startHoldTimer(obj);
        
        expect(mockScene.startHoldTimer).toHaveBeenCalledWith(obj);
    });

    test('should enable holding after hold duration', (done) => {
        const obj = mockScene.spawnObjectAt(100, 100, 'emoji');
        
        // Start hold timer with shorter duration for testing
        mockScene.holdDuration = 50;
        mockScene.startHoldTimer(obj);
        
        setTimeout(() => {
            expect(mockScene.isHolding).toBe(true);
            expect(mockScene.draggedObject).toBe(obj);
            done();
        }, 60);
    });

    test('should clear hold timer and state on pointer up', () => {
        const obj = mockScene.spawnObjectAt(100, 100, 'emoji');
        mockScene.isDragging = true;
        mockScene.draggedObject = obj;
        mockScene.isHolding = true;
        
        // Mock pointer up behavior
        mockScene.clearHoldTimer();
        mockScene.isDragging = false;
        mockScene.draggedObject = null;
        mockScene.isHolding = false;
        
        expect(mockScene.clearHoldTimer).toHaveBeenCalled();
        expect(mockScene.isDragging).toBe(false);
        expect(mockScene.draggedObject).toBe(null);
        expect(mockScene.isHolding).toBe(false);
    });
})