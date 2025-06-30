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
    configManager: {
        getNumberModes: jest.fn(() => ({ cistercian: true, binary: true, kaktovik: true, objectCounting: true }))
    }
};

// Test numbers that are likely to cause overlaps
const testNumbers = [1, 9, 19, 99, 111, 119, 199, 999, 1111, 1119, 1199, 1999, 9999];

// All possible number mode configurations
const numberModeConfigurations = [
    { cistercian: false, binary: false, kaktovik: false, objectCounting: false },
    { cistercian: true, binary: false, kaktovik: false, objectCounting: false },
    { cistercian: false, binary: true, kaktovik: false, objectCounting: false },
    { cistercian: false, binary: false, kaktovik: true, objectCounting: false },
    { cistercian: false, binary: false, kaktovik: false, objectCounting: true },
    { cistercian: true, binary: true, kaktovik: false, objectCounting: false },
    { cistercian: true, binary: false, kaktovik: true, objectCounting: false },
    { cistercian: true, binary: false, kaktovik: false, objectCounting: true },
    { cistercian: false, binary: true, kaktovik: true, objectCounting: false },
    { cistercian: false, binary: true, kaktovik: false, objectCounting: true },
    { cistercian: false, binary: false, kaktovik: true, objectCounting: true },
    { cistercian: true, binary: true, kaktovik: true, objectCounting: false },
    { cistercian: true, binary: true, kaktovik: false, objectCounting: true },
    { cistercian: true, binary: false, kaktovik: true, objectCounting: true },
    { cistercian: false, binary: true, kaktovik: true, objectCounting: true },
    { cistercian: true, binary: true, kaktovik: true, objectCounting: true }
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
        
        // Resolve any overlaps
        this.resolveOverlaps();
        
        return positions;
    }
    
    positionBinary(number, centerX, centerY) {
        const binaryString = number.toString(2);
        const estimatedWidth = binaryString.length * 20;
        
        return {
            x: centerX,
            y: centerY - 40,
            width: estimatedWidth,
            height: 25,
            type: 'binary'
        };
    }
    
    positionKaktovik(number, centerX, centerY) {
        const kaktovikDigits = this.convertToKaktovik(number);
        const estimatedWidth = kaktovikDigits.length * 25;
        
        return {
            x: centerX,
            y: centerY - 70,
            width: estimatedWidth,
            height: 30,
            type: 'kaktovik'
        };
    }
    
    positionCistercian(number, centerX, centerY) {
        return {
            x: centerX,
            y: centerY - 100,
            width: 40,
            height: 50,
            type: 'cistercian'
        };
    }
    
    positionObjectCounting(number, centerX, centerY) {
        const { width, height } = this.calculateObjectCountingDimensions(number);
        
        return {
            x: centerX,
            y: centerY - 170,
            width,
            height,
            type: 'objectCounting'
        };
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
            expect(dimensions0.width).toBe(0);
            expect(dimensions0.height).toBe(0);
        });
    });
    
    describe('Dynamic Spacing Tests', () => {
        test('should maintain minimum spacing between components', () => {
            const config = { cistercian: true, binary: true, kaktovik: true, objectCounting: true };
            
            testNumbers.forEach(number => {
                const positions = positioner.calculatePositions(number, 400, 300, config);
                const components = Array.from(positioner.components.values());
                
                // Check minimum spacing
                for (let i = 0; i < components.length; i++) {
                    for (let j = i + 1; j < components.length; j++) {
                        const comp1 = components[i];
                        const comp2 = components[j];
                        const box1 = positioner.getComponentBoundingBox(comp1);
                        const box2 = positioner.getComponentBoundingBox(comp2);
                        
                        // Calculate actual spacing
                        const verticalSpacing = Math.min(
                            Math.abs(box1.top - box2.bottom),
                            Math.abs(box2.top - box1.bottom)
                        );
                        const horizontalSpacing = Math.min(
                            Math.abs(box1.left - box2.right),
                            Math.abs(box2.left - box1.right)
                        );
                        
                        const actualSpacing = Math.min(verticalSpacing, horizontalSpacing);
                        
                        if (!checkOverlap(box1, box2)) {
                            expect(actualSpacing).toBeGreaterThanOrEqual(positioner.minimumSpacing);
                        }
                    }
                }
            });
        });
    });
});

describe('Regression Tests for Specific Issues', () => {
    test('should handle 6921 with all modes enabled without overlap', () => {
        const positioner = new NumberModePositioner(mockPhaser);
        const config = { cistercian: true, binary: true, kaktovik: true, objectCounting: true };
        
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
        
        // Test with only object counting enabled
        const config1 = { cistercian: false, binary: false, kaktovik: false, objectCounting: true };
        const positions1 = positioner.calculatePositions(1234, 400, 300, config1);
        const objCountingOnly = positioner.components.get('objectCounting');
        
        // Should be closer to main number when other modes disabled
        expect(objCountingOnly.y).toBeGreaterThan(200); // Closer to center
        
        // Test with all modes enabled
        const config2 = { cistercian: true, binary: true, kaktovik: true, objectCounting: true };
        const positions2 = positioner.calculatePositions(1234, 400, 300, config2);
        const objCountingAll = positioner.components.get('objectCounting');
        
        // Should be further from main number when other modes enabled
        expect(objCountingAll.y).toBeLessThan(objCountingOnly.y);
    });
});