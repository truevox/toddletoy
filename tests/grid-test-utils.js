/**
 * Grid Mode Test Utilities
 * Helper functions and mock configurations for comprehensive Grid Mode testing
 */

/**
 * Creates a mock GridManager instance with configurable properties
 */
export function createMockGridManager(options = {}) {
    const defaults = {
        rows: 4,
        cols: 4,
        screenWidth: 800,
        screenHeight: 600,
        cellWidth: 150,
        cellHeight: 120,
        offsetX: 50,
        offsetY: 60,
        cellPadding: 10
    };

    const config = { ...defaults, ...options };

    return {
        ...config,
        
        // Core grid calculation methods
        calculateGrid: jest.fn(),
        getCellPosition: jest.fn((row, col) => {
            if (row < 0 || row >= config.rows || col < 0 || col >= config.cols) {
                return null;
            }
            return {
                x: config.offsetX + (col * config.cellWidth) + (config.cellWidth / 2),
                y: config.offsetY + (row * config.cellHeight) + (config.cellHeight / 2)
            };
        }),
        getGridCell: jest.fn((screenX, screenY) => {
            const col = Math.floor((screenX - config.offsetX) / config.cellWidth);
            const row = Math.floor((screenY - config.offsetY) / config.cellHeight);
            
            if (row >= 0 && row < config.rows && col >= 0 && col < config.cols) {
                return { row, col };
            }
            return null;
        }),
        isValidCell: jest.fn((row, col) => {
            return row >= 0 && row < config.rows && col >= 0 && col < config.cols;
        }),
        updateDimensions: jest.fn((width, height) => {
            config.screenWidth = width;
            config.screenHeight = height;
            // Recalculate cell dimensions
            config.cellWidth = (width - 100) / config.cols; // 100px total margin
            config.cellHeight = (height - 120) / config.rows; // 120px total margin
            config.offsetX = (width - (config.cellWidth * config.cols)) / 2;
            config.offsetY = (height - (config.cellHeight * config.rows)) / 2;
        })
    };
}

/**
 * Creates a mock game scene with grid functionality
 */
export function createMockGameScene(options = {}) {
    const mockGridManager = createMockGridManager(options.gridManager);
    
    const scene = {
        gridManager: mockGridManager,
        objects: [],
        config: { width: 800, height: 600 },
        gridMode: {
            enabled: false,
            currentCell: { row: 0, col: 0 },
            selectedCell: null,
            autoCleanupTimers: new Map(),
            cellOccupancy: new Map(),
            ...options.gridMode
        },
        
        // Mock Phaser components
        add: {
            text: jest.fn(() => createMockTextObject()),
            graphics: jest.fn(() => createMockGraphics()),
            tween: jest.fn()
        },
        input: createMockInput(),
        
        // Grid mode methods (mocked)
        enableGridMode: jest.fn(),
        disableGridMode: jest.fn(),
        createGridOverlay: jest.fn(),
        updateGridOverlay: jest.fn(),
        highlightGridCell: jest.fn(),
        clearGridHighlight: jest.fn(),
        spawnObjectInGridCell: jest.fn(),
        removeObjectFromGridCell: jest.fn(),
        navigateGridCell: jest.fn(),
        selectGridCell: jest.fn(),
        
        // Existing game methods
        spawnObjectAt: jest.fn(() => createMockGameObject()),
        displayTextLabels: jest.fn(),
        speakObjectLabel: jest.fn(),
        
        ...options.scene
    };
    
    return scene;
}

/**
 * Creates a mock Phaser text object
 */
export function createMockTextObject() {
    return {
        setOrigin: jest.fn().mockReturnThis(),
        setPosition: jest.fn().mockReturnThis(),
        setAlpha: jest.fn().mockReturnThis(),
        setTint: jest.fn().mockReturnThis(),
        clearTint: jest.fn().mockReturnThis(),
        setVisible: jest.fn().mockReturnThis(),
        destroy: jest.fn(),
        x: 0,
        y: 0,
        text: ''
    };
}

/**
 * Creates a mock Phaser graphics object
 */
export function createMockGraphics() {
    return {
        lineStyle: jest.fn().mockReturnThis(),
        strokeRect: jest.fn().mockReturnThis(),
        fillStyle: jest.fn().mockReturnThis(),
        fillRect: jest.fn().mockReturnThis(),
        fillCircle: jest.fn().mockReturnThis(),
        clear: jest.fn().mockReturnThis(),
        setVisible: jest.fn().mockReturnThis(),
        setAlpha: jest.fn().mockReturnThis(),
        setTint: jest.fn().mockReturnThis(),
        destroy: jest.fn(),
        x: 0,
        y: 0
    };
}

/**
 * Creates a mock input system
 */
export function createMockInput() {
    return {
        keyboard: {
            on: jest.fn(),
            addKeys: jest.fn(),
            createCursorKeys: jest.fn(() => ({
                up: { isDown: false, justDown: false },
                down: { isDown: false, justDown: false },
                left: { isDown: false, justDown: false },
                right: { isDown: false, justDown: false }
            }))
        },
        gamepad: {
            total: 0,
            getPad: jest.fn(() => null)
        },
        activePointer: null,
        pointers: []
    };
}

/**
 * Creates a mock game object
 */
export function createMockGameObject(options = {}) {
    const defaults = {
        id: `obj-${Date.now()}-${Math.random()}`,
        x: 100,
        y: 100,
        type: 'emoji',
        data: { en: 'Test Object', es: 'Objeto de Prueba' },
        lastInteractionTime: Date.now()
    };
    
    return {
        ...defaults,
        ...options,
        sprite: createMockTextObject(),
        englishLabel: createMockTextObject(),
        spanishLabel: createMockTextObject()
    };
}

/**
 * Grid configuration test scenarios
 */
export const gridTestScenarios = {
    // Standard grid sizes
    small: { rows: 3, cols: 3 },
    medium: { rows: 4, cols: 4 },
    large: { rows: 5, cols: 5 },
    maximum: { rows: 6, cols: 6 },
    
    // Asymmetric grids
    wide: { rows: 3, cols: 5 },
    tall: { rows: 5, cols: 3 },
    
    // Screen dimensions for testing
    screens: {
        mobile: { width: 375, height: 667 },
        mobileLandscape: { width: 667, height: 375 },
        tablet: { width: 768, height: 1024 },
        tabletLandscape: { width: 1024, height: 768 },
        desktop: { width: 1920, height: 1080 },
        ultrawide: { width: 2560, height: 1080 }
    },
    
    // Device configurations
    devices: {
        mobile: {
            type: 'mobile',
            touchEnabled: true,
            maxGridSize: { rows: 4, cols: 4 },
            minCellSize: 80
        },
        tablet: {
            type: 'tablet',
            touchEnabled: true,
            maxGridSize: { rows: 5, cols: 5 },
            minCellSize: 100
        },
        desktop: {
            type: 'desktop',
            touchEnabled: false,
            maxGridSize: { rows: 6, cols: 6 },
            minCellSize: 120
        }
    }
};

/**
 * Creates test objects for various grid scenarios
 */
export function createTestObjects(count, options = {}) {
    const objects = [];
    
    for (let i = 0; i < count; i++) {
        const row = Math.floor(i / 4) % 4;
        const col = i % 4;
        
        objects.push(createMockGameObject({
            id: `test-obj-${i}`,
            gridCell: { row, col },
            ...options
        }));
    }
    
    return objects;
}

/**
 * Mock configuration manager for grid settings
 */
export function createMockConfigManager(overrides = {}) {
    const defaultConfig = {
        gridMode: {
            enabled: false,
            rows: 4,
            cols: 4,
            showGrid: true,
            autoPopulate: false,
            cellPadding: 10,
            wrapNavigation: false,
            highlightStyle: 'default',
            theme: 'default',
            autoCleanup: {
                enabled: true,
                timeoutDuration: 20000,
                maxObjectsPerCell: 1,
                cleanupStrategy: 'cell-based'
            }
        },
        autoCleanup: {
            enabled: true,
            timeoutDuration: 30000,
            maxObjects: 10
        }
    };
    
    return {
        config: { ...defaultConfig, ...overrides },
        saveConfig: jest.fn(),
        loadConfig: jest.fn(),
        resetToDefaults: jest.fn(),
        validateConfig: jest.fn(() => true),
        getGridConfig: jest.fn(function() { return this.config.gridMode; }),
        setGridConfig: jest.fn(function(gridConfig) { 
            this.config.gridMode = { ...this.config.gridMode, ...gridConfig };
        }),
        updateGridSettings: jest.fn()
    };
}

/**
 * Accessibility testing helpers
 */
export const accessibilityTestHelpers = {
    createMockAriaAnnouncer() {
        return {
            announce: jest.fn(),
            setLiveRegion: jest.fn(),
            clearAnnouncements: jest.fn()
        };
    },
    
    createMockSpeechSynthesis() {
        return {
            speak: jest.fn(),
            cancel: jest.fn(),
            getVoices: jest.fn(() => [])
        };
    },
    
    mockHighContrastMedia() {
        return {
            matches: false,
            addEventListener: jest.fn(),
            removeEventListener: jest.fn()
        };
    },
    
    mockReducedMotionMedia() {
        return {
            matches: false,
            addEventListener: jest.fn(),
            removeEventListener: jest.fn()
        };
    }
};

/**
 * Performance testing utilities
 */
export const performanceTestHelpers = {
    createLargeGridScenario(rows = 6, cols = 6) {
        const objects = [];
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                objects.push(createMockGameObject({
                    gridCell: { row, col },
                    lastInteractionTime: Date.now() - Math.random() * 60000
                }));
            }
        }
        return objects;
    },
    
    simulateRapidInteractions(count = 100) {
        const interactions = [];
        for (let i = 0; i < count; i++) {
            interactions.push({
                type: 'spawn',
                cell: { row: Math.floor(Math.random() * 4), col: Math.floor(Math.random() * 4) },
                timestamp: Date.now() + i * 10 // 10ms intervals
            });
        }
        return interactions;
    },
    
    measureMemoryUsage: jest.fn(),
    measureRenderTime: jest.fn()
};

/**
 * Cross-device testing scenarios
 */
export const deviceTestScenarios = {
    mobilePortrait: {
        screen: { width: 375, height: 667 },
        device: { type: 'mobile', orientation: 'portrait', touchEnabled: true },
        expectedGrid: { rows: 3, cols: 3 }
    },
    
    mobileLandscape: {
        screen: { width: 667, height: 375 },
        device: { type: 'mobile', orientation: 'landscape', touchEnabled: true },
        expectedGrid: { rows: 3, cols: 4 }
    },
    
    tabletPortrait: {
        screen: { width: 768, height: 1024 },
        device: { type: 'tablet', orientation: 'portrait', touchEnabled: true },
        expectedGrid: { rows: 4, cols: 4 }
    },
    
    desktop: {
        screen: { width: 1920, height: 1080 },
        device: { type: 'desktop', orientation: 'landscape', touchEnabled: false },
        expectedGrid: { rows: 5, cols: 6 }
    },
    
    ultrawideDesktop: {
        screen: { width: 2560, height: 1080 },
        device: { type: 'desktop', orientation: 'landscape', touchEnabled: false },
        expectedGrid: { rows: 4, cols: 6 }
    }
};

/**
 * Common test assertion helpers
 */
export const assertionHelpers = {
    expectValidGridPosition(position) {
        expect(position).toHaveProperty('x');
        expect(position).toHaveProperty('y');
        expect(typeof position.x).toBe('number');
        expect(typeof position.y).toBe('number');
        expect(position.x).toBeGreaterThanOrEqual(0);
        expect(position.y).toBeGreaterThanOrEqual(0);
    },
    
    expectValidGridCell(cell) {
        expect(cell).toHaveProperty('row');
        expect(cell).toHaveProperty('col');
        expect(Number.isInteger(cell.row)).toBe(true);
        expect(Number.isInteger(cell.col)).toBe(true);
        expect(cell.row).toBeGreaterThanOrEqual(0);
        expect(cell.col).toBeGreaterThanOrEqual(0);
    },
    
    expectGridCellInBounds(cell, gridManager) {
        expect(cell.row).toBeLessThan(gridManager.rows);
        expect(cell.col).toBeLessThan(gridManager.cols);
    },
    
    expectValidGameObject(obj) {
        expect(obj).toHaveProperty('id');
        expect(obj).toHaveProperty('x');
        expect(obj).toHaveProperty('y');
        expect(obj).toHaveProperty('type');
        expect(obj).toHaveProperty('data');
        expect(typeof obj.id).toBe('string');
        expect(typeof obj.x).toBe('number');
        expect(typeof obj.y).toBe('number');
    }
};

/**
 * Test data generators
 */
export const testDataGenerators = {
    randomGridCell(maxRows = 4, maxCols = 4) {
        return {
            row: Math.floor(Math.random() * maxRows),
            col: Math.floor(Math.random() * maxCols)
        };
    },
    
    randomScreenPosition(maxWidth = 800, maxHeight = 600) {
        return {
            x: Math.random() * maxWidth,
            y: Math.random() * maxHeight
        };
    },
    
    generateTestObjectData() {
        const types = ['emoji', 'shape', 'letter', 'number'];
        const emojis = ['🐶', '🐱', '🐻', '🦁', '🐸'];
        const shapes = ['Circle', 'Square', 'Triangle', 'Rectangle'];
        const letters = ['A', 'B', 'C', 'D', 'E'];
        const numbers = [1, 2, 3, 4, 5];
        
        const type = types[Math.floor(Math.random() * types.length)];
        
        switch (type) {
            case 'emoji':
                const emoji = emojis[Math.floor(Math.random() * emojis.length)];
                return { emoji, en: 'Animal', es: 'Animal', type };
            case 'shape':
                const shape = shapes[Math.floor(Math.random() * shapes.length)];
                return { en: `Red ${shape}`, es: `${shape} Rojo`, type };
            case 'letter':
                const letter = letters[Math.floor(Math.random() * letters.length)];
                return { en: `Letter ${letter}`, es: `Letra ${letter}`, type };
            case 'number':
                const number = numbers[Math.floor(Math.random() * numbers.length)];
                return { en: `Number ${number}`, es: `Número ${number}`, type };
            default:
                return { en: 'Test Object', es: 'Objeto de Prueba', type: 'test' };
        }
    }
};