describe('Text Display', () => {
    let game;
    let mockAdd;
    let mockTextObjects;

    beforeEach(() => {
        // Create a factory function for mock text objects
        const createMockTextObject = () => ({
            setOrigin: jest.fn().mockReturnThis(),
            setPosition: jest.fn().mockReturnThis(),
            destroy: jest.fn()
        });

        // Mock Phaser scene add methods
        mockAdd = {
            text: jest.fn().mockImplementation(() => createMockTextObject()),
            graphics: jest.fn().mockReturnValue({
                fillStyle: jest.fn().mockReturnThis(),
                fillCircle: jest.fn().mockReturnThis()
            })
        };

        // Create game instance with displayTextLabels implementation
        game = {
            add: mockAdd,
            objects: [],
            displayTextLabels: function(obj) {
                if (!obj || !obj.data) return;
                
                const data = obj.data;
                const x = obj.x;
                const y = obj.y;
                
                const labelStyle = {
                    fontSize: '24px',
                    fill: '#ffffff',
                    fontFamily: 'Arial',
                    align: 'center',
                    stroke: '#000000',
                    strokeThickness: 2
                };
                
                const englishText = this.add.text(x, y + 60, data.en, labelStyle)
                    .setOrigin(0.5);
                
                const spanishText = this.add.text(x, y + 90, data.es, labelStyle)
                    .setOrigin(0.5);
                
                obj.englishLabel = englishText;
                obj.spanishLabel = spanishText;
                
                return {
                    english: englishText,
                    spanish: spanishText
                };
            }
        };
    });

    test('should create English text label below emoji', () => {
        const obj = {
            x: 100,
            y: 200,
            data: { emoji: '🐶', en: 'Dog', es: 'Perro' }
        };
        
        const result = game.displayTextLabels(obj);
        
        expect(mockAdd.text).toHaveBeenCalledWith(100, 260, 'Dog', expect.any(Object));
        expect(result.english).toBeDefined();
        expect(result.english.setOrigin).toHaveBeenCalledWith(0.5);
    });

    test('should create Spanish text label below English label', () => {
        const obj = {
            x: 150,
            y: 250,
            data: { emoji: '🐱', en: 'Cat', es: 'Gato' }
        };
        
        const result = game.displayTextLabels(obj);
        
        expect(mockAdd.text).toHaveBeenCalledWith(150, 340, 'Gato', expect.any(Object));
        expect(result.spanish).toBeDefined();
        expect(result.spanish.setOrigin).toHaveBeenCalledWith(0.5);
    });

    test('should center align all text labels horizontally', () => {
        const obj = {
            x: 300,
            y: 400,
            data: { emoji: '🐻', en: 'Bear', es: 'Oso' }
        };
        
        const result = game.displayTextLabels(obj);
        
        // Both labels should be centered (setOrigin(0.5))
        expect(result.english.setOrigin).toHaveBeenCalledWith(0.5);
        expect(result.spanish.setOrigin).toHaveBeenCalledWith(0.5);
    });

    test('should store label references in object for cleanup', () => {
        const obj = {
            x: 200,
            y: 300,
            data: { emoji: '🐸', en: 'Frog', es: 'Rana' }
        };
        
        game.displayTextLabels(obj);
        
        expect(obj.englishLabel).toBeDefined();
        expect(obj.spanishLabel).toBeDefined();
    });
});