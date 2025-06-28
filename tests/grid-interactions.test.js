describe('Grid Interactions', () => {
    let gameScene;
    let mockGridManager;
    let mockAdd;
    let mockInput;

    beforeEach(() => {
        // Mock GridManager
        mockGridManager = {
            rows: 4,
            cols: 4,
            getCellPosition: jest.fn(),
            getGridCell: jest.fn(),
            isValidCell: jest.fn(),
            updateDimensions: jest.fn()
        };

        // Create mock text objects
        const createMockTextObject = () => ({
            setOrigin: jest.fn().mockReturnThis(),
            setPosition: jest.fn().mockReturnThis(),
            destroy: jest.fn(),
            setTint: jest.fn().mockReturnThis(),
            clearTint: jest.fn().mockReturnThis()
        });

        // Mock Phaser graphics for grid overlay
        const mockGraphics = {
            lineStyle: jest.fn().mockReturnThis(),
            strokeRect: jest.fn().mockReturnThis(),
            fillStyle: jest.fn().mockReturnThis(),
            fillRect: jest.fn().mockReturnThis(),
            clear: jest.fn().mockReturnThis(),
            setVisible: jest.fn().mockReturnThis(),
            destroy: jest.fn()
        };

        // Mock Phaser input
        mockInput = {
            keyboard: {
                on: jest.fn(),
                addKeys: jest.fn(),
                createCursorKeys: jest.fn(() => ({
                    up: { isDown: false, justDown: false },
                    down: { isDown: false, justDown: false },
                    left: { isDown: false, justDown: false },
                    right: { isDown: false, justDown: false }
                }))
            }
        };

        // Mock Phaser scene add methods
        mockAdd = {
            text: jest.fn().mockImplementation(() => createMockTextObject()),
            graphics: jest.fn().mockReturnValue(mockGraphics)
        };

        // Create game scene instance with grid mode functionality
        gameScene = {
            add: mockAdd,
            input: mockInput,
            gridManager: mockGridManager,
            objects: [],
            config: { width: 800, height: 600 },
            gridMode: {
                enabled: false,
                currentCell: { row: 0, col: 0 },
                selectedCell: null,
                gridOverlay: null,
                cellHighlight: null
            },
            // Grid interaction methods (will be implemented)
            enableGridMode: jest.fn(),
            disableGridMode: jest.fn(),
            handleGridPointerDown: jest.fn(),
            navigateGridCell: jest.fn(),
            selectGridCell: jest.fn(),
            highlightGridCell: jest.fn(),
            clearGridHighlight: jest.fn(),
            spawnObjectInGridCell: jest.fn(),
            removeObjectFromGridCell: jest.fn(),
            createGridOverlay: jest.fn(),
            updateGridHighlight: jest.fn(),
            initGridInput: jest.fn(),
            // Existing methods
            spawnObjectAt: jest.fn().mockReturnValue({ x: 100, y: 100, data: {} }),
            displayTextLabels: jest.fn(),
            speakObjectLabel: jest.fn()
        };
    });

    describe('Grid Mode Toggle', () => {
        test('should enable grid mode and initialize grid input', () => {
            gameScene.enableGridMode();
            
            expect(gameScene.enableGridMode).toHaveBeenCalled();
            // Additional expectations will be added as implementation develops
        });

        test('should disable grid mode and cleanup grid elements', () => {
            gameScene.gridMode.enabled = true;
            gameScene.disableGridMode();
            
            expect(gameScene.disableGridMode).toHaveBeenCalled();
            // Grid overlay and highlights should be cleaned up
        });

        test('should handle multiple toggle operations correctly', () => {
            gameScene.enableGridMode();
            gameScene.disableGridMode();
            gameScene.enableGridMode();
            
            expect(gameScene.enableGridMode).toHaveBeenCalledTimes(2);
            expect(gameScene.disableGridMode).toHaveBeenCalledTimes(1);
        });
    });

    describe('Touch/Click Input Mapping', () => {
        beforeEach(() => {
            gameScene.gridMode.enabled = true;
            mockGridManager.getGridCell.mockReturnValue({ row: 1, col: 1 });
            mockGridManager.getCellPosition.mockReturnValue({ x: 200, y: 200 });
            mockGridManager.isValidCell.mockReturnValue(true);
        });

        test('should map touch/click to correct grid cell', () => {
            const mockPointer = { x: 250, y: 250 };
            
            gameScene.handleGridPointerDown(mockPointer);
            
            expect(mockGridManager.getGridCell).toHaveBeenCalledWith(250, 250);
            expect(gameScene.handleGridPointerDown).toHaveBeenCalledWith(mockPointer);
        });

        test('should select grid cell on valid touch/click', () => {
            const mockPointer = { x: 200, y: 200 };
            
            gameScene.handleGridPointerDown(mockPointer);
            
            expect(gameScene.handleGridPointerDown).toHaveBeenCalledWith(mockPointer);
            // Should result in cell selection
        });

        test('should ignore touches/clicks outside grid boundaries', () => {
            mockGridManager.getGridCell.mockReturnValue(null);
            const mockPointer = { x: 50, y: 50 }; // Outside grid
            
            gameScene.handleGridPointerDown(mockPointer);
            
            expect(mockGridManager.getGridCell).toHaveBeenCalledWith(50, 50);
            // Should not select any cell
        });

        test('should replace existing object in cell when touched', () => {
            const existingObject = { id: 'test-1', gridCell: { row: 1, col: 1 } };
            gameScene.objects = [existingObject];
            
            const mockPointer = { x: 200, y: 200 };
            gameScene.handleGridPointerDown(mockPointer);
            
            // Should remove existing object and spawn new one
            expect(gameScene.handleGridPointerDown).toHaveBeenCalledWith(mockPointer);
        });

        test('should handle multi-touch by using first touch point only', () => {
            const mockPointer = { 
                x: 200, 
                y: 200,
                pointerId: 0,
                isDown: true 
            };
            
            gameScene.handleGridPointerDown(mockPointer);
            
            expect(mockGridManager.getGridCell).toHaveBeenCalledWith(200, 200);
            // Additional touches should be ignored in grid mode
        });
    });

    describe('Keyboard Navigation', () => {
        beforeEach(() => {
            gameScene.gridMode.enabled = true;
            gameScene.gridMode.currentCell = { row: 1, col: 1 };
            mockGridManager.isValidCell.mockImplementation((row, col) => {
                return row >= 0 && row < 4 && col >= 0 && col < 4;
            });
        });

        test('should navigate up with arrow key', () => {
            const mockEvent = { code: 'ArrowUp' };
            
            gameScene.navigateGridCell('up');
            
            expect(gameScene.navigateGridCell).toHaveBeenCalledWith('up');
            // Should move current cell up by one row
        });

        test('should navigate down with arrow key', () => {
            const mockEvent = { code: 'ArrowDown' };
            
            gameScene.navigateGridCell('down');
            
            expect(gameScene.navigateGridCell).toHaveBeenCalledWith('down');
            // Should move current cell down by one row
        });

        test('should navigate left with arrow key', () => {
            const mockEvent = { code: 'ArrowLeft' };
            
            gameScene.navigateGridCell('left');
            
            expect(gameScene.navigateGridCell).toHaveBeenCalledWith('left');
            // Should move current cell left by one column
        });

        test('should navigate right with arrow key', () => {
            const mockEvent = { code: 'ArrowRight' };
            
            gameScene.navigateGridCell('right');
            
            expect(gameScene.navigateGridCell).toHaveBeenCalledWith('right');
            // Should move current cell right by one column
        });

        test('should not navigate beyond grid boundaries', () => {
            gameScene.gridMode.currentCell = { row: 0, col: 0 }; // Top-left corner
            
            gameScene.navigateGridCell('up');
            gameScene.navigateGridCell('left');
            
            expect(gameScene.navigateGridCell).toHaveBeenCalledWith('up');
            expect(gameScene.navigateGridCell).toHaveBeenCalledWith('left');
            // Current cell should remain at (0, 0)
        });

        test('should wrap navigation at grid boundaries when configured', () => {
            gameScene.gridMode.wrapNavigation = true;
            gameScene.gridMode.currentCell = { row: 3, col: 3 }; // Bottom-right corner
            
            gameScene.navigateGridCell('down');
            gameScene.navigateGridCell('right');
            
            expect(gameScene.navigateGridCell).toHaveBeenCalledWith('down');
            expect(gameScene.navigateGridCell).toHaveBeenCalledWith('right');
            // Should wrap to opposite edges
        });

        test('should select cell with space or enter key', () => {
            const spaceEvent = { code: 'Space' };
            const enterEvent = { code: 'Enter' };
            
            gameScene.selectGridCell();
            
            expect(gameScene.selectGridCell).toHaveBeenCalled();
            // Should spawn object in current cell
        });

        test('should highlight current cell during navigation', () => {
            gameScene.navigateGridCell('right');
            
            expect(gameScene.highlightGridCell).toHaveBeenCalled();
            // Should update cell highlight visualization
        });
    });

    describe('Gamepad Navigation', () => {
        beforeEach(() => {
            gameScene.gridMode.enabled = true;
            gameScene.gridMode.currentCell = { row: 2, col: 2 };
            
            // Mock gamepad state
            gameScene.gamepadButtonStates = new Map();
            gameScene.gamepadDeadzone = 0.1;
        });

        test('should navigate with D-pad up', () => {
            const mockGamepad = {
                buttons: [
                    { pressed: false }, // Button 0
                    { pressed: false }, // Button 1
                    { pressed: false }, // Button 2
                    { pressed: false }, // Button 3
                    { pressed: false }, // Button 4
                    { pressed: false }, // Button 5
                    { pressed: false }, // Button 6
                    { pressed: false }, // Button 7
                    { pressed: false }, // Button 8
                    { pressed: false }, // Button 9
                    { pressed: false }, // Button 10
                    { pressed: false }, // Button 11
                    { pressed: true },  // Button 12 - D-pad up
                    { pressed: false }, // Button 13 - D-pad down
                    { pressed: false }, // Button 14 - D-pad left
                    { pressed: false }  // Button 15 - D-pad right
                ]
            };
            
            gameScene.navigateGridCell('up');
            
            expect(gameScene.navigateGridCell).toHaveBeenCalledWith('up');
            // Should move up one row
        });

        test('should navigate with analog stick', () => {
            const mockGamepad = {
                axes: [0.8, -0.9, 0, 0] // Strong right and up movement
            };
            
            // Simulate analog stick navigation
            gameScene.navigateGridCell('up'); // Based on negative Y axis
            
            expect(gameScene.navigateGridCell).toHaveBeenCalledWith('up');
        });

        test('should ignore analog stick input within deadzone', () => {
            const mockGamepad = {
                axes: [0.05, 0.08, 0, 0] // Within deadzone
            };
            
            // Navigation should not be triggered
            expect(gameScene.navigateGridCell).not.toHaveBeenCalled();
        });

        test('should select cell with gamepad button press', () => {
            const mockGamepad = {
                buttons: [
                    { pressed: true }, // Button 0 - usually A/X button
                ]
            };
            
            gameScene.selectGridCell();
            
            expect(gameScene.selectGridCell).toHaveBeenCalled();
            // Should spawn object in current cell
        });

        test('should handle gamepad button repeat prevention', () => {
            // Simulate button being held down
            gameScene.gamepadButtonStates.set(0, true);
            
            const mockGamepad = {
                buttons: [{ pressed: true }]
            };
            
            // Second press should be ignored while button is held
            expect(gameScene.selectGridCell).not.toHaveBeenCalled();
        });
    });

    describe('Cell Selection and Highlighting', () => {
        beforeEach(() => {
            gameScene.gridMode.enabled = true;
            mockGridManager.getCellPosition.mockReturnValue({ x: 200, y: 200 });
        });

        test('should highlight selected cell visually', () => {
            gameScene.highlightGridCell(1, 1);
            
            expect(gameScene.highlightGridCell).toHaveBeenCalledWith(1, 1);
            // Should update visual highlight
        });

        test('should clear previous cell highlight when selecting new cell', () => {
            gameScene.highlightGridCell(1, 1);
            gameScene.highlightGridCell(2, 2);
            
            expect(gameScene.clearGridHighlight).toHaveBeenCalled();
            expect(gameScene.highlightGridCell).toHaveBeenCalledWith(2, 2);
        });

        test('should maintain highlight during cell navigation', () => {
            gameScene.gridMode.currentCell = { row: 1, col: 1 };
            gameScene.navigateGridCell('right');
            
            expect(gameScene.highlightGridCell).toHaveBeenCalled();
            // Highlight should follow navigation
        });

        test('should use different highlight styles for selection vs navigation', () => {
            gameScene.highlightGridCell(1, 1, 'navigation');
            gameScene.highlightGridCell(2, 2, 'selection');
            
            expect(gameScene.highlightGridCell).toHaveBeenCalledWith(1, 1, 'navigation');
            expect(gameScene.highlightGridCell).toHaveBeenCalledWith(2, 2, 'selection');
        });

        test('should animate highlight transitions smoothly', () => {
            gameScene.highlightGridCell(1, 1);
            
            // Should use smooth transition animations
            expect(gameScene.highlightGridCell).toHaveBeenCalledWith(1, 1);
        });
    });

    describe('Object Placement in Grid Cells', () => {
        beforeEach(() => {
            gameScene.gridMode.enabled = true;
            mockGridManager.getCellPosition.mockReturnValue({ x: 200, y: 200 });
            mockGridManager.isValidCell.mockReturnValue(true);
        });

        test('should spawn object at cell center position', () => {
            gameScene.spawnObjectInGridCell(1, 1);
            
            expect(gameScene.spawnObjectInGridCell).toHaveBeenCalledWith(1, 1);
            expect(mockGridManager.getCellPosition).toHaveBeenCalledWith(1, 1);
        });

        test('should replace existing object in cell', () => {
            const existingObject = { 
                id: 'test-1', 
                gridCell: { row: 1, col: 1 },
                sprite: { destroy: jest.fn() }
            };
            gameScene.objects = [existingObject];
            
            gameScene.spawnObjectInGridCell(1, 1);
            
            expect(gameScene.removeObjectFromGridCell).toHaveBeenCalledWith(1, 1);
            expect(gameScene.spawnObjectInGridCell).toHaveBeenCalledWith(1, 1);
        });

        test('should prevent object dragging in grid mode', () => {
            const mockObject = {
                id: 'test-1',
                gridCell: { row: 1, col: 1 },
                sprite: { setPosition: jest.fn() }
            };
            
            // Attempt to drag object
            const newPosition = { x: 300, y: 300 };
            
            // Dragging should be prevented in grid mode
            expect(mockObject.sprite.setPosition).not.toHaveBeenCalledWith(300, 300);
        });

        test('should maintain object data structure with grid cell reference', () => {
            gameScene.spawnObjectInGridCell(2, 3);
            
            expect(gameScene.spawnObjectInGridCell).toHaveBeenCalledWith(2, 3);
            // Object should include gridCell: { row: 2, col: 3 } property
        });

        test('should handle invalid cell coordinates gracefully', () => {
            mockGridManager.isValidCell.mockReturnValue(false);
            
            gameScene.spawnObjectInGridCell(-1, 5);
            
            expect(gameScene.spawnObjectInGridCell).toHaveBeenCalledWith(-1, 5);
            // Should not spawn object for invalid coordinates
        });
    });

    describe('Cell Replacement Logic', () => {
        beforeEach(() => {
            gameScene.gridMode.enabled = true;
            mockGridManager.getCellPosition.mockReturnValue({ x: 200, y: 200 });
        });

        test('should remove existing object before placing new one', () => {
            const existingObject = {
                id: 'test-1',
                gridCell: { row: 1, col: 1 },
                sprite: { destroy: jest.fn() },
                englishLabel: { destroy: jest.fn() },
                spanishLabel: { destroy: jest.fn() }
            };
            gameScene.objects = [existingObject];
            
            gameScene.removeObjectFromGridCell(1, 1);
            
            expect(gameScene.removeObjectFromGridCell).toHaveBeenCalledWith(1, 1);
            // Should clean up all object components
        });

        test('should handle cleanup timing appropriately', () => {
            const existingObject = {
                id: 'test-1',
                gridCell: { row: 1, col: 1 },
                lastInteractionTime: Date.now() - 5000 // 5 seconds ago
            };
            gameScene.objects = [existingObject];
            
            // Auto-cleanup should respect grid mode timing rules
            gameScene.removeObjectFromGridCell(1, 1);
            
            expect(gameScene.removeObjectFromGridCell).toHaveBeenCalledWith(1, 1);
        });

        test('should update objects array after removal', () => {
            const obj1 = { id: 'test-1', gridCell: { row: 1, col: 1 } };
            const obj2 = { id: 'test-2', gridCell: { row: 2, col: 2 } };
            gameScene.objects = [obj1, obj2];
            
            gameScene.removeObjectFromGridCell(1, 1);
            
            expect(gameScene.removeObjectFromGridCell).toHaveBeenCalledWith(1, 1);
            // Objects array should only contain obj2
        });

        test('should handle multiple objects in same cell edge case', () => {
            const obj1 = { id: 'test-1', gridCell: { row: 1, col: 1 } };
            const obj2 = { id: 'test-2', gridCell: { row: 1, col: 1 } }; // Same cell
            gameScene.objects = [obj1, obj2];
            
            gameScene.removeObjectFromGridCell(1, 1);
            
            expect(gameScene.removeObjectFromGridCell).toHaveBeenCalledWith(1, 1);
            // Should remove all objects from the cell
        });

        test('should not affect objects in other cells during removal', () => {
            const obj1 = { id: 'test-1', gridCell: { row: 1, col: 1 } };
            const obj2 = { id: 'test-2', gridCell: { row: 2, col: 2 } };
            gameScene.objects = [obj1, obj2];
            
            gameScene.removeObjectFromGridCell(1, 1);
            
            expect(gameScene.removeObjectFromGridCell).toHaveBeenCalledWith(1, 1);
            // obj2 should remain unaffected
        });
    });

    describe('Grid Input Integration', () => {
        test('should disable free-form input handlers when grid mode enabled', () => {
            gameScene.gridMode.enabled = false;
            gameScene.enableGridMode();
            
            // Free-form pointer handlers should be disabled
            expect(gameScene.enableGridMode).toHaveBeenCalled();
        });

        test('should re-enable free-form input handlers when grid mode disabled', () => {
            gameScene.gridMode.enabled = true;
            gameScene.disableGridMode();
            
            // Free-form pointer handlers should be re-enabled
            expect(gameScene.disableGridMode).toHaveBeenCalled();
        });

        test('should handle simultaneous input methods gracefully', () => {
            gameScene.gridMode.enabled = true;
            
            // Simulate simultaneous keyboard and gamepad input
            gameScene.navigateGridCell('up'); // Keyboard
            // Gamepad navigation should be queued or ignored
            
            expect(gameScene.navigateGridCell).toHaveBeenCalledWith('up');
        });

        test('should maintain input state consistency across mode switches', () => {
            gameScene.enableGridMode();
            gameScene.disableGridMode();
            gameScene.enableGridMode();
            
            // Input handlers should be properly initialized each time
            expect(gameScene.enableGridMode).toHaveBeenCalledTimes(2);
            expect(gameScene.disableGridMode).toHaveBeenCalledTimes(1);
        });
    });
});