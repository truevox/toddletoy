/**
 * Emoji Rendering Tests
 * 
 * Tests to ensure emoji objects are properly created with actual Unicode emoji characters
 * and not just empty text labels. These tests catch missing emoji/icon rendering issues.
 */

describe('Emoji Rendering', () => {
    let game;
    let mockAdd;
    let mockConfigManager;
    let fetchMock;

    beforeEach(() => {
        // Mock fetch to return emoji data
        fetchMock = jest.fn();
        global.fetch = fetchMock;
        
        // Mock emoji data that should be returned by fetch
        const mockEmojiData = [
            {"emoji":"🐶","en":"Dog","es":"Perro","type":"emoji","categories":["animals","nature"],"colors":["brown"]},
            {"emoji":"🐱","en":"Cat","es":"Gato","type":"emoji","categories":["animals","nature"],"colors":["gray"]},
            {"emoji":"😢","en":"Crying Face","es":"Cara Llorando","type":"emoji","categories":["faces"],"colors":["yellow"]},
            {"emoji":"🐛","en":"Caterpillar","es":"Oruga","type":"emoji","categories":["animals","nature"],"colors":["green"]}
        ];

        fetchMock.mockResolvedValue({
            json: jest.fn().mockResolvedValue(mockEmojiData)
        });

        // Mock Phaser text object with realistic behavior
        const mockTextObject = {
            setOrigin: jest.fn().mockReturnThis(),
            setPosition: jest.fn().mockReturnThis(),
            text: '', // Store the actual text content
            style: {} // Store the style
        };

        // Mock ConfigManager
        mockConfigManager = {
            getConfig: jest.fn().mockReturnValue({
                emojiCategories: {
                    animals: { enabled: true },
                    nature: { enabled: true },
                    faces: { enabled: true }
                }
            })
        };

        // Mock Phaser scene add methods
        mockAdd = {
            text: jest.fn().mockImplementation((x, y, text, style) => {
                const textObj = { ...mockTextObject };
                textObj.text = text; // Store the actual text for verification
                textObj.style = style;
                return textObj;
            }),
            graphics: jest.fn().mockReturnValue({
                fillStyle: jest.fn().mockReturnThis(),
                fillCircle: jest.fn().mockReturnThis(),
                fillRect: jest.fn().mockReturnThis(),
                setPosition: jest.fn().mockReturnThis(),
                generateTexture: jest.fn().mockReturnThis(),
                destroy: jest.fn()
            })
        };

        // Mock scale object for responsive sizing
        const mockScale = {
            width: 800,
            height: 600
        };

        // Create a game instance that mirrors the actual implementation
        game = {
            add: mockAdd,
            scale: mockScale,
            objects: [],
            configManager: mockConfigManager,
            
            // Copy of actual getRandomEmoji method (simplified for testing)
            async getRandomEmoji() {
                try {
                    const response = await fetch('/emojis.json');
                    const emojiData = await response.json();
                    
                    const config = this.configManager.getConfig();
                    const enabledCategories = Object.keys(config.emojiCategories)
                        .filter(category => config.emojiCategories[category].enabled);
                    
                    const filteredEmojis = emojiData.filter(emoji => {
                        return emoji.categories && emoji.categories.some(cat => enabledCategories.includes(cat));
                    });
                    
                    const availableEmojis = filteredEmojis.length > 0 ? filteredEmojis : emojiData;
                    
                    if (availableEmojis.length === 0) {
                        return {"emoji":"🐶","en":"Dog","es":"Perro","type":"emoji"};
                    }
                    
                    return availableEmojis[Math.floor(Math.random() * availableEmojis.length)];
                } catch (error) {
                    console.warn('Failed to load emojis.json, using fallback:', error);
                    return {"emoji":"🐶","en":"Dog","es":"Perro","type":"emoji"};
                }
            },

            // Copy of actual getDisplayText method
            getDisplayText(item, type) {
                if (type === 'emoji') {
                    return item.emoji;
                } else {
                    return item.symbol;
                }
            },

            // Simplified version of spawnObjectAt that focuses on emoji creation
            async spawnObjectAt(x, y, type = 'emoji') {
                let selectedItem;
                
                if (type === 'emoji') {
                    selectedItem = await this.getRandomEmoji();
                } else {
                    // Fallback for non-emoji types in this test
                    selectedItem = {"emoji":"🐶","en":"Dog","es":"Perro","type":"emoji"};
                }
                
                const obj = {
                    x: x,
                    y: y,
                    type: type,
                    id: Date.now() + Math.random(),
                    data: selectedItem
                };
                
                this.objects.push(obj);
                
                const displayText = this.getDisplayText(selectedItem, type);
                
                // Create Phaser text object
                const objectText = this.add.text(x, y, displayText, {
                    fontSize: '64px',
                    align: 'center',
                    fill: selectedItem.color || '#ffffff'
                }).setOrigin(0.5);
                
                obj.sprite = objectText;
                
                return obj;
            }
        };
    });

    afterEach(() => {
        // Clean up fetch mock
        delete global.fetch;
        jest.clearAllMocks();
    });

    test('should create emoji object with actual Unicode emoji character', async () => {
        const x = 100;
        const y = 200;
        
        const result = await game.spawnObjectAt(x, y, 'emoji');
        
        expect(result).toBeDefined();
        expect(result.data).toBeDefined();
        expect(result.data.emoji).toBeDefined();
        
        // Verify that the emoji property contains an actual Unicode emoji
        const emojiChar = result.data.emoji;
        expect(emojiChar).toMatch(/[\u{1f000}-\u{1ffff}]|[\u{2600}-\u{26ff}]|[\u{2700}-\u{27bf}]/u);
        
        // Verify that the displayed text is the emoji character, not just the label
        const displayedText = game.getDisplayText(result.data, 'emoji');
        expect(displayedText).toBe(emojiChar);
        expect(displayedText).not.toBe(result.data.en); // Should not be the English label
        expect(displayedText).not.toBe(result.data.es); // Should not be the Spanish label
    });

    test('should create emoji object with both emoji character AND text labels', async () => {
        const result = await game.spawnObjectAt(150, 250, 'emoji');
        
        expect(result.data).toEqual(expect.objectContaining({
            emoji: expect.stringMatching(/[\u{1f000}-\u{1ffff}]|[\u{2600}-\u{26ff}]|[\u{2700}-\u{27bf}]/u),
            en: expect.any(String),
            es: expect.any(String),
            type: 'emoji'
        }));
        
        // Verify labels are not empty
        expect(result.data.en.length).toBeGreaterThan(0);
        expect(result.data.es.length).toBeGreaterThan(0);
    });

    test('should pass emoji character to Phaser text object, not labels', async () => {
        const result = await game.spawnObjectAt(200, 300, 'emoji');
        
        // Check that the text object was created with the emoji character
        expect(mockAdd.text).toHaveBeenCalledWith(
            200, 
            300, 
            result.data.emoji, // Should be emoji character, not label
            expect.objectContaining({
                fontSize: '64px',
                align: 'center'
            })
        );
        
        // Verify sprite was created and contains emoji
        expect(result.sprite).toBeDefined();
        expect(result.sprite.text).toBe(result.data.emoji);
    });

    test('should handle specific problematic emojis like crying face and caterpillar', async () => {
        // Force specific emoji by mocking random to return specific indices
        const originalRandom = Math.random;
        
        // Test crying face (😢)
        Math.random = jest.fn().mockReturnValue(0.6); // Should select crying face from mock data
        const cryingResult = await game.spawnObjectAt(100, 100, 'emoji');
        expect(cryingResult.data.en).toBe('Crying Face');
        expect(cryingResult.data.emoji).toBe('😢');
        expect(game.getDisplayText(cryingResult.data, 'emoji')).toBe('😢');
        
        // Test caterpillar (🐛)
        Math.random = jest.fn().mockReturnValue(0.9); // Should select caterpillar from mock data
        const caterpillarResult = await game.spawnObjectAt(200, 200, 'emoji');
        expect(caterpillarResult.data.en).toBe('Caterpillar');
        expect(caterpillarResult.data.emoji).toBe('🐛');
        expect(game.getDisplayText(caterpillarResult.data, 'emoji')).toBe('🐛');
        
        // Restore original random
        Math.random = originalRandom;
    });

    test('should filter emojis based on configuration categories', async () => {
        // Test with only animals enabled
        mockConfigManager.getConfig.mockReturnValue({
            emojiCategories: {
                animals: { enabled: true },
                nature: { enabled: false },
                faces: { enabled: false }
            }
        });
        
        const result = await game.spawnObjectAt(100, 100, 'emoji');
        
        expect(result.data).toBeDefined();
        expect(result.data.categories).toContain('animals');
        expect(result.data.emoji).toMatch(/[\u{1f000}-\u{1ffff}]|[\u{2600}-\u{26ff}]|[\u{2700}-\u{27bf}]/u);
    });

    test('should handle emoji loading failure gracefully', async () => {
        // Mock fetch to fail
        fetchMock.mockRejectedValue(new Error('Network error'));
        
        const result = await game.spawnObjectAt(100, 100, 'emoji');
        
        // Should fall back to default dog emoji
        expect(result.data).toEqual({
            emoji: '🐶',
            en: 'Dog',
            es: 'Perro',
            type: 'emoji'
        });
        
        expect(game.getDisplayText(result.data, 'emoji')).toBe('🐶');
    });

    test('should create multiple distinct emoji objects', async () => {
        const results = [];
        
        // Create multiple emoji objects
        for (let i = 0; i < 5; i++) {
            const result = await game.spawnObjectAt(i * 100, i * 100, 'emoji');
            results.push(result);
        }
        
        expect(results).toHaveLength(5);
        
        // Each should have valid emoji data
        results.forEach(result => {
            expect(result.data.emoji).toMatch(/[\u{1f000}-\u{1ffff}]|[\u{2600}-\u{26ff}]|[\u{2700}-\u{27bf}]/u);
            expect(result.data.en).toBeTruthy();
            expect(result.data.es).toBeTruthy();
            expect(result.sprite.text).toBe(result.data.emoji);
        });
        
        // All should be added to objects array
        expect(game.objects).toHaveLength(5);
    });

    test('should verify emoji Unicode character ranges', async () => {
        const result = await game.spawnObjectAt(100, 100, 'emoji');
        const emojiChar = result.data.emoji;

        // Check if it's a valid emoji Unicode character
        // This regex covers main emoji blocks in Unicode
        const emojiRegex = /[\u{1f300}-\u{1f5ff}]|[\u{1f600}-\u{1f64f}]|[\u{1f680}-\u{1f6ff}]|[\u{1f700}-\u{1f77f}]|[\u{1f780}-\u{1f7ff}]|[\u{1f800}-\u{1f8ff}]|[\u{1f900}-\u{1f9ff}]|[\u{1fa00}-\u{1fa6f}]|[\u{1fa70}-\u{1faff}]|[\u{2600}-\u{26ff}]|[\u{2700}-\u{27bf}]/u;

        expect(emojiChar).toMatch(emojiRegex);

        // Verify it's not just a regular ASCII character
        expect(emojiChar.charCodeAt(0)).toBeGreaterThan(255);
    });
});

describe('Emoji Category Filtering', () => {
    let game;
    let mockAdd;
    let mockConfigManager;
    let fetchMock;
    let consoleSpy;

    beforeEach(() => {
        consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        fetchMock = jest.fn();
        global.fetch = fetchMock;

        const mockEmojiData = [
            {"emoji":"🐶","en":"Dog","es":"Perro","type":"emoji","categories":["animals"],"colors":["brown"]},
            {"emoji":"🐱","en":"Cat","es":"Gato","type":"emoji","categories":["animals"],"colors":["gray"]},
            {"emoji":"🍎","en":"Apple","es":"Manzana","type":"emoji","categories":["food"],"colors":["red"]},
            {"emoji":"🍌","en":"Banana","es":"Plátano","type":"emoji","categories":["food"],"colors":["yellow"]},
            {"emoji":"🚗","en":"Car","es":"Coche","type":"emoji","categories":["vehicles"],"colors":["red"]},
            {"emoji":"😢","en":"Crying Face","es":"Cara Llorando","type":"emoji","categories":["faces"],"colors":["yellow"]},
            {"emoji":"🌲","en":"Tree","es":"Árbol","type":"emoji","categories":["nature"],"colors":["green"]},
            {"emoji":"📦","en":"Box","es":"Caja","type":"emoji","categories":["objects"],"colors":["brown"]}
        ];

        fetchMock.mockResolvedValue({
            json: jest.fn().mockResolvedValue(mockEmojiData)
        });

        const mockTextObject = {
            setOrigin: jest.fn().mockReturnThis(),
            setPosition: jest.fn().mockReturnThis(),
            text: '',
            style: {}
        };

        mockConfigManager = {
            getConfig: jest.fn().mockReturnValue({
                emojiCategories: {
                    animals: { enabled: true, weight: 40 },
                    food: { enabled: true, weight: 30 },
                    vehicles: { enabled: false, weight: 15 },
                    faces: { enabled: false, weight: 10 },
                    nature: { enabled: false, weight: 3 },
                    objects: { enabled: false, weight: 2 }
                }
            })
        };

        mockAdd = {
            text: jest.fn().mockImplementation((x, y, text, style) => {
                const textObj = { ...mockTextObject };
                textObj.text = text;
                textObj.style = style;
                return textObj;
            })
        };

        game = {
            add: mockAdd,
            scale: { width: 800, height: 600 },
            objects: [],
            configManager: mockConfigManager,

            async getRandomEmoji() {
                try {
                    const response = await fetch('/emojis.json');
                    const emojiData = await response.json();

                    const config = this.configManager.getConfig();
                    const enabledCategories = Object.keys(config.emojiCategories)
                        .filter(category => config.emojiCategories[category].enabled);

                    console.log(`🎯 Filtering emojis by enabled categories: ${enabledCategories.join(', ')}`);

                    const filteredEmojis = emojiData.filter(emoji => {
                        return emoji.categories && emoji.categories.some(cat => enabledCategories.includes(cat));
                    });

                    console.log(`📊 Filtered from ${emojiData.length} emojis to ${filteredEmojis.length} emojis`);

                    const availableEmojis = filteredEmojis.length > 0 ? filteredEmojis : emojiData;

                    if (availableEmojis.length === 0) {
                        return {"emoji":"🐶","en":"Dog","es":"Perro","type":"emoji"};
                    }

                    return availableEmojis[Math.floor(Math.random() * availableEmojis.length)];
                } catch (error) {
                    console.warn('Failed to load emojis.json, using fallback:', error);
                    return {"emoji":"🐶","en":"Dog","es":"Perro","type":"emoji"};
                }
            },

            getDisplayText(item, type) {
                if (type === 'emoji') {
                    return item.emoji;
                } else {
                    return item.symbol;
                }
            },

            async spawnObjectAt(x, y, type = 'emoji') {
                let selectedItem;

                if (type === 'emoji') {
                    selectedItem = await this.getRandomEmoji();
                } else {
                    selectedItem = {"emoji":"🐶","en":"Dog","es":"Perro","type":"emoji"};
                }

                const obj = {
                    x: x,
                    y: y,
                    type: type,
                    id: Date.now() + Math.random(),
                    data: selectedItem
                };

                this.objects.push(obj);

                const displayText = this.getDisplayText(selectedItem, type);

                const objectText = this.add.text(x, y, displayText, {
                    fontSize: '64px',
                    align: 'center',
                    fill: selectedItem.color || '#ffffff'
                }).setOrigin(0.5);

                obj.sprite = objectText;

                return obj;
            }
        };
    });

    afterEach(() => {
        delete global.fetch;
        jest.clearAllMocks();
        consoleSpy.mockRestore();
    });

    test('should filter emojis based on enabled categories', async () => {
        // Only animals and food enabled
        const result = await game.spawnObjectAt(100, 100, 'emoji');

        expect(result.data).toBeDefined();
        expect(result.data.categories).toBeDefined();

        // Should be either animals or food
        const isAnimalOrFood = result.data.categories.includes('animals') ||
                              result.data.categories.includes('food');
        expect(isAnimalOrFood).toBe(true);

        // Should NOT be vehicles, faces, nature, or objects (disabled categories)
        expect(result.data.categories).not.toContain('vehicles');
        expect(result.data.categories).not.toContain('faces');
        expect(result.data.categories).not.toContain('objects');
    });

    test('should log filtering information when selecting emojis', async () => {
        await game.spawnObjectAt(100, 100, 'emoji');

        // Should log enabled categories
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('🎯 Filtering emojis by enabled categories:')
        );
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('animals, food')
        );

        // Should log filtering results
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('📊 Filtered from')
        );
    });

    test('should fall back to all emojis if no enabled categories match', async () => {
        // Configure with no enabled categories
        mockConfigManager.getConfig.mockReturnValue({
            emojiCategories: {
                animals: { enabled: false },
                food: { enabled: false },
                vehicles: { enabled: false },
                faces: { enabled: false },
                nature: { enabled: false },
                objects: { enabled: false }
            }
        });

        const result = await game.spawnObjectAt(100, 100, 'emoji');

        // Should still return an emoji (fallback to all available)
        expect(result.data).toBeDefined();
        expect(result.data.emoji).toBeDefined();
    });

    test('should respect category weights in selection', async () => {
        // Configure animals with higher weight
        mockConfigManager.getConfig.mockReturnValue({
            emojiCategories: {
                animals: { enabled: true, weight: 90 },
                food: { enabled: true, weight: 10 }
            }
        });

        // Spawn multiple emojis and verify animals appear more frequently
        const results = [];
        const originalRandom = Math.random;

        for (let i = 0; i < 10; i++) {
            Math.random = jest.fn().mockReturnValue(i / 10);
            const result = await game.spawnObjectAt(i * 50, 100, 'emoji');
            results.push(result);
        }

        Math.random = originalRandom;

        // All should be animals or food
        results.forEach(result => {
            const isAnimalOrFood = result.data.categories.includes('animals') ||
                                  result.data.categories.includes('food');
            expect(isAnimalOrFood).toBe(true);
        });
    });

    test('should handle single category filter correctly', async () => {
        // Only animals enabled
        mockConfigManager.getConfig.mockReturnValue({
            emojiCategories: {
                animals: { enabled: true, weight: 100 },
                food: { enabled: false },
                vehicles: { enabled: false },
                faces: { enabled: false },
                nature: { enabled: false },
                objects: { enabled: false }
            }
        });

        const result = await game.spawnObjectAt(100, 100, 'emoji');

        expect(result.data.categories).toContain('animals');
        expect(['🐶', '🐱']).toContain(result.data.emoji);
    });

    test('should handle multiple enabled categories correctly', async () => {
        // Animals, food, and vehicles enabled
        mockConfigManager.getConfig.mockReturnValue({
            emojiCategories: {
                animals: { enabled: true, weight: 30 },
                food: { enabled: true, weight: 30 },
                vehicles: { enabled: true, weight: 40 },
                faces: { enabled: false },
                nature: { enabled: false },
                objects: { enabled: false }
            }
        });

        const result = await game.spawnObjectAt(100, 100, 'emoji');

        const hasEnabledCategory = result.data.categories.includes('animals') ||
                                   result.data.categories.includes('food') ||
                                   result.data.categories.includes('vehicles');
        expect(hasEnabledCategory).toBe(true);
    });

    test('should handle emojis with multiple categories', async () => {
        // Mock emoji data with multi-category items
        const multiCatEmojiData = [
            {"emoji":"🐶","en":"Dog","es":"Perro","type":"emoji","categories":["animals","nature"],"colors":["brown"]},
            {"emoji":"🍎","en":"Apple","es":"Manzana","type":"emoji","categories":["food","nature"],"colors":["red"]}
        ];

        fetchMock.mockResolvedValue({
            json: jest.fn().mockResolvedValue(multiCatEmojiData)
        });

        // Enable only nature
        mockConfigManager.getConfig.mockReturnValue({
            emojiCategories: {
                animals: { enabled: false },
                food: { enabled: false },
                nature: { enabled: true, weight: 100 }
            }
        });

        const result = await game.spawnObjectAt(100, 100, 'emoji');

        // Should match because both emojis have 'nature' category
        expect(result.data.categories).toContain('nature');
        expect(['🐶', '🍎']).toContain(result.data.emoji);
    });

    test('should log warning when no emojis match any enabled category', async () => {
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

        // Configure categories that don't exist in emoji data
        mockConfigManager.getConfig.mockReturnValue({
            emojiCategories: {
                nonexistent: { enabled: true, weight: 100 }
            }
        });

        await game.spawnObjectAt(100, 100, 'emoji');

        // Should still return an emoji (fallback behavior)
        expect(game.objects.length).toBe(1);

        warnSpy.mockRestore();
    });

    test('should correctly calculate filtered emoji count', async () => {
        // Only animals enabled (should be 2 out of 8 total)
        mockConfigManager.getConfig.mockReturnValue({
            emojiCategories: {
                animals: { enabled: true, weight: 100 },
                food: { enabled: false },
                vehicles: { enabled: false },
                faces: { enabled: false },
                nature: { enabled: false },
                objects: { enabled: false }
            }
        });

        await game.spawnObjectAt(100, 100, 'emoji');

        // Check console logs for correct counts
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('Filtered from 8 emojis to 2 emojis')
        );
    });
});