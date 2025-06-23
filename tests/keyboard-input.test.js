describe('Keyboard Input', () => {
    let game;
    let mockAdd;
    let mockInput;

    beforeEach(() => {
        // Create mock text objects
        const createMockTextObject = () => ({
            setOrigin: jest.fn().mockReturnThis(),
            setPosition: jest.fn().mockReturnThis(),
            destroy: jest.fn()
        });

        // Mock Phaser input
        mockInput = {
            keyboard: {
                on: jest.fn(),
                addKeys: jest.fn(),
                createCursorKeys: jest.fn(() => ({
                    up: { isDown: false },
                    down: { isDown: false },
                    left: { isDown: false },
                    right: { isDown: false }
                }))
            }
        };

        // Mock Phaser scene add methods
        mockAdd = {
            text: jest.fn().mockImplementation(() => createMockTextObject()),
            graphics: jest.fn().mockReturnValue({
                fillStyle: jest.fn().mockReturnThis(),
                fillCircle: jest.fn().mockReturnThis()
            })
        };

        // Create game instance with keyboard input implementation
        game = {
            add: mockAdd,
            input: mockInput,
            objects: [],
            keyPositions: {},
            config: { width: 800, height: 600 },
            spawnObjectAt: jest.fn().mockReturnValue({ x: 100, y: 100, data: {} }),
            displayTextLabels: jest.fn(),
            speakObjectLabel: jest.fn(),
            initKeyboardInput: function() {
                const width = this.config.width;
                const height = this.config.height;
                
                this.keyPositions = {
                    'KeyQ': { x: width * 0.2, y: height * 0.2 },
                    'KeyW': { x: width * 0.5, y: height * 0.2 },
                    'KeyE': { x: width * 0.8, y: height * 0.2 },
                    'KeyA': { x: width * 0.2, y: height * 0.5 },
                    'KeyS': { x: width * 0.5, y: height * 0.5 },
                    'KeyD': { x: width * 0.8, y: height * 0.5 },
                    'KeyZ': { x: width * 0.2, y: height * 0.8 },
                    'KeyX': { x: width * 0.5, y: height * 0.8 },
                    'KeyC': { x: width * 0.8, y: height * 0.8 }
                };
                
                this.input.keyboard.on('keydown', this.onKeyDown, this);
            },
            onKeyDown: function(event) {
                const position = this.getKeyPosition(event.code);
                if (position) {
                    const obj = this.spawnObjectAt(position.x, position.y, 'emoji');
                    this.displayTextLabels(obj);
                    this.speakObjectLabel(obj, 'both');
                }
            },
            getKeyPosition: function(keyCode) {
                return this.keyPositions[keyCode] || null;
            }
        };
    });

    test('should initialize keyboard input and set up key positions', () => {
        game.initKeyboardInput();
        
        expect(game.keyPositions['KeyA']).toEqual({ x: 160, y: 300 }); // Mid-left
        expect(game.keyPositions['KeyS']).toEqual({ x: 400, y: 300 }); // Center
        expect(mockInput.keyboard.on).toHaveBeenCalledWith('keydown', game.onKeyDown, game);
    });

    test('should spawn object at key position when key is pressed', () => {
        game.initKeyboardInput();
        const mockEvent = { code: 'KeyA' };
        
        game.onKeyDown(mockEvent);
        
        expect(game.spawnObjectAt).toHaveBeenCalledWith(160, 300, 'emoji');
        expect(game.displayTextLabels).toHaveBeenCalled();
        expect(game.speakObjectLabel).toHaveBeenCalled();
    });

    test('should return correct position for mapped keys', () => {
        game.initKeyboardInput();
        
        expect(game.getKeyPosition('KeyQ')).toEqual({ x: 160, y: 120 }); // Top-left
        expect(game.getKeyPosition('KeyC')).toEqual({ x: 640, y: 480 }); // Bottom-right
        expect(game.getKeyPosition('KeyS')).toEqual({ x: 400, y: 300 }); // Center
    });

    test('should return null for unmapped keys', () => {
        game.initKeyboardInput();
        
        expect(game.getKeyPosition('KeyP')).toBeNull();
        expect(game.getKeyPosition('KeyL')).toBeNull();
    });
});