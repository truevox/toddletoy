describe('Binary Representation with Hearts', () => {
    let game;
    let mockAdd;

    beforeEach(() => {
        // Mock Phaser scene add methods
        mockAdd = {
            text: jest.fn().mockReturnValue({
                setOrigin: jest.fn().mockReturnThis()
            })
        };

        // Create game instance with binary rendering
        game = {
            add: mockAdd,
            
            renderBinaryHearts: function(number, x, y) {
                if (number < 0) return null;
                
                // Convert number to binary string
                const binaryString = this.convertToBinary(number);
                
                // Convert binary to hearts: 1 = ❤️, 0 = 🤍
                let heartString = '';
                for (const bit of binaryString) {
                    heartString += bit === '1' ? '❤️' : '🤍';
                }
                
                // Create text object with heart emojis
                const textObj = this.add.text(x, y, heartString, {
                    fontSize: '16px',
                    fontFamily: 'Arial, sans-serif',
                    fill: '#ffffff',
                    align: 'center'
                }).setOrigin(0.5);
                
                return textObj;
            },
            
            convertToBinary: function(number) {
                if (number === 0) return '0';
                return number.toString(2);
            }
        };
    });

    test('should convert numbers to binary correctly', () => {
        expect(game.convertToBinary(0)).toBe('0');
        expect(game.convertToBinary(1)).toBe('1');
        expect(game.convertToBinary(2)).toBe('10');
        expect(game.convertToBinary(3)).toBe('11');
        expect(game.convertToBinary(4)).toBe('100');
        expect(game.convertToBinary(5)).toBe('101');
        expect(game.convertToBinary(8)).toBe('1000');
        expect(game.convertToBinary(15)).toBe('1111');
        expect(game.convertToBinary(255)).toBe('11111111');
    });

    test('should convert binary to heart emojis correctly', () => {
        game.renderBinaryHearts(0, 100, 200);
        expect(mockAdd.text).toHaveBeenCalledWith(100, 200, '🤍', expect.any(Object));
        
        game.renderBinaryHearts(1, 100, 200);
        expect(mockAdd.text).toHaveBeenCalledWith(100, 200, '❤️', expect.any(Object));
        
        game.renderBinaryHearts(3, 100, 200);
        expect(mockAdd.text).toHaveBeenCalledWith(100, 200, '❤️❤️', expect.any(Object));
        
        game.renderBinaryHearts(5, 100, 200);
        expect(mockAdd.text).toHaveBeenCalledWith(100, 200, '❤️🤍❤️', expect.any(Object));
    });

    test('should position binary hearts at specified coordinates', () => {
        game.renderBinaryHearts(10, 100, 200);
        
        // Should be positioned at the exact coordinates provided
        expect(mockAdd.text).toHaveBeenCalledWith(100, 200, expect.any(String), expect.any(Object));
    });

    test('should use correct font styling for hearts', () => {
        game.renderBinaryHearts(7, 100, 200);
        
        expect(mockAdd.text).toHaveBeenCalledWith(100, 200, '❤️❤️❤️', {
            fontSize: '16px',
            fontFamily: 'Arial, sans-serif',
            fill: '#ffffff',
            align: 'center'
        });
    });

    test('should handle larger numbers correctly', () => {
        game.renderBinaryHearts(255, 100, 200);
        expect(mockAdd.text).toHaveBeenCalledWith(100, 200, '❤️❤️❤️❤️❤️❤️❤️❤️', expect.any(Object));
        
        game.renderBinaryHearts(256, 100, 200);
        expect(mockAdd.text).toHaveBeenCalledWith(100, 200, '❤️🤍🤍🤍🤍🤍🤍🤍🤍', expect.any(Object));
    });

    test('should reject negative numbers', () => {
        const result = game.renderBinaryHearts(-1, 100, 200);
        expect(result).toBeNull();
    });

    test('should return text object for cleanup', () => {
        const mockTextObj = { setOrigin: jest.fn().mockReturnThis() };
        mockAdd.text.mockReturnValue(mockTextObj);
        
        const result = game.renderBinaryHearts(42, 100, 200);
        
        expect(result).toBe(mockTextObj);
        expect(mockTextObj.setOrigin).toHaveBeenCalledWith(0.5);
    });
});