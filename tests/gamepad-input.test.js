describe('Gamepad Input', () => {
    let game;
    let mockInput;
    let mockGamepads;

    beforeEach(() => {
        // Mock gamepad objects
        mockGamepads = {
            gamepad1: {
                connected: true,
                buttons: [
                    { pressed: false }, // Button 0
                    { pressed: false }, // Button 1
                    { pressed: false }, // Button 2
                    { pressed: false }  // Button 3
                ],
                axes: [0, 0, 0, 0] // Left stick X, Left stick Y, Right stick X, Right stick Y
            }
        };

        // Mock Phaser input
        mockInput = {
            gamepad: {
                on: jest.fn(),
                total: 0,
                gamepads: [],
                getGamepad: jest.fn().mockReturnValue(null)
            }
        };

        // Mock navigator.getGamepads
        global.navigator = {
            getGamepads: jest.fn().mockReturnValue([mockGamepads.gamepad1, null, null, null])
        };

        // Create game instance with gamepad implementation
        game = {
            input: mockInput,
            objects: [],
            config: { width: 800, height: 600 },
            currentGamepadPosition: { x: 400, y: 300 },
            gamepadDeadzone: 0.1,
            gamepadButtonStates: new Map(),
            spawnObjectAt: jest.fn().mockReturnValue({ x: 100, y: 100, data: {}, id: 'test' }),
            displayTextLabels: jest.fn(),
            speakObjectLabel: jest.fn(),
            generateTone: jest.fn(),
            createSpawnBurst: jest.fn(),
            initGamepadInput: function() {
                if (this.input.gamepad) {
                    this.input.gamepad.on('connected', (gamepad) => {
                        console.log('Gamepad connected:', gamepad);
                    });
                    
                    this.input.gamepad.on('disconnected', (gamepad) => {
                        console.log('Gamepad disconnected:', gamepad);
                    });
                }
            },
            updateGamepadInput: function() {
                if (navigator.getGamepads) {
                    const gamepads = navigator.getGamepads();
                    
                    for (let i = 0; i < gamepads.length; i++) {
                        const gamepad = gamepads[i];
                        if (gamepad && gamepad.connected) {
                            const position = this.getGamepadPosition(gamepad);
                            this.currentGamepadPosition = position;
                            
                            for (let buttonIndex = 0; buttonIndex < gamepad.buttons.length; buttonIndex++) {
                                const button = gamepad.buttons[buttonIndex];
                                const wasPressed = this.gamepadButtonStates.get(`${i}-${buttonIndex}`) || false;
                                
                                if (button.pressed && !wasPressed) {
                                    this.onGamepadButtonDown(gamepad, buttonIndex);
                                }
                                
                                this.gamepadButtonStates.set(`${i}-${buttonIndex}`, button.pressed);
                            }
                        }
                    }
                }
            },
            onGamepadButtonDown: function(gamepad, buttonIndex) {
                const obj = this.spawnObjectAt(
                    this.currentGamepadPosition.x, 
                    this.currentGamepadPosition.y, 
                    'emoji'
                );
                
                this.displayTextLabels(obj);
                this.speakObjectLabel(obj, 'both');
                this.generateTone(this.currentGamepadPosition.x, this.currentGamepadPosition.y, obj.id);
                this.createSpawnBurst(this.currentGamepadPosition.x, this.currentGamepadPosition.y);
            },
            getGamepadPosition: function(gamepad) {
                const leftStickX = this.applyDeadzone(gamepad.axes[0], this.gamepadDeadzone);
                const leftStickY = this.applyDeadzone(gamepad.axes[1], this.gamepadDeadzone);
                const rightStickX = this.applyDeadzone(gamepad.axes[2] || 0, this.gamepadDeadzone);
                const rightStickY = this.applyDeadzone(gamepad.axes[3] || 0, this.gamepadDeadzone);
                
                const avgX = (leftStickX + rightStickX) / 2;
                const avgY = (leftStickY + rightStickY) / 2;
                
                const screenX = (avgX + 1) * (this.config.width / 2);
                const screenY = (avgY + 1) * (this.config.height / 2);
                
                return {
                    x: Math.max(0, Math.min(this.config.width, screenX)),
                    y: Math.max(0, Math.min(this.config.height, screenY))
                };
            },
            applyDeadzone: function(value, deadzone) {
                if (Math.abs(value) < deadzone) {
                    return 0;
                }
                
                const sign = Math.sign(value);
                const scaledValue = (Math.abs(value) - deadzone) / (1 - deadzone);
                return sign * scaledValue;
            }
        };
    });

    test('should initialize gamepad input listeners', () => {
        // Mock input.gamepad to test listener setup
        game.input.gamepad = {
            on: jest.fn()
        };
        
        game.initGamepadInput();
        
        expect(game.input.gamepad.on).toHaveBeenCalledWith('connected', expect.any(Function));
        expect(game.input.gamepad.on).toHaveBeenCalledWith('disconnected', expect.any(Function));
    });

    test('should update gamepad input and position', () => {
        // Set up gamepad with stick input (above deadzone)
        mockGamepads.gamepad1.axes = [0.5, -0.3, 0, 0]; // Left stick right and up
        
        game.updateGamepadInput();
        
        // Position should be calculated and stored
        expect(game.currentGamepadPosition).toBeDefined();
        expect(typeof game.currentGamepadPosition.x).toBe('number');
        expect(typeof game.currentGamepadPosition.y).toBe('number');
    });

    test('should spawn object when gamepad button is pressed', () => {
        game.currentGamepadPosition = { x: 200, y: 150 };
        
        game.onGamepadButtonDown(mockGamepads.gamepad1, 0);
        
        expect(game.spawnObjectAt).toHaveBeenCalledWith(200, 150, 'emoji');
        expect(game.displayTextLabels).toHaveBeenCalled();
        expect(game.speakObjectLabel).toHaveBeenCalled();
        expect(game.generateTone).toHaveBeenCalledWith(200, 150, 'test');
        expect(game.createSpawnBurst).toHaveBeenCalledWith(200, 150);
    });

    test('should calculate position from gamepad axes', () => {
        // Test center position (no stick input)
        mockGamepads.gamepad1.axes = [0, 0, 0, 0];
        const centerPos = game.getGamepadPosition(mockGamepads.gamepad1);
        expect(centerPos.x).toBe(400); // Center X
        expect(centerPos.y).toBe(300); // Center Y
        
        // Test full right stick input (averaged with right stick = 0)
        mockGamepads.gamepad1.axes = [1, 0, 0, 0];
        const rightPos = game.getGamepadPosition(mockGamepads.gamepad1);
        expect(rightPos.x).toBeCloseTo(600, 0); // (1 + 0)/2 = 0.5, then (0.5+1)*400 = 600
        
        // Test full left stick input (averaged with right stick = 0)
        mockGamepads.gamepad1.axes = [-1, 0, 0, 0];
        const leftPos = game.getGamepadPosition(mockGamepads.gamepad1);
        expect(leftPos.x).toBeCloseTo(200, 0); // (-1 + 0)/2 = -0.5, then (-0.5+1)*400 = 200
    });

    test('should apply deadzone correctly', () => {
        // Values within deadzone should return 0
        expect(game.applyDeadzone(0.05, 0.1)).toBe(0);
        expect(game.applyDeadzone(-0.08, 0.1)).toBe(0);
        
        // Values outside deadzone should be scaled
        const result = game.applyDeadzone(0.5, 0.1);
        expect(result).toBeGreaterThan(0);
        expect(result).toBeLessThan(0.5); // Should be scaled down
        
        // Test negative values
        const negResult = game.applyDeadzone(-0.6, 0.1);
        expect(negResult).toBeLessThan(0);
        expect(negResult).toBeGreaterThan(-0.6);
    });
});