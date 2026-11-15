import { viewWidth, viewHeight, toLogical } from './DisplayScale.js'

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
        
        // Advanced keyboard state
        this.keyPositions = {};
        this.randomKeyPositions = new Map(); // held id -> random position for non-grid keys
        this.keysHeld = new Set();
        this.interpolatedPosition = { x: 0, y: 0 };
        this.averageKeyPosition = { x: 0, y: 0 };
        
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

    /**
     * (Re)compute the 3x3 grid (QWEASDZXC) positions from the current size.
     */
    computeKeyPositions() {
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

        const screenWidth = viewWidth(this.scene);
        const screenHeight = viewHeight(this.scene);
        const gridWidth = screenWidth * 0.8;
        const gridHeight = screenHeight * 0.8;
        const startX = (screenWidth - gridWidth) / 2;
        const startY = (screenHeight - gridHeight) / 2;

        gridKeys.forEach(({ key, gridX, gridY }) => {
            const x = startX + (gridX * gridWidth / 2);
            const y = startY + (gridY * gridHeight / 2);
            this.keyPositions[key] = { x, y };
        });
    }

    initKeyboardInput() {
        this.computeKeyPositions();

        // Set up keyboard event listeners
        this.scene.input.keyboard.on('keydown', this.onKeyDown, this);
        this.scene.input.keyboard.on('keyup', this.onKeyUp, this);
    }

    /**
     * Viewport changed (resize / rotation): recompute positions that were
     * derived from the old size.
     * @param {{width:number,height:number}} [previous] - size before the resize
     */
    handleResize(previous) {
        const width = viewWidth(this.scene);
        const height = viewHeight(this.scene);

        this.computeKeyPositions();

        if (previous && previous.width > 0 && previous.height > 0) {
            const sx = width / previous.width;
            const sy = height / previous.height;
            this.currentGamepadPosition.x *= sx;
            this.currentGamepadPosition.y *= sy;
            this.randomKeyPositions.forEach(pos => { pos.x *= sx; pos.y *= sy; });
        } else {
            this.currentGamepadPosition.x = width / 2;
            this.currentGamepadPosition.y = height / 2;
        }
        this.updateAverageKeyPosition();
    }

    /** Random on-screen position (away from the extreme edges) for ungridded keys. */
    getRandomKeyPosition() {
        const width = viewWidth(this.scene);
        const height = viewHeight(this.scene);
        return {
            x: width * (0.1 + Math.random() * 0.8),
            y: height * (0.1 + Math.random() * 0.8)
        };
    }

    /**
     * Decide whether a keyboard event drives the toy and under which "held id".
     * Grid keys (QWEASDZXC) keep their fixed positions; every other printable
     * key, Space and Enter spawns at a random position. Modifier combos,
     * function keys, Tab, Escape and typing targets are never handled.
     * @returns {{id:string,isGrid:boolean}|null}
     */
    resolveKey(event) {
        if (!event || typeof event.key !== 'string') return null;
        if (event.ctrlKey || event.metaKey || event.altKey) return null;

        const target = event.target;
        const tag = target && target.tagName ? String(target.tagName).toUpperCase() : '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (target && target.isContentEditable)) return null;

        const upper = event.key.toUpperCase();
        if (this.keyPositions[upper]) return { id: upper, isGrid: true };

        const isPrintable = event.key.length === 1; // includes ' ' (Space)
        const isEnter = event.key === 'Enter';
        if (!isPrintable && !isEnter) return null;
        // Space/Enter on a focused control belongs to that control
        if ((tag === 'BUTTON' || tag === 'A') && (event.key === ' ' || isEnter)) return null;

        return { id: `code:${event.code || upper}`, isGrid: false };
    }

    /** Identify a keyup by the same id scheme (code for ungridded keys survives Shift changes). */
    resolveHeldId(event) {
        if (!event || typeof event.key !== 'string') return null;
        const upper = event.key.toUpperCase();
        if (this.keyPositions[upper] && this.keysHeld.has(upper)) return upper;
        const codeId = `code:${event.code || upper}`;
        if (this.keysHeld.has(codeId)) return codeId;
        return null;
    }

    getHeldPosition(id) {
        return this.keyPositions[id] || this.randomKeyPositions.get(id);
    }

    onKeyDown(event) {
        const resolved = this.resolveKey(event);
        if (!resolved) return;

        event.preventDefault();
        const { id, isGrid } = resolved;

        if (this.keysHeld.has(id)) return; // auto-repeat

        if (!isGrid) {
            this.randomKeyPositions.set(id, this.getRandomKeyPosition());
        }
        this.keysHeld.add(id);
        this.updateAverageKeyPosition();

        if (this.keysHeld.size === 1) {
            // First key pressed - spawn object
            this.emit('keyPress', { key: isGrid ? id : event.key.toUpperCase(), position: this.getHeldPosition(id) });
        } else {
            // Multiple keys - update interpolated position
            this.emit('keyInterpolate', { position: this.averageKeyPosition });
        }
    }

    onKeyUp(event) {
        const id = this.resolveHeldId(event);
        if (!id) return;

        event.preventDefault();
        this.keysHeld.delete(id);
        this.randomKeyPositions.delete(id);
        this.updateAverageKeyPosition();

        if (this.keysHeld.size === 0) {
            this.emit('keyRelease', { key: event.key.toUpperCase() });
        } else {
            // Still have keys held - update interpolated position
            this.emit('keyInterpolate', { position: this.averageKeyPosition });
        }
    }

    /**
     * Forget every held key. Key-up events are not delivered while the scene
     * is paused (parent exit, tab switch), so stale entries would make the
     * next key press look like a multi-key hold and spawn nothing.
     */
    clearHeldKeys() {
        this.keysHeld.clear();
        this.randomKeyPositions.clear();
        this.updateAverageKeyPosition();
    }

    updateAverageKeyPosition() {
        if (this.keysHeld.size === 0) {
            this.averageKeyPosition = { x: 0, y: 0 };
            return;
        }

        let totalX = 0;
        let totalY = 0;
        
        this.keysHeld.forEach(id => {
            const pos = this.getHeldPosition(id);
            if (!pos) return;
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
        
        if (this.scene.input.keyboard) {
            this.scene.input.keyboard.off('keydown', this.onKeyDown, this);
            this.scene.input.keyboard.off('keyup', this.onKeyUp, this);
        }

        if (this.holdTimer) {
            this.holdTimer.remove();
        }
    }
}