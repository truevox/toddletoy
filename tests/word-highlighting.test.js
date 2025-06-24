describe('Word Highlighting Animation', () => {
    let game;
    let mockAdd;
    let mockTweens;

    beforeEach(() => {
        // Mock Phaser tweens
        mockTweens = {
            add: jest.fn().mockReturnValue({
                on: jest.fn().mockReturnThis()
            })
        };

        // Mock Phaser scene add methods
        mockAdd = {
            text: jest.fn().mockReturnValue({
                setOrigin: jest.fn().mockReturnThis(),
                setTint: jest.fn().mockReturnThis(),
                setScale: jest.fn().mockReturnThis()
            })
        };

        // Create game instance with word highlighting
        game = {
            add: mockAdd,
            tweens: mockTweens,
            
            highlightWord: function(textObject, wordIndex, totalWords) {
                if (!textObject || wordIndex < 0) return;
                
                // Create highlight animation with tint and scale
                const highlightTween = this.tweens.add({
                    targets: textObject,
                    scaleX: 1.2,
                    scaleY: 1.2,
                    duration: 300,
                    ease: 'Back.easeOut',
                    yoyo: true,
                    onStart: () => {
                        textObject.setTint(0xffff00); // Yellow highlight
                    },
                    onComplete: () => {
                        textObject.setTint(0xffffff); // Back to white
                    }
                });
                
                return highlightTween;
            },
            
            animateWordsSequentially: function(textObjects, speechDuration) {
                if (!textObjects || textObjects.length === 0) return [];
                
                const animations = [];
                const wordDuration = speechDuration / textObjects.length;
                
                textObjects.forEach((textObj, index) => {
                    const delay = index * wordDuration;
                    const animation = this.highlightWord(textObj, index, textObjects.length);
                    
                    // Store animation with delay for tracking
                    animations.push({
                        animation: animation,
                        delay: delay,
                        wordIndex: index
                    });
                });
                
                return animations;
            }
        };
    });

    test('should highlight individual words with tint and scale', () => {
        const mockTextObject = {
            setTint: jest.fn().mockReturnThis(),
            setScale: jest.fn().mockReturnThis(),
            setOrigin: jest.fn().mockReturnThis()
        };
        
        game.highlightWord(mockTextObject, 0, 2);
        
        expect(mockTweens.add).toHaveBeenCalledWith({
            targets: mockTextObject,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 300,
            ease: 'Back.easeOut',
            yoyo: true,
            onStart: expect.any(Function),
            onComplete: expect.any(Function)
        });
    });

    test('should apply yellow tint during highlight', () => {
        const mockTextObject = {
            setTint: jest.fn().mockReturnThis(),
            setScale: jest.fn().mockReturnThis(),
            setOrigin: jest.fn().mockReturnThis()
        };
        
        const tweenCall = mockTweens.add.mock.calls[0];
        game.highlightWord(mockTextObject, 0, 2);
        
        // Simulate onStart callback
        const onStartCallback = mockTweens.add.mock.calls[0][0].onStart;
        onStartCallback();
        
        expect(mockTextObject.setTint).toHaveBeenCalledWith(0xffff00);
    });

    test('should restore white tint after highlight', () => {
        const mockTextObject = {
            setTint: jest.fn().mockReturnThis(),
            setScale: jest.fn().mockReturnThis(),
            setOrigin: jest.fn().mockReturnThis()
        };
        
        game.highlightWord(mockTextObject, 0, 2);
        
        // Simulate onComplete callback
        const onCompleteCallback = mockTweens.add.mock.calls[0][0].onComplete;
        onCompleteCallback();
        
        expect(mockTextObject.setTint).toHaveBeenCalledWith(0xffffff);
    });

    test('should animate words sequentially with proper timing', () => {
        const mockTextObjects = [
            { setTint: jest.fn().mockReturnThis(), setScale: jest.fn().mockReturnThis() },
            { setTint: jest.fn().mockReturnThis(), setScale: jest.fn().mockReturnThis() }
        ];
        
        const speechDuration = 2000; // 2 seconds
        const animations = game.animateWordsSequentially(mockTextObjects, speechDuration);
        
        expect(animations).toHaveLength(2);
        expect(animations[0].delay).toBe(0);
        expect(animations[1].delay).toBe(1000); // Second word at 1 second
        expect(animations[0].wordIndex).toBe(0);
        expect(animations[1].wordIndex).toBe(1);
    });

    test('should handle empty text objects array', () => {
        const animations = game.animateWordsSequentially([], 1000);
        expect(animations).toEqual([]);
    });

    test('should handle invalid word index', () => {
        const mockTextObject = {
            setTint: jest.fn().mockReturnThis(),
            setScale: jest.fn().mockReturnThis()
        };
        
        const result = game.highlightWord(mockTextObject, -1, 2);
        expect(result).toBeUndefined();
        expect(mockTweens.add).not.toHaveBeenCalled();
    });

    test('should handle null text object', () => {
        const result = game.highlightWord(null, 0, 2);
        expect(result).toBeUndefined();
        expect(mockTweens.add).not.toHaveBeenCalled();
    });

    test('should create separate animations for each word', () => {
        const mockTextObjects = [
            { setTint: jest.fn().mockReturnThis(), setScale: jest.fn().mockReturnThis() },
            { setTint: jest.fn().mockReturnThis(), setScale: jest.fn().mockReturnThis() },
            { setTint: jest.fn().mockReturnThis(), setScale: jest.fn().mockReturnThis() }
        ];
        
        game.animateWordsSequentially(mockTextObjects, 3000);
        
        // Should create one tween per word
        expect(mockTweens.add).toHaveBeenCalledTimes(3);
    });
});