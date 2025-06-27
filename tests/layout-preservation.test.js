/**
 * @jest-environment jsdom
 */

// Mock Phaser text objects with proper width calculation
const createMockTextObject = (text, style = {}) => ({
    text: text,
    style: style,
    width: text.length * (parseInt(style.fontSize) || 24) * 0.6, // Approximate width calculation
    height: parseInt(style.fontSize) || 24,
    x: 0,
    y: 0,
    setPosition: jest.fn(function(x, y) {
        this.x = x;
        this.y = y;
    }),
    setOrigin: jest.fn().mockReturnThis(),
    destroy: jest.fn()
});

// Create mock game with layout functionality
const createMockGameWithLayout = () => {
    return {
        objects: [],
        
        // Mock Phaser scene add methods
        add: {
            text: jest.fn((x, y, text, style) => createMockTextObject(text, style)),
            graphics: jest.fn(() => ({
                fillStyle: jest.fn().mockReturnThis(),
                fillCircle: jest.fn().mockReturnThis(),
                generateTexture: jest.fn().mockReturnThis(),
                destroy: jest.fn()
            }))
        },
        
        // Mock responsive scaling
        scale: { width: 800, height: 600 },
        
        // Create test object with all components
        createTestObject: function(x, y, type = 'letter') {
            const data = {
                letter: {
                    symbol: 'Q',
                    color: '#ffa500',
                    en: 'Orange Q',
                    es: 'Q Naranja',
                    type: 'letter'
                },
                number: {
                    symbol: '5',
                    color: '#0000ff',
                    en: 'Blue Five',
                    es: 'Cinco Azul',
                    type: 'number'
                },
                emoji: {
                    emoji: '🐶',
                    en: 'Happy Dog',
                    es: 'Perro Feliz',
                    type: 'emoji'
                }
            };
            
            const obj = {
                x: x,
                y: y,
                id: Date.now() + Math.random(),
                type: type,
                data: data[type]
            };
            
            // Create main sprite
            obj.sprite = createMockTextObject(obj.data.symbol || obj.data.emoji, {
                fontSize: '64px',
                fill: obj.data.color || '#ffffff'
            });
            obj.sprite.setPosition(x, y);
            
            // Create word objects for bilingual text
            this.createWordObjects(obj);
            
            // Create number-specific displays if it's a number
            if (type === 'number') {
                this.createNumberDisplays(obj);
            }
            
            this.objects.push(obj);
            return obj;
        },
        
        createWordObjects: function(obj) {
            const style = {
                fontSize: '24px',
                fill: '#ffffff',
                fontFamily: 'Arial'
            };
            
            // Create English word objects
            const englishWords = obj.data.en.split(' ');
            obj.englishWords = englishWords.map(word => 
                createMockTextObject(word, style)
            );
            
            // Create Spanish word objects  
            const spanishWords = obj.data.es.split(' ');
            obj.spanishWords = spanishWords.map(word => 
                createMockTextObject(word, style)
            );
            
            // Position them initially
            this.repositionWordObjects(obj.englishWords, obj.x, obj.y + 60);
            this.repositionWordObjects(obj.spanishWords, obj.x, obj.y + 90);
        },
        
        createNumberDisplays: function(obj) {
            const numberValue = parseInt(obj.data.symbol);
            
            // Create Kaktovik numeral
            obj.kaktovikNumeral = createMockTextObject('𝕂', { fontSize: '32px' });
            obj.kaktovikNumeral.setPosition(obj.x, obj.y - 60);
            
            // Create binary hearts
            obj.binaryHearts = createMockTextObject('❤️🤍❤️', { fontSize: '16px' });
            obj.binaryHearts.setPosition(obj.x, obj.y - 30);
        },
        
        // This is the function under test - it should preserve layout
        setObjectPosition: function(obj, x, y) {
            if (!obj) return;
            
            // Update object position
            obj.x = x;
            obj.y = y;
            
            // Update sprite position
            if (obj.sprite) {
                obj.sprite.setPosition(x, y);
            }
            
            // Update word object positions
            if (obj.englishWords && obj.englishWords.length > 0) {
                this.repositionWordObjects(obj.englishWords, x, y + 60);
            }
            if (obj.spanishWords && obj.spanishWords.length > 0) {
                this.repositionWordObjects(obj.spanishWords, x, y + 90);
            }
            
            // Update Kaktovik numeral position
            if (obj.kaktovikNumeral) {
                obj.kaktovikNumeral.setPosition(x, y - 60);
            }
            
            // Update binary hearts position
            if (obj.binaryHearts) {
                obj.binaryHearts.setPosition(x, y - 30);
            }
        },
        
        repositionWordObjects: function(wordObjects, centerX, y) {
            if (!wordObjects || wordObjects.length === 0) return;
            
            // Calculate total width of all words
            let totalWidth = 0;
            wordObjects.forEach((wordObj, index) => {
                totalWidth += wordObj.width;
                if (index < wordObjects.length - 1) {
                    // Add space width between words
                    totalWidth += wordObj.style.fontSize ? parseInt(wordObj.style.fontSize) * 0.3 : 8;
                }
            });
            
            // Position words starting from the left edge of the centered group
            let currentX = centerX - (totalWidth / 2);
            
            wordObjects.forEach((wordObj, index) => {
                wordObj.setPosition(currentX, y);
                currentX += wordObj.width;
                
                // Add space after word (except for the last word)
                if (index < wordObjects.length - 1) {
                    currentX += wordObj.style.fontSize ? parseInt(wordObj.style.fontSize) * 0.3 : 8;
                }
            });
        },
        
        // Helper function to get object layout snapshot
        getLayoutSnapshot: function(obj) {
            const snapshot = {
                main: { x: obj.sprite.x, y: obj.sprite.y },
                englishWords: obj.englishWords ? obj.englishWords.map(w => ({ x: w.x, y: w.y, text: w.text })) : [],
                spanishWords: obj.spanishWords ? obj.spanishWords.map(w => ({ x: w.x, y: w.y, text: w.text })) : []
            };
            
            if (obj.kaktovikNumeral) {
                snapshot.kaktovikNumeral = { x: obj.kaktovikNumeral.x, y: obj.kaktovikNumeral.y };
            }
            if (obj.binaryHearts) {
                snapshot.binaryHearts = { x: obj.binaryHearts.x, y: obj.binaryHearts.y };
            }
            
            return snapshot;
        },
        
        // Helper to check if layout is properly centered
        checkCentering: function(obj) {
            const issues = [];
            
            // Check English words centering
            if (obj.englishWords && obj.englishWords.length > 0) {
                const firstWord = obj.englishWords[0];
                const lastWord = obj.englishWords[obj.englishWords.length - 1];
                const phraseStart = firstWord.x;
                const phraseEnd = lastWord.x + lastWord.width;
                const phraseCenterX = (phraseStart + phraseEnd) / 2;
                const expectedCenterX = obj.x;
                
                if (Math.abs(phraseCenterX - expectedCenterX) > 1) {
                    issues.push(`English words not centered: expected ${expectedCenterX}, got ${phraseCenterX}`);
                }
            }
            
            // Check Spanish words centering
            if (obj.spanishWords && obj.spanishWords.length > 0) {
                const firstWord = obj.spanishWords[0];
                const lastWord = obj.spanishWords[obj.spanishWords.length - 1];
                const phraseStart = firstWord.x;
                const phraseEnd = lastWord.x + lastWord.width;
                const phraseCenterX = (phraseStart + phraseEnd) / 2;
                const expectedCenterX = obj.x;
                
                if (Math.abs(phraseCenterX - expectedCenterX) > 1) {
                    issues.push(`Spanish words not centered: expected ${expectedCenterX}, got ${phraseCenterX}`);
                }
            }
            
            return issues;
        }
    };
};

describe('Layout Preservation During Movement', () => {
    let mockGame;
    
    beforeEach(() => {
        mockGame = createMockGameWithLayout();
        jest.clearAllMocks();
    });
    
    describe('Letter Objects', () => {
        test('should preserve layout when moving letter object', () => {
            // Create a letter object at initial position
            const obj = mockGame.createTestObject(400, 300, 'letter');
            const initialSnapshot = mockGame.getLayoutSnapshot(obj);
            
            // Verify initial layout is correct
            expect(obj.sprite.x).toBe(400);
            expect(obj.sprite.y).toBe(300);
            expect(obj.englishWords[0].y).toBe(360); // y + 60
            expect(obj.spanishWords[0].y).toBe(390); // y + 90
            
            // Check initial centering
            const initialIssues = mockGame.checkCentering(obj);
            expect(initialIssues).toHaveLength(0);
            
            // Move the object to a new position
            mockGame.setObjectPosition(obj, 200, 150);
            const finalSnapshot = mockGame.getLayoutSnapshot(obj);
            
            // Verify main object moved correctly
            expect(obj.sprite.x).toBe(200);
            expect(obj.sprite.y).toBe(150);
            
            // Verify all components moved relative to the main object
            expect(obj.englishWords[0].y).toBe(210); // new y + 60
            expect(obj.spanishWords[0].y).toBe(240); // new y + 90
            
            // Verify centering is preserved after movement
            const finalIssues = mockGame.checkCentering(obj);
            expect(finalIssues).toHaveLength(0);
            
            // Verify relative positioning is maintained
            const deltaX = finalSnapshot.main.x - initialSnapshot.main.x;
            const deltaY = finalSnapshot.main.y - initialSnapshot.main.y;
            
            finalSnapshot.englishWords.forEach((word, index) => {
                const initialWord = initialSnapshot.englishWords[index];
                expect(word.x).toBeCloseTo(initialWord.x + deltaX, 1);
                expect(word.y).toBeCloseTo(initialWord.y + deltaY, 1);
            });
            
            finalSnapshot.spanishWords.forEach((word, index) => {
                const initialWord = initialSnapshot.spanishWords[index];
                expect(word.x).toBeCloseTo(initialWord.x + deltaX, 1);
                expect(word.y).toBeCloseTo(initialWord.y + deltaY, 1);
            });
        });
    });
    
    describe('Number Objects', () => {
        test('should preserve layout when moving number object with all displays', () => {
            // Create a number object with all components
            const obj = mockGame.createTestObject(400, 300, 'number');
            const initialSnapshot = mockGame.getLayoutSnapshot(obj);
            
            // Verify initial layout includes all number components
            expect(obj.kaktovikNumeral.x).toBe(400);
            expect(obj.kaktovikNumeral.y).toBe(240); // y - 60
            expect(obj.binaryHearts.x).toBe(400);
            expect(obj.binaryHearts.y).toBe(270); // y - 30
            
            // Check initial centering
            const initialIssues = mockGame.checkCentering(obj);
            expect(initialIssues).toHaveLength(0);
            
            // Move the object
            mockGame.setObjectPosition(obj, 150, 450);
            const finalSnapshot = mockGame.getLayoutSnapshot(obj);
            
            // Verify all number displays moved correctly
            expect(obj.kaktovikNumeral.x).toBe(150);
            expect(obj.kaktovikNumeral.y).toBe(390); // new y - 60
            expect(obj.binaryHearts.x).toBe(150);
            expect(obj.binaryHearts.y).toBe(420); // new y - 30
            
            // Verify centering is preserved
            const finalIssues = mockGame.checkCentering(obj);
            expect(finalIssues).toHaveLength(0);
            
            // Verify all components moved by the same delta
            const deltaX = finalSnapshot.main.x - initialSnapshot.main.x;
            const deltaY = finalSnapshot.main.y - initialSnapshot.main.y;
            
            expect(finalSnapshot.kaktovikNumeral.x).toBe(initialSnapshot.kaktovikNumeral.x + deltaX);
            expect(finalSnapshot.kaktovikNumeral.y).toBe(initialSnapshot.kaktovikNumeral.y + deltaY);
            expect(finalSnapshot.binaryHearts.x).toBe(initialSnapshot.binaryHearts.x + deltaX);
            expect(finalSnapshot.binaryHearts.y).toBe(initialSnapshot.binaryHearts.y + deltaY);
        });
    });
    
    describe('Multiple Movements', () => {
        test('should preserve layout through multiple movements', () => {
            const obj = mockGame.createTestObject(300, 200, 'emoji');
            
            // Perform multiple movements
            const positions = [
                [100, 100],
                [500, 400], 
                [250, 350],
                [450, 150]
            ];
            
            for (const [x, y] of positions) {
                mockGame.setObjectPosition(obj, x, y);
                
                // Check that layout is preserved after each movement
                const issues = mockGame.checkCentering(obj);
                expect(issues).toHaveLength(0);
                
                // Verify correct relative positioning
                expect(obj.sprite.x).toBe(x);
                expect(obj.sprite.y).toBe(y);
                expect(obj.englishWords[0].y).toBe(y + 60);
                expect(obj.spanishWords[0].y).toBe(y + 90);
            }
        });
    });
    
    describe('Word Centering Edge Cases', () => {
        test('should handle single-word phrases correctly', () => {
            const obj = mockGame.createTestObject(300, 200, 'letter');
            
            // Replace with single words for testing
            obj.englishWords = [createMockTextObject('Q', { fontSize: '24px' })];
            obj.spanishWords = [createMockTextObject('Letra', { fontSize: '24px' })];
            
            // Position initially
            mockGame.repositionWordObjects(obj.englishWords, obj.x, obj.y + 60);
            mockGame.repositionWordObjects(obj.spanishWords, obj.x, obj.y + 90);
            
            // Move and check centering
            mockGame.setObjectPosition(obj, 400, 350);
            
            const issues = mockGame.checkCentering(obj);
            expect(issues).toHaveLength(0);
        });
        
        test('should handle long multi-word phrases correctly', () => {
            const obj = mockGame.createTestObject(300, 200, 'letter');
            
            // Replace with long phrases
            obj.data.en = 'Very Long English Phrase Here';
            obj.data.es = 'Frase Muy Larga En Español Aquí';
            
            obj.englishWords = obj.data.en.split(' ').map(word => 
                createMockTextObject(word, { fontSize: '24px' })
            );
            obj.spanishWords = obj.data.es.split(' ').map(word => 
                createMockTextObject(word, { fontSize: '24px' })
            );
            
            // Position and move
            mockGame.setObjectPosition(obj, 400, 350);
            
            const issues = mockGame.checkCentering(obj);
            expect(issues).toHaveLength(0);
        });
    });
});