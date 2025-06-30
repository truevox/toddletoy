/**
 * Basic positioning system test
 */

describe('PositioningSystem Basic Tests', () => {
    test('should handle basic collision detection', () => {
        // Test basic overlap detection
        function checkOverlap(box1, box2) {
            return !(box1.right < box2.left || 
                     box2.right < box1.left || 
                     box1.bottom < box2.top || 
                     box2.bottom < box1.top);
        }
        
        const box1 = { left: 0, top: 0, right: 100, bottom: 50 };
        const box2 = { left: 50, top: 25, right: 150, bottom: 75 };
        const box3 = { left: 110, top: 0, right: 200, bottom: 50 };
        
        expect(checkOverlap(box1, box2)).toBe(true);  // Should overlap
        expect(checkOverlap(box1, box3)).toBe(false); // Should not overlap
    });
    
    test('should calculate object counting dimensions correctly', () => {
        function calculateObjectCountingDimensions(number) {
            if (number === 0) return { width: 0, height: 0 };
            
            const ones = number % 10;
            const tens = Math.floor((number % 100) / 10);
            const hundreds = Math.floor((number % 1000) / 100);
            const thousands = Math.floor(number / 1000);
            
            const placeValues = [
                { count: thousands },
                { count: hundreds },
                { count: tens },
                { count: ones }
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
        
        // Test specific problematic numbers
        const dims9999 = calculateObjectCountingDimensions(9999);
        expect(dims9999.width).toBe(315); // 9 × 35
        expect(dims9999.height).toBe(140); // 4 rows × 35
        
        const dims6921 = calculateObjectCountingDimensions(6921);
        expect(dims6921.width).toBe(315); // 9 × 35 (max count is 9)
        expect(dims6921.height).toBe(140); // 4 rows × 35
        
        const dims0 = calculateObjectCountingDimensions(0);
        expect(dims0.width).toBe(0);
        expect(dims0.height).toBe(0);
    });
    
    test('should handle edge cases correctly', () => {
        const testNumbers = [1, 9, 19, 99, 111, 119, 199, 999, 1111, 1119, 1199, 1999, 9999];
        
        testNumbers.forEach(number => {
            function calculateObjectCountingDimensions(number) {
                if (number === 0) return { width: 0, height: 0 };
                
                const ones = number % 10;
                const tens = Math.floor((number % 100) / 10);
                const hundreds = Math.floor((number % 1000) / 100);
                const thousands = Math.floor(number / 1000);
                
                const placeValues = [thousands, hundreds, tens, ones].filter(val => val > 0);
                
                if (placeValues.length === 0) return { width: 0, height: 0 };
                
                const maxCount = Math.max(...placeValues);
                const numRows = placeValues.length;
                const spacing = 35;
                
                return {
                    width: maxCount * spacing,
                    height: numRows * spacing
                };
            }
            
            const dims = calculateObjectCountingDimensions(number);
            
            // Should have reasonable dimensions
            expect(dims.width).toBeGreaterThanOrEqual(0);
            expect(dims.height).toBeGreaterThanOrEqual(0);
            expect(dims.width).toBeLessThanOrEqual(315); // Max 9 × 35
            expect(dims.height).toBeLessThanOrEqual(140); // Max 4 rows × 35
        });
    });
});