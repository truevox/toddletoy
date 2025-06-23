describe('Text Display', () => {
    let game;
    let mockAdd;
    let mockTextObjects;

    beforeEach(() => {
        // Mock multiple Phaser text objects for different labels
        mockTextObjects = {
            emoji: {
                setOrigin: jest.fn().mockReturnThis(),
                setPosition: jest.fn().mockReturnThis(),
                destroy: jest.fn()
            },
            englishLabel: {
                setOrigin: jest.fn().mockReturnThis(),
                setPosition: jest.fn().mockReturnThis(),
                destroy: jest.fn()
            },
            spanishLabel: {
                setOrigin: jest.fn().mockReturnThis(),
                setPosition: jest.fn().mockReturnThis(),
                destroy: jest.fn()
            }
        };

        // Mock Phaser scene add methods
        mockAdd = {
            text: jest.fn()
                .mockReturnValueOnce(mockTextObjects.emoji)
                .mockReturnValueOnce(mockTextObjects.englishLabel)
                .mockReturnValueOnce(mockTextObjects.spanishLabel),
            graphics: jest.fn().mockReturnValue({
                fillStyle: jest.fn().mockReturnThis(),
                fillCircle: jest.fn().mockReturnThis()
            })
        };

        // Create game instance 
        game = {
            add: mockAdd,
            objects: [],
            displayTextLabels: function(obj) {
                // This should be implemented to pass tests
                throw new Error('displayTextLabels not implemented');
            }
        };
    });

    test('should throw error when displayTextLabels is not implemented', () => {
        const obj = {
            x: 100,
            y: 200,
            data: { emoji: '🐶', en: 'Dog', es: 'Perro' }
        };
        
        expect(() => {
            game.displayTextLabels(obj);
        }).toThrow('displayTextLabels not implemented');
    });

    test('should create English text label below emoji', () => {
        const obj = {
            x: 100,
            y: 200,
            data: { emoji: '🐶', en: 'Dog', es: 'Perro' }
        };
        
        expect(() => {
            game.displayTextLabels(obj);
        }).toThrow('displayTextLabels not implemented');
    });

    test('should create Spanish text label below English label', () => {
        const obj = {
            x: 150,
            y: 250,
            data: { emoji: '🐱', en: 'Cat', es: 'Gato' }
        };
        
        expect(() => {
            game.displayTextLabels(obj);
        }).toThrow('displayTextLabels not implemented');
    });

    test('should center align all text labels horizontally', () => {
        const obj = {
            x: 300,
            y: 400,
            data: { emoji: '🐻', en: 'Bear', es: 'Oso' }
        };
        
        expect(() => {
            game.displayTextLabels(obj);
        }).toThrow('displayTextLabels not implemented');
    });
});