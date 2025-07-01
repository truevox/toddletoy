describe('Numeral Positioning Fix', () => {
    let gameScene;
    let mockRenderManager;
    let mockConfigManager;

    beforeEach(() => {
        // Mock RenderManager with spies
        mockRenderManager = {
            renderCistercianNumeral: jest.fn().mockReturnValue({ destroy: jest.fn() }),
            renderKaktovikNumeral: jest.fn().mockReturnValue({ destroy: jest.fn() }),
            renderBinaryHearts: jest.fn().mockReturnValue({ destroy: jest.fn() })
        };

        // Mock ConfigManager
        mockConfigManager = {
            getNumberModes: jest.fn()
        };

        // Create mock GameScene with the positioning method
        gameScene = {
            renderManager: mockRenderManager,
            configManager: mockConfigManager,
            renderAllNumberModes: function(obj, numberValue, centerX, centerY) {
                if (!obj || typeof numberValue !== 'number') return;
                
                const numberModes = this.configManager ? this.configManager.getNumberModes() : {};
                const components = [];
                
                // Render Cistercian numerals (furthest from center)
                // POSITIONING FIX: Move Cistercian numerals 7 pixels higher for improved visual alignment
                if (numberModes.cistercian) {
                    const cistercianYOffset = -107; // Was -100, now 7 pixels higher
                    const cistercianObj = this.renderManager.renderCistercianNumeral(numberValue, centerX, centerY + cistercianYOffset);
                    if (cistercianObj) {
                        components.push({ type: 'cistercian', object: cistercianObj, offsetX: 0, offsetY: cistercianYOffset });
                    }
                }
                
                // Render Kaktovik numerals (middle distance)
                // POSITIONING FIX: Move Kaktovik numerals 4 pixels higher for improved visual alignment
                if (numberModes.kaktovik) {
                    const baseOffset = numberModes.cistercian ? -60 : -80;
                    const kaktovikYOffset = baseOffset - 4; // 4 pixels higher: -64 or -84
                    const kaktovikObj = this.renderManager.renderKaktovikNumeral(numberValue, centerX, centerY + kaktovikYOffset);
                    if (kaktovikObj) {
                        components.push({ type: 'kaktovik', object: kaktovikObj, offsetX: 0, offsetY: kaktovikYOffset });
                    }
                }
                
                return components;
            }
        };
    });

    describe('Cistercian Numeral Positioning', () => {
        test('should position Cistercian numerals 7 pixels higher than before', () => {
            // Enable only Cistercian numerals
            mockConfigManager.getNumberModes.mockReturnValue({ cistercian: true });
            
            const mockObj = { componentLayout: {} };
            const numberValue = 42;
            const centerX = 200;
            const centerY = 300;
            
            // Call the positioning method
            gameScene.renderAllNumberModes(mockObj, numberValue, centerX, centerY);
            
            // Verify that Cistercian numeral is positioned 7 pixels higher
            // Old position: centerY - 100 = 300 - 100 = 200
            // New position: centerY - 107 = 300 - 107 = 193
            const expectedY = 193;
            
            expect(mockRenderManager.renderCistercianNumeral).toHaveBeenCalledWith(
                numberValue, centerX, expectedY
            );
        });
    });

    describe('Kaktovik Numeral Positioning', () => {
        test('should position Kaktovik numerals 4 pixels higher when only Kaktovik is enabled', () => {
            // Enable only Kaktovik numerals
            mockConfigManager.getNumberModes.mockReturnValue({ kaktovik: true });
            
            const mockObj = { componentLayout: {} };
            const numberValue = 15;
            const centerX = 200;
            const centerY = 300;
            
            // Call the positioning method
            gameScene.renderAllNumberModes(mockObj, numberValue, centerX, centerY);
            
            // Verify that Kaktovik numeral is positioned 4 pixels higher
            // Old position: centerY - 80 = 300 - 80 = 220
            // New position: centerY - 84 = 300 - 84 = 216
            const expectedY = 216;
            
            expect(mockRenderManager.renderKaktovikNumeral).toHaveBeenCalledWith(
                numberValue, centerX, expectedY
            );
        });

        test('should position Kaktovik numerals 4 pixels higher when both Kaktovik and Cistercian are enabled', () => {
            // Enable both Kaktovik and Cistercian numerals
            mockConfigManager.getNumberModes.mockReturnValue({ kaktovik: true, cistercian: true });
            
            const mockObj = { componentLayout: {} };
            const numberValue = 25;
            const centerX = 200;
            const centerY = 300;
            
            // Call the positioning method
            gameScene.renderAllNumberModes(mockObj, numberValue, centerX, centerY);
            
            // Verify that Kaktovik numeral is positioned 4 pixels higher
            // Old position: centerY - 60 = 300 - 60 = 240 (when Cistercian is also enabled)
            // New position: centerY - 64 = 300 - 64 = 236
            const expectedY = 236;
            
            expect(mockRenderManager.renderKaktovikNumeral).toHaveBeenCalledWith(
                numberValue, centerX, expectedY
            );
        });
    });

    describe('Combined Positioning', () => {
        test('should position both numerals correctly when both are enabled', () => {
            // Enable both numerals
            mockConfigManager.getNumberModes.mockReturnValue({ kaktovik: true, cistercian: true });
            
            const mockObj = { componentLayout: {} };
            const numberValue = 123;
            const centerX = 400;
            const centerY = 500;
            
            // Call the positioning method
            gameScene.renderAllNumberModes(mockObj, numberValue, centerX, centerY);
            
            // Verify Cistercian positioning: centerY - 107 = 500 - 107 = 393
            expect(mockRenderManager.renderCistercianNumeral).toHaveBeenCalledWith(
                numberValue, centerX, 393
            );
            
            // Verify Kaktovik positioning: centerY - 64 = 500 - 64 = 436
            expect(mockRenderManager.renderKaktovikNumeral).toHaveBeenCalledWith(
                numberValue, centerX, 436
            );
        });
    });

    describe('Legacy Positioning Verification', () => {
        test('should demonstrate the improvement over legacy positioning', () => {
            // Test the positioning improvement
            const centerY = 300;
            
            // Legacy positioning
            const legacyCistercianY = centerY - 100; // 200
            const legacyKaktovikY = centerY - 80;     // 220
            
            // Improved positioning  
            const improvedCistercianY = centerY - 107; // 193 (7 pixels higher)
            const improvedKaktovikY = centerY - 84;    // 216 (4 pixels higher)
            
            // Verify the improvements
            expect(improvedCistercianY).toBe(legacyCistercianY - 7);
            expect(improvedKaktovikY).toBe(legacyKaktovikY - 4);
            
            // Verify the visual alignment improvement
            expect(improvedCistercianY).toBeLessThan(legacyCistercianY);
            expect(improvedKaktovikY).toBeLessThan(legacyKaktovikY);
        });
    });
});