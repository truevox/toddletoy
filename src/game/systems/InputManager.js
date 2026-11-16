import { viewWidth, viewHeight, toLogical } from './DisplayScale.js'
import { KeyboardInput } from '../input/KeyboardInput.js'

/**
 * InputManager - Unified input handling for pointer, keyboard, and gamepad
 * Manages all user input events and emits standardized events for the game
 */
export class InputManager {
    constructor(scene) {
        this.scene = scene;
        this.gamepadDeadzone = 0.1;
        this.gamepadButtonStates = new Map();
        this.currentGamepadPosition = {
            x: viewWidth(scene) / 2,
            y: viewHeight(scene) / 2
        };
        this.holdTimer = null;
        this.holdDuration = 500; // 500ms hold to start auto-drag
        this.isHolding = false;
        this.pointerIsDown = false;
        
        this.keyboard = null; // baby keyboard, created by initKeyboardInput()

        this.initializeInputHandlers();
    }

    initializeInputHandlers() {
        // Pointer/touch input
        this.scene.input.on('pointerdown', this.onPointerDown, this);
        this.scene.input.on('pointermove', this.onPointerMove, this);
        this.scene.input.on('pointerup', this.onPointerUp, this);

        // Keyboard input
        this.initKeyboardInput();

        // Gamepad input
        this.initGamepadInput();
    }

    onPointerDown(pointer) {
        this.pointerIsDown = true;
        this.isHolding = false;

        // Start hold timer for auto-drag
        this.holdTimer = this.scene.time.delayedCall(this.holdDuration, () => {
            if (this.pointerIsDown) {
                this.isHolding = true;
                this.emit('holdStart', toLogical(this.scene, pointer));
            }
        });

        this.emit('pointerDown', toLogical(this.scene, pointer));
    }

    onPointerMove(pointer) {
        if (this.pointerIsDown) {
            this.emit('pointerMove', toLogical(this.scene, pointer));
        }
    }

    onPointerUp(pointer) {
        this.pointerIsDown = false;
        this.isHolding = false;

        // Clear hold timer
        if (this.holdTimer) {
            this.holdTimer.remove();
            this.holdTimer = null;
        }

        this.emit('pointerUp', toLogical(this.scene, pointer));
    }

    /** Baby keyboard: listens on the window (see ../input/KeyboardInput.js). */
    initKeyboardInput() {
        this.keyboard = new KeyboardInput(this.scene, (name, data) => this.emit(name, data));
    }

    /** Viewport changed (resize / rotation): rescale the gamepad cursor. Key positions are computed per press. */
    handleResize(previous) {
        const width = viewWidth(this.scene);
        const height = viewHeight(this.scene);

        if (previous && previous.width > 0 && previous.height > 0) {
            const sx = width / previous.width;
            const sy = height / previous.height;
            this.currentGamepadPosition.x *= sx;
            this.currentGamepadPosition.y *= sy;
        } else {
            this.currentGamepadPosition.x = width / 2;
            this.currentGamepadPosition.y = height / 2;
        }
    }

    /** Another screen covers the toy (or the toy is back): keys and pads are ignored right away, not a frame later. */
    setInputPaused(paused) {
        if (this.keyboard) this.keyboard.setPaused(paused);
    }

    /**
     * Forget every held key. Key-up events are not delivered while the scene
     * is paused (parent exit, tab switch), so stale entries would swallow the
     * next press of those keys.
     */
    clearHeldKeys() {
        if (this.keyboard) this.keyboard.clear();
    }

    initGamepadInput() {
        // Gamepad events are handled in update loop
        this.gamepadEnabled = true;
    }

    update() {
        this.updateGamepad();
    }

    updateGamepad() {
        if (!this.gamepadEnabled) return;

        const gamepads = navigator.getGamepads();
        if (!gamepads || gamepads.length === 0) return;

        const gamepad = gamepads[0];
        if (!gamepad) return;

        // Update gamepad position based on stick input
        this.updateGamepadPosition(gamepad);
        
        // Check gamepad buttons
        this.updateGamepadButtons(gamepad);
    }

    updateGamepadPosition(gamepad) {
        const leftStickX = Math.abs(gamepad.axes[0]) > this.gamepadDeadzone ? gamepad.axes[0] : 0;
        const leftStickY = Math.abs(gamepad.axes[1]) > this.gamepadDeadzone ? gamepad.axes[1] : 0;
        const rightStickX = Math.abs(gamepad.axes[2]) > this.gamepadDeadzone ? gamepad.axes[2] : 0;
        const rightStickY = Math.abs(gamepad.axes[3]) > this.gamepadDeadzone ? gamepad.axes[3] : 0;

        // Average the two sticks for position
        const avgX = (leftStickX + rightStickX) / 2;
        const avgY = (leftStickY + rightStickY) / 2;

        if (Math.abs(avgX) > 0.01 || Math.abs(avgY) > 0.01) {
            const screenWidth = viewWidth(this.scene);
            const screenHeight = viewHeight(this.scene);
            
            this.currentGamepadPosition.x = Math.max(50, Math.min(screenWidth - 50, 
                this.currentGamepadPosition.x + avgX * 5));
            this.currentGamepadPosition.y = Math.max(50, Math.min(screenHeight - 50, 
                this.currentGamepadPosition.y + avgY * 5));

            this.emit('gamepadMove', { position: this.currentGamepadPosition });
        }
    }

    updateGamepadButtons(gamepad) {
        gamepad.buttons.forEach((button, index) => {
            const wasPressed = this.gamepadButtonStates.get(index) || false;
            const isPressed = button.pressed;

            if (isPressed && !wasPressed) {
                this.emit('gamepadButtonDown', { 
                    button: index, 
                    position: this.currentGamepadPosition 
                });
            } else if (!isPressed && wasPressed) {
                this.emit('gamepadButtonUp', { 
                    button: index, 
                    position: this.currentGamepadPosition 
                });
            }

            this.gamepadButtonStates.set(index, isPressed);
        });
    }

    // Event emitter functionality
    emit(eventName, data) {
        // Emit to scene's events system
        this.scene.events.emit(`input:${eventName}`, data);
    }

    destroy() {
        // Clean up event listeners
        this.scene.input.off('pointerdown', this.onPointerDown, this);
        this.scene.input.off('pointermove', this.onPointerMove, this);
        this.scene.input.off('pointerup', this.onPointerUp, this);
        
        if (this.keyboard) this.keyboard.destroy();

        if (this.holdTimer) {
            this.holdTimer.remove();
        }
    }
}