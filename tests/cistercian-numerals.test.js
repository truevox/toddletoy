describe('Cistercian Numerals', () => {
    let game;
    let mockAdd;
    let mockGraphics;

    beforeEach(() => {
        // Mock graphics object for drawing Cistercian numerals
        mockGraphics = {
            lineStyle: jest.fn().mockReturnThis(),
            lineBetween: jest.fn().mockReturnThis(),
            setPosition: jest.fn().mockReturnThis(),
            clear: jest.fn().mockReturnThis(),
            destroy: jest.fn()
        };

        // Mock Phaser scene add methods
        mockAdd = {
            graphics: jest.fn().mockReturnValue(mockGraphics),
            text: jest.fn().mockReturnValue({
                setOrigin: jest.fn().mockReturnThis()
            })
        };

        // Create game instance with Cistercian rendering
        game = {
            add: mockAdd,
            renderCistercianNumeral: function(number, x, y) {
                // This should create a graphics object and draw the Cistercian numeral
                const graphics = this.add.graphics();
                graphics.lineStyle(3, 0xffffff); // White lines, 3px thick
                
                // Draw the central vertical line (always present)
                const centerX = x;
                const centerY = y;
                const height = 60; // Total height of the numeral
                
                graphics.lineBetween(centerX, centerY - height/2, centerX, centerY + height/2);
                
                // Parse the number into components
                const units = number % 10;
                const tens = Math.floor((number % 100) / 10);
                const hundreds = Math.floor((number % 1000) / 100);
                const thousands = Math.floor(number / 1000);
                
                // Draw each component
                if (units > 0) this.drawCistercianDigit(graphics, units, centerX, centerY, 'units');
                if (tens > 0) this.drawCistercianDigit(graphics, tens, centerX, centerY, 'tens');
                if (hundreds > 0) this.drawCistercianDigit(graphics, hundreds, centerX, centerY, 'hundreds');
                if (thousands > 0) this.drawCistercianDigit(graphics, thousands, centerX, centerY, 'thousands');
                
                return graphics;
            },
            
            drawCistercianDigit: function(graphics, digit, centerX, centerY, position) {
                const halfHeight = 30;
                const lineLength = 20;
                
                // Determine position offsets
                let xOffset, yOffset;
                switch(position) {
                    case 'units':    // Upper right
                        xOffset = 1; yOffset = -1; break;
                    case 'tens':     // Upper left  
                        xOffset = -1; yOffset = -1; break;
                    case 'hundreds': // Lower right
                        xOffset = 1; yOffset = 1; break;
                    case 'thousands': // Lower left
                        xOffset = -1; yOffset = 1; break;
                }
                
                const baseX = centerX + (xOffset * 0);
                const baseY = centerY + (yOffset * halfHeight / 2);
                
                // Draw the digit pattern (simplified for testing)
                switch(digit) {
                    case 1:
                        graphics.lineBetween(baseX, baseY, baseX + (xOffset * lineLength), baseY);
                        break;
                    case 2:
                        graphics.lineBetween(baseX, baseY, baseX + (xOffset * lineLength), baseY + (yOffset * 5));
                        break;
                    case 5:
                        graphics.lineBetween(baseX, baseY, baseX + (xOffset * lineLength), baseY + (yOffset * halfHeight));
                        break;
                    // Additional patterns would be implemented here
                }
            }
        };
    });

    test('should render central vertical line for any number', () => {
        game.renderCistercianNumeral(1, 100, 200);
        
        expect(mockAdd.graphics).toHaveBeenCalled();
        expect(mockGraphics.lineStyle).toHaveBeenCalledWith(3, 0xffffff);
        expect(mockGraphics.lineBetween).toHaveBeenCalledWith(100, 170, 100, 230); // Vertical line
    });

    test('should parse number components correctly', () => {
        // Test number 1234
        const drawDigitSpy = jest.spyOn(game, 'drawCistercianDigit');
        
        game.renderCistercianNumeral(1234, 100, 200);
        
        expect(drawDigitSpy).toHaveBeenCalledWith(expect.anything(), 4, 100, 200, 'units');      // 4 in units place
        expect(drawDigitSpy).toHaveBeenCalledWith(expect.anything(), 3, 100, 200, 'tens');       // 3 in tens place  
        expect(drawDigitSpy).toHaveBeenCalledWith(expect.anything(), 2, 100, 200, 'hundreds');   // 2 in hundreds place
        expect(drawDigitSpy).toHaveBeenCalledWith(expect.anything(), 1, 100, 200, 'thousands');  // 1 in thousands place
    });

    test('should not draw components for zero digits', () => {
        const drawDigitSpy = jest.spyOn(game, 'drawCistercianDigit');
        
        game.renderCistercianNumeral(105, 100, 200); // Only hundreds and units
        
        expect(drawDigitSpy).toHaveBeenCalledWith(expect.anything(), 5, 100, 200, 'units');      // 5 in units
        expect(drawDigitSpy).toHaveBeenCalledWith(expect.anything(), 1, 100, 200, 'hundreds');   // 1 in hundreds
        expect(drawDigitSpy).not.toHaveBeenCalledWith(expect.anything(), 0, expect.anything(), expect.anything(), 'tens'); // No tens
        expect(drawDigitSpy).not.toHaveBeenCalledWith(expect.anything(), 0, expect.anything(), expect.anything(), 'thousands'); // No thousands
    });

    test('should draw units digit in upper right position', () => {
        game.renderCistercianNumeral(1, 100, 200);
        
        // For digit 1 in units position, should draw horizontal line in upper right
        expect(mockGraphics.lineBetween).toHaveBeenCalledWith(100, 185, 120, 185);
    });

    test('should handle numbers up to 9999', () => {
        const drawDigitSpy = jest.spyOn(game, 'drawCistercianDigit');
        
        game.renderCistercianNumeral(9999, 100, 200);
        
        expect(drawDigitSpy).toHaveBeenCalledWith(expect.anything(), 9, 100, 200, 'units');
        expect(drawDigitSpy).toHaveBeenCalledWith(expect.anything(), 9, 100, 200, 'tens');
        expect(drawDigitSpy).toHaveBeenCalledWith(expect.anything(), 9, 100, 200, 'hundreds');
        expect(drawDigitSpy).toHaveBeenCalledWith(expect.anything(), 9, 100, 200, 'thousands');
    });

    test('should return graphics object for cleanup', () => {
        const result = game.renderCistercianNumeral(42, 100, 200);
        
        expect(result).toBe(mockGraphics);
    });
});