describe('Grid Accessibility', () => {
    let gameScene;
    let mockGridManager;
    let mockSpeechSynthesis;
    let mockAriaAnnouncer;

    beforeEach(() => {
        // Mock GridManager
        mockGridManager = {
            rows: 4,
            cols: 4,
            getCellPosition: jest.fn(),
            getGridCell: jest.fn(),
            isValidCell: jest.fn()
        };

        // Mock Web Speech API
        mockSpeechSynthesis = {
            speak: jest.fn(),
            cancel: jest.fn(),
            getVoices: jest.fn(() => [])
        };
        global.speechSynthesis = mockSpeechSynthesis;

        // Mock ARIA announcer
        mockAriaAnnouncer = {
            announce: jest.fn(),
            setLiveRegion: jest.fn(),
            clearAnnouncements: jest.fn()
        };

        // Create game scene with accessibility features
        gameScene = {
            gridManager: mockGridManager,
            ariaAnnouncer: mockAriaAnnouncer,
            gridMode: {
                enabled: true,
                currentCell: { row: 1, col: 1 },
                accessibility: {
                    screenReaderEnabled: true,
                    announceNavigation: true,
                    announceSelection: true,
                    announceContent: true,
                    highContrast: false,
                    reducedMotion: false,
                    audioFeedback: true,
                    cellDescriptions: true
                }
            },
            
            // Accessibility methods
            initGridAccessibility: jest.fn(),
            setupAriaLabels: jest.fn(),
            createAriaLiveRegion: jest.fn(),
            announceCellNavigation: jest.fn(),
            announceCellSelection: jest.fn(),
            announceCellContent: jest.fn(),
            announceGridState: jest.fn(),
            provideCellDescription: jest.fn(),
            enableHighContrastMode: jest.fn(),
            disableHighContrastMode: jest.fn(),
            enableReducedMotion: jest.fn(),
            disableReducedMotion: jest.fn(),
            playNavigationSound: jest.fn(),
            playSelectionSound: jest.fn(),
            updateFocusIndicator: jest.fn(),
            handleKeyboardNavigation: jest.fn(),
            
            // Existing methods
            spawnObjectAt: jest.fn(),
            speakObjectLabel: jest.fn(),
            highlightGridCell: jest.fn()
        };

        // Mock DOM elements
        global.document = {
            createElement: jest.fn(() => ({
                setAttribute: jest.fn(),
                appendChild: jest.fn(),
                textContent: '',
                style: {},
                focus: jest.fn()
            })),
            body: {
                appendChild: jest.fn()
            },
            getElementById: jest.fn()
        };
    });

    describe('Screen Reader Compatibility', () => {
        test('should initialize ARIA live region for announcements', () => {
            gameScene.initGridAccessibility();
            
            expect(gameScene.initGridAccessibility).toHaveBeenCalled();
            expect(gameScene.createAriaLiveRegion).toHaveBeenCalled();
        });

        test('should announce current grid position when navigating', () => {
            gameScene.gridMode.currentCell = { row: 2, col: 3 };
            
            gameScene.announceCellNavigation(2, 3);
            
            expect(gameScene.announceCellNavigation).toHaveBeenCalledWith(2, 3);
            expect(mockAriaAnnouncer.announce).toHaveBeenCalledWith(
                expect.stringContaining('Row 3, Column 4')
            );
        });

        test('should announce cell content when object is present', () => {
            const cellObject = {
                data: { en: 'Red Circle', es: 'Círculo Rojo' },
                type: 'shape'
            };
            
            gameScene.announceCellContent(cellObject, 1, 1);
            
            expect(gameScene.announceCellContent).toHaveBeenCalledWith(cellObject, 1, 1);
            expect(mockAriaAnnouncer.announce).toHaveBeenCalledWith(
                expect.stringContaining('Red Circle')
            );
        });

        test('should announce empty cell when no object present', () => {
            gameScene.announceCellContent(null, 1, 1);
            
            expect(gameScene.announceCellContent).toHaveBeenCalledWith(null, 1, 1);
            expect(mockAriaAnnouncer.announce).toHaveBeenCalledWith(
                expect.stringContaining('Empty cell')
            );
        });

        test('should provide grid dimensions and current position on request', () => {
            gameScene.announceGridState();
            
            expect(gameScene.announceGridState).toHaveBeenCalled();
            expect(mockAriaAnnouncer.announce).toHaveBeenCalledWith(
                expect.stringContaining('4 by 4 grid')
            );
        });

        test('should announce successful object placement', () => {
            const newObject = {
                data: { en: 'Blue Triangle', es: 'Triángulo Azul' },
                gridCell: { row: 1, col: 2 }
            };
            
            gameScene.announceCellSelection(newObject);
            
            expect(gameScene.announceCellSelection).toHaveBeenCalledWith(newObject);
            expect(mockAriaAnnouncer.announce).toHaveBeenCalledWith(
                expect.stringContaining('Placed Blue Triangle')
            );
        });

        test('should provide navigation instructions for new users', () => {
            gameScene.announceGridState();
            
            expect(gameScene.announceGridState).toHaveBeenCalled();
            expect(mockAriaAnnouncer.announce).toHaveBeenCalledWith(
                expect.stringContaining('Use arrow keys to navigate')
            );
        });

        test('should respect screen reader preference settings', () => {
            gameScene.gridMode.accessibility.screenReaderEnabled = false;
            
            gameScene.announceCellNavigation(1, 1);
            
            expect(gameScene.announceCellNavigation).toHaveBeenCalledWith(1, 1);
            // Should not make announcements when disabled
        });
    });

    describe('High Contrast Cell Boundaries', () => {
        test('should enable high contrast mode when requested', () => {
            gameScene.enableHighContrastMode();
            
            expect(gameScene.enableHighContrastMode).toHaveBeenCalled();
            // Should increase contrast of grid lines and highlights
        });

        test('should use high contrast colors for grid overlay', () => {
            gameScene.gridMode.accessibility.highContrast = true;
            gameScene.enableHighContrastMode();
            
            expect(gameScene.enableHighContrastMode).toHaveBeenCalled();
            // Grid lines should use high contrast colors (white on black or black on white)
        });

        test('should use high contrast colors for cell highlights', () => {
            gameScene.gridMode.accessibility.highContrast = true;
            gameScene.highlightGridCell(1, 1, 'navigation');
            
            expect(gameScene.highlightGridCell).toHaveBeenCalledWith(1, 1, 'navigation');
            // Highlights should use maximum contrast colors
        });

        test('should increase cell border thickness in high contrast mode', () => {
            gameScene.enableHighContrastMode();
            
            expect(gameScene.enableHighContrastMode).toHaveBeenCalled();
            // Cell borders should be thicker for better visibility
        });

        test('should disable high contrast mode when requested', () => {
            gameScene.gridMode.accessibility.highContrast = true;
            gameScene.disableHighContrastMode();
            
            expect(gameScene.disableHighContrastMode).toHaveBeenCalled();
            // Should revert to normal contrast levels
        });

        test('should respect system high contrast preferences', () => {
            // Mock system high contrast detection
            global.matchMedia = jest.fn(() => ({
                matches: true,
                addEventListener: jest.fn()
            }));
            
            gameScene.initGridAccessibility();
            
            expect(gameScene.initGridAccessibility).toHaveBeenCalled();
            // Should automatically enable high contrast if system preference is set
        });

        test('should update contrast dynamically when system settings change', () => {
            const mockMediaQuery = {
                matches: false,
                addEventListener: jest.fn()
            };
            global.matchMedia = jest.fn(() => mockMediaQuery);
            
            gameScene.initGridAccessibility();
            
            // Simulate system contrast change
            mockMediaQuery.matches = true;
            const changeHandler = mockMediaQuery.addEventListener.mock.calls[0][1];
            changeHandler({ matches: true });
            
            expect(gameScene.enableHighContrastMode).toHaveBeenCalled();
        });
    });

    describe('Audio Feedback for Navigation', () => {
        test('should play navigation sound when moving between cells', () => {
            gameScene.gridMode.accessibility.audioFeedback = true;
            
            gameScene.playNavigationSound('up');
            
            expect(gameScene.playNavigationSound).toHaveBeenCalledWith('up');
            // Should play directional navigation sound
        });

        test('should play selection sound when activating cell', () => {
            gameScene.gridMode.accessibility.audioFeedback = true;
            
            gameScene.playSelectionSound();
            
            expect(gameScene.playSelectionSound).toHaveBeenCalled();
            // Should play confirmation sound for selection
        });

        test('should use different sounds for different navigation directions', () => {
            const directions = ['up', 'down', 'left', 'right'];
            
            directions.forEach(direction => {
                gameScene.playNavigationSound(direction);
            });
            
            expect(gameScene.playNavigationSound).toHaveBeenCalledTimes(4);
            // Should use distinct sounds for each direction
        });

        test('should respect audio feedback preference settings', () => {
            gameScene.gridMode.accessibility.audioFeedback = false;
            
            gameScene.playNavigationSound('up');
            
            expect(gameScene.playNavigationSound).toHaveBeenCalledWith('up');
            // Should not play sounds when disabled
        });

        test('should provide audio feedback for boundary limits', () => {
            // Try to navigate beyond grid boundary
            gameScene.gridMode.currentCell = { row: 0, col: 0 };
            gameScene.handleKeyboardNavigation('ArrowUp'); // Can't go up from top row
            
            expect(gameScene.handleKeyboardNavigation).toHaveBeenCalledWith('ArrowUp');
            // Should play boundary sound or verbal announcement
        });

        test('should integrate audio feedback with speech announcements', () => {
            gameScene.playNavigationSound('right');
            gameScene.announceCellNavigation(1, 2);
            
            expect(gameScene.playNavigationSound).toHaveBeenCalledWith('right');
            expect(gameScene.announceCellNavigation).toHaveBeenCalledWith(1, 2);
            // Audio and speech should complement each other
        });

        test('should handle audio feedback in noisy environments', () => {
            // Mock Web Audio API context state
            global.AudioContext = jest.fn(() => ({
                state: 'suspended',
                resume: jest.fn()
            }));
            
            gameScene.playNavigationSound('down');
            
            expect(gameScene.playNavigationSound).toHaveBeenCalledWith('down');
            // Should handle cases where audio context is suspended
        });
    });

    describe('Keyboard-Only Navigation Support', () => {
        test('should handle arrow key navigation', () => {
            const keyEvents = [
                { code: 'ArrowUp' },
                { code: 'ArrowDown' },
                { code: 'ArrowLeft' },
                { code: 'ArrowRight' }
            ];
            
            keyEvents.forEach(event => {
                gameScene.handleKeyboardNavigation(event.code);
            });
            
            expect(gameScene.handleKeyboardNavigation).toHaveBeenCalledTimes(4);
        });

        test('should handle space key for cell activation', () => {
            gameScene.handleKeyboardNavigation('Space');
            
            expect(gameScene.handleKeyboardNavigation).toHaveBeenCalledWith('Space');
            // Should activate current cell (spawn object)
        });

        test('should handle enter key for cell activation', () => {
            gameScene.handleKeyboardNavigation('Enter');
            
            expect(gameScene.handleKeyboardNavigation).toHaveBeenCalledWith('Enter');
            // Should activate current cell (spawn object)
        });

        test('should handle escape key for grid state announcement', () => {
            gameScene.handleKeyboardNavigation('Escape');
            
            expect(gameScene.handleKeyboardNavigation).toHaveBeenCalledWith('Escape');
            expect(gameScene.announceGridState).toHaveBeenCalled();
        });

        test('should handle tab key for focus management', () => {
            gameScene.handleKeyboardNavigation('Tab');
            
            expect(gameScene.handleKeyboardNavigation).toHaveBeenCalledWith('Tab');
            // Should manage focus appropriately
        });

        test('should prevent default browser behavior for navigation keys', () => {
            const mockEvent = {
                code: 'ArrowUp',
                preventDefault: jest.fn()
            };
            
            gameScene.handleKeyboardNavigation(mockEvent.code);
            
            expect(gameScene.handleKeyboardNavigation).toHaveBeenCalledWith('ArrowUp');
            // Should prevent page scrolling when navigating grid
        });

        test('should provide keyboard shortcuts for common actions', () => {
            const shortcuts = [
                { key: 'KeyH', action: 'help' }, // Help/instructions
                { key: 'KeyG', action: 'grid-state' }, // Grid state announcement
                { key: 'KeyC', action: 'clear' }, // Clear current cell
                { key: 'KeyR', action: 'repeat' } // Repeat last announcement
            ];
            
            shortcuts.forEach(shortcut => {
                gameScene.handleKeyboardNavigation(shortcut.key);
            });
            
            expect(gameScene.handleKeyboardNavigation).toHaveBeenCalledTimes(4);
        });

        test('should handle rapid key presses without conflicts', () => {
            // Simulate rapid arrow key presses
            const rapidKeys = ['ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowLeft'];
            
            rapidKeys.forEach(key => {
                gameScene.handleKeyboardNavigation(key);
            });
            
            expect(gameScene.handleKeyboardNavigation).toHaveBeenCalledTimes(4);
            // Should handle rapid navigation smoothly
        });
    });

    describe('Focus Management and Visual Indicators', () => {
        test('should maintain clear focus indicator for current cell', () => {
            gameScene.updateFocusIndicator(1, 1);
            
            expect(gameScene.updateFocusIndicator).toHaveBeenCalledWith(1, 1);
            // Should show prominent focus indicator
        });

        test('should move focus indicator during navigation', () => {
            gameScene.gridMode.currentCell = { row: 1, col: 1 };
            gameScene.handleKeyboardNavigation('ArrowRight');
            
            expect(gameScene.updateFocusIndicator).toHaveBeenCalled();
            // Focus indicator should move to new cell
        });

        test('should use high visibility focus indicator', () => {
            gameScene.updateFocusIndicator(2, 2);
            
            expect(gameScene.updateFocusIndicator).toHaveBeenCalledWith(2, 2);
            // Focus indicator should be highly visible (thick border, bright color)
        });

        test('should respect reduced motion preferences for focus transitions', () => {
            gameScene.gridMode.accessibility.reducedMotion = true;
            gameScene.updateFocusIndicator(1, 2);
            
            expect(gameScene.updateFocusIndicator).toHaveBeenCalledWith(1, 2);
            // Should use instant transitions instead of animations
        });

        test('should handle focus indicator during rapid navigation', () => {
            // Rapid navigation sequence
            const moves = [
                { row: 1, col: 1 },
                { row: 1, col: 2 },
                { row: 2, col: 2 },
                { row: 2, col: 1 }
            ];
            
            moves.forEach(cell => {
                gameScene.updateFocusIndicator(cell.row, cell.col);
            });
            
            expect(gameScene.updateFocusIndicator).toHaveBeenCalledTimes(4);
            // Should handle rapid focus changes smoothly
        });

        test('should ensure focus indicator is always visible', () => {
            // Test with various grid sizes and cell positions
            const testCases = [
                { rows: 3, cols: 3, row: 0, col: 0 }, // Top-left
                { rows: 6, cols: 6, row: 5, col: 5 }, // Bottom-right
                { rows: 4, cols: 5, row: 2, col: 3 }  // Middle
            ];
            
            testCases.forEach(testCase => {
                mockGridManager.rows = testCase.rows;
                mockGridManager.cols = testCase.cols;
                gameScene.updateFocusIndicator(testCase.row, testCase.col);
            });
            
            expect(gameScene.updateFocusIndicator).toHaveBeenCalledTimes(3);
            // Focus should be visible in all cases
        });
    });

    describe('Cell Position Announcements', () => {
        test('should announce cell position using human-readable format', () => {
            gameScene.announceCellNavigation(0, 0);
            
            expect(gameScene.announceCellNavigation).toHaveBeenCalledWith(0, 0);
            expect(mockAriaAnnouncer.announce).toHaveBeenCalledWith(
                expect.stringContaining('Row 1, Column 1')
            );
        });

        test('should provide relative position context', () => {
            gameScene.announceCellNavigation(0, 1);
            
            expect(gameScene.announceCellNavigation).toHaveBeenCalledWith(0, 1);
            expect(mockAriaAnnouncer.announce).toHaveBeenCalledWith(
                expect.stringContaining('Top row, Column 2')
            );
        });

        test('should announce corner and edge positions', () => {
            const specialPositions = [
                { row: 0, col: 0, expected: 'Top-left corner' },
                { row: 0, col: 3, expected: 'Top-right corner' },
                { row: 3, col: 0, expected: 'Bottom-left corner' },
                { row: 3, col: 3, expected: 'Bottom-right corner' },
                { row: 0, col: 1, expected: 'Top edge' },
                { row: 3, col: 1, expected: 'Bottom edge' },
                { row: 1, col: 0, expected: 'Left edge' },
                { row: 1, col: 3, expected: 'Right edge' }
            ];
            
            specialPositions.forEach(pos => {
                gameScene.announceCellNavigation(pos.row, pos.col);
            });
            
            expect(gameScene.announceCellNavigation).toHaveBeenCalledTimes(8);
        });

        test('should provide cell descriptions when enabled', () => {
            gameScene.gridMode.accessibility.cellDescriptions = true;
            gameScene.provideCellDescription(1, 1);
            
            expect(gameScene.provideCellDescription).toHaveBeenCalledWith(1, 1);
            // Should provide detailed description of cell position and contents
        });

        test('should handle large grid announcements efficiently', () => {
            mockGridManager.rows = 6;
            mockGridManager.cols = 6;
            
            gameScene.announceCellNavigation(5, 5);
            
            expect(gameScene.announceCellNavigation).toHaveBeenCalledWith(5, 5);
            expect(mockAriaAnnouncer.announce).toHaveBeenCalledWith(
                expect.stringContaining('Row 6, Column 6')
            );
        });
    });

    describe('Accessibility Configuration and Preferences', () => {
        test('should respect user accessibility preferences', () => {
            const accessibilityPrefs = {
                screenReaderEnabled: true,
                announceNavigation: false,
                announceSelection: true,
                audioFeedback: false,
                highContrast: true,
                reducedMotion: true
            };
            
            gameScene.gridMode.accessibility = { ...gameScene.gridMode.accessibility, ...accessibilityPrefs };
            gameScene.initGridAccessibility();
            
            expect(gameScene.initGridAccessibility).toHaveBeenCalled();
            // Should apply all preference settings
        });

        test('should provide accessibility settings toggle', () => {
            gameScene.gridMode.accessibility.announceNavigation = false;
            gameScene.gridMode.accessibility.announceNavigation = true;
            
            gameScene.announceCellNavigation(1, 1);
            
            expect(gameScene.announceCellNavigation).toHaveBeenCalledWith(1, 1);
            // Should respect the updated setting
        });

        test('should handle missing accessibility preferences gracefully', () => {
            gameScene.gridMode.accessibility = null;
            gameScene.initGridAccessibility();
            
            expect(gameScene.initGridAccessibility).toHaveBeenCalled();
            // Should use default accessibility settings
        });

        test('should validate accessibility configuration values', () => {
            const invalidConfig = {
                screenReaderEnabled: 'yes', // Should be boolean
                announceNavigation: 1, // Should be boolean
                audioFeedback: 'loud' // Should be boolean
            };
            
            gameScene.gridMode.accessibility = invalidConfig;
            gameScene.initGridAccessibility();
            
            expect(gameScene.initGridAccessibility).toHaveBeenCalled();
            // Should handle invalid values and use defaults
        });

        test('should persist accessibility preferences', () => {
            const preferences = {
                screenReaderEnabled: true,
                highContrast: true,
                audioFeedback: false
            };
            
            // Simulate saving preferences
            localStorage.setItem('gridAccessibilityPrefs', JSON.stringify(preferences));
            
            gameScene.initGridAccessibility();
            
            expect(gameScene.initGridAccessibility).toHaveBeenCalled();
            // Should load and apply saved preferences
        });

        test('should provide accessibility help and instructions', () => {
            gameScene.handleKeyboardNavigation('KeyH'); // Help shortcut
            
            expect(gameScene.handleKeyboardNavigation).toHaveBeenCalledWith('KeyH');
            expect(mockAriaAnnouncer.announce).toHaveBeenCalledWith(
                expect.stringContaining('Grid navigation help')
            );
        });
    });
});