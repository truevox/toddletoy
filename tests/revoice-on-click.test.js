/**
 * @jest-environment jsdom
 */

// Mock speech synthesis
global.speechSynthesis = {
    speak: jest.fn(),
    cancel: jest.fn(),
    getVoices: jest.fn(() => [])
};

global.SpeechSynthesisUtterance = jest.fn().mockImplementation((text) => ({
    text,
    lang: 'en-US',
    rate: 0.8,
    volume: 0.7,
    onend: null,
    onerror: null
}));

// Create mock game with revoice functionality
const createMockGameWithRevoice = () => {
    return {
        objects: [],
        isSpeaking: false,
        currentSpeakingObject: null,
        currentSpeech: null,
        
        // Mock object creation
        createTestObject: function(x, y, data) {
            const obj = {
                x,
                y,
                id: Date.now() + Math.random(),
                data: data || {
                    emoji: '🐶',
                    en: 'Dog',
                    es: 'Perro',
                    type: 'emoji'
                }
            };
            this.objects.push(obj);
            return obj;
        },
        
        // Mock existing functionality
        getObjectUnderPointer: jest.fn().mockImplementation(function(x, y) {
            // Find the closest object within hit distance
            for (const obj of this.objects) {
                const distance = Math.sqrt((x - obj.x) ** 2 + (y - obj.y) ** 2);
                if (distance < 50) {
                    return obj;
                }
            }
            return null;
        }),
        
        speakObjectLabel: jest.fn(function(obj, language = 'en') {
            if (!obj || !obj.data) return;
            
            // Cancel any current speech
            if (this.currentSpeech) {
                speechSynthesis.cancel();
            }
            
            // Set speaking state
            this.isSpeaking = true;
            this.currentSpeakingObject = obj;
            
            const utterance = new SpeechSynthesisUtterance(obj.data.en);
            this.currentSpeech = utterance;
            speechSynthesis.speak(utterance);
        }),
        
        // Mock pointer handling - this is what we need to test
        onPointerDown: jest.fn(function(pointer) {
            const hitObject = this.getObjectUnderPointer(pointer.x, pointer.y);
            
            if (hitObject && !this.isSpeaking) {
                // Revoice the object if nothing is currently speaking
                this.speakObjectLabel(hitObject, 'both');
                return 'revoiced';
            } else if (hitObject && this.isSpeaking) {
                // Currently speaking - just move the object (existing behavior)
                return 'moved_during_speech';
            } else if (!hitObject && !this.isSpeaking) {
                // Empty space, not speaking - spawn new object (existing behavior)
                return 'spawned_new';
            } else if (!hitObject && this.isSpeaking) {
                // Empty space, currently speaking - move speaking object (existing behavior)
                return 'moved_speaking_object';
            }
        })
    };
};

describe('Revoice on Click', () => {
    let mockGame;
    
    beforeEach(() => {
        mockGame = createMockGameWithRevoice();
        jest.clearAllMocks();
    });
    
    describe('Clicking Existing Objects', () => {
        test('should revoice object when clicked and nothing is speaking', () => {
            // Create an existing object
            const obj = mockGame.createTestObject(100, 100);
            expect(mockGame.objects).toHaveLength(1);
            expect(mockGame.isSpeaking).toBe(false);
            
            // Simulate clicking on the object
            const result = mockGame.onPointerDown({ x: 100, y: 100 });
            
            expect(mockGame.getObjectUnderPointer).toHaveBeenCalledWith(100, 100);
            expect(mockGame.speakObjectLabel).toHaveBeenCalledWith(obj, 'both');
            expect(result).toBe('revoiced');
        });
        
        test('should not revoice when clicking object during speech', () => {
            // Create an existing object and set speaking state
            const obj = mockGame.createTestObject(100, 100);
            mockGame.isSpeaking = true;
            mockGame.currentSpeakingObject = obj;
            
            // Simulate clicking on the object during speech
            const result = mockGame.onPointerDown({ x: 100, y: 100 });
            
            expect(mockGame.getObjectUnderPointer).toHaveBeenCalledWith(100, 100);
            expect(mockGame.speakObjectLabel).not.toHaveBeenCalled();
            expect(result).toBe('moved_during_speech');
        });
        
        test('should find object within hit distance', () => {
            const obj = mockGame.createTestObject(100, 100);
            
            // Test various points within hit distance (50 pixels)
            expect(mockGame.getObjectUnderPointer(100, 100)).toBe(obj); // Exact position
            expect(mockGame.getObjectUnderPointer(120, 120)).toBe(obj); // Within range (~28 pixels)
            expect(mockGame.getObjectUnderPointer(135, 135)).toBe(obj); // Edge of range (~49 pixels)
            expect(mockGame.getObjectUnderPointer(160, 160)).toBe(null); // Outside range (~85 pixels)
        });
        
        test('should not find object outside hit distance', () => {
            mockGame.createTestObject(100, 100);
            
            // Test points outside hit distance
            expect(mockGame.getObjectUnderPointer(200, 200)).toBe(null);
            expect(mockGame.getObjectUnderPointer(50, 200)).toBe(null);
            expect(mockGame.getObjectUnderPointer(200, 50)).toBe(null);
        });
    });
    
    describe('Clicking Empty Space', () => {
        test('should spawn new object when clicking empty space and not speaking', () => {
            expect(mockGame.objects).toHaveLength(0);
            expect(mockGame.isSpeaking).toBe(false);
            
            // Click empty space
            const result = mockGame.onPointerDown({ x: 200, y: 200 });
            
            expect(mockGame.getObjectUnderPointer).toHaveBeenCalledWith(200, 200);
            expect(result).toBe('spawned_new');
        });
        
        test('should move speaking object when clicking empty space during speech', () => {
            const obj = mockGame.createTestObject(100, 100);
            mockGame.isSpeaking = true;
            mockGame.currentSpeakingObject = obj;
            
            // Click empty space during speech
            const result = mockGame.onPointerDown({ x: 200, y: 200 });
            
            expect(mockGame.getObjectUnderPointer).toHaveBeenCalledWith(200, 200);
            expect(result).toBe('moved_speaking_object');
        });
    });
    
    describe('Multiple Objects', () => {
        test('should revoice the closest object when multiple objects are present', () => {
            const obj1 = mockGame.createTestObject(100, 100);
            const obj2 = mockGame.createTestObject(150, 150);
            const obj3 = mockGame.createTestObject(200, 200);
            
            // Click closer to obj1
            const result = mockGame.onPointerDown({ x: 110, y: 110 });
            
            expect(mockGame.speakObjectLabel).toHaveBeenCalledWith(obj1, 'both');
            expect(result).toBe('revoiced');
        });
        
        test('should not revoice any object when click is far from all objects', () => {
            mockGame.createTestObject(100, 100);
            mockGame.createTestObject(150, 150);
            
            // Click far from all objects
            const result = mockGame.onPointerDown({ x: 300, y: 300 });
            
            expect(mockGame.speakObjectLabel).not.toHaveBeenCalled();
            expect(result).toBe('spawned_new');
        });
    });
    
    describe('Speech State Management', () => {
        test('should cancel current speech before starting new speech', () => {
            const obj = mockGame.createTestObject(100, 100);
            
            // Start speaking and set up speech state properly
            mockGame.speakObjectLabel(obj, 'en');
            expect(speechSynthesis.speak).toHaveBeenCalledTimes(1);
            expect(mockGame.isSpeaking).toBe(true);
            expect(mockGame.currentSpeech).toBeTruthy();
            
            // Reset speaking state to allow revoicing
            mockGame.isSpeaking = false;
            mockGame.currentSpeech = new SpeechSynthesisUtterance('previous');
            
            // Click to revoice (should cancel previous speech)
            mockGame.onPointerDown({ x: 100, y: 100 });
            
            expect(speechSynthesis.cancel).toHaveBeenCalled();
            expect(speechSynthesis.speak).toHaveBeenCalledTimes(2);
        });
        
        test('should set correct speaking state when revoicing', () => {
            const obj = mockGame.createTestObject(100, 100);
            expect(mockGame.isSpeaking).toBe(false);
            expect(mockGame.currentSpeakingObject).toBe(null);
            
            // Revoice object
            mockGame.onPointerDown({ x: 100, y: 100 });
            
            expect(mockGame.isSpeaking).toBe(true);
            expect(mockGame.currentSpeakingObject).toBe(obj);
        });
    });
});