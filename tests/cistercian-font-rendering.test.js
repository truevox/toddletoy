/**
 * @jest-environment jsdom
 */

// Test for font-based Cistercian numeral rendering
// Following TDD: Test the new font-based implementation

// Mock Phaser text object
const mockTextObject = {
    setOrigin: jest.fn().mockReturnThis(),
    setPosition: jest.fn().mockReturnThis(),
    destroy: jest.fn()
};

// Mock game scene with font-based Cistercian rendering
const createGameWithCistercianFont = () => {
    return {
        add: {
            text: jest.fn((x, y, text, style) => {
                const textObj = {
                    ...mockTextObject,
                    x: x,
                    y: y,
                    text: text,
                    style: style
                };
                return textObj;
            })
        },
        
        // Font-based Cistercian implementation methods
        getCistercianKeyMapping: function(digit) {
            const mapping = {
                1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9',
                0: '0'
            };
            return mapping[digit] || '0';
        },
        
        renderCistercianNumeral: function(number, x, y) {
            // Font-based Cistercian numeral rendering
            if (number === 0) {
                return this.add.text(x, y, '0', {
                    fontSize: '32px',
                    fontFamily: 'Cistercian, monospace',
                    fill: '#ffffff',
                    align: 'center'
                }).setOrigin(0.5, 0.5);
            }
            
            const units = number % 10;
            const tens = Math.floor((number % 100) / 10);
            const hundreds = Math.floor((number % 1000) / 100);
            const thousands = Math.floor(number / 1000);
            
            let cistercianChars = '';
            
            if (thousands > 0) cistercianChars += this.getCistercianKeyMapping(thousands);
            if (hundreds > 0) cistercianChars += this.getCistercianKeyMapping(hundreds);
            if (tens > 0) cistercianChars += this.getCistercianKeyMapping(tens);
            if (units > 0) cistercianChars += this.getCistercianKeyMapping(units);
            
            if (cistercianChars === '') cistercianChars = '0';
            
            return this.add.text(x, y, cistercianChars, {
                fontSize: '32px',
                fontFamily: 'Cistercian, monospace',
                fill: '#ffffff',
                align: 'center'
            }).setOrigin(0.5, 0.5);
        }
    };
};

describe('Cistercian Font-Based Rendering', () => {
    let game;
    
    beforeEach(() => {
        game = createGameWithCistercianFont();
        jest.clearAllMocks();
    });
    
    describe('Key Mapping', () => {
        test('should map digits 1-9 to corresponding keyboard characters', () => {
            expect(game.getCistercianKeyMapping(1)).toBe('1');
            expect(game.getCistercianKeyMapping(5)).toBe('5');
            expect(game.getCistercianKeyMapping(9)).toBe('9');
        });
        
        test('should map 0 to base character', () => {
            expect(game.getCistercianKeyMapping(0)).toBe('0');
        });
        
        test('should handle invalid digits gracefully', () => {
            expect(game.getCistercianKeyMapping(10)).toBe('0');
            expect(game.getCistercianKeyMapping(-1)).toBe('0');
        });
    });
    
    describe('Number Rendering', () => {
        test('should render zero as base character', () => {
            const result = game.renderCistercianNumeral(0, 100, 200);
            
            expect(game.add.text).toHaveBeenCalledWith(100, 200, '0', {
                fontSize: '32px',
                fontFamily: 'Cistercian, monospace',
                fill: '#ffffff',
                align: 'center'
            });
            expect(result.setOrigin).toHaveBeenCalledWith(0.5, 0.5);
        });
        
        test('should render single digit numbers correctly', () => {
            const result = game.renderCistercianNumeral(5, 150, 250);
            
            expect(game.add.text).toHaveBeenCalledWith(150, 250, '5', {
                fontSize: '32px',
                fontFamily: 'Cistercian, monospace',
                fill: '#ffffff',
                align: 'center'
            });
        });
        
        test('should combine digits for multi-digit numbers', () => {
            const result = game.renderCistercianNumeral(23, 200, 300);
            
            // 23 = 2 tens + 3 units = '23'
            expect(game.add.text).toHaveBeenCalledWith(200, 300, '23', {
                fontSize: '32px',
                fontFamily: 'Cistercian, monospace',
                fill: '#ffffff',
                align: 'center'
            });
        });
        
        test('should handle larger numbers with all positions', () => {
            const result = game.renderCistercianNumeral(1234, 300, 400);
            
            // 1234 = 1 thousand + 2 hundreds + 3 tens + 4 units = '1234'
            expect(game.add.text).toHaveBeenCalledWith(300, 400, '1234', {
                fontSize: '32px',
                fontFamily: 'Cistercian, monospace',
                fill: '#ffffff',
                align: 'center'
            });
        });
        
        test('should skip zero positions in multi-digit numbers', () => {
            const result = game.renderCistercianNumeral(105, 250, 350);
            
            // 105 = 1 hundred + 0 tens + 5 units = '15' (skip the 0)
            expect(game.add.text).toHaveBeenCalledWith(250, 350, '15', {
                fontSize: '32px',
                fontFamily: 'Cistercian, monospace',
                fill: '#ffffff',
                align: 'center'
            });
        });
        
        test('should handle numbers with leading zeros correctly', () => {
            const result = game.renderCistercianNumeral(7, 180, 280);
            
            expect(game.add.text).toHaveBeenCalledWith(180, 280, '7', {
                fontSize: '32px',
                fontFamily: 'Cistercian, monospace',
                fill: '#ffffff',
                align: 'center'
            });
        });
    });
    
    describe('Font and Styling', () => {
        test('should use correct font family', () => {
            game.renderCistercianNumeral(42, 100, 100);
            
            const callArgs = game.add.text.mock.calls[0];
            expect(callArgs[3].fontFamily).toBe('Cistercian, monospace');
        });
        
        test('should use appropriate font size', () => {
            game.renderCistercianNumeral(99, 100, 100);
            
            const callArgs = game.add.text.mock.calls[0];
            expect(callArgs[3].fontSize).toBe('32px');
        });
        
        test('should use white color for visibility', () => {
            game.renderCistercianNumeral(88, 100, 100);
            
            const callArgs = game.add.text.mock.calls[0];
            expect(callArgs[3].fill).toBe('#ffffff');
        });
        
        test('should set proper text origin for centering', () => {
            const result = game.renderCistercianNumeral(123, 100, 100);
            
            expect(result.setOrigin).toHaveBeenCalledWith(0.5, 0.5);
        });
    });
    
    describe('Edge Cases', () => {
        test('should handle maximum 4-digit number', () => {
            const result = game.renderCistercianNumeral(9999, 400, 500);
            
            expect(game.add.text).toHaveBeenCalledWith(400, 500, '9999', {
                fontSize: '32px',
                fontFamily: 'Cistercian, monospace',
                fill: '#ffffff',
                align: 'center'
            });
        });
        
        test('should handle numbers with middle zeros', () => {
            const result = game.renderCistercianNumeral(3007, 350, 450);
            
            // 3007 = 3 thousands + 0 hundreds + 0 tens + 7 units = '37'
            expect(game.add.text).toHaveBeenCalledWith(350, 450, '37', {
                fontSize: '32px',
                fontFamily: 'Cistercian, monospace',
                fill: '#ffffff',
                align: 'center'
            });
        });
        
        test('should return text object for further manipulation', () => {
            const result = game.renderCistercianNumeral(456, 200, 300);
            
            expect(result).toBeDefined();
            expect(result.setOrigin).toBeDefined();
            expect(result.x).toBe(200);
            expect(result.y).toBe(300);
        });
    });
});

describe('Cistercian Font Integration', () => {
    test('should be compatible with existing Phaser text system', () => {
        const game = createGameWithCistercianFont();
        
        // Should create text objects that work with Phaser's text system
        const result = game.renderCistercianNumeral(789, 100, 200);
        
        expect(result.setOrigin).toBeDefined();
        expect(typeof result.destroy).toBe('function');
    });
    
    test('should work with component layout system', () => {
        const game = createGameWithCistercianFont();
        
        // The returned text object should be positionable like other components
        const cistercianText = game.renderCistercianNumeral(321, 300, 400);
        
        expect(cistercianText.x).toBe(300);
        expect(cistercianText.y).toBe(400);
        expect(cistercianText.setOrigin).toHaveBeenCalled();
    });
});