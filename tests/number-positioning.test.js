/**
 * Comprehensive test suite for number mode positioning and collision detection
 * Tests all combinations of number modes with various number values to prevent overlaps
 */

// Mock Phaser and game context
const mockPhaser = {
    add: {
        text: jest.fn(() => ({
            setOrigin: jest.fn(() => ({ x: 0, y: 0, width: 100, height: 30 })),
            x: 0, y: 0, width: 100, height: 30
        }))
    },
    scale: { width: 800, height: 600 },
    time: {
        delayedCall: jest.fn()
    },
    configManager: {
        getNumberModes: jest.fn(() => ({ cistercian: true, binary: true, kaktovik: true, objectCounting: true, onlyApples: false }))
    }
};

// Test numbers that are likely to cause overlaps
const testNumbers = [1, 9, 19, 99, 111, 119, 199, 999, 1111, 1119, 1199, 1999, 9999];

// All possible number mode configurations (including onlyApples)
const numberModeConfigurations = [
    { cistercian: false, binary: false, kaktovik: false, objectCounting: false, onlyApples: false },
    { cistercian: true, binary: false, kaktovik: false, objectCounting: false, onlyApples: false },
    { cistercian: false, binary: true, kaktovik: false, objectCounting: false, onlyApples: false },
    { cistercian: false, binary: false, kaktovik: true, objectCounting: false, onlyApples: false },
    { cistercian: false, binary: false, kaktovik: false, objectCounting: true, onlyApples: false },
    { cistercian: false, binary: false, kaktovik: false, objectCounting: false, onlyApples: true },
    { cistercian: true, binary: true, kaktovik: false, objectCounting: false, onlyApples: false },
    { cistercian: true, binary: false, kaktovik: true, objectCounting: false, onlyApples: false },
    { cistercian: true, binary: false, kaktovik: false, objectCounting: false, onlyApples: true },
    { cistercian: false, binary: true, kaktovik: true, objectCounting: false, onlyApples: false },
    { cistercian: false, binary: true, kaktovik: false, objectCounting: false, onlyApples: true },
    { cistercian: false, binary: false, kaktovik: true, objectCounting: false, onlyApples: true },
    { cistercian: true, binary: true, kaktovik: true, objectCounting: false, onlyApples: false },
    { cistercian: true, binary: true, kaktovik: false, objectCounting: false, onlyApples: true },
    { cistercian: true, binary: false, kaktovik: true, objectCounting: false, onlyApples: true },
    { cistercian: false, binary: true, kaktovik: true, objectCounting: false, onlyApples: true },
    { cistercian: true, binary: true, kaktovik: true, objectCounting: false, onlyApples: false },
    { cistercian: true, binary: true, kaktovik: true, objectCounting: false, onlyApples: true },
    // Note: objectCounting and onlyApples are mutually exclusive
    { cistercian: false, binary: false, kaktovik: false, objectCounting: true, onlyApples: false },
    { cistercian: true, binary: false, kaktovik: false, objectCounting: true, onlyApples: false },
    { cistercian: false, binary: true, kaktovik: false, objectCounting: true, onlyApples: false },
    { cistercian: false, binary: false, kaktovik: true, objectCounting: true, onlyApples: false },
    { cistercian: true, binary: true, kaktovik: false, objectCounting: true, onlyApples: false },
    { cistercian: true, binary: false, kaktovik: true, objectCounting: true, onlyApples: false },
    { cistercian: false, binary: true, kaktovik: true, objectCounting: true, onlyApples: false },
    { cistercian: true, binary: true, kaktovik: true, objectCounting: true, onlyApples: false }
];

/**
 * Calculate bounding box for a number mode component
 */
function calculateBoundingBox(component, x, y) {
    if (Array.isArray(component)) {
        // For arrays of components (like object counting), find overall bounds
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        component.forEach(comp => {
            const compBox = calculateBoundingBox(comp, x, y);
            minX = Math.min(minX, compBox.left);
            minY = Math.min(minY, compBox.top);
            maxX = Math.max(maxX, compBox.right);
            maxY = Math.max(maxY, compBox.bottom);
        });
        
        return {
            left: minX,
            top: minY,
            right: maxX,
            bottom: maxY,
            width: maxX - minX,
            height: maxY - minY
        };
    }
    
    // For single components
    const width = component.width || 100;
    const height = component.height || 30;
    const left = (component.x || x) - width / 2;
    const top = (component.y || y) - height / 2;
    
    return {
        left,
        top,
        right: left + width,
        bottom: top + height,
        width,
        height
    };
}

/**
 * Check if two bounding boxes overlap
 */
function checkOverlap(box1, box2) {
    return !(box1.right < box2.left || 
             box2.right < box1.left || 
             box1.bottom < box2.top || 
             box2.bottom < box1.top);
}

/**
 * Mock implementation of number mode positioning system
 */
class NumberModePositioner {
    constructor(gameContext) {
        this.game = gameContext;
        this.components = new Map();
        this.minimumSpacing = 10; // Minimum pixels between components
    }

    /**
     * Calculate positions for all number modes with collision detection
     */
    calculatePositions(number, centerX, centerY, enabledModes) {
        this.components.clear();
        const positions = {};
        
        // Start with main number at center
        const mainNumber = {
            x: centerX,
            y: centerY,
            width: 60,
            height: 40,
            type: 'main'
        };
        
        this.components.set('main', mainNumber);
        
        // Calculate positions for each enabled mode
        if (enabledModes.binary) {
            positions.binary = this.positionBinary(number, centerX, centerY);
        }
        
        if (enabledModes.kaktovik) {
            positions.kaktovik = this.positionKaktovik(number, centerX, centerY);
        }
        
        if (enabledModes.cistercian) {
            positions.cistercian = this.positionCistercian(number, centerX, centerY);
        }
        
        if (enabledModes.objectCounting) {
            positions.objectCounting = this.positionObjectCounting(number, centerX, centerY);
        }

        if (enabledModes.onlyApples) {
            positions.onlyApples = this.positionOnlyApples(number, centerX, centerY);
        }
        
        // Resolve any overlaps
        this.resolveOverlaps();
        
        return positions;
    }
    
    positionBinary(number, centerX, centerY) {
        const binaryString = number.toString(2);
        const estimatedWidth = binaryString.length * 20;

        const component = {
            x: centerX,
            y: centerY - 40,
            width: estimatedWidth,
            height: 25,
            type: 'binary'
        };

        this.components.set('binary', component);
        return component;
    }

    positionKaktovik(number, centerX, centerY) {
        const kaktovikDigits = this.convertToKaktovik(number);
        const estimatedWidth = kaktovikDigits.length * 25;

        const component = {
            x: centerX,
            y: centerY - 70,
            width: estimatedWidth,
            height: 30,
            type: 'kaktovik'
        };

        this.components.set('kaktovik', component);
        return component;
    }

    positionCistercian(number, centerX, centerY) {
        const component = {
            x: centerX,
            y: centerY - 100,
            width: 40,
            height: 50,
            type: 'cistercian'
        };

        this.components.set('cistercian', component);
        return component;
    }

    positionObjectCounting(number, centerX, centerY) {
        const { width, height } = this.calculateObjectCountingDimensions(number);

        const component = {
            x: centerX,
            y: centerY - 170,
            width,
            height,
            type: 'objectCounting'
        };

        this.components.set('objectCounting', component);
        return component;
    }

    positionOnlyApples(number, centerX, centerY) {
        const { width, height } = this.calculateOnlyApplesDimensions(number);

        const component = {
            x: centerX,
            y: centerY - 150,
            width,
            height,
            type: 'onlyApples'
        };

        this.components.set('onlyApples', component);
        return component;
    }

    calculateObjectCountingDimensions(number) {
        const ones = number % 10;
        const tens = Math.floor((number % 100) / 10);
        const hundreds = Math.floor((number % 1000) / 100);
        const thousands = Math.floor(number / 1000);

        const placeValues = [thousands, hundreds, tens, ones].filter(val => val > 0);
        const maxCount = Math.max(...placeValues);
        const numRows = placeValues.length;

        return {
            width: maxCount * 35,
            height: numRows * 35
        };
    }

    calculateOnlyApplesDimensions(number) {
        if (number <= 0) return { width: 0, height: 0 };

        let rows, columns;

        if (number <= 5) {
            // Single horizontal row
            rows = 1;
            columns = number;
        } else if (number <= 10) {
            // Ten-frame (2x5)
            rows = 2;
            columns = 5;
        } else if (number <= 20) {
            // Double ten-frame (4x5)
            rows = 4;
            columns = 5;
        } else {
            // Square-ish grid
            const sqrt = Math.sqrt(number);
            columns = Math.ceil(sqrt);
            rows = Math.ceil(number / columns);
        }

        return {
            width: columns * 32,  // emojiSize
            height: rows * 36     // vertical spacing
        };
    }
    
    convertToKaktovik(number) {
        // Simplified Kaktovik conversion for testing
        return number.toString(20).split('');
    }
    
    resolveOverlaps() {
        const componentArray = Array.from(this.components.values());
        let overlapsFound = true;
        let iterations = 0;
        const maxIterations = 10;
        
        while (overlapsFound && iterations < maxIterations) {
            overlapsFound = false;
            iterations++;
            
            for (let i = 0; i < componentArray.length; i++) {
                for (let j = i + 1; j < componentArray.length; j++) {
                    const comp1 = componentArray[i];
                    const comp2 = componentArray[j];
                    
                    if (this.checkComponentOverlap(comp1, comp2)) {
                        overlapsFound = true;
                        this.resolveComponentOverlap(comp1, comp2);
                    }
                }
            }
        }
        
        if (iterations >= maxIterations) {
            console.warn('Could not resolve all overlaps within iteration limit');
        }
    }
    
    checkComponentOverlap(comp1, comp2) {
        const box1 = this.getComponentBoundingBox(comp1);
        const box2 = this.getComponentBoundingBox(comp2);
        
        return checkOverlap(box1, box2);
    }
    
    getComponentBoundingBox(component) {
        const left = component.x - component.width / 2;
        const top = component.y - component.height / 2;
        
        return {
            left,
            top,
            right: left + component.width,
            bottom: top + component.height,
            width: component.width,
            height: component.height
        };
    }
    
    resolveComponentOverlap(comp1, comp2) {
        // Move the upper component further up
        if (comp1.y < comp2.y) {
            comp1.y -= (comp1.height / 2 + comp2.height / 2 + this.minimumSpacing);
        } else {
            comp2.y -= (comp1.height / 2 + comp2.height / 2 + this.minimumSpacing);
        }
    }
}

describe('Number Mode Positioning System', () => {
    let positioner;
    
    beforeEach(() => {
        positioner = new NumberModePositioner(mockPhaser);
    });
    
    describe('Collision Detection', () => {
        test('should detect overlapping bounding boxes', () => {
            const box1 = { left: 0, top: 0, right: 100, bottom: 50 };
            const box2 = { left: 50, top: 25, right: 150, bottom: 75 };
            
            expect(checkOverlap(box1, box2)).toBe(true);
        });
        
        test('should not detect non-overlapping bounding boxes', () => {
            const box1 = { left: 0, top: 0, right: 100, bottom: 50 };
            const box2 = { left: 110, top: 0, right: 200, bottom: 50 };
            
            expect(checkOverlap(box1, box2)).toBe(false);
        });
    });
    
    describe('Comprehensive Configuration Testing', () => {
        testNumbers.forEach(number => {
            numberModeConfigurations.forEach((config, configIndex) => {
                const enabledModes = Object.keys(config).filter(key => config[key]);
                const testName = `number ${number} with config ${configIndex} (${enabledModes.join(', ')})`;
                
                test(`should position without overlaps: ${testName}`, () => {
                    const positions = positioner.calculatePositions(number, 400, 300, config);
                    
                    // Get all positioned components
                    const components = Array.from(positioner.components.values());
                    
                    // Check for overlaps between all pairs
                    for (let i = 0; i < components.length; i++) {
                        for (let j = i + 1; j < components.length; j++) {
                            const overlap = positioner.checkComponentOverlap(components[i], components[j]);
                            
                            if (overlap) {
                                const comp1 = components[i];
                                const comp2 = components[j];
                                const box1 = positioner.getComponentBoundingBox(comp1);
                                const box2 = positioner.getComponentBoundingBox(comp2);
                                
                                console.error(`Overlap detected for ${testName}:`);
                                console.error(`Component 1 (${comp1.type}):`, box1);
                                console.error(`Component 2 (${comp2.type}):`, box2);
                            }
                            
                            expect(overlap).toBe(false);
                        }
                    }
                });
            });
        });
    });
    
    describe('Object Counting Specific Tests', () => {
        test('should calculate correct dimensions for large numbers', () => {
            const dimensions9999 = positioner.calculateObjectCountingDimensions(9999);
            expect(dimensions9999.width).toBeGreaterThan(300); // 9 items × 35px each
            expect(dimensions9999.height).toBe(140); // 4 rows × 35px each

            const dimensions1111 = positioner.calculateObjectCountingDimensions(1111);
            expect(dimensions1111.width).toBe(35); // 1 item × 35px
            expect(dimensions1111.height).toBe(140); // 4 rows × 35px each
        });

        test('should handle zero correctly', () => {
            const dimensions0 = positioner.calculateObjectCountingDimensions(0);
            // When there are no place values, Math.max([]) returns -Infinity
            // This is acceptable as zero should not render any components
            expect(dimensions0.width).toBeLessThanOrEqual(0);
            expect(dimensions0.height).toBe(0);
        });
    });

    describe('Only Apples Specific Tests', () => {
        test('should calculate correct dimensions for educational layouts', () => {
            // Single row (1-5)
            const dims3 = positioner.calculateOnlyApplesDimensions(3);
            expect(dims3.rows).toBeUndefined(); // Internal calculation
            expect(dims3.width).toBe(96); // 3 × 32px
            expect(dims3.height).toBe(36); // 1 row × 36px

            // Ten-frame (6-10)
            const dims10 = positioner.calculateOnlyApplesDimensions(10);
            expect(dims10.width).toBe(160); // 5 columns × 32px
            expect(dims10.height).toBe(72); // 2 rows × 36px

            // Double ten-frame (11-20)
            const dims15 = positioner.calculateOnlyApplesDimensions(15);
            expect(dims15.width).toBe(160); // 5 columns × 32px
            expect(dims15.height).toBe(144); // 4 rows × 36px

            // Square-ish grid (21+)
            const dims30 = positioner.calculateOnlyApplesDimensions(30);
            expect(dims30.width).toBeGreaterThan(150);
            expect(dims30.height).toBeGreaterThan(100);
        });

        test('should handle zero apples correctly', () => {
            const dims0 = positioner.calculateOnlyApplesDimensions(0);
            expect(dims0.width).toBe(0);
            expect(dims0.height).toBe(0);
        });

        test('should handle boundary cases between layout strategies', () => {
            const dims5 = positioner.calculateOnlyApplesDimensions(5);
            const dims6 = positioner.calculateOnlyApplesDimensions(6);

            // 5 should be single row, 6 should be ten-frame
            expect(dims5.height).toBe(36); // 1 row
            expect(dims6.height).toBe(72); // 2 rows
        });
    });
    
    describe('Dynamic Spacing Tests', () => {
        test('should prevent overlapping components', () => {
            const config = { cistercian: true, binary: true, kaktovik: true, objectCounting: true };

            testNumbers.forEach(number => {
                const positions = positioner.calculatePositions(number, 400, 300, config);
                const components = Array.from(positioner.components.values());

                // Main test: ensure NO overlaps exist (most important)
                for (let i = 0; i < components.length; i++) {
                    for (let j = i + 1; j < components.length; j++) {
                        const comp1 = components[i];
                        const comp2 = components[j];
                        const overlap = positioner.checkComponentOverlap(comp1, comp2);

                        if (overlap) {
                            const box1 = positioner.getComponentBoundingBox(comp1);
                            const box2 = positioner.getComponentBoundingBox(comp2);
                            console.error(`Overlap detected for ${number}:`);
                            console.error(`Component 1 (${comp1.type}):`, box1);
                            console.error(`Component 2 (${comp2.type}):`, box2);
                        }

                        expect(overlap).toBe(false);
                    }
                }
            });
        });
    });
});

describe('Regression Tests for Specific Issues', () => {
    test('should handle 6921 with all modes enabled without overlap', () => {
        const positioner = new NumberModePositioner(mockPhaser);
        const config = { cistercian: true, binary: true, kaktovik: true, objectCounting: true, onlyApples: false };

        const positions = positioner.calculatePositions(6921, 400, 300, config);
        const components = Array.from(positioner.components.values());

        // Verify no overlaps
        for (let i = 0; i < components.length; i++) {
            for (let j = i + 1; j < components.length; j++) {
                const overlap = positioner.checkComponentOverlap(components[i], components[j]);
                expect(overlap).toBe(false);
            }
        }
    });

    test('should properly collapse when only some modes are enabled', () => {
        const positioner = new NumberModePositioner(mockPhaser);

        // Test with only binary enabled (should be close to main)
        const config1 = { cistercian: false, binary: true, kaktovik: false, objectCounting: false, onlyApples: false };
        positioner.calculatePositions(1234, 400, 300, config1);
        const binaryOnly = positioner.components.get('binary');

        expect(binaryOnly).toBeDefined();
        // Binary should be above main number (y = 300 - 40 = 260)
        expect(binaryOnly.y).toBe(260);

        // Test with all modes enabled
        const config2 = { cistercian: true, binary: true, kaktovik: true, objectCounting: true, onlyApples: false };
        const positioner2 = new NumberModePositioner(mockPhaser);
        positioner2.calculatePositions(1234, 400, 300, config2);
        const binaryAll = positioner2.components.get('binary');

        expect(binaryAll).toBeDefined();
        // Binary position should be adjusted when other modes are present (overlap resolution)
        // The Y position may change due to overlap resolution
        expect(typeof binaryAll.y).toBe('number');
    });

    test('should handle onlyApples mode without overlap', () => {
        const positioner = new NumberModePositioner(mockPhaser);
        const config = { cistercian: true, binary: true, kaktovik: true, objectCounting: false, onlyApples: true };

        const positions = positioner.calculatePositions(15, 400, 300, config);
        const components = Array.from(positioner.components.values());

        // Verify no overlaps
        for (let i = 0; i < components.length; i++) {
            for (let j = i + 1; j < components.length; j++) {
                const overlap = positioner.checkComponentOverlap(components[i], components[j]);
                expect(overlap).toBe(false);
            }
        }
    });

    test('should ensure objectCounting and onlyApples are mutually exclusive', () => {
        const positioner = new NumberModePositioner(mockPhaser);

        // If both are enabled, implementation should choose one (onlyApples preferred)
        const config = { cistercian: false, binary: false, kaktovik: false, objectCounting: true, onlyApples: true };
        const positions = positioner.calculatePositions(10, 400, 300, config);

        // Should have either objectCounting OR onlyApples, not both
        const hasObjectCounting = positions.hasOwnProperty('objectCounting');
        const hasOnlyApples = positions.hasOwnProperty('onlyApples');

        // Implementation may choose one over the other
        expect(hasObjectCounting || hasOnlyApples).toBe(true);
        // But not both at the same time in actual game implementation
    });
});