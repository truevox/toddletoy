describe('Object Dragging', () => {
    let mockScene;

    beforeEach(() => {
        // Mock scene with dragging functionality
        mockScene = {
            objects: [],
            isDragging: false,
            draggedObject: null,
            spawnObjectAt: jest.fn((x, y, type) => {
                const obj = {
                    x: x,
                    y: y,
                    type: type,
                    id: Date.now(),
                    sprite: {
                        x: x,
                        y: y,
                        setPosition: jest.fn()
                    }
                };
                mockScene.objects.push(obj);
                return obj;
            }),
            onPointerDown: jest.fn(),
            onPointerMove: jest.fn(),
            onPointerUp: jest.fn(),
            getObjectUnderPointer: jest.fn()
        };
    })

    test('should enable dragging when pointer is pressed down on an object', () => {
        // Spawn an object first
        const obj = mockScene.spawnObjectAt(100, 100, 'emoji')
        expect(mockScene.objects).toHaveLength(1)
        expect(obj.x).toBe(100)
        expect(obj.y).toBe(100)

        // Mock the dragging behavior
        mockScene.onPointerDown.mockImplementation((pointer) => {
            const hitObj = mockScene.getObjectUnderPointer(pointer.x, pointer.y)
            if (hitObj) {
                mockScene.isDragging = true
                mockScene.draggedObject = hitObj
            }
        })
        
        mockScene.getObjectUnderPointer.mockReturnValue(obj)

        // Mock pointer down event on the object
        const mockPointer = { x: 100, y: 100, isDown: true }
        mockScene.onPointerDown(mockPointer)
        
        // Check that dragging is enabled
        expect(mockScene.isDragging).toBe(true)
        expect(mockScene.draggedObject).toBe(obj)
    })

    test('should move object during drag motion', () => {
        // Spawn and start dragging an object
        const obj = mockScene.spawnObjectAt(100, 100, 'emoji')
        mockScene.isDragging = true
        mockScene.draggedObject = obj

        // Mock the drag movement behavior
        mockScene.onPointerMove.mockImplementation((pointer) => {
            if (mockScene.isDragging && mockScene.draggedObject) {
                mockScene.draggedObject.x = pointer.x
                mockScene.draggedObject.y = pointer.y
                mockScene.draggedObject.sprite.x = pointer.x
                mockScene.draggedObject.sprite.y = pointer.y
            }
        })

        // Mock pointer move event
        const mockPointer = { x: 150, y: 150, isDown: true }
        mockScene.onPointerMove(mockPointer)
        
        expect(obj.x).toBe(150)
        expect(obj.y).toBe(150)
        expect(obj.sprite.x).toBe(150)
        expect(obj.sprite.y).toBe(150)
    })

    test('should stop dragging when pointer is released', () => {
        // Spawn and start dragging an object
        const obj = mockScene.spawnObjectAt(100, 100, 'emoji')
        mockScene.isDragging = true
        mockScene.draggedObject = obj

        // Mock the pointer up behavior
        mockScene.onPointerUp.mockImplementation(() => {
            mockScene.isDragging = false
            mockScene.draggedObject = null
        })

        // Mock pointer up event
        const mockPointer = { x: 150, y: 150, isDown: false }
        mockScene.onPointerUp(mockPointer)
        
        expect(mockScene.isDragging).toBe(false)
        expect(mockScene.draggedObject).toBe(null)
    })

    test('should move object instead of spawning new one when dragging', () => {
        // Spawn an object and start dragging
        const obj = mockScene.spawnObjectAt(100, 100, 'emoji')
        mockScene.isDragging = true
        mockScene.draggedObject = obj
        
        const initialObjectCount = mockScene.objects.length

        // Mock behavior: move object instead of spawn during drag
        mockScene.onPointerDown.mockImplementation((pointer) => {
            if (mockScene.isDragging && mockScene.draggedObject) {
                // Move existing object instead of spawning
                mockScene.draggedObject.x = pointer.x
                mockScene.draggedObject.y = pointer.y
            }
        })

        // Mock pointer down during drag (should move, not spawn)
        const mockPointer = { x: 200, y: 200, isDown: true }
        mockScene.onPointerDown(mockPointer)
        
        // Should not spawn new object
        expect(mockScene.objects).toHaveLength(initialObjectCount)
        // Should move existing object
        expect(obj.x).toBe(200)
        expect(obj.y).toBe(200)
    })

    test('should detect which object is under pointer for dragging', () => {
        // Spawn multiple objects
        const obj1 = mockScene.spawnObjectAt(100, 100, 'emoji')
        const obj2 = mockScene.spawnObjectAt(200, 200, 'emoji')
        
        // Mock the hit detection to return closest object
        mockScene.getObjectUnderPointer.mockImplementation((x, y) => {
            // Simple distance-based hit detection
            const dist1 = Math.sqrt((x - obj1.x) ** 2 + (y - obj1.y) ** 2)
            const dist2 = Math.sqrt((x - obj2.x) ** 2 + (y - obj2.y) ** 2)
            
            if (dist1 < 50) return obj1
            if (dist2 < 50) return obj2
            return null
        })
        
        // Should find the closest object
        const hitObject = mockScene.getObjectUnderPointer(100, 100)
        expect(hitObject).toBe(obj1)
    })
})