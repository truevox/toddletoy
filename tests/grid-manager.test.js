import GridManager from '../src/game/systems/GridManager.js';

describe('GridManager', () => {
    
    beforeEach(() => {
        // GridManager will be imported once it's implemented
        // For now, tests will fail as expected in TDD
    });

    describe('Grid Layout Calculations', () => {
        test('should create a 3x3 grid with correct cell dimensions', () => {
            const gridManager = new GridManager(3, 3, 800, 600);
            
            expect(gridManager.rows).toBe(3);
            expect(gridManager.cols).toBe(3);
            expect(gridManager.screenWidth).toBe(800);
            expect(gridManager.screenHeight).toBe(600);
            expect(gridManager.cellWidth).toBeGreaterThan(0);
            expect(gridManager.cellHeight).toBeGreaterThan(0);
        });

        test('should create a 4x4 grid with different cell dimensions', () => {
            const gridManager = new GridManager(4, 4, 1024, 768);
            
            expect(gridManager.rows).toBe(4);
            expect(gridManager.cols).toBe(4);
            expect(gridManager.cellWidth).toBeGreaterThan(0);
            expect(gridManager.cellHeight).toBeGreaterThan(0);
        });

        test('should create a 5x5 grid with appropriate cell sizing', () => {
            const gridManager = new GridManager(5, 5, 1200, 800);
            
            expect(gridManager.rows).toBe(5);
            expect(gridManager.cols).toBe(5);
            expect(gridManager.cellWidth).toBeGreaterThan(0);
            expect(gridManager.cellHeight).toBeGreaterThan(0);
        });

        test('should create a 6x6 grid with minimal cell sizing', () => {
            const gridManager = new GridManager(6, 6, 1400, 900);
            
            expect(gridManager.rows).toBe(6);
            expect(gridManager.cols).toBe(6);
            expect(gridManager.cellWidth).toBeGreaterThan(0);
            expect(gridManager.cellHeight).toBeGreaterThan(0);
        });
    });

    describe('Responsive Grid Sizing', () => {
        test('should adapt cell size to mobile portrait orientation', () => {
            const gridManager = new GridManager(3, 3, 375, 667); // iPhone dimensions
            
            expect(gridManager.cellWidth).toBeGreaterThan(80);
            expect(gridManager.cellHeight).toBeGreaterThan(80);
            expect(gridManager.offsetX).toBeGreaterThanOrEqual(0);
            expect(gridManager.offsetY).toBeGreaterThanOrEqual(0);
        });

        test('should adapt cell size to mobile landscape orientation', () => {
            const gridManager = new GridManager(3, 3, 667, 375); // iPhone landscape
            
            expect(gridManager.cellWidth).toBeGreaterThan(80);
            expect(gridManager.cellHeight).toBeGreaterThan(80);
            expect(gridManager.offsetX).toBeGreaterThanOrEqual(0);
            expect(gridManager.offsetY).toBeGreaterThanOrEqual(0);
        });

        test('should adapt cell size to tablet dimensions', () => {
            const gridManager = new GridManager(4, 4, 768, 1024); // iPad dimensions
            
            expect(gridManager.cellWidth).toBeGreaterThan(120);
            expect(gridManager.cellHeight).toBeGreaterThan(120);
            expect(gridManager.offsetX).toBeGreaterThanOrEqual(0);
            expect(gridManager.offsetY).toBeGreaterThanOrEqual(0);
        });

        test('should adapt cell size to desktop dimensions', () => {
            const gridManager = new GridManager(5, 5, 1920, 1080); // Desktop HD
            
            expect(gridManager.cellWidth).toBeGreaterThan(150);
            expect(gridManager.cellHeight).toBeGreaterThan(150);
            expect(gridManager.offsetX).toBeGreaterThanOrEqual(0);
            expect(gridManager.offsetY).toBeGreaterThanOrEqual(0);
        });

        test('should maintain minimum cell size for very small screens', () => {
            const gridManager = new GridManager(4, 4, 320, 568); // Small mobile
            
            expect(gridManager.cellWidth).toBeGreaterThanOrEqual(60);
            expect(gridManager.cellHeight).toBeGreaterThanOrEqual(60);
        });

        test('should center grid with proper offsets for non-square aspect ratios', () => {
            const gridManager = new GridManager(3, 3, 1200, 600); // Wide aspect ratio
            
            expect(gridManager.offsetX).toBeGreaterThanOrEqual(0);
            expect(gridManager.offsetY).toBeGreaterThanOrEqual(0);
            
            // Grid should be centered horizontally
            const totalGridWidth = gridManager.cellWidth * gridManager.cols;
            const expectedOffsetX = (gridManager.screenWidth - totalGridWidth) / 2;
            expect(Math.abs(gridManager.offsetX - expectedOffsetX)).toBeLessThan(5);
        });
    });

    describe('Cell Position Mapping', () => {
        test('should return correct screen coordinates for top-left cell', () => {
            const gridManager = new GridManager(3, 3, 600, 600);
            const position = gridManager.getCellPosition(0, 0);
            
            expect(position).toHaveProperty('x');
            expect(position).toHaveProperty('y');
            expect(position.x).toBeGreaterThan(0);
            expect(position.y).toBeGreaterThan(0);
        });

        test('should return correct screen coordinates for center cell', () => {
            const gridManager = new GridManager(3, 3, 600, 600);
            const position = gridManager.getCellPosition(1, 1);
            
            expect(position.x).toBeCloseTo(300, 1); // Should be near center
            expect(position.y).toBeCloseTo(300, 1); // Should be near center
        });

        test('should return correct screen coordinates for bottom-right cell', () => {
            const gridManager = new GridManager(3, 3, 600, 600);
            const position = gridManager.getCellPosition(2, 2);
            
            expect(position.x).toBeGreaterThan(400);
            expect(position.y).toBeGreaterThan(400);
            expect(position.x).toBeLessThan(600);
            expect(position.y).toBeLessThan(600);
        });

        test('should return coordinates with proper cell padding applied', () => {
            const gridManager = new GridManager(3, 3, 600, 600, 20); // 20px padding
            const pos1 = gridManager.getCellPosition(0, 0);
            const pos2 = gridManager.getCellPosition(0, 1);
            
            const expectedDistance = gridManager.cellWidth + gridManager.cellPadding;
            const actualDistance = pos2.x - pos1.x;
            expect(Math.abs(actualDistance - expectedDistance)).toBeLessThan(5);
        });

        test('should handle edge cases for invalid cell coordinates', () => {
            const gridManager = new GridManager(3, 3, 600, 600);
            
            expect(gridManager.getCellPosition(-1, 0)).toBeNull();
            expect(gridManager.getCellPosition(0, -1)).toBeNull();
            expect(gridManager.getCellPosition(3, 0)).toBeNull();
            expect(gridManager.getCellPosition(0, 3)).toBeNull();
            expect(gridManager.getCellPosition(5, 5)).toBeNull();
        });
    });

    describe('Screen to Grid Coordinate Mapping', () => {
        test('should return correct grid cell for screen position at top-left', () => {
            const gridManager = new GridManager(3, 3, 600, 600);
            const topLeftPosition = gridManager.getCellPosition(0, 0);
            const gridCell = gridManager.getGridCell(topLeftPosition.x, topLeftPosition.y);
            
            expect(gridCell).toEqual({ row: 0, col: 0 });
        });

        test('should return correct grid cell for screen position at center', () => {
            const gridManager = new GridManager(3, 3, 600, 600);
            const centerPosition = gridManager.getCellPosition(1, 1);
            const gridCell = gridManager.getGridCell(centerPosition.x, centerPosition.y);
            
            expect(gridCell).toEqual({ row: 1, col: 1 });
        });

        test('should return correct grid cell for screen position at bottom-right', () => {
            const gridManager = new GridManager(3, 3, 600, 600);
            const bottomRightPosition = gridManager.getCellPosition(2, 2);
            const gridCell = gridManager.getGridCell(bottomRightPosition.x, bottomRightPosition.y);
            
            expect(gridCell).toEqual({ row: 2, col: 2 });
        });

        test('should handle clicks near cell boundaries correctly', () => {
            const gridManager = new GridManager(4, 4, 800, 800);
            
            // Test click just inside cell boundary
            const cellPos = gridManager.getCellPosition(1, 1);
            const nearBoundaryX = cellPos.x + (gridManager.cellWidth / 2) - 5;
            const nearBoundaryY = cellPos.y + (gridManager.cellHeight / 2) - 5;
            
            const gridCell = gridManager.getGridCell(nearBoundaryX, nearBoundaryY);
            expect(gridCell).toEqual({ row: 1, col: 1 });
        });

        test('should return null for positions outside grid boundaries', () => {
            const gridManager = new GridManager(3, 3, 600, 600);
            
            expect(gridManager.getGridCell(0, 0)).toEqual({ row: 0, col: 0 }); // Top-left corner of the grid
            expect(gridManager.getGridCell(-10, -10)).toBeNull(); // Negative coordinates
            expect(gridManager.getGridCell(650, 650)).toBeNull(); // After grid ends
            expect(gridManager.getGridCell(-10, 300)).toBeNull(); // Negative coordinates
            expect(gridManager.getGridCell(300, -10)).toBeNull(); // Negative coordinates
        });

        test('should handle floating point coordinates correctly', () => {
            const gridManager = new GridManager(3, 3, 600, 600);
            const centerPos = gridManager.getCellPosition(1, 1);
            
            const gridCell = gridManager.getGridCell(centerPos.x + 0.7, centerPos.y + 0.3);
            expect(gridCell).toEqual({ row: 1, col: 1 });
        });
    });

    describe('Boundary Checking and Validation', () => {
        test('should validate cell coordinates within grid bounds', () => {
            const gridManager = new GridManager(4, 4, 800, 800);
            
            expect(gridManager.isValidCell(0, 0)).toBe(true);
            expect(gridManager.isValidCell(3, 3)).toBe(true);
            expect(gridManager.isValidCell(2, 1)).toBe(true);
            expect(gridManager.isValidCell(1, 2)).toBe(true);
        });

        test('should reject cell coordinates outside grid bounds', () => {
            const gridManager = new GridManager(4, 4, 800, 800);
            
            expect(gridManager.isValidCell(-1, 0)).toBe(false);
            expect(gridManager.isValidCell(0, -1)).toBe(false);
            expect(gridManager.isValidCell(4, 0)).toBe(false);
            expect(gridManager.isValidCell(0, 4)).toBe(false);
            expect(gridManager.isValidCell(5, 5)).toBe(false);
        });

        test('should handle floating point coordinates in validation', () => {
            const gridManager = new GridManager(3, 3, 600, 600);
            
            expect(gridManager.isValidCell(1.5, 1.5)).toBe(false); // Should require integers
            expect(gridManager.isValidCell(2.0, 2.0)).toBe(true); // Should accept integer floats
        });
    });

    describe('Grid Configuration Options', () => {
        test('should handle custom cell padding values', () => {
            const gridManager = new GridManager(3, 3, 600, 600, 30); // 30px padding
            
            expect(gridManager.cellPadding).toBe(30);
            
            const pos1 = gridManager.getCellPosition(0, 0);
            const pos2 = gridManager.getCellPosition(0, 1);
            
            // Distance between cells should account for padding
            expect(pos2.x - pos1.x).toBeGreaterThan(gridManager.cellWidth - 30);
        });

        test('should handle zero padding correctly', () => {
            const gridManager = new GridManager(3, 3, 600, 600, 0);
            
            expect(gridManager.cellPadding).toBe(0);
            expect(gridManager.cellWidth).toBeGreaterThan(0);
            expect(gridManager.cellHeight).toBeGreaterThan(0);
        });

        test('should recalculate grid when dimensions change', () => {
            const gridManager = new GridManager(3, 3, 600, 600);
            const originalCellWidth = gridManager.cellWidth;
            
            gridManager.updateDimensions(800, 800);
            
            expect(gridManager.screenWidth).toBe(800);
            expect(gridManager.screenHeight).toBe(800);
            expect(gridManager.cellWidth).toBeGreaterThan(originalCellWidth);
        });

        test('should maintain grid integrity after dimension updates', () => {
            const gridManager = new GridManager(4, 4, 800, 600);
            gridManager.updateDimensions(1200, 900);
            
            // All cells should still be valid
            for (let row = 0; row < 4; row++) {
                for (let col = 0; col < 4; col++) {
                    const position = gridManager.getCellPosition(row, col);
                    expect(position).not.toBeNull();
                    expect(position.x).toBeGreaterThan(0);
                    expect(position.y).toBeGreaterThan(0);
                    expect(position.x).toBeLessThan(1200);
                    expect(position.y).toBeLessThan(900);
                }
            }
        });
    });

    describe('Edge Cases and Error Handling', () => {
        test('should handle very small screen dimensions gracefully', () => {
            const gridManager = new GridManager(3, 3, 200, 200);
            
            expect(gridManager.cellWidth).toBeGreaterThan(0);
            expect(gridManager.cellHeight).toBeGreaterThan(0);
            expect(gridManager.getCellPosition(0, 0)).not.toBeNull();
        });

        test('should handle very large screen dimensions', () => {
            const gridManager = new GridManager(3, 3, 4000, 3000);
            
            expect(gridManager.cellWidth).toBeGreaterThan(0);
            expect(gridManager.cellHeight).toBeGreaterThan(0);
            expect(gridManager.getCellPosition(2, 2)).not.toBeNull();
        });

        test('should handle extreme aspect ratios', () => {
            const gridManager = new GridManager(3, 3, 1800, 300); // Very wide
            
            expect(gridManager.cellWidth).toBeGreaterThan(0);
            expect(gridManager.cellHeight).toBeGreaterThan(0);
            expect(gridManager.offsetX).toBeGreaterThanOrEqual(0);
            expect(gridManager.offsetY).toBeGreaterThanOrEqual(0);
        });

        test('should handle single cell grid', () => {
            const gridManager = new GridManager(1, 1, 400, 400);
            
            expect(gridManager.rows).toBe(1);
            expect(gridManager.cols).toBe(1);
            expect(gridManager.getCellPosition(0, 0)).not.toBeNull();
            expect(gridManager.isValidCell(0, 0)).toBe(true);
            expect(gridManager.isValidCell(1, 0)).toBe(false);
        });

        test('should handle maximum supported grid size', () => {
            const gridManager = new GridManager(6, 6, 1920, 1080);
            
            expect(gridManager.rows).toBe(6);
            expect(gridManager.cols).toBe(6);
            
            // Should be able to access all cells
            expect(gridManager.getCellPosition(0, 0)).not.toBeNull();
            expect(gridManager.getCellPosition(5, 5)).not.toBeNull();
            expect(gridManager.isValidCell(5, 5)).toBe(true);
            expect(gridManager.isValidCell(6, 6)).toBe(false);
        });
    });
});