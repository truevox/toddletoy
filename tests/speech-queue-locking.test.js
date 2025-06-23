describe('Speech Queue Locking', () => {
    let mockScene;
    let mockSpeechSynthesis;

    beforeEach(() => {
        // Mock speech synthesis
        mockSpeechSynthesis = {
            speak: jest.fn(),
            cancel: jest.fn()
        };
        global.speechSynthesis = mockSpeechSynthesis;
        global.SpeechSynthesisUtterance = jest.fn();

        // Mock scene with speech locking functionality
        mockScene = {
            objects: [],
            isSpeaking: false,
            currentSpeakingObject: null,
            currentSpeech: null,
            spawnObjectAt: jest.fn((x, y, type) => {
                const obj = {
                    x: x,
                    y: y,
                    type: type,
                    id: Date.now(),
                    data: { en: 'Test', es: 'Prueba' },
                    sprite: { setPosition: jest.fn() }
                };
                mockScene.objects.push(obj);
                return obj;
            }),
            displayTextLabels: jest.fn(),
            generateTone: jest.fn(),
            createSpawnBurst: jest.fn(),
            moveObjectTo: jest.fn(),
            getObjectUnderPointer: jest.fn(),
            speakObjectLabel: jest.fn((obj, lang) => {
                mockScene.isSpeaking = true;
                mockScene.currentSpeakingObject = obj;
            }),
            onPointerDown: jest.fn(),
            onKeyDown: jest.fn(),
            onGamepadButtonDown: jest.fn()
        };
    });

    test('should prevent spawning new objects while speech is active', () => {
        // Set up speaking state
        const obj1 = mockScene.spawnObjectAt(100, 100, 'emoji');
        mockScene.isSpeaking = true;
        mockScene.currentSpeakingObject = obj1;

        // Mock the pointer down behavior with speech locking
        mockScene.onPointerDown.mockImplementation((pointer) => {
            const hitObject = mockScene.getObjectUnderPointer(pointer.x, pointer.y);
            
            if (hitObject) {
                // Handle dragging (not relevant for this test)
                return;
            } else if (!mockScene.isSpeaking) {
                // Spawn new object only if not speaking
                const obj = mockScene.spawnObjectAt(pointer.x, pointer.y, 'random');
                mockScene.displayTextLabels(obj);
                mockScene.speakObjectLabel(obj, 'both');
            } else if (mockScene.currentSpeakingObject) {
                // Move the currently speaking object instead
                mockScene.moveObjectTo(mockScene.currentSpeakingObject, pointer.x, pointer.y);
            }
        });

        const initialObjectCount = mockScene.objects.length;

        // Try to spawn during speech
        const mockPointer = { x: 200, y: 200 };
        mockScene.onPointerDown(mockPointer);

        // Should not spawn new object
        expect(mockScene.objects).toHaveLength(initialObjectCount);
        // Should move the existing speaking object instead
        expect(mockScene.moveObjectTo).toHaveBeenCalledWith(obj1, 200, 200);
    });

    test('should allow spawning after speech completes', () => {
        // Start with speaking state
        const obj1 = mockScene.spawnObjectAt(100, 100, 'emoji');
        mockScene.isSpeaking = true;
        mockScene.currentSpeakingObject = obj1;

        // Mock speech completion
        mockScene.isSpeaking = false;
        mockScene.currentSpeakingObject = null;

        // Mock the pointer down behavior
        mockScene.onPointerDown.mockImplementation((pointer) => {
            if (!mockScene.isSpeaking) {
                const obj = mockScene.spawnObjectAt(pointer.x, pointer.y, 'random');
                mockScene.displayTextLabels(obj);
                mockScene.speakObjectLabel(obj, 'both');
            }
        });

        const initialObjectCount = mockScene.objects.length;

        // Try to spawn after speech completes
        const mockPointer = { x: 200, y: 200 };
        mockScene.onPointerDown(mockPointer);

        // Should spawn new object
        expect(mockScene.objects).toHaveLength(initialObjectCount + 1);
        expect(mockScene.displayTextLabels).toHaveBeenCalled();
        expect(mockScene.speakObjectLabel).toHaveBeenCalled();
    });

    test('should move speaking object during keyboard input while speaking', () => {
        // Set up speaking state
        const obj1 = mockScene.spawnObjectAt(100, 100, 'emoji');
        mockScene.isSpeaking = true;
        mockScene.currentSpeakingObject = obj1;

        // Mock keyboard handler with speech locking
        mockScene.onKeyDown.mockImplementation((event) => {
            const position = { x: 150, y: 150 }; // Mock key position
            
            if (!mockScene.isSpeaking) {
                const obj = mockScene.spawnObjectAt(position.x, position.y, 'random');
                mockScene.speakObjectLabel(obj, 'both');
            } else if (mockScene.currentSpeakingObject) {
                mockScene.moveObjectTo(mockScene.currentSpeakingObject, position.x, position.y);
            }
        });

        const initialObjectCount = mockScene.objects.length;

        // Simulate key press during speech
        mockScene.onKeyDown({ code: 'KeyA' });

        // Should not spawn new object
        expect(mockScene.objects).toHaveLength(initialObjectCount);
        // Should move the speaking object
        expect(mockScene.moveObjectTo).toHaveBeenCalledWith(obj1, 150, 150);
    });

    test('should move speaking object during gamepad input while speaking', () => {
        // Set up speaking state
        const obj1 = mockScene.spawnObjectAt(100, 100, 'emoji');
        mockScene.isSpeaking = true;
        mockScene.currentSpeakingObject = obj1;

        // Mock gamepad handler with speech locking
        mockScene.onGamepadButtonDown.mockImplementation((gamepad, buttonIndex) => {
            const position = { x: 250, y: 250 }; // Mock gamepad position
            
            if (!mockScene.isSpeaking) {
                const obj = mockScene.spawnObjectAt(position.x, position.y, 'random');
                mockScene.speakObjectLabel(obj, 'both');
            } else if (mockScene.currentSpeakingObject) {
                mockScene.moveObjectTo(mockScene.currentSpeakingObject, position.x, position.y);
            }
        });

        const initialObjectCount = mockScene.objects.length;

        // Simulate gamepad button press during speech
        mockScene.onGamepadButtonDown({}, 0);

        // Should not spawn new object
        expect(mockScene.objects).toHaveLength(initialObjectCount);
        // Should move the speaking object
        expect(mockScene.moveObjectTo).toHaveBeenCalledWith(obj1, 250, 250);
    });
})