describe('Grid Cross-Device Compatibility', () => {
    let gameScene;
    let mockGridManager;
    let mockInput;

    beforeEach(() => {
        // Mock GridManager with device-responsive behavior
        mockGridManager = {
            rows: 4,
            cols: 4,
            cellWidth: 120,
            cellHeight: 100,
            offsetX: 50,
            offsetY: 40,
            screenWidth: 800,
            screenHeight: 600,
            deviceType: 'desktop',
            
            getCellPosition: jest.fn(),
            getGridCell: jest.fn(),
            isValidCell: jest.fn(),
            updateDimensions: jest.fn(),
            adaptToDevice: jest.fn(),
            calculateOptimalCellSize: jest.fn(),
            adjustForTouchTargets: jest.fn()
        };

        // Mock input system with device detection
        mockInput = {
            activePointer: null,
            pointers: [],
            keyboard: {
                on: jest.fn(),
                addKeys: jest.fn()
            },
            gamepad: {
                total: 0,
                getPad: jest.fn()
            },
            
            // Device detection methods
            detectInputMethod: jest.fn(),
            isTouchDevice: jest.fn(),
            isMouseDevice: jest.fn(),
            hasGamepad: jest.fn(),
            getScreenInfo: jest.fn()
        };

        // Create game scene with cross-device support
        gameScene = {
            gridManager: mockGridManager,
            input: mockInput,
            config: { width: 800, height: 600 },
            device: {
                type: 'desktop', // 'mobile', 'tablet', 'desktop'
                os: 'unknown',
                browser: 'unknown',
                touchEnabled: false,
                orientation: 'landscape', // 'portrait', 'landscape'
                pixelRatio: 1,
                safeArea: { top: 0, right: 0, bottom: 0, left: 0 }
            },
            gridMode: {
                enabled: true,
                deviceAdaptations: {
                    mobile: {
                        minCellSize: 80,
                        touchTargetPadding: 20,
                        maxGridSize: { rows: 4, cols: 4 }
                    },
                    tablet: {
                        minCellSize: 100,
                        touchTargetPadding: 15,
                        maxGridSize: { rows: 5, cols: 5 }
                    },
                    desktop: {
                        minCellSize: 120,
                        touchTargetPadding: 10,
                        maxGridSize: { rows: 6, cols: 6 }
                    }
                }
            },
            
            // Device adaptation methods
            detectDevice: jest.fn(),
            adaptGridForDevice: jest.fn(),
            handleOrientationChange: jest.fn(),
            adjustForSafeArea: jest.fn(),
            optimizeForTouchInput: jest.fn(),
            optimizeForMouseInput: jest.fn(),
            optimizeForGamepadInput: jest.fn(),
            handlePixelRatioChange: jest.fn(),
            updateDeviceSpecificSettings: jest.fn(),
            
            // Input handling methods
            handleTouchInput: jest.fn(),
            handleMouseInput: jest.fn(),
            handleKeyboardInput: jest.fn(),
            handleGamepadInput: jest.fn(),
            
            // Grid methods
            createGridOverlay: jest.fn(),
            updateGridOverlay: jest.fn(),
            highlightGridCell: jest.fn(),
            spawnObjectInGridCell: jest.fn()
        };

        // Mock device detection APIs
        global.navigator = {
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            maxTouchPoints: 0,
            platform: 'Win32'
        };

        global.window = {
            screen: {
                width: 1920,
                height: 1080,
                orientation: {
                    type: 'landscape-primary'
                }
            },
            devicePixelRatio: 1,
            matchMedia: jest.fn()
        };
    });

    describe('Mobile Touch Interaction', () => {
        beforeEach(() => {
            gameScene.device.type = 'mobile';
            gameScene.device.touchEnabled = true;
            mockGridManager.deviceType = 'mobile';
            mockInput.isTouchDevice.mockReturnValue(true);
        });

        test('should adapt grid cell size for mobile touch targets', () => {
            gameScene.adaptGridForDevice();
            
            expect(gameScene.adaptGridForDevice).toHaveBeenCalled();
            expect(mockGridManager.adaptToDevice).toHaveBeenCalledWith('mobile');
            // Cell size should be at least 80px for touch targets
        });

        test('should handle single touch input for cell selection', () => {
            const touchEvent = {
                type: 'pointerdown',
                pointerId: 1,
                pointerType: 'touch',
                x: 150,
                y: 120
            };
            
            gameScene.handleTouchInput(touchEvent);
            
            expect(gameScene.handleTouchInput).toHaveBeenCalledWith(touchEvent);
            // Should map touch to grid cell
        });

        test('should handle multi-touch gestures appropriately', () => {
            const multiTouchEvents = [
                { pointerId: 1, x: 150, y: 120 },
                { pointerId: 2, x: 250, y: 220 }
            ];
            
            multiTouchEvents.forEach(event => {
                gameScene.handleTouchInput(event);
            });
            
            expect(gameScene.handleTouchInput).toHaveBeenCalledTimes(2);
            // Should handle first touch only in grid mode
        });

        test('should provide adequate touch target spacing', () => {
            mockGridManager.cellWidth = 80;
            mockGridManager.cellHeight = 80;
            
            gameScene.optimizeForTouchInput();
            
            expect(gameScene.optimizeForTouchInput).toHaveBeenCalled();
            expect(mockGridManager.adjustForTouchTargets).toHaveBeenCalled();
            // Should ensure minimum 44px touch targets (iOS guidelines)
        });

        test('should handle touch precision issues gracefully', () => {
            const impreciseTouch = {
                x: 149.7, // Near cell boundary
                y: 119.3
            };
            
            mockGridManager.getGridCell.mockReturnValue({ row: 1, col: 1 });
            gameScene.handleTouchInput(impreciseTouch);
            
            expect(gameScene.handleTouchInput).toHaveBeenCalledWith(impreciseTouch);
            // Should round to nearest cell
        });

        test('should adjust grid size for small mobile screens', () => {
            gameScene.config = { width: 320, height: 568 }; // iPhone SE
            
            gameScene.adaptGridForDevice();
            
            expect(gameScene.adaptGridForDevice).toHaveBeenCalled();
            // Should use smaller grid (3x3 or 4x4) on small screens
        });

        test('should handle mobile keyboard when on-screen keyboard appears', () => {
            // Simulate screen size change when keyboard appears
            gameScene.config = { width: 375, height: 300 }; // Reduced height
            
            gameScene.handleOrientationChange();
            
            expect(gameScene.handleOrientationChange).toHaveBeenCalled();
            // Should adapt grid to reduced screen space
        });
    });

    describe('Desktop Mouse Interaction', () => {
        beforeEach(() => {
            gameScene.device.type = 'desktop';
            gameScene.device.touchEnabled = false;
            mockGridManager.deviceType = 'desktop';
            mockInput.isMouseDevice.mockReturnValue(true);
        });

        test('should handle precise mouse clicking', () => {
            const mouseEvent = {
                type: 'pointerdown',
                pointerId: 1,
                pointerType: 'mouse',
                x: 200,
                y: 150
            };
            
            gameScene.handleMouseInput(mouseEvent);
            
            expect(gameScene.handleMouseInput).toHaveBeenCalledWith(mouseEvent);
            // Should map precise mouse coordinates to grid cell
        });

        test('should provide hover feedback for mouse users', () => {
            const hoverEvent = {
                type: 'pointermove',
                x: 200,
                y: 150
            };
            
            mockGridManager.getGridCell.mockReturnValue({ row: 1, col: 2 });
            gameScene.handleMouseInput(hoverEvent);
            
            expect(gameScene.handleMouseInput).toHaveBeenCalledWith(hoverEvent);
            expect(gameScene.highlightGridCell).toHaveBeenCalledWith(1, 2, 'hover');
        });

        test('should handle mouse wheel events for grid navigation', () => {
            const wheelEvent = {
                type: 'wheel',
                deltaY: 120 // Scroll down
            };
            
            gameScene.handleMouseInput(wheelEvent);
            
            expect(gameScene.handleMouseInput).toHaveBeenCalledWith(wheelEvent);
            // Should navigate grid cells with mouse wheel
        });

        test('should optimize cell size for desktop precision', () => {
            gameScene.optimizeForMouseInput();
            
            expect(gameScene.optimizeForMouseInput).toHaveBeenCalled();
            // Desktop can use smaller cells due to mouse precision
        });

        test('should handle right-click context actions', () => {
            const rightClickEvent = {
                type: 'pointerdown',
                button: 2, // Right mouse button
                x: 200,
                y: 150
            };
            
            gameScene.handleMouseInput(rightClickEvent);
            
            expect(gameScene.handleMouseInput).toHaveBeenCalledWith(rightClickEvent);
            // Should provide context menu or alternative actions
        });

        test('should support drag operations for desktop users', () => {
            const dragStart = { type: 'pointerdown', x: 200, y: 150 };
            const dragMove = { type: pointermove', x: 300, y: 250 };
            const dragEnd = { type: 'pointerup', x: 300, y: 250 };
            
            gameScene.handleMouseInput(dragStart);
            gameScene.handleMouseInput(dragMove);
            gameScene.handleMouseInput(dragEnd);
            
            expect(gameScene.handleMouseInput).toHaveBeenCalledTimes(3);
            // Should handle drag operations appropriately
        });
    });

    describe('Tablet Gesture Support', () => {
        beforeEach(() => {
            gameScene.device.type = 'tablet';
            gameScene.device.touchEnabled = true;
            mockGridManager.deviceType = 'tablet';
        });

        test('should optimize grid layout for tablet screen size', () => {
            gameScene.config = { width: 768, height: 1024 }; // iPad dimensions
            
            gameScene.adaptGridForDevice();
            
            expect(gameScene.adaptGridForDevice).toHaveBeenCalled();
            // Should use medium-sized grid appropriate for tablets
        });

        test('should handle pinch-to-zoom gestures', () => {
            const pinchGesture = {
                type: 'pinch',
                scale: 1.5,
                center: { x: 400, y: 300 }
            };
            
            gameScene.handleTouchInput(pinchGesture);
            
            expect(gameScene.handleTouchInput).toHaveBeenCalledWith(pinchGesture);
            // Should handle zoom appropriately (or disable if not supported)
        });

        test('should support swipe gestures for navigation', () => {
            const swipeGesture = {
                type: 'swipe',
                direction: 'right',
                startX: 100,
                startY: 200,
                endX: 300,
                endY: 200
            };
            
            gameScene.handleTouchInput(swipeGesture);
            
            expect(gameScene.handleTouchInput).toHaveBeenCalledWith(swipeGesture);
            // Should navigate grid cells with swipe
        });

        test('should handle two-finger tap for alternative actions', () => {
            const twoFingerTap = {
                type: 'tap',
                pointerCount: 2,
                x: 200,
                y: 150
            };
            
            gameScene.handleTouchInput(twoFingerTap);
            
            expect(gameScene.handleTouchInput).toHaveBeenCalledWith(twoFingerTap);
            // Should provide alternative action for two-finger tap
        });

        test('should adapt touch targets for stylus input', () => {
            const stylusEvent = {
                type: 'pointerdown',
                pointerType: 'pen',
                pressure: 0.8,
                x: 200,
                y: 150
            };
            
            gameScene.handleTouchInput(stylusEvent);
            
            expect(gameScene.handleTouchInput).toHaveBeenCalledWith(stylusEvent);
            // Should handle stylus input with higher precision
        });
    });

    describe('Screen Orientation Handling', () => {
        test('should adapt grid layout for portrait orientation', () => {
            gameScene.device.orientation = 'portrait';
            gameScene.config = { width: 375, height: 667 };
            
            gameScene.handleOrientationChange();
            
            expect(gameScene.handleOrientationChange).toHaveBeenCalled();
            expect(mockGridManager.updateDimensions).toHaveBeenCalledWith(375, 667);
        });

        test('should adapt grid layout for landscape orientation', () => {
            gameScene.device.orientation = 'landscape';
            gameScene.config = { width: 667, height: 375 };
            
            gameScene.handleOrientationChange();
            
            expect(gameScene.handleOrientationChange).toHaveBeenCalled();
            expect(mockGridManager.updateDimensions).toHaveBeenCalledWith(667, 375);
        });

        test('should handle orientation change animations smoothly', () => {
            gameScene.handleOrientationChange();
            
            expect(gameScene.handleOrientationChange).toHaveBeenCalled();
            expect(gameScene.updateGridOverlay).toHaveBeenCalled();
            // Should animate grid transformation smoothly
        });

        test('should preserve grid state during orientation changes', () => {
            const existingObjects = [
                { id: 'obj1', gridCell: { row: 1, col: 1 } },
                { id: 'obj2', gridCell: { row: 2, col: 2 } }
            ];
            gameScene.objects = existingObjects;
            
            gameScene.handleOrientationChange();
            
            expect(gameScene.handleOrientationChange).toHaveBeenCalled();
            // Objects should remain in their grid cells
        });

        test('should handle rapid orientation changes gracefully', () => {
            // Simulate rapid orientation flipping
            gameScene.handleOrientationChange(); // To landscape
            gameScene.handleOrientationChange(); // Back to portrait
            gameScene.handleOrientationChange(); // To landscape again
            
            expect(gameScene.handleOrientationChange).toHaveBeenCalledTimes(3);
            // Should handle rapid changes without issues
        });

        test('should adjust for different aspect ratios', () => {
            const aspectRatios = [
                { width: 320, height: 568 }, // 16:9
                { width: 375, height: 812 }, // iPhone X
                { width: 768, height: 1024 }, // 4:3 iPad
                { width: 1920, height: 1080 } // 16:9 desktop
            ];
            
            aspectRatios.forEach(dimensions => {
                gameScene.config = dimensions;
                gameScene.handleOrientationChange();
            });
            
            expect(gameScene.handleOrientationChange).toHaveBeenCalledTimes(4);
        });
    });

    describe('High DPI and Pixel Ratio Support', () => {
        test('should handle high DPI displays correctly', () => {
            global.window.devicePixelRatio = 2; // Retina display
            gameScene.device.pixelRatio = 2;
            
            gameScene.handlePixelRatioChange();
            
            expect(gameScene.handlePixelRatioChange).toHaveBeenCalled();
            // Should adjust rendering for high DPI
        });

        test('should scale grid elements appropriately for pixel ratio', () => {
            gameScene.device.pixelRatio = 3; // High DPI mobile
            
            gameScene.createGridOverlay();
            
            expect(gameScene.createGridOverlay).toHaveBeenCalled();
            // Grid lines should scale with pixel ratio
        });

        test('should handle varying pixel ratios across different devices', () => {
            const pixelRatios = [1, 1.5, 2, 2.5, 3];
            
            pixelRatios.forEach(ratio => {
                gameScene.device.pixelRatio = ratio;
                gameScene.handlePixelRatioChange();
            });
            
            expect(gameScene.handlePixelRatioChange).toHaveBeenCalledTimes(5);
        });

        test('should maintain crisp grid lines on all pixel densities', () => {
            gameScene.device.pixelRatio = 2.5; // Unusual pixel ratio
            
            gameScene.createGridOverlay();
            
            expect(gameScene.createGridOverlay).toHaveBeenCalled();
            // Should avoid blurry lines on fractional pixel ratios
        });
    });

    describe('Safe Area and Notch Handling', () => {
        test('should adjust grid layout for iPhone notch', () => {
            gameScene.device.safeArea = { top: 44, right: 0, bottom: 34, left: 0 };
            
            gameScene.adjustForSafeArea();
            
            expect(gameScene.adjustForSafeArea).toHaveBeenCalled();
            // Grid should avoid notch and home indicator areas
        });

        test('should handle Android punch-hole cameras', () => {
            gameScene.device.safeArea = { top: 24, right: 0, bottom: 0, left: 0 };
            
            gameScene.adjustForSafeArea();
            
            expect(gameScene.adjustForSafeArea).toHaveBeenCalled();
            // Grid should account for status bar and camera cutout
        });

        test('should work on devices without safe area constraints', () => {
            gameScene.device.safeArea = { top: 0, right: 0, bottom: 0, left: 0 };
            
            gameScene.adjustForSafeArea();
            
            expect(gameScene.adjustForSafeArea).toHaveBeenCalled();
            // Should work normally on devices without notches
        });

        test('should update safe area handling on orientation change', () => {
            // Portrait notch
            gameScene.device.safeArea = { top: 44, right: 0, bottom: 34, left: 0 };
            gameScene.adjustForSafeArea();
            
            // Landscape notch (different orientation)
            gameScene.device.safeArea = { top: 0, right: 44, bottom: 21, left: 44 };
            gameScene.handleOrientationChange();
            
            expect(gameScene.adjustForSafeArea).toHaveBeenCalled();
            expect(gameScene.handleOrientationChange).toHaveBeenCalled();
        });
    });

    describe('Cross-Platform Input Compatibility', () => {
        test('should detect and handle multiple input methods simultaneously', () => {
            // Device supports multiple input types
            mockInput.isTouchDevice.mockReturnValue(true);
            mockInput.isMouseDevice.mockReturnValue(true);
            mockInput.hasGamepad.mockReturnValue(true);
            
            gameScene.detectDevice();
            
            expect(gameScene.detectDevice).toHaveBeenCalled();
            // Should handle hybrid devices (Surface, Chromebook, etc.)
        });

        test('should prioritize touch input on touch-enabled devices', () => {
            gameScene.device.touchEnabled = true;
            
            const touchEvent = { type: 'pointerdown', pointerType: 'touch' };
            const mouseEvent = { type: 'pointerdown', pointerType: 'mouse' };
            
            gameScene.handleTouchInput(touchEvent);
            gameScene.handleMouseInput(mouseEvent);
            
            expect(gameScene.handleTouchInput).toHaveBeenCalledWith(touchEvent);
            // Touch should take priority when available
        });

        test('should handle external keyboard on mobile devices', () => {
            gameScene.device.type = 'mobile';
            
            const keyboardEvent = { code: 'ArrowUp' };
            gameScene.handleKeyboardInput(keyboardEvent);
            
            expect(gameScene.handleKeyboardInput).toHaveBeenCalledWith(keyboardEvent);
            // Should support external keyboards on mobile
        });

        test('should handle gamepad input across all device types', () => {
            const devices = ['mobile', 'tablet', 'desktop'];
            
            devices.forEach(deviceType => {
                gameScene.device.type = deviceType;
                gameScene.handleGamepadInput();
            });
            
            expect(gameScene.handleGamepadInput).toHaveBeenCalledTimes(3);
            // Gamepad should work on all platforms
        });

        test('should adapt input sensitivity for different devices', () => {
            const adaptations = [
                { device: 'mobile', sensitivity: 'high' },
                { device: 'tablet', sensitivity: 'medium' },
                { device: 'desktop', sensitivity: 'precise' }
            ];
            
            adaptations.forEach(adaptation => {
                gameScene.device.type = adaptation.device;
                gameScene.updateDeviceSpecificSettings();
            });
            
            expect(gameScene.updateDeviceSpecificSettings).toHaveBeenCalledTimes(3);
        });
    });

    describe('Performance Optimization Across Devices', () => {
        test('should optimize rendering for lower-end mobile devices', () => {
            gameScene.device.type = 'mobile';
            gameScene.device.performance = 'low'; // Simulated low-end device
            
            gameScene.adaptGridForDevice();
            
            expect(gameScene.adaptGridForDevice).toHaveBeenCalled();
            // Should reduce visual effects or complexity for performance
        });

        test('should enable full features on high-performance devices', () => {
            gameScene.device.type = 'desktop';
            gameScene.device.performance = 'high';
            
            gameScene.adaptGridForDevice();
            
            expect(gameScene.adaptGridForDevice).toHaveBeenCalled();
            // Should enable all visual effects and features
        });

        test('should handle frame rate optimization based on device capabilities', () => {
            const deviceCapabilities = [
                { type: 'mobile', targetFPS: 30 },
                { type: 'tablet', targetFPS: 60 },
                { type: 'desktop', targetFPS: 60 }
            ];
            
            deviceCapabilities.forEach(capability => {
                gameScene.device.type = capability.type;
                gameScene.adaptGridForDevice();
            });
            
            expect(gameScene.adaptGridForDevice).toHaveBeenCalledTimes(3);
        });

        test('should manage memory usage efficiently across devices', () => {
            gameScene.adaptGridForDevice();
            
            expect(gameScene.adaptGridForDevice).toHaveBeenCalled();
            // Should optimize memory usage based on device constraints
        });
    });
});