/**
 * @jest-environment jsdom
 */

/**
 * Test: InputManager should NOT add duplicate DOM event listeners
 * 
 * The bug: Debug code added addEventListener('click') and addEventListener('pointerdown')
 * directly to the canvas, causing duplicate events on touch devices.
 * 
 * This test verifies that InputManager.initializeInputHandlers does NOT
 * call addEventListener on the canvas element.
 */

describe('InputManager Duplicate Event Prevention', () => {
    let mockScene;
    let mockCanvas;
    let addEventListenerSpy;

    beforeEach(() => {
        // Create a mock canvas with spied addEventListener
        mockCanvas = document.createElement('canvas');
        addEventListenerSpy = jest.spyOn(mockCanvas, 'addEventListener');

        // Create mock Phaser scene
        mockScene = {
            input: {
                on: jest.fn(),
                keyboard: {
                    on: jest.fn()
                },
                enabled: true
            },
            game: {
                canvas: mockCanvas
            },
            scale: {
                width: 800,
                height: 600
            },
            time: {
                delayedCall: jest.fn()
            },
            events: {
                emit: jest.fn()
            }
        };
    });

    afterEach(() => {
        addEventListenerSpy.mockRestore();
    });

    test('InputManager should NOT add DOM event listeners to canvas (prevents duplicate events)', async () => {
        // Import and instantiate InputManager
        // Note: We import dynamically to ensure fresh module state
        const { InputManager } = await import('../src/game/systems/InputManager.js');

        // Create InputManager instance
        new InputManager(mockScene);

        // ASSERTION: addEventListener should NOT have been called on the canvas
        // If this fails, it means there are debug listeners causing duplicate events
        const clickListeners = addEventListenerSpy.mock.calls.filter(
            call => call[0] === 'click'
        );
        const pointerdownListeners = addEventListenerSpy.mock.calls.filter(
            call => call[0] === 'pointerdown'
        );

        expect(clickListeners.length).toBe(0);
        expect(pointerdownListeners.length).toBe(0);
    });

    test('InputManager should only use Phaser input system (no DOM duplication)', async () => {
        const { InputManager } = await import('../src/game/systems/InputManager.js');

        new InputManager(mockScene);

        // Phaser input listeners SHOULD be added
        expect(mockScene.input.on).toHaveBeenCalledWith('pointerdown', expect.any(Function), expect.anything());
        expect(mockScene.input.on).toHaveBeenCalledWith('pointermove', expect.any(Function), expect.anything());
        expect(mockScene.input.on).toHaveBeenCalledWith('pointerup', expect.any(Function), expect.anything());

        // But DOM listeners should NOT
        expect(addEventListenerSpy).not.toHaveBeenCalledWith('click', expect.any(Function));
        expect(addEventListenerSpy).not.toHaveBeenCalledWith('pointerdown', expect.any(Function));
    });
});
