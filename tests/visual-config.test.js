/**
 * @jest-environment jsdom
 */
const fs = require('fs');
const path = require('path');

const mockPhaser = {
    AUTO: 'AUTO',
    Scale: {
        RESIZE: 'RESIZE',
        CENTER_BOTH: 'CENTER_BOTH'
    },
    Game: class {
        constructor(config) {
            this.config = config;
            this.events = {
                once: jest.fn(),
                on: jest.fn()
            };
            this.scene = {
                getScene: jest.fn(),
                scenes: []
            };
            this.scale = {
                resize: jest.fn()
            };
        }
    },
    Scene: class {
        constructor(config) {
            this.sys = {
                update: jest.fn(),
                events: { on: jest.fn() }
            };
        }
    },
    GameObjects: {
        Container: class {
            constructor() { }
        },
        Image: class { },
        Text: class { }
    },
    Display: {
        Color: {
            HexStringToColor: jest.fn(() => ({ color: 0 }))
        }
    }
};

// Set global variable for finding like `class ResourceBar extends Phaser.GameObjects.Container`
global.Phaser = mockPhaser;

// Mock module for `import Phaser from 'phaser'`
jest.mock('phaser', () => mockPhaser, { virtual: true });


describe('Visual Configuration', () => {
    let ResponsiveGameManager;

    beforeAll(async () => {
        // Load index.html content into JSDOM
        const htmlPath = path.resolve(__dirname, '../index.html');
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        document.documentElement.innerHTML = htmlContent;

        // Mock other dependencies if they are imported by game.js
        jest.mock('../src/config/ConfigManager.js', () => ({ ConfigManager: class { } }), { virtual: true });
        jest.mock('../src/positioning/PositioningSystem.js', () => ({ PositioningSystem: class { } }), { virtual: true });
        jest.mock('../src/game/systems/AudioManager.js', () => ({ AudioManager: class { } }), { virtual: true });

        // Import the class under test
        const gameModule = await import('../src/game.js');
        ResponsiveGameManager = gameModule.ResponsiveGameManager;
    });

    test('HTML and Body should have black background fallback', () => {
        // JSDOM computed styles might not be perfect for gradients, but we can check specific rules
        // or just check the style element contents if JSDOM is limited.

        // However, we can check basic styles if they are applied.
        // Let's manually verify the style tag content for critical rules as a robust check.
        const styleTag = document.querySelector('style');
        const styleContent = styleTag.textContent;

        expect(styleContent).toContain('background-color: #000');
        expect(styleContent).toContain('background: radial-gradient(circle at center, #1a1a1a 0%, #000000 85%)');

        // Also check computed style for body if possible
        // Note: JSDOM support for complex CSS inheritance is good but 'background' shorthand can be tricky.
        // We'll focus on the presence of the rigorous CSS definitions.
    });

    test('Phaser config should have transparent: true', () => {
        // Instantiate the manager
        const manager = new ResponsiveGameManager();

        // Access the config passed to Phaser.Game
        const config = manager.config;

        expect(config).toBeDefined();

        // THE CRITICAL CHECK:
        expect(config.transparent).toBe(true);

        // Also verify background color is NOT set (which would override transparency)
        expect(config.backgroundColor).toBeUndefined();
    });
});
