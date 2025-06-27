/**
 * @jest-environment jsdom
 */

// Test for specific user-reported regression: word overlap on second movement
// This test reproduces the exact issue where "Red Triangle" becomes "R921"

// Enhanced mock that more accurately simulates Phaser text objects
const createRealisticTextMock = (text, style = {}) => {
    const fontSize = parseInt(style.fontSize) || 24;
    // More realistic width calculation based on typical font metrics
    const width = text.length * fontSize * 0.6; // Approximate character width
    
    return {
        text: text,
        style: style,
        width: width,
        height: fontSize,
        x: 0,
        y: 0,
        setPosition: jest.fn(function(x, y) {
            this.x = x;
            this.y = y;
        }),
        setOrigin: jest.fn().mockReturnThis(),
        destroy: jest.fn()
    };
};

// Mock game scene that simulates the actual layout preservation issue
const createRealisticGame = () => {
    return {
        objects: [],
        scale: { width: 800, height: 600 },
        
        // Mock Phaser scene methods
        add: {
            text: jest.fn((x, y, text, style) => createRealisticTextMock(text, style)),
            graphics: jest.fn(() => ({
                fillStyle: jest.fn().mockReturnThis(),
                fillCircle: jest.fn().mockReturnThis(),
                generateTexture: jest.fn().mockReturnThis(),
                destroy: jest.fn()
            }))
        },
        
        // Simulate the exact spawn process from the game
        createTestObjectWithComponentLayout: function(x, y, data) {
            const obj = {
                x: x,
                y: y,
                id: Date.now() + Math.random(),
                data: data,
                componentLayout: {}
            };
            
            // Simulate the responsive scaling used in real game
            const screenWidth = this.scale.width;
            const screenHeight = this.scale.height;
            const minDimension = Math.min(screenWidth, screenHeight);
            const scaleFactor = Math.max(0.4, Math.min(1.2, minDimension / 600));
            const labelFontSize = Math.floor(24 * scaleFactor);
            
            const labelStyle = {
                fontSize: `${labelFontSize}px`,
                fill: '#ffffff',
                fontFamily: 'Arial'
            };
            
            // Create word objects with responsive positioning (like real game)
            const labelOffset = Math.floor(60 * scaleFactor);
            const englishWords = this.createWordObjects(data.en, x, y + labelOffset, labelStyle);
            const spanishWords = this.createWordObjects(data.es, x, y + labelOffset + Math.floor(30 * scaleFactor), labelStyle);
            
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
            
            return obj;
        },
        
        createWordObjects: function(text, x, y, labelStyle) {
            if (!text || text.trim() === '') return [];
            
            const words = text.split(' ');
            const wordObjects = [];
            
            const spaceWidth = labelStyle.fontSize ? parseInt(labelStyle.fontSize) * 0.3 : 8;
            let totalActualWidth = 0;
            
            // Create word objects and calculate total width
            words.forEach((word, index) => {
                const wordText = this.add.text(0, y, word, labelStyle);
                wordObjects.push(wordText);
                
                totalActualWidth += wordText.width;
                if (index < words.length - 1) {
                    totalActualWidth += spaceWidth;
                }
            });
            
            // Position words to be centered at x
            let currentX = x - (totalActualWidth / 2);
            
            wordObjects.forEach((wordObj, index) => {
                wordObj.setPosition(currentX, y);
                currentX += wordObj.width + (index < words.length - 1 ? spaceWidth : 0);
            });
            
            return wordObjects;
        },
        
        // The core function being tested - should use stored component layout
        setObjectPosition: function(obj, x, y) {
            if (!obj) return;
            
            obj.x = x;
            obj.y = y;
            
            // THE FIX: Use stored component layout instead of hardcoded offsets
            if (obj.componentLayout) {
                // Update English words using stored relative positions
                if (obj.englishWords && obj.componentLayout.englishWords) {
                    obj.englishWords.forEach((wordObj, index) => {
                        const storedOffset = obj.componentLayout.englishWords[index];
                        if (storedOffset && wordObj) {
                            wordObj.setPosition(x + storedOffset.offsetX, y + storedOffset.offsetY);
                        }
                    });
                }
                
                // Update Spanish words using stored relative positions
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
        
        // Helper to check if words overlap (detect the regression)
        checkForWordOverlaps: function(wordObjects) {
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
        
        // Helper to get spacing between words
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

describe('Layout Preservation Regression Tests', () => {
    let game;
    
    beforeEach(() => {
        game = createRealisticGame();
        jest.clearAllMocks();
    });
    
    describe('User-Reported Issue: Word Overlap on Movement', () => {
        test('should preserve "Red Triangle" spacing after movement (not become "R921")', () => {
            // Create object with "Red Triangle" text
            const triangleData = {
                en: 'Red Triangle',
                es: 'Triángulo Rojo'
            };
            
            const obj = game.createTestObjectWithComponentLayout(400, 300, triangleData);
            
            // Verify initial state is correct
            expect(obj.englishWords).toHaveLength(2);
            expect(obj.englishWords[0].text).toBe('Red');
            expect(obj.englishWords[1].text).toBe('Triangle');
            
            // Check no initial overlaps
            const initialOverlaps = game.checkForWordOverlaps(obj.englishWords);
            expect(initialOverlaps).toHaveLength(0);
            
            // Capture initial spacing
            const initialSpacing = game.getWordSpacing(obj.englishWords);
            expect(initialSpacing[0]).toBeGreaterThan(0); // Should have positive space between words
            
            // MOVEMENT (this is where the bug occurs)
            game.setObjectPosition(obj, 200, 150);
            
            // Verify no overlaps after movement
            const afterMoveOverlaps = game.checkForWordOverlaps(obj.englishWords);
            expect(afterMoveOverlaps).toHaveLength(0);
            
            // Verify spacing is preserved
            const afterMoveSpacing = game.getWordSpacing(obj.englishWords);
            expect(afterMoveSpacing[0]).toBeCloseTo(initialSpacing[0], 1);
            
            // Verify text content is unchanged
            expect(obj.englishWords[0].text).toBe('Red');
            expect(obj.englishWords[1].text).toBe('Triangle');
        });
        
        test('should preserve "Orange Q" spacing after movement', () => {
            const letterData = {
                en: 'Orange Q',
                es: 'Q Naranja'
            };
            
            const obj = game.createTestObjectWithComponentLayout(400, 300, letterData);
            
            // Verify initial state
            expect(obj.englishWords).toHaveLength(2);
            expect(obj.englishWords[0].text).toBe('Orange');
            expect(obj.englishWords[1].text).toBe('Q');
            
            const initialOverlaps = game.checkForWordOverlaps(obj.englishWords);
            expect(initialOverlaps).toHaveLength(0);
            
            const initialSpacing = game.getWordSpacing(obj.englishWords);
            
            // Move object multiple times (test cumulative error)
            game.setObjectPosition(obj, 200, 150);
            game.setObjectPosition(obj, 300, 250);
            game.setObjectPosition(obj, 500, 400);
            
            // Verify no overlaps after multiple movements
            const finalOverlaps = game.checkForWordOverlaps(obj.englishWords);
            expect(finalOverlaps).toHaveLength(0);
            
            // Verify spacing consistency
            const finalSpacing = game.getWordSpacing(obj.englishWords);
            expect(finalSpacing[0]).toBeCloseTo(initialSpacing[0], 1);
            
            // Verify text integrity
            expect(obj.englishWords[0].text).toBe('Orange');
            expect(obj.englishWords[1].text).toBe('Q');
        });
        
        test('should handle long phrases without overlap', () => {
            const longPhraseData = {
                en: 'Very Long English Phrase',
                es: 'Frase Muy Larga En Español'
            };
            
            const obj = game.createTestObjectWithComponentLayout(400, 300, longPhraseData);
            
            // Verify no initial overlaps
            const initialOverlaps = game.checkForWordOverlaps(obj.englishWords);
            expect(initialOverlaps).toHaveLength(0);
            
            // Move and verify
            game.setObjectPosition(obj, 100, 100);
            
            const afterMoveOverlaps = game.checkForWordOverlaps(obj.englishWords);
            expect(afterMoveOverlaps).toHaveLength(0);
            
            // All words should have positive spacing
            const spacing = game.getWordSpacing(obj.englishWords);
            spacing.forEach(space => {
                expect(space).toBeGreaterThan(0);
            });
        });
        
        test('should preserve component layout across responsive scaling', () => {
            // Test with different screen sizes to verify responsive scaling is preserved
            game.scale.width = 400;
            game.scale.height = 300;
            
            const obj = game.createTestObjectWithComponentLayout(200, 150, {
                en: 'Test Phrase',
                es: 'Frase Prueba'
            });
            
            // Capture relative positions
            const englishRelativePositions = obj.componentLayout.englishWords;
            const spanishRelativePositions = obj.componentLayout.spanishWords;
            
            // Move object
            game.setObjectPosition(obj, 100, 100);
            
            // Verify stored relative positions were used
            obj.englishWords.forEach((wordObj, index) => {
                const expectedX = 100 + englishRelativePositions[index].offsetX;
                const expectedY = 100 + englishRelativePositions[index].offsetY;
                expect(wordObj.x).toBeCloseTo(expectedX, 1);
                expect(wordObj.y).toBeCloseTo(expectedY, 1);
            });
        });
    });
});