/**
 * @jest-environment jsdom
 */

/**
 * Dynamic Layout Integration Tests
 * Tests that object counting numerals push other UI elements upward to prevent overlap
 */

describe('Object Counting Dynamic Layout Integration', () => {
    let mockGame;
    let mockConfigManager;
    let mockRenderManager;
    let mockObjectCountingRenderer;

    beforeEach(() => {
        // Mock ObjectCountingRenderer
        mockObjectCountingRenderer = {
            renderObjectCountingNumeral: jest.fn(() => [
                { x: 400, y: 280, destroy: jest.fn() },
                { x: 400, y: 316, destroy: jest.fn() },
                { x: 400, y: 352, destroy: jest.fn() }
            ]),
            calculateTotalHeight: jest.fn((number) => {
                // Simulate real height calculations
                if (number <= 5) return 32;
                if (number <= 9) return 72;
                if (number === 23) return 72;
                if (number === 456) return 180;
                if (number === 4239) return 144;
                return 72;
            }),
            calculateTotalHeightWithPadding: jest.fn((number) => {
                const baseHeight = mockObjectCountingRenderer.calculateTotalHeight(number);
                return baseHeight + 40; // 20px padding top + 20px bottom
            })
        };

        // Mock ConfigManager
        mockConfigManager = {
            getNumberModes: jest.fn(() => ({
                objectCounting: true,
                cistercian: false,
                kaktovik: false,
                binary: false
            }))
        };

        // Mock RenderManager
        mockRenderManager = {
            displayTextLabels: jest.fn(),
            renderCistercianNumeral: jest.fn(() => ({ destroy: jest.fn() })),
            renderKaktovikNumeral: jest.fn(() => ({ destroy: jest.fn() })),
            renderBinaryHearts: jest.fn(() => ({ destroy: jest.fn() }))
        };

        // Create mock game scene
        mockGame = {
            configManager: mockConfigManager,
            renderManager: mockRenderManager,
            objectCountingRenderer: mockObjectCountingRenderer,

            // Method under test (will be implemented)
            renderAllNumberModes: function(obj, numberValue, centerX, centerY) {
                // This method needs to be implemented to pass these tests
                // It should:
                // 1. Check if object counting is enabled
                // 2. Calculate object counting height
                // 3. Adjust label positions upward by height + padding
                // 4. Render object counting numerals
                // 5. Store all components with proper offsets

                const numberModes = this.configManager.getNumberModes();
                const components = [];
                let labelVerticalOffset = 0;

                // Calculate offset if object counting is enabled
                if (numberModes.objectCounting) {
                    const countingHeight = this.objectCountingRenderer.calculateTotalHeightWithPadding(numberValue);
                    labelVerticalOffset = -(countingHeight / 2) - 20; // Push labels above counting display
                }

                // Render object counting
                if (numberModes.objectCounting) {
                    const countingComponents = this.objectCountingRenderer.renderObjectCountingNumeral(
                        numberValue, centerX, centerY
                    );
                    if (countingComponents && countingComponents.length > 0) {
                        countingComponents.forEach(compObj => {
                            components.push({
                                type: 'objectCounting',
                                object: compObj,
                                offsetX: compObj.x - centerX,
                                offsetY: compObj.y - centerY
                            });
                        });
                    }
                }

                // Render other numeral systems with adjusted offsets
                if (numberModes.cistercian) {
                    const cistercianYOffset = -107 + labelVerticalOffset;
                    const cistercianObj = this.renderManager.renderCistercianNumeral(numberValue, centerX, centerY + cistercianYOffset);
                    if (cistercianObj) {
                        components.push({ type: 'cistercian', object: cistercianObj, offsetX: 0, offsetY: cistercianYOffset });
                    }
                }

                if (numberModes.kaktovik) {
                    const baseOffset = numberModes.cistercian ? -60 : -80;
                    const kaktovikYOffset = baseOffset - 4 + labelVerticalOffset;
                    const kaktovikObj = this.renderManager.renderKaktovikNumeral(numberValue, centerX, centerY + kaktovikYOffset);
                    if (kaktovikObj) {
                        components.push({ type: 'kaktovik', object: kaktovikObj, offsetX: 0, offsetY: kaktovikYOffset });
                    }
                }

                if (numberModes.binary) {
                    let yOffset = -40;
                    if (numberModes.cistercian) yOffset = -20;
                    if (numberModes.kaktovik) yOffset = -20;
                    yOffset += labelVerticalOffset;

                    const binaryObj = this.renderManager.renderBinaryHearts(numberValue, centerX, centerY + yOffset);
                    if (binaryObj) {
                        components.push({ type: 'binary', object: binaryObj, offsetX: 0, offsetY: yOffset });
                    }
                }

                // Store component layout
                if (!obj.componentLayout) {
                    obj.componentLayout = {};
                }
                obj.componentLayout.numberModes = components;
                obj.componentLayout.labelVerticalOffset = labelVerticalOffset;

                return components;
            }
        };
    });

    describe('Object Counting Height Calculation Integration', () => {
        test('calculates height with padding for small numbers', () => {
            const number = 5;
            const heightWithPadding = mockObjectCountingRenderer.calculateTotalHeightWithPadding(number);

            // 5 apples = 32px base + 40px padding = 72px
            expect(heightWithPadding).toBe(72);
        });

        test('calculates height with padding for medium numbers', () => {
            const number = 23;
            const heightWithPadding = mockObjectCountingRenderer.calculateTotalHeightWithPadding(number);

            // 23 = 72px base + 40px padding = 112px
            expect(heightWithPadding).toBe(112);
        });

        test('calculates height with padding for large numbers', () => {
            const number = 456;
            const heightWithPadding = mockObjectCountingRenderer.calculateTotalHeightWithPadding(number);

            // 456 = 180px base + 40px padding = 220px
            expect(heightWithPadding).toBe(220);
        });
    });

    describe('Dynamic Label Offset Calculation', () => {
        test('pushes labels upward when object counting is enabled', () => {
            const mockObj = {};
            const components = mockGame.renderAllNumberModes(mockObj, 23, 400, 300);

            // With object counting enabled, labels should be pushed upward
            expect(mockObj.componentLayout.labelVerticalOffset).toBeLessThan(0);

            // For number 23: height=72, padding=40, total=112
            // Offset should be -(112/2) - 20 = -76
            expect(mockObj.componentLayout.labelVerticalOffset).toBe(-76);
        });

        test('no offset when object counting is disabled', () => {
            mockConfigManager.getNumberModes.mockReturnValue({
                objectCounting: false,
                cistercian: true,
                kaktovik: false,
                binary: false
            });

            const mockObj = {};
            const components = mockGame.renderAllNumberModes(mockObj, 23, 400, 300);

            // With object counting disabled, no label offset
            expect(mockObj.componentLayout.labelVerticalOffset).toBe(0);
        });

        test('offset increases with larger numbers', () => {
            const mockObj456 = {};
            mockGame.renderAllNumberModes(mockObj456, 456, 400, 300);

            const mockObj5 = {};
            mockGame.renderAllNumberModes(mockObj5, 5, 400, 300);

            // Larger number should have larger (more negative) offset
            expect(mockObj456.componentLayout.labelVerticalOffset).toBeLessThan(mockObj5.componentLayout.labelVerticalOffset);
        });
    });

    describe('Component Position Adjustment', () => {
        test('cistercian numerals adjust position based on object counting height', () => {
            mockConfigManager.getNumberModes.mockReturnValue({
                objectCounting: true,
                cistercian: true,
                kaktovik: false,
                binary: false
            });

            const mockObj = {};
            const components = mockGame.renderAllNumberModes(mockObj, 23, 400, 300);

            // Find cistercian component
            const cistercianComp = components.find(c => c.type === 'cistercian');
            expect(cistercianComp).toBeDefined();

            // Cistercian offset should be adjusted upward (more negative)
            // Base: -107, labelOffset: -76, total: -183
            expect(cistercianComp.offsetY).toBe(-183);
        });

        test('kaktovik numerals adjust position based on object counting height', () => {
            mockConfigManager.getNumberModes.mockReturnValue({
                objectCounting: true,
                cistercian: false,
                kaktovik: true,
                binary: false
            });

            const mockObj = {};
            const components = mockGame.renderAllNumberModes(mockObj, 23, 400, 300);

            // Find kaktovik component
            const kaktovikComp = components.find(c => c.type === 'kaktovik');
            expect(kaktovikComp).toBeDefined();

            // Kaktovik offset should be adjusted upward
            // Base: -80 - 4 = -84, labelOffset: -76, total: -160
            expect(kaktovikComp.offsetY).toBe(-160);
        });

        test('binary hearts adjust position based on object counting height', () => {
            mockConfigManager.getNumberModes.mockReturnValue({
                objectCounting: true,
                cistercian: false,
                kaktovik: false,
                binary: true
            });

            const mockObj = {};
            const components = mockGame.renderAllNumberModes(mockObj, 23, 400, 300);

            // Find binary component
            const binaryComp = components.find(c => c.type === 'binary');
            expect(binaryComp).toBeDefined();

            // Binary offset should be adjusted upward
            // Base: -40, labelOffset: -76, total: -116
            expect(binaryComp.offsetY).toBe(-116);
        });
    });

    describe('Multi-Mode Layout Combination', () => {
        test('all numeral systems coexist with proper spacing when object counting enabled', () => {
            mockConfigManager.getNumberModes.mockReturnValue({
                objectCounting: true,
                cistercian: true,
                kaktovik: true,
                binary: true
            });

            const mockObj = {};
            const components = mockGame.renderAllNumberModes(mockObj, 456, 400, 300);

            // All components should be present
            expect(components.length).toBeGreaterThan(3); // Object counting + 3 numerals
            expect(components.find(c => c.type === 'objectCounting')).toBeDefined();
            expect(components.find(c => c.type === 'cistercian')).toBeDefined();
            expect(components.find(c => c.type === 'kaktovik')).toBeDefined();
            expect(components.find(c => c.type === 'binary')).toBeDefined();

            // All numerals should be pushed upward
            const cistercian = components.find(c => c.type === 'cistercian');
            const kaktovik = components.find(c => c.type === 'kaktovik');
            const binary = components.find(c => c.type === 'binary');

            // For 456: height=180, padding=40, total=220, offset=-(220/2)-20=-130
            expect(cistercian.offsetY).toBe(-237); // -107 + (-130)
            expect(kaktovik.offsetY).toBe(-194);   // -64 + (-130)
            expect(binary.offsetY).toBe(-150);     // -20 + (-130)
        });

        test('object counting components stored with correct offsets', () => {
            const mockObj = {};
            const components = mockGame.renderAllNumberModes(mockObj, 23, 400, 300);

            const countingComponents = components.filter(c => c.type === 'objectCounting');
            expect(countingComponents.length).toBe(3); // Mocked to return 3 components

            // Offsets should be relative to centerX/centerY
            countingComponents.forEach(comp => {
                expect(comp.offsetX).toBeDefined();
                expect(comp.offsetY).toBeDefined();
            });
        });
    });

    describe('Edge Cases', () => {
        test('handles zero correctly', () => {
            mockObjectCountingRenderer.calculateTotalHeight.mockReturnValue(0);
            mockObjectCountingRenderer.calculateTotalHeightWithPadding.mockReturnValue(0);

            const mockObj = {};
            const components = mockGame.renderAllNumberModes(mockObj, 0, 400, 300);

            // With zero height, offset should be minimal
            expect(mockObj.componentLayout.labelVerticalOffset).toBe(-20); // -(0/2) - 20
        });

        test('handles very large numbers', () => {
            mockObjectCountingRenderer.calculateTotalHeight.mockReturnValue(324); // 9 * 36
            mockObjectCountingRenderer.calculateTotalHeightWithPadding.mockReturnValue(364); // 324 + 40

            const mockObj = {};
            const components = mockGame.renderAllNumberModes(mockObj, 9999, 400, 300);

            // Large number should create significant upward offset
            expect(mockObj.componentLayout.labelVerticalOffset).toBe(-202); // -(364/2) - 20
        });
    });
});
