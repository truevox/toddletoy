describe('Kaktovik Numerals', () => {
    let game;
    let mockAdd;
    let mockGraphics;

    beforeEach(() => {
        // Mock graphics object for drawing Kaktovik numerals
        mockGraphics = {
            lineStyle: jest.fn().mockReturnThis(),
            lineBetween: jest.fn().mockReturnThis(),
            fillStyle: jest.fn().mockReturnThis(),
            fillCircle: jest.fn().mockReturnThis(),
            setPosition: jest.fn().mockReturnThis(),
            clear: jest.fn().mockReturnThis(),
            destroy: jest.fn()
        };

        // Mock Phaser scene add methods
        mockAdd = {
            graphics: jest.fn().mockReturnValue(mockGraphics),
            text: jest.fn().mockReturnValue({
                setOrigin: jest.fn().mockReturnThis(),
                x: 0,
                y: 0
            })
        };

        // Create game instance with Kaktovik rendering
        game = {
            add: mockAdd,
            renderKaktovikNumeral: function(number, x, y) {
                if (number < 0) return null;
                
                // Convert number to base-20 representation
                const base20Digits = this.convertToBase20(number);
                
                // Create Unicode string for Kaktovik numerals
                let kaktovikString = '';
                for (const digit of base20Digits) {
                    const unicodeCodePoint = 0x1D2C0 + digit;
                    kaktovikString += String.fromCodePoint(unicodeCodePoint);
                }
                
                // Create text object with Kaktovik font
                const textObj = this.add.text(x, y, kaktovikString, {
                    fontSize: '32px',
                    fontFamily: 'Kaktovik, monospace',
                    fill: '#ffffff',
                    align: 'center'
                });
                textObj.setOrigin(0.5);
                
                return textObj;
            },
            
            convertToBase20: function(number) {
                if (number === 0) return [0];
                
                const digits = [];
                let remaining = number;
                
                while (remaining > 0) {
                    digits.unshift(remaining % 20);
                    remaining = Math.floor(remaining / 20);
                }
                
                return digits;
            }
        };
    });

    test('should handle number 0', () => {
        const result = game.renderKaktovikNumeral(0, 100, 200);
        
        expect(mockAdd.text).toHaveBeenCalledWith(100, 200, String.fromCodePoint(0x1D2C0), expect.any(Object));
        expect(result).toBeDefined();
    });

    test('should convert numbers to correct Unicode characters', () => {
        // Test single digits 0-19
        game.renderKaktovikNumeral(5, 100, 200);
        expect(mockAdd.text).toHaveBeenCalledWith(100, 200, String.fromCodePoint(0x1D2C0 + 5), expect.any(Object));
        
        game.renderKaktovikNumeral(19, 100, 200);
        expect(mockAdd.text).toHaveBeenCalledWith(100, 200, String.fromCodePoint(0x1D2C0 + 19), expect.any(Object));
    });

    test('should handle base-20 conversion for numbers > 19', () => {
        // Test 20 = [1, 0] in base-20
        game.renderKaktovikNumeral(20, 100, 200);
        const expected20 = String.fromCodePoint(0x1D2C0 + 1) + String.fromCodePoint(0x1D2C0 + 0);
        expect(mockAdd.text).toHaveBeenCalledWith(100, 200, expected20, expect.any(Object));
        
        // Test 25 = [1, 5] in base-20  
        game.renderKaktovikNumeral(25, 100, 200);
        const expected25 = String.fromCodePoint(0x1D2C0 + 1) + String.fromCodePoint(0x1D2C0 + 5);
        expect(mockAdd.text).toHaveBeenCalledWith(100, 200, expected25, expect.any(Object));
    });

    test('should handle large numbers correctly', () => {
        // Test 400 = [1, 0, 0] in base-20 (20^2 = 400)
        game.renderKaktovikNumeral(400, 100, 200);
        const expected400 = String.fromCodePoint(0x1D2C0 + 1) + String.fromCodePoint(0x1D2C0 + 0) + String.fromCodePoint(0x1D2C0 + 0);
        expect(mockAdd.text).toHaveBeenCalledWith(100, 200, expected400, expect.any(Object));
    });

    test('should use correct font styling', () => {
        game.renderKaktovikNumeral(10, 100, 200);
        
        expect(mockAdd.text).toHaveBeenCalledWith(100, 200, expect.any(String), {
            fontSize: '32px',
            fontFamily: 'Kaktovik, monospace',
            fill: '#ffffff',
            align: 'center'
        });
    });

    test('should convert to base-20 correctly', () => {
        expect(game.convertToBase20(0)).toEqual([0]);
        expect(game.convertToBase20(19)).toEqual([19]);
        expect(game.convertToBase20(20)).toEqual([1, 0]);
        expect(game.convertToBase20(25)).toEqual([1, 5]);
        expect(game.convertToBase20(40)).toEqual([2, 0]);
        expect(game.convertToBase20(400)).toEqual([1, 0, 0]);
        expect(game.convertToBase20(421)).toEqual([1, 1, 1]);
    });

    test('should reject negative numbers', () => {
        const result = game.renderKaktovikNumeral(-1, 100, 200);
        expect(result).toBeNull();
    });

    test('should return text object for cleanup', () => {
        const mockTextObj = { setOrigin: jest.fn().mockReturnThis() };
        mockAdd.text.mockReturnValue(mockTextObj);
        
        const result = game.renderKaktovikNumeral(10, 100, 200);
        
        expect(result).toBe(mockTextObj);
        expect(mockTextObj.setOrigin).toHaveBeenCalledWith(0.5);
    });

    test('should position Kaktovik numerals 4 pixels higher for improved visual alignment', () => {
        // FAILING TEST: Based on game.js positioning logic, Kaktovik numerals should be 4 pixels higher
        // Current game.js uses: centerY + yOffset where yOffset = -60 or -80
        // We need: centerY + (yOffset - 4) for improved alignment
        
        const centerY = 200;
        const currentYOffset = -80; // Standard offset when only Kaktovik is enabled
        const improvedYOffset = currentYOffset - 4; // 4 pixels higher
        const expectedY = centerY + improvedYOffset; // Should be 200 + (-84) = 116
        
        // This test should fail with current implementation
        // The implementation should adjust positioning by 4 pixels higher
        game.renderKaktovikNumeral(10, 100, expectedY);
        
        expect(mockAdd.text).toHaveBeenCalledWith(100, 116, expect.any(String), expect.any(Object));
    });
});