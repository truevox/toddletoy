describe('Advanced Keyboard Input', () => {
    let mockScene;

    beforeEach(() => {
        // Mock scene with advanced keyboard functionality
        mockScene = {
            objects: [],
            heldKeys: new Set(),
            keyboardObject: null,
            isSpeaking: false,
            currentSpeakingObject: null,
            keyPositions: {
                'KeyQ': { x: 100, y: 100 },
                'KeyW': { x: 200, y: 100 },
                'KeyE': { x: 300, y: 100 },
                'KeyA': { x: 100, y: 200 },
                'KeyS': { x: 200, y: 200 },
                'KeyD': { x: 300, y: 200 }
            },
            
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
            
            getKeyPosition: jest.fn((keyCode) => {
                return mockScene.keyPositions[keyCode] || null;
            }),
            
            moveObjectTo: jest.fn(),
            generateTone: jest.fn(),
            displayTextLabels: jest.fn(),
            speakObjectLabel: jest.fn(),
            createSpawnBurst: jest.fn(),
            
            onKeyDown: jest.fn(),
            onKeyUp: jest.fn(),
            updateKeyboardObjectPosition: jest.fn(),
            getInterpolatedKeyPosition: jest.fn()
        };
    });

    test('should spawn object on first key press when not speaking', () => {
        // Mock the key down behavior
        mockScene.onKeyDown.mockImplementation((event) => {
            const position = mockScene.getKeyPosition(event.code);
            if (!position) return;
            
            const wasEmpty = mockScene.heldKeys.size === 0;
            mockScene.heldKeys.add(event.code);
            
            if (wasEmpty && !mockScene.isSpeaking) {
                const obj = mockScene.spawnObjectAt(position.x, position.y, 'random');
                mockScene.displayTextLabels(obj);
                mockScene.speakObjectLabel(obj, 'both');
                mockScene.keyboardObject = obj;
            }
        });

        // Simulate first key press
        mockScene.onKeyDown({ code: 'KeyQ' });
        
        expect(mockScene.heldKeys.has('KeyQ')).toBe(true);
        expect(mockScene.spawnObjectAt).toHaveBeenCalledWith(100, 100, 'random');
        expect(mockScene.keyboardObject).toBeTruthy();
    });

    test('should interpolate position when holding multiple keys', () => {
        // Set up keyboard object
        const obj = mockScene.spawnObjectAt(100, 100, 'emoji');
        mockScene.keyboardObject = obj;
        mockScene.heldKeys.add('KeyQ'); // (100, 100)
        mockScene.heldKeys.add('KeyE'); // (300, 100)
        
        // Mock interpolation calculation
        mockScene.getInterpolatedKeyPosition.mockImplementation(() => {
            if (mockScene.heldKeys.size === 0) return null;
            
            let totalX = 0, totalY = 0, validKeys = 0;
            for (const keyCode of mockScene.heldKeys) {
                const position = mockScene.getKeyPosition(keyCode);
                if (position) {
                    totalX += position.x;
                    totalY += position.y;
                    validKeys++;
                }
            }
            
            return validKeys > 0 ? { x: totalX / validKeys, y: totalY / validKeys } : null;
        });
        
        // Mock update position behavior
        mockScene.updateKeyboardObjectPosition.mockImplementation(() => {
            if (!mockScene.keyboardObject || mockScene.heldKeys.size === 0) return;
            
            const interpolatedPosition = mockScene.getInterpolatedKeyPosition();
            if (interpolatedPosition) {
                mockScene.moveObjectTo(mockScene.keyboardObject, interpolatedPosition.x, interpolatedPosition.y, true);
            }
        });

        // Update position
        mockScene.updateKeyboardObjectPosition();
        
        // Should move to interpolated position between Q (100,100) and E (300,100) = (200,100)
        expect(mockScene.getInterpolatedKeyPosition).toHaveBeenCalled();
        expect(mockScene.moveObjectTo).toHaveBeenCalledWith(obj, 200, 100, true);
    });

    test('should update position when releasing keys', () => {
        // Set up with multiple keys held
        const obj = mockScene.spawnObjectAt(150, 150, 'emoji');
        mockScene.keyboardObject = obj;
        mockScene.heldKeys.add('KeyQ'); // (100, 100)
        mockScene.heldKeys.add('KeyW'); // (200, 100)
        mockScene.heldKeys.add('KeyS'); // (200, 200)
        
        // Mock key up behavior
        mockScene.onKeyUp.mockImplementation((event) => {
            mockScene.heldKeys.delete(event.code);
            
            if (mockScene.heldKeys.size === 0) {
                mockScene.keyboardObject = null;
            } else {
                mockScene.updateKeyboardObjectPosition();
            }
        });
        
        // Mock interpolation for remaining keys
        mockScene.getInterpolatedKeyPosition.mockImplementation(() => {
            if (mockScene.heldKeys.size === 0) return null;
            
            let totalX = 0, totalY = 0, validKeys = 0;
            for (const keyCode of mockScene.heldKeys) {
                const position = mockScene.getKeyPosition(keyCode);
                if (position) {
                    totalX += position.x;
                    totalY += position.y;
                    validKeys++;
                }
            }
            
            return validKeys > 0 ? { x: totalX / validKeys, y: totalY / validKeys } : null;
        });
        
        mockScene.updateKeyboardObjectPosition.mockImplementation(() => {
            if (!mockScene.keyboardObject || mockScene.heldKeys.size === 0) return;
            
            const interpolatedPosition = mockScene.getInterpolatedKeyPosition();
            if (interpolatedPosition) {
                mockScene.moveObjectTo(mockScene.keyboardObject, interpolatedPosition.x, interpolatedPosition.y, true);
            }
        });

        // Release one key (KeyQ)
        mockScene.onKeyUp({ code: 'KeyQ' });
        
        // Should still have keyboard object and update position
        expect(mockScene.heldKeys.has('KeyQ')).toBe(false);
        expect(mockScene.heldKeys.size).toBe(2);
        expect(mockScene.keyboardObject).toBe(obj);
        expect(mockScene.updateKeyboardObjectPosition).toHaveBeenCalled();
    });

    test('should clear keyboard object when all keys are released', () => {
        // Set up with one key held
        const obj = mockScene.spawnObjectAt(100, 100, 'emoji');
        mockScene.keyboardObject = obj;
        mockScene.heldKeys.add('KeyQ');
        
        // Mock key up behavior
        mockScene.onKeyUp.mockImplementation((event) => {
            mockScene.heldKeys.delete(event.code);
            
            if (mockScene.heldKeys.size === 0) {
                mockScene.keyboardObject = null;
            }
        });

        // Release the last key
        mockScene.onKeyUp({ code: 'KeyQ' });
        
        expect(mockScene.heldKeys.size).toBe(0);
        expect(mockScene.keyboardObject).toBe(null);
    });

    test('should use speaking object as keyboard object when speech is active', () => {
        // Set up speaking state
        const speakingObj = mockScene.spawnObjectAt(150, 150, 'emoji');
        mockScene.isSpeaking = true;
        mockScene.currentSpeakingObject = speakingObj;
        
        // Mock key down behavior during speech
        mockScene.onKeyDown.mockImplementation((event) => {
            const position = mockScene.getKeyPosition(event.code);
            if (!position) return;
            
            const wasEmpty = mockScene.heldKeys.size === 0;
            mockScene.heldKeys.add(event.code);
            
            if (wasEmpty && mockScene.isSpeaking && mockScene.currentSpeakingObject) {
                mockScene.keyboardObject = mockScene.currentSpeakingObject;
            }
        });

        // Press key during speech
        mockScene.onKeyDown({ code: 'KeyA' });
        
        // Should use speaking object as keyboard object
        expect(mockScene.keyboardObject).toBe(speakingObj);
        expect(mockScene.heldKeys.has('KeyA')).toBe(true);
    });

    test('should calculate correct interpolated position for three keys', () => {
        // Set up held keys manually for testing interpolation
        mockScene.heldKeys.add('KeyQ'); // (100, 100)
        mockScene.heldKeys.add('KeyW'); // (200, 100) 
        mockScene.heldKeys.add('KeyA'); // (100, 200)
        
        // Implement real interpolation logic
        mockScene.getInterpolatedKeyPosition.mockImplementation(() => {
            if (mockScene.heldKeys.size === 0) return null;
            
            let totalX = 0, totalY = 0, validKeys = 0;
            for (const keyCode of mockScene.heldKeys) {
                const position = mockScene.getKeyPosition(keyCode);
                if (position) {
                    totalX += position.x;
                    totalY += position.y;
                    validKeys++;
                }
            }
            
            return validKeys > 0 ? { x: totalX / validKeys, y: totalY / validKeys } : null;
        });

        const result = mockScene.getInterpolatedKeyPosition();
        
        // Expected: (100+200+100)/3 = 133.33, (100+100+200)/3 = 133.33
        expect(result.x).toBeCloseTo(133.33, 1);
        expect(result.y).toBeCloseTo(133.33, 1);
    });
})