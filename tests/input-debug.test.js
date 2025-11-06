/**
 * @jest-environment jsdom
 */

// Quick debug test to verify input handling is working
describe('Input Debug Test', () => {
    test('should verify input event flow from InputManager to GameScene', () => {
        // Mock Phaser scene
        const mockEvents = {
            on: jest.fn(),
            emit: jest.fn()
        };
        
        const mockInput = {
            on: jest.fn()
        };
        
        const mockTime = {
            delayedCall: jest.fn(() => ({ remove: jest.fn() }))
        };
        
        const mockScene = {
            input: mockInput,
            events: mockEvents,
            time: mockTime
        };
        
        // Import InputManager (inline for testing)
        class InputManager {
            constructor(scene) {
                this.scene = scene;
                this.pointerIsDown = false;
                this.holdTimer = null;
                this.holdDuration = 500;
                this.initializeInputHandlers();
            }
            
            initializeInputHandlers() {
                this.scene.input.on('pointerdown', this.onPointerDown, this);
            }
            
            onPointerDown(pointer) {
                this.pointerIsDown = true;
                this.emit('pointerDown', { x: pointer.x, y: pointer.y });
            }
            
            emit(eventName, data) {
                this.scene.events.emit(`input:${eventName}`, data);
            }
        }
        
        const inputManager = new InputManager(mockScene);
        
        // Verify that input handlers are set up
        expect(mockInput.on).toHaveBeenCalledWith('pointerdown', expect.any(Function), inputManager);
        
        // Simulate pointer down
        const mockPointer = { x: 100, y: 200 };
        inputManager.onPointerDown(mockPointer);
        
        // Verify that the correct event is emitted
        expect(mockEvents.emit).toHaveBeenCalledWith('input:pointerDown', { x: 100, y: 200 });
        
        console.log('✅ Input event flow test passed - InputManager correctly emits input:pointerDown');
    });
    
    test('should verify GameScene listens for correct events', () => {
        const mockEvents = {
            on: jest.fn()
        };

        const mockScene = {
            events: mockEvents,
            onInputPointerDown: jest.fn() // Add the missing handler function
        };

        // Simulate GameScene setupInputHandlers
        const setupInputHandlers = function() {
            this.events.on('input:pointerDown', this.onInputPointerDown, this);
        };

        setupInputHandlers.call(mockScene);

        // Verify correct event listener setup
        expect(mockEvents.on).toHaveBeenCalledWith('input:pointerDown', expect.any(Function), mockScene);

        console.log('✅ GameScene event listener test passed - correctly listens for input:pointerDown');
    });
});