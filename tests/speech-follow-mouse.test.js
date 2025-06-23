describe('Speech Follow Mouse', () => {
    let mockScene;

    beforeEach(() => {
        // Mock scene with speech follow functionality
        mockScene = {
            objects: [],
            isSpeaking: false,
            currentSpeakingObject: null,
            pointerIsDown: false,
            isDragging: false,
            draggedObject: null,
            isHolding: false,
            holdTimer: null,
            
            spawnObjectAt: jest.fn((x, y, type) => {
                const obj = {
                    x: x,
                    y: y,
                    type: type,
                    id: Date.now() + Math.random(),
                    data: { en: 'Test', es: 'Prueba' },
                    sprite: { setPosition: jest.fn() }
                };
                mockScene.objects.push(obj);
                return obj;
            }),
            
            moveObjectTo: jest.fn(),
            generateTone: jest.fn(),
            startHoldTimer: jest.fn(),
            clearHoldTimer: jest.fn(),
            getObjectUnderPointer: jest.fn(),
            
            onPointerDown: jest.fn(),
            onPointerMove: jest.fn(),
            onPointerUp: jest.fn()
        };
    });

    test('should enable speaking object to follow mouse when holding during speech', () => {
        // Set up speaking state
        const obj = mockScene.spawnObjectAt(100, 100, 'emoji');
        mockScene.isSpeaking = true;
        mockScene.currentSpeakingObject = obj;
        
        // Mock pointer down behavior during speech
        mockScene.onPointerDown.mockImplementation((pointer) => {
            mockScene.pointerIsDown = true;
            
            if (mockScene.isSpeaking && mockScene.currentSpeakingObject) {
                mockScene.moveObjectTo(mockScene.currentSpeakingObject, pointer.x, pointer.y, true);
                mockScene.generateTone(pointer.x, pointer.y, mockScene.currentSpeakingObject.id);
                mockScene.startHoldTimer(mockScene.currentSpeakingObject);
            }
        });
        
        // Mock pointer move behavior
        mockScene.onPointerMove.mockImplementation((pointer) => {
            if (mockScene.pointerIsDown && mockScene.isSpeaking && mockScene.currentSpeakingObject) {
                mockScene.moveObjectTo(mockScene.currentSpeakingObject, pointer.x, pointer.y, true);
                mockScene.generateTone(pointer.x, pointer.y, mockScene.currentSpeakingObject.id);
            }
        });

        // Simulate mouse down anywhere during speech
        const initialPointer = { x: 150, y: 150 };
        mockScene.onPointerDown(initialPointer);
        
        // Should move speaking object to pointer location
        expect(mockScene.moveObjectTo).toHaveBeenCalledWith(obj, 150, 150, true);
        expect(mockScene.generateTone).toHaveBeenCalledWith(150, 150, obj.id);
        expect(mockScene.pointerIsDown).toBe(true);

        // Simulate mouse movement while held down
        const movePointer = { x: 200, y: 200 };
        mockScene.onPointerMove(movePointer);
        
        // Should continue following mouse
        expect(mockScene.moveObjectTo).toHaveBeenCalledWith(obj, 200, 200, true);
        expect(mockScene.generateTone).toHaveBeenCalledWith(200, 200, obj.id);
    });

    test('should not follow mouse when pointer is not down', () => {
        // Set up speaking state
        const obj = mockScene.spawnObjectAt(100, 100, 'emoji');
        mockScene.isSpeaking = true;
        mockScene.currentSpeakingObject = obj;
        mockScene.pointerIsDown = false; // Key difference
        
        // Mock pointer move behavior
        mockScene.onPointerMove.mockImplementation((pointer) => {
            if (mockScene.pointerIsDown && mockScene.isSpeaking && mockScene.currentSpeakingObject) {
                mockScene.moveObjectTo(mockScene.currentSpeakingObject, pointer.x, pointer.y, true);
            }
        });

        // Simulate mouse movement without pointer down
        const movePointer = { x: 200, y: 200 };
        mockScene.onPointerMove(movePointer);
        
        // Should NOT move the object
        expect(mockScene.moveObjectTo).not.toHaveBeenCalled();
    });

    test('should not follow mouse when not speaking', () => {
        // Set up non-speaking state
        const obj = mockScene.spawnObjectAt(100, 100, 'emoji');
        mockScene.isSpeaking = false; // Key difference
        mockScene.currentSpeakingObject = null;
        mockScene.pointerIsDown = true;
        
        // Mock pointer move behavior
        mockScene.onPointerMove.mockImplementation((pointer) => {
            if (mockScene.pointerIsDown && mockScene.isSpeaking && mockScene.currentSpeakingObject) {
                mockScene.moveObjectTo(mockScene.currentSpeakingObject, pointer.x, pointer.y, true);
            }
        });

        // Simulate mouse movement with pointer down but no speech
        const movePointer = { x: 200, y: 200 };
        mockScene.onPointerMove(movePointer);
        
        // Should NOT move any object
        expect(mockScene.moveObjectTo).not.toHaveBeenCalled();
    });

    test('should stop following when pointer is released', () => {
        // Set up speaking and following state
        const obj = mockScene.spawnObjectAt(100, 100, 'emoji');
        mockScene.isSpeaking = true;
        mockScene.currentSpeakingObject = obj;
        mockScene.pointerIsDown = true;
        
        // Mock pointer up behavior
        mockScene.onPointerUp.mockImplementation((pointer) => {
            mockScene.pointerIsDown = false;
            mockScene.clearHoldTimer();
        });
        
        // Mock pointer move behavior
        mockScene.onPointerMove.mockImplementation((pointer) => {
            if (mockScene.pointerIsDown && mockScene.isSpeaking && mockScene.currentSpeakingObject) {
                mockScene.moveObjectTo(mockScene.currentSpeakingObject, pointer.x, pointer.y, true);
            }
        });

        // Release pointer
        mockScene.onPointerUp({ x: 200, y: 200 });
        
        expect(mockScene.pointerIsDown).toBe(false);
        expect(mockScene.clearHoldTimer).toHaveBeenCalled();

        // Simulate mouse movement after release
        const movePointer = { x: 300, y: 300 };
        mockScene.onPointerMove(movePointer);
        
        // Should NOT move the object after release
        expect(mockScene.moveObjectTo).not.toHaveBeenCalled();
    });

    test('should work even when clicking in empty space during speech', () => {
        // Set up speaking state
        const obj = mockScene.spawnObjectAt(100, 100, 'emoji');
        mockScene.isSpeaking = true;
        mockScene.currentSpeakingObject = obj;
        
        // Mock hitting empty space (no object under pointer)
        mockScene.getObjectUnderPointer.mockReturnValue(null);
        
        // Mock pointer down behavior during speech
        mockScene.onPointerDown.mockImplementation((pointer) => {
            mockScene.pointerIsDown = true;
            const hitObject = mockScene.getObjectUnderPointer(pointer.x, pointer.y);
            
            if (!hitObject && mockScene.isSpeaking && mockScene.currentSpeakingObject) {
                // Clicking empty space during speech should still enable following
                mockScene.moveObjectTo(mockScene.currentSpeakingObject, pointer.x, pointer.y, true);
                mockScene.startHoldTimer(mockScene.currentSpeakingObject);
            }
        });

        // Click in empty space during speech
        const pointer = { x: 250, y: 250 };
        mockScene.onPointerDown(pointer);
        
        // Should move speaking object to click location
        expect(mockScene.moveObjectTo).toHaveBeenCalledWith(obj, 250, 250, true);
        expect(mockScene.startHoldTimer).toHaveBeenCalledWith(obj);
    });
})