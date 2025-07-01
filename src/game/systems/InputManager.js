/**
 * InputManager - Unified input handling for pointer, keyboard, and gamepad
 * Manages all user input events and emits standardized events for the game
 */
export class InputManager {
    constructor(scene) {
        this.scene = scene;
        this.gamepadDeadzone = 0.1;
        this.gamepadButtonStates = new Map();
        this.currentGamepadPosition = { x: 400, y: 300 };
        this.holdTimer = null;
        this.holdDuration = 500; // 500ms hold to start auto-drag
        this.isHolding = false;
        this.pointerIsDown = false;
        
        // Advanced keyboard state
        this.keyPositions = {};
        this.keysHeld = new Set();
        this.interpolatedPosition = { x: 0, y: 0 };
        this.averageKeyPosition = { x: 0, y: 0 };
        
        this.initializeInputHandlers();
    }

    initializeInputHandlers() {
        console.log('🎮 InputManager.initializeInputHandlers called');
        console.log('🎮 Scene input object:', this.scene.input);
        console.log('🎮 Scene input enabled:', this.scene.input?.enabled);
        
        // Pointer/touch input
        this.scene.input.on('pointerdown', this.onPointerDown, this);
        this.scene.input.on('pointermove', this.onPointerMove, this);
        this.scene.input.on('pointerup', this.onPointerUp, this);
        
        console.log('🎮 Input event listeners attached');
        
        // Test if we can manually trigger input detection
        console.log('🎮 Scene canvas:', this.scene.game.canvas);
        
        // Keyboard input
        this.initKeyboardInput();
        
        // Gamepad input
        this.initGamepadInput();
    }

    onPointerDown(pointer) {
        console.log('🎮 InputManager.onPointerDown called with pointer:', pointer.x, pointer.y);
        this.pointerIsDown = true;
        this.isHolding = false;

        // Start hold timer for auto-drag
        this.holdTimer = this.scene.time.delayedCall(this.holdDuration, () => {
            if (this.pointerIsDown) {
                this.isHolding = true;
                this.emit('holdStart', { x: pointer.x, y: pointer.y });
            }
        });

        console.log('🎮 InputManager emitting input:pointerDown');
        this.emit('pointerDown', { x: pointer.x, y: pointer.y });
    }

    onPointerMove(pointer) {
        if (this.pointerIsDown) {
            this.emit('pointerMove', { x: pointer.x, y: pointer.y });
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

        this.emit('pointerUp', { x: pointer.x, y: pointer.y });
    }

    initKeyboardInput() {
        // Define 3x3 grid layout (QWEASDZXC)
        const gridKeys = [
            { key: 'Q', gridX: 0, gridY: 0 },
            { key: 'W', gridX: 1, gridY: 0 },
            { key: 'E', gridX: 2, gridY: 0 },
            { key: 'A', gridX: 0, gridY: 1 },
            { key: 'S', gridX: 1, gridY: 1 },
            { key: 'D', gridX: 2, gridY: 1 },
            { key: 'Z', gridX: 0, gridY: 2 },
            { key: 'X', gridX: 1, gridY: 2 },
            { key: 'C', gridX: 2, gridY: 2 }
        ];

        // Calculate positions for 3x3 grid
        const screenWidth = this.scene.scale.width;
        const screenHeight = this.scene.scale.height;
        const gridWidth = screenWidth * 0.8;
        const gridHeight = screenHeight * 0.8;
        const startX = (screenWidth - gridWidth) / 2;
        const startY = (screenHeight - gridHeight) / 2;

        gridKeys.forEach(({ key, gridX, gridY }) => {
            const x = startX + (gridX * gridWidth / 2);
            const y = startY + (gridY * gridHeight / 2);
            this.keyPositions[key] = { x, y };
        });

        // Set up keyboard event listeners
        this.scene.input.keyboard.on('keydown', this.onKeyDown, this);
        this.scene.input.keyboard.on('keyup', this.onKeyUp, this);
    }

    onKeyDown(event) {
        const key = event.key.toUpperCase();
        
        if (this.keyPositions[key]) {
            event.preventDefault();
            
            if (!this.keysHeld.has(key)) {
                this.keysHeld.add(key);
                this.updateAverageKeyPosition();
                
                if (this.keysHeld.size === 1) {
                    // First key pressed - spawn object
                    const position = this.keyPositions[key];
                    this.emit('keyPress', { key, position });
                } else {
                    // Multiple keys - update interpolated position
                    this.emit('keyInterpolate', { position: this.averageKeyPosition });
                }
            }
        }
    }

    onKeyUp(event) {
        const key = event.key.toUpperCase();
        
        if (this.keyPositions[key] && this.keysHeld.has(key)) {
            event.preventDefault();
            this.keysHeld.delete(key);
            this.updateAverageKeyPosition();
            
            if (this.keysHeld.size === 0) {
                this.emit('keyRelease', { key });
            } else {
                // Still have keys held - update interpolated position
                this.emit('keyInterpolate', { position: this.averageKeyPosition });
            }
        }
    }

    updateAverageKeyPosition() {
        if (this.keysHeld.size === 0) {
            this.averageKeyPosition = { x: 0, y: 0 };
            return;
        }

        let totalX = 0;
        let totalY = 0;
        
        this.keysHeld.forEach(key => {
            const pos = this.keyPositions[key];
            totalX += pos.x;
            totalY += pos.y;
        });

        this.averageKeyPosition = {
            x: totalX / this.keysHeld.size,
            y: totalY / this.keysHeld.size
        };
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
            const screenWidth = this.scene.scale.width;
            const screenHeight = this.scene.scale.height;
            
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
        
        if (this.scene.input.keyboard) {
            this.scene.input.keyboard.off('keydown', this.onKeyDown, this);
            this.scene.input.keyboard.off('keyup', this.onKeyUp, this);
        }

        if (this.holdTimer) {
            this.holdTimer.remove();
        }
    }
}