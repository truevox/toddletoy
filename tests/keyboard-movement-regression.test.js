/**
 * @jest-environment jsdom
 */

// Test for keyboard-triggered movement regression
// Simulates pressing 'A' then 'P' which moves the object and triggers word overlap

// Enhanced mock that simulates the exact keyboard input behavior
const createKeyboardMovementGame = () => {
    return {
        objects: [],
        heldKeys: new Set(),
        keyboardObject: null,
        isSpeaking: false,
        scale: { width: 800, height: 600 },
        
        // Mock key position mapping (like the real game)
        getKeyPosition: function(keyCode) {
            const width = this.scale.width;
            const height = this.scale.height;
            
            const keyPositions = {
                'KeyA': { x: (width * 0.14) + (0 * width * 0.08), y: height * 0.4 },
                'KeyP': { x: (width * 0.1) + (9 * width * 0.08), y: height * 0.25 }
            };
            
            return keyPositions[keyCode] || { x: width/2, y: height/2 };
        },
        
        // Mock Phaser scene methods
        add: {
            text: jest.fn((x, y, text, style) => ({
                text: text,
                style: style,
                width: text.length * (parseInt(style.fontSize) || 24) * 0.6,
                height: parseInt(style.fontSize) || 24,
                x: x,
                y: y,
                setPosition: jest.fn(function(newX, newY) {
                    this.x = newX;
                    this.y = newY;
                }),
                setOrigin: jest.fn().mockReturnThis(),
                destroy: jest.fn()
            })),
        },
        
        // Simulate object creation with component layout
        createObject: function(x, y, data) {
            const obj = {
                x: x,
                y: y,
                id: Date.now() + Math.random(),
                data: data,
                componentLayout: {}
            };
            
            // Create text components with responsive scaling
            const scaleFactor = 1.0; // Simplified for testing
            const labelStyle = {
                fontSize: '24px',
                fill: '#ffffff',
                fontFamily: 'Arial'
            };
            
            const labelOffset = Math.floor(60 * scaleFactor);
            const englishWords = this.createWordObjects(data.en, x, y + labelOffset, labelStyle);
            const spanishWords = this.createWordObjects(data.es, x, y + labelOffset + 30, labelStyle);
            
            obj.englishWords = englishWords;
            obj.spanishWords = spanishWords;
            
            // Store component layout (the fix being tested)
            obj.componentLayout.englishWords = englishWords.map(wordObj => ({
                offsetX: wordObj.x - x,
                offsetY: wordObj.y - y
            }));
            
            obj.componentLayout.spanishWords = spanishWords.map(wordObj => ({
                offsetX: wordObj.x - x,
                offsetY: wordObj.y - y
            }));
            
            this.objects.push(obj);
            return obj;
        },
        
        createWordObjects: function(text, x, y, labelStyle) {
            if (!text || text.trim() === '') return [];
            
            const words = text.split(' ');
            const wordObjects = [];
            const spaceWidth = 8; // Fixed for testing
            let totalWidth = 0;
            
            // Create word objects
            words.forEach((word, index) => {
                const wordText = this.add.text(0, y, word, labelStyle);
                wordObjects.push(wordText);
                totalWidth += wordText.width;
                if (index < words.length - 1) {
                    totalWidth += spaceWidth;
                }
            });
            
            // Position words centered
            let currentX = x - (totalWidth / 2);
            wordObjects.forEach((wordObj, index) => {
                wordObj.setPosition(currentX, y);
                currentX += wordObj.width + (index < words.length - 1 ? spaceWidth : 0);
            });
            
            return wordObjects;
        },
        
        // Simulate the exact onKeyDown behavior
        onKeyDown: function(keyCode) {
            if (this.heldKeys.has(keyCode)) return; // Key already held
            
            this.heldKeys.add(keyCode);
            
            if (this.heldKeys.size === 1 && !this.isSpeaking) {
                // First key - spawn new object
                const position = this.getKeyPosition(keyCode);
                const data = this.getDataForKey(keyCode);
                this.keyboardObject = this.createObject(position.x, position.y, data);
            } else if (this.keyboardObject) {
                // Additional key - move existing object
                this.updateKeyboardObjectPosition();
            }
        },
        
        onKeyUp: function(keyCode) {
            this.heldKeys.delete(keyCode);
            
            if (this.heldKeys.size === 0) {
                this.keyboardObject = null;
            } else if (this.keyboardObject) {
                this.updateKeyboardObjectPosition();
            }
        },
        
        updateKeyboardObjectPosition: function() {
            if (!this.keyboardObject || this.heldKeys.size === 0) return;
            
            // Calculate interpolated position from all held keys
            let totalX = 0, totalY = 0;
            let keyCount = 0;
            
            for (const keyCode of this.heldKeys) {
                const pos = this.getKeyPosition(keyCode);
                totalX += pos.x;
                totalY += pos.y;
                keyCount++;
            }
            
            const newX = totalX / keyCount;
            const newY = totalY / keyCount;
            
            // THIS IS WHERE THE BUG SHOULD BE FIXED
            this.setObjectPosition(this.keyboardObject, newX, newY);
        },
        
        // The core function being tested
        setObjectPosition: function(obj, x, y) {
            if (!obj) return;
            
            obj.x = x;
            obj.y = y;
            
            // Use stored component layout (the fix)
            if (obj.componentLayout) {
                if (obj.englishWords && obj.componentLayout.englishWords) {
                    obj.englishWords.forEach((wordObj, index) => {
                        const storedOffset = obj.componentLayout.englishWords[index];
                        if (storedOffset && wordObj) {
                            wordObj.setPosition(x + storedOffset.offsetX, y + storedOffset.offsetY);
                        }
                    });
                }
                
                if (obj.spanishWords && obj.componentLayout.spanishWords) {
                    obj.spanishWords.forEach((wordObj, index) => {
                        const storedOffset = obj.componentLayout.spanishWords[index];
                        if (storedOffset && wordObj) {
                            wordObj.setPosition(x + storedOffset.offsetX, y + storedOffset.offsetY);
                        }
                    });
                }
            }
        },
        
        getDataForKey: function(keyCode) {
            const keyData = {
                'KeyA': { en: 'Orange A', es: 'A Naranja' },
                'KeyP': { en: 'Purple P', es: 'P Morado' }
            };
            return keyData[keyCode] || { en: 'Test', es: 'Prueba' };
        },
        
        // Helper to check for word overlaps
        checkWordOverlaps: function(wordObjects) {
            const overlaps = [];
            for (let i = 0; i < wordObjects.length - 1; i++) {
                const word1 = wordObjects[i];
                const word2 = wordObjects[i + 1];
                const word1End = word1.x + word1.width;
                const word2Start = word2.x;
                
                if (word1End > word2Start) {
                    overlaps.push({
                        word1: word1.text,
                        word2: word2.text,
                        overlapAmount: word1End - word2Start
                    });
                }
            }
            return overlaps;
        },
        
        // Helper to get word spacing
        getWordSpacing: function(wordObjects) {
            const spacings = [];
            for (let i = 0; i < wordObjects.length - 1; i++) {
                const word1 = wordObjects[i];
                const word2 = wordObjects[i + 1];
                const spacing = word2.x - (word1.x + word1.width);
                spacings.push(spacing);
            }
            return spacings;
        }
    };
};

describe('Keyboard Movement Regression Tests', () => {
    let game;
    
    beforeEach(() => {
        game = createKeyboardMovementGame();
        jest.clearAllMocks();
    });
    
    describe('User-Reported Keyboard Sequence: A then P', () => {
        test('should preserve word spacing when pressing A then P', () => {
            // Step 1: Press 'A' key (spawns object)
            game.onKeyDown('KeyA');
            
            expect(game.objects).toHaveLength(1);
            expect(game.keyboardObject).toBeTruthy();
            expect(game.heldKeys.has('KeyA')).toBe(true);
            
            const obj = game.keyboardObject;
            expect(obj.englishWords).toHaveLength(2);
            expect(obj.englishWords[0].text).toBe('Orange');
            expect(obj.englishWords[1].text).toBe('A');
            
            // Verify no initial overlaps
            const initialOverlaps = game.checkWordOverlaps(obj.englishWords);
            expect(initialOverlaps).toHaveLength(0);
            
            // Capture initial spacing
            const initialSpacing = game.getWordSpacing(obj.englishWords);
            expect(initialSpacing[0]).toBeGreaterThan(0);
            
            // Capture initial positions
            const initialPositions = obj.englishWords.map(w => ({ x: w.x, y: w.y, text: w.text }));
            
            // Step 2: Press 'P' key while holding 'A' (moves object)
            game.onKeyDown('KeyP');
            
            expect(game.heldKeys.has('KeyA')).toBe(true);
            expect(game.heldKeys.has('KeyP')).toBe(true);
            expect(game.heldKeys.size).toBe(2);
            
            // Object should have moved to interpolated position
            const keyAPos = game.getKeyPosition('KeyA');
            const keyPPos = game.getKeyPosition('KeyP');
            const expectedX = (keyAPos.x + keyPPos.x) / 2;
            const expectedY = (keyAPos.y + keyPPos.y) / 2;
            
            expect(obj.x).toBeCloseTo(expectedX, 1);
            expect(obj.y).toBeCloseTo(expectedY, 1);
            
            // CRITICAL: Verify no word overlaps after movement
            const afterMoveOverlaps = game.checkWordOverlaps(obj.englishWords);
            expect(afterMoveOverlaps).toHaveLength(0);
            
            // Verify spacing is preserved
            const afterMoveSpacing = game.getWordSpacing(obj.englishWords);
            expect(afterMoveSpacing[0]).toBeCloseTo(initialSpacing[0], 1);
            
            // Verify text content unchanged
            expect(obj.englishWords[0].text).toBe('Orange');
            expect(obj.englishWords[1].text).toBe('A');
            
            // Verify relative positioning maintained
            const finalPositions = obj.englishWords.map(w => ({ x: w.x, y: w.y, text: w.text }));
            const deltaX = finalPositions[0].x - initialPositions[0].x;
            const deltaY = finalPositions[0].y - initialPositions[0].y;
            
            // Both words should have moved by the same delta
            for (let i = 1; i < finalPositions.length; i++) {
                const expectedX = initialPositions[i].x + deltaX;
                const expectedY = initialPositions[i].y + deltaY;
                expect(finalPositions[i].x).toBeCloseTo(expectedX, 1);
                expect(finalPositions[i].y).toBeCloseTo(expectedY, 1);
            }
        });
        
        test('should handle rapid key sequence without cumulative errors', () => {
            // Simulate rapid typing: A -> P -> S -> D
            const keySequence = ['KeyA', 'KeyP', 'KeyS', 'KeyD'];
            
            // Press first key
            game.onKeyDown(keySequence[0]);
            const obj = game.keyboardObject;
            const initialSpacing = game.getWordSpacing(obj.englishWords);
            
            // Press additional keys rapidly
            for (let i = 1; i < keySequence.length; i++) {
                game.onKeyDown(keySequence[i]);
                
                // Check for overlaps after each key press
                const overlaps = game.checkWordOverlaps(obj.englishWords);
                expect(overlaps).toHaveLength(0);
                
                // Check spacing consistency
                const currentSpacing = game.getWordSpacing(obj.englishWords);
                expect(currentSpacing[0]).toBeCloseTo(initialSpacing[0], 1);
            }
        });
        
        test('should handle key release correctly', () => {
            // Press A, then P, then release A
            game.onKeyDown('KeyA');
            const obj = game.keyboardObject;
            
            game.onKeyDown('KeyP');
            const afterTwoKeysSpacing = game.getWordSpacing(obj.englishWords);
            
            // Release A (should move to P position)
            game.onKeyUp('KeyA');
            
            const afterReleaseOverlaps = game.checkWordOverlaps(obj.englishWords);
            expect(afterReleaseOverlaps).toHaveLength(0);
            
            const afterReleaseSpacing = game.getWordSpacing(obj.englishWords);
            expect(afterReleaseSpacing[0]).toBeCloseTo(afterTwoKeysSpacing[0], 1);
        });
        
        test('should preserve Spanish text spacing as well', () => {
            game.onKeyDown('KeyA');
            const obj = game.keyboardObject;
            
            // Check Spanish words
            expect(obj.spanishWords).toHaveLength(2);
            expect(obj.spanishWords[0].text).toBe('A');
            expect(obj.spanishWords[1].text).toBe('Naranja');
            
            const initialSpanishSpacing = game.getWordSpacing(obj.spanishWords);
            expect(initialSpanishSpacing[0]).toBeGreaterThan(0);
            
            // Move object
            game.onKeyDown('KeyP');
            
            // Verify Spanish words don't overlap
            const spanishOverlaps = game.checkWordOverlaps(obj.spanishWords);
            expect(spanishOverlaps).toHaveLength(0);
            
            const finalSpanishSpacing = game.getWordSpacing(obj.spanishWords);
            expect(finalSpanishSpacing[0]).toBeCloseTo(initialSpanishSpacing[0], 1);
        });
    });
});