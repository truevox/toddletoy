/**
 * Advanced positioning system with collision detection for number mode components
 * Ensures no overlaps between different number display modes
 */

export class PositioningSystem {
    constructor(gameScene) {
        this.game = gameScene;
        this.components = new Map();
        this.minimumSpacing = 15; // Minimum pixels between components
        this.maxIterations = 20; // Maximum attempts to resolve overlaps
    }

    /**
     * Calculate optimal positions for all number modes with collision detection
     */
    calculateNumberModePositions(number, centerX, centerY, enabledModes) {
        this.components.clear();
        
        // Start with main number at center - this is the anchor point
        const mainNumber = {
            id: 'main',
            x: centerX,
            y: centerY,
            width: this.estimateMainNumberWidth(number),
            height: 40,
            type: 'main',
            priority: 0 // Highest priority - never moves
        };
        
        this.components.set('main', mainNumber);
        
        // Calculate initial positions for each enabled mode
        const positions = {};
        
        if (enabledModes.binary) {
            positions.binary = this.calculateBinaryPosition(number, centerX, centerY);
        }
        
        if (enabledModes.kaktovik) {
            positions.kaktovik = this.calculateKaktovikPosition(number, centerX, centerY);
        }
        
        if (enabledModes.cistercian) {
            positions.cistercian = this.calculateCistercianPosition(number, centerX, centerY);
        }
        
        if (enabledModes.objectCounting) {
            positions.objectCounting = this.calculateObjectCountingPosition(number, centerX, centerY);
        }
        
        // Add all components to the system
        Object.entries(positions).forEach(([key, position]) => {
            this.components.set(key, position);
        });
        
        // Resolve any overlaps using collision detection
        this.resolveAllOverlaps();
        
        // Convert back to coordinate format expected by game
        const finalPositions = {};
        this.components.forEach((component, key) => {
            if (key !== 'main') {
                finalPositions[key] = {
                    x: component.x,
                    y: component.y,
                    offsetX: component.x - centerX,
                    offsetY: component.y - centerY
                };
            }
        });
        
        return finalPositions;
    }
    
    estimateMainNumberWidth(number) {
        const digits = number.toString().length;
        return Math.max(40, digits * 20); // Minimum 40px, ~20px per digit
    }
    
    calculateBinaryPosition(number, centerX, centerY) {
        const binaryString = number.toString(2);
        const estimatedWidth = binaryString.length * 18; // Heart emojis are wider
        
        return {
            id: 'binary',
            x: centerX,
            y: centerY - 50, // Start above main number
            width: estimatedWidth,
            height: 25,
            type: 'binary',
            priority: 3
        };
    }
    
    calculateKaktovikPosition(number, centerX, centerY) {
        const base20Digits = this.convertToBase20(number);
        const estimatedWidth = base20Digits.length * 30; // Kaktovik characters are wide
        
        return {
            id: 'kaktovik',
            x: centerX,
            y: centerY - 80, // Above binary
            width: estimatedWidth,
            height: 35,
            type: 'kaktovik',
            priority: 2
        };
    }
    
    calculateCistercianPosition(number, centerX, centerY) {
        return {
            id: 'cistercian',
            x: centerX,
            y: centerY - 120, // Above kaktovik
            width: 50,
            height: 60,
            type: 'cistercian',
            priority: 4
        };
    }
    
    calculateObjectCountingPosition(number, centerX, centerY) {
        const dimensions = this.calculateObjectCountingDimensions(number);
        
        return {
            id: 'objectCounting',
            x: centerX,
            y: centerY - 180, // Above everything else initially
            width: dimensions.width,
            height: dimensions.height,
            type: 'objectCounting',
            priority: 1 // High priority - should stay high
        };
    }
    
    calculateObjectCountingDimensions(number) {
        if (number === 0) return { width: 0, height: 0 };
        
        const ones = number % 10;
        const tens = Math.floor((number % 100) / 10);
        const hundreds = Math.floor((number % 1000) / 100);
        const thousands = Math.floor(number / 1000);
        
        const placeValues = [
            { count: thousands, name: 'thousands' },
            { count: hundreds, name: 'hundreds' },
            { count: tens, name: 'tens' },
            { count: ones, name: 'ones' }
        ].filter(place => place.count > 0);
        
        if (placeValues.length === 0) return { width: 0, height: 0 };
        
        const maxCount = Math.max(...placeValues.map(p => p.count));
        const numRows = placeValues.length;
        const spacing = 35;
        
        return {
            width: maxCount * spacing,
            height: numRows * spacing
        };
    }
    
    convertToBase20(number) {
        if (number === 0) return [0];
        const digits = [];
        while (number > 0) {
            digits.unshift(number % 20);
            number = Math.floor(number / 20);
        }
        return digits;
    }
    
    /**
     * Resolve all overlaps using iterative collision detection
     */
    resolveAllOverlaps() {
        let overlapsFound = true;
        let iterations = 0;
        
        while (overlapsFound && iterations < this.maxIterations) {
            overlapsFound = false;
            iterations++;
            
            const componentArray = Array.from(this.components.values())
                .sort((a, b) => a.priority - b.priority); // Process by priority
            
            for (let i = 0; i < componentArray.length; i++) {
                for (let j = i + 1; j < componentArray.length; j++) {
                    const comp1 = componentArray[i];
                    const comp2 = componentArray[j];
                    
                    if (this.checkOverlap(comp1, comp2)) {
                        overlapsFound = true;
                        this.resolveOverlap(comp1, comp2);
                    }
                }
            }
        }
        
        if (iterations >= this.maxIterations) {
            console.warn(`Could not resolve all overlaps within ${this.maxIterations} iterations`);
            
            // Last resort: force spacing
            this.forceVerticalSpacing();
        }
    }
    
    /**
     * Check if two components overlap
     */
    checkOverlap(comp1, comp2) {
        const box1 = this.getBoundingBox(comp1);
        const box2 = this.getBoundingBox(comp2);
        
        // Add padding to ensure minimum spacing
        const padding = this.minimumSpacing / 2;
        
        return !(box1.right + padding < box2.left - padding || 
                 box2.right + padding < box1.left - padding || 
                 box1.bottom + padding < box2.top - padding || 
                 box2.bottom + padding < box1.top - padding);
    }
    
    /**
     * Get bounding box for a component
     */
    getBoundingBox(component) {
        const left = component.x - component.width / 2;
        const top = component.y - component.height / 2;
        
        return {
            left,
            top,
            right: left + component.width,
            bottom: top + component.height,
            width: component.width,
            height: component.height,
            centerX: component.x,
            centerY: component.y
        };
    }
    
    /**
     * Resolve overlap between two components
     */
    resolveOverlap(comp1, comp2) {
        // Don't move the main number (priority 0)
        if (comp1.priority === 0) {
            this.moveComponentAwayFromMain(comp2, comp1);
            return;
        }
        
        if (comp2.priority === 0) {
            this.moveComponentAwayFromMain(comp1, comp2);
            return;
        }
        
        // Move the lower priority component (higher number = lower priority)
        if (comp1.priority <= comp2.priority) {
            this.moveComponentUp(comp2, comp1);
        } else {
            this.moveComponentUp(comp1, comp2);
        }
    }
    
    /**
     * Move a component away from the main number
     */
    moveComponentAwayFromMain(component, mainComponent) {
        const box1 = this.getBoundingBox(component);
        const box2 = this.getBoundingBox(mainComponent);
        
        // Calculate how much to move up
        const requiredSpacing = (box1.height + box2.height) / 2 + this.minimumSpacing;
        const currentSpacing = box2.top - box1.bottom;
        
        if (currentSpacing < this.minimumSpacing) {
            const moveDistance = this.minimumSpacing - currentSpacing + 5; // Extra buffer
            component.y -= moveDistance;
        }
    }
    
    /**
     * Move a component upward to avoid overlap
     */
    moveComponentUp(component, otherComponent) {
        const box1 = this.getBoundingBox(component);
        const box2 = this.getBoundingBox(otherComponent);
        
        // Move component up so its bottom edge clears the other component's top edge
        const requiredY = box2.top - component.height / 2 - this.minimumSpacing;
        
        if (component.y > requiredY) {
            component.y = requiredY;
        }
    }
    
    /**
     * Last resort: force proper vertical spacing
     */
    forceVerticalSpacing() {
        const components = Array.from(this.components.values())
            .filter(comp => comp.id !== 'main')
            .sort((a, b) => a.y - b.y); // Sort by Y position (top to bottom)
        
        let currentY = this.components.get('main').y - 60; // Start above main
        
        components.forEach(component => {
            const requiredY = currentY - component.height / 2;
            component.y = requiredY;
            currentY = requiredY - component.height / 2 - this.minimumSpacing;
        });
    }
    
    /**
     * Debug method to visualize component positions
     */
    debugVisualize() {
        const components = Array.from(this.components.values());
        console.log('Component Positions:');
        
        components.forEach(comp => {
            const box = this.getBoundingBox(comp);
            console.log(`${comp.id}: (${comp.x}, ${comp.y}) - Box: (${box.left}, ${box.top}) to (${box.right}, ${box.bottom})`);
        });
        
        // Check for any remaining overlaps
        const overlaps = [];
        for (let i = 0; i < components.length; i++) {
            for (let j = i + 1; j < components.length; j++) {
                if (this.checkOverlap(components[i], components[j])) {
                    overlaps.push([components[i].id, components[j].id]);
                }
            }
        }
        
        if (overlaps.length > 0) {
            console.warn('Remaining overlaps:', overlaps);
        } else {
            console.log('✅ No overlaps detected');
        }
        
        return overlaps.length === 0;
    }
}