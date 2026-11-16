import { PointerInput } from '../input/PointerInput.js'
import { KeyboardInput } from '../input/KeyboardInput.js'
import { GamepadInput } from '../input/GamepadInput.js'

/**
 * InputManager - Unified input handling for pointer, keyboard, and gamepad
 * Manages all user input events and emits standardized events for the game
 */
export class InputManager {
    constructor(scene) {
        this.scene = scene;
        this.pointerIsDown = false; // any pointer down
        this.pointerInput = new PointerInput(this); // the mouse and up to 10 fingers
        
        this.keyboard = null; // baby keyboard, created by initKeyboardInput()
        this.gamepad = null;  // pads and their cursors, created by initGamepadInput()

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

    onPointerDown(pointer) { this.pointerInput.onDown(pointer); }

    onPointerMove(pointer) { this.pointerInput.onMove(pointer); }

    onPointerUp(pointer) { this.pointerInput.onUp(pointer); }

    /** Baby keyboard: listens on the window (see ../input/KeyboardInput.js). */
    initKeyboardInput() {
        this.keyboard = new KeyboardInput(this.scene, (name, data) => this.emit(name, data));
    }

    /** Viewport changed (resize / rotation): keep the gamepad cursors where they were, relatively. Key positions are computed per press. */
    handleResize(previous) {
        if (this.gamepad) this.gamepad.handleResize(previous);
    }

    /** Another screen covers the toy (or the toy is back): keys and pads are ignored right away, not a frame later. */
    setInputPaused(paused) {
        if (this.keyboard) this.keyboard.setPaused(paused);
        if (this.gamepad) this.gamepad.setPaused(paused);
    }

    /**
     * Forget every held key. Key-up events are not delivered while the scene
     * is paused (parent exit, tab switch), so stale entries would swallow the
     * next press of those keys.
     */
    clearHeldKeys() {
        if (this.keyboard) this.keyboard.clear();
    }

    /** Gamepads: nothing is polled until one connects (see ../input/GamepadInput.js). */
    initGamepadInput() {
        this.gamepad = new GamepadInput(this.scene, (name, data) => this.emit(name, data));
    }

    update() {
        if (this.gamepad) this.gamepad.update();
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
        if (this.gamepad) this.gamepad.destroy();

        this.pointerInput.destroy();
    }
}