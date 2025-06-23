describe('Object Spawning', () => {
    let game;
    let mockAdd;

    beforeEach(() => {
        // Mock Phaser text object
        const mockTextObject = {
            setOrigin: jest.fn().mockReturnThis(),
            setPosition: jest.fn().mockReturnThis()
        };

        // Mock Phaser scene add methods
        mockAdd = {
            text: jest.fn().mockReturnValue(mockTextObject),
            graphics: jest.fn().mockReturnValue({
                fillStyle: jest.fn().mockReturnThis(),
                fillCircle: jest.fn().mockReturnThis(),
                fillRect: jest.fn().mockReturnThis(),
                setPosition: jest.fn().mockReturnThis()
            })
        };

        // Create a game instance with the spawnObjectAt method
        game = {
            add: mockAdd,
            objects: [],
            spawnObjectAt: function(x, y, type = 'emoji') {
                const emojis = [
                    {"emoji":"🐶","en":"Dog","es":"Perro","type":"emoji"},
                    {"emoji":"🐱","en":"Cat","es":"Gato","type":"emoji"},
                    {"emoji":"🐻","en":"Bear","es":"Oso","type":"emoji"}
                ];
                
                const selectedEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                
                const obj = {
                    x: x,
                    y: y,
                    type: type,
                    id: Date.now() + Math.random(),
                    data: selectedEmoji
                };
                
                this.objects.push(obj);
                
                const emojiText = this.add.text(x, y, selectedEmoji.emoji, {
                    fontSize: '64px',
                    align: 'center'
                }).setOrigin(0.5);
                
                obj.sprite = emojiText;
                
                return obj;
            }
        };
    });

    test('should spawn an object at the specified coordinates', () => {
        const x = 100;
        const y = 200;
        const type = 'emoji';

        const result = game.spawnObjectAt(x, y, type);

        expect(result).toBeDefined();
        expect(result.x).toBe(x);
        expect(result.y).toBe(y);
        expect(result.type).toBe(type);
        expect(mockAdd.text).toHaveBeenCalledWith(x, y, expect.any(String), expect.any(Object));
    });

    test('should add spawned object to objects array', () => {
        const x = 150;
        const y = 250;
        
        const result = game.spawnObjectAt(x, y, 'emoji');

        expect(game.objects).toHaveLength(1);
        expect(game.objects[0]).toEqual(expect.objectContaining({
            x: 150,
            y: 250,
            type: 'emoji'
        }));
        expect(result).toBeDefined();
    });

    test('should handle multiple objects spawned at different positions', () => {
        game.spawnObjectAt(10, 20, 'emoji');
        game.spawnObjectAt(30, 40, 'emoji');

        expect(game.objects).toHaveLength(2);
        expect(game.objects[0].x).toBe(10);
        expect(game.objects[0].y).toBe(20);
        expect(game.objects[1].x).toBe(30);
        expect(game.objects[1].y).toBe(40);
    });
});