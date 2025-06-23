describe('Speech Synthesis', () => {
    let game;
    let mockSpeechSynthesis;
    let mockSpeechUtterance;

    beforeEach(() => {
        // Mock SpeechSynthesisUtterance
        mockSpeechUtterance = {
            text: '',
            lang: '',
            onend: null,
            onstart: null
        };
        
        global.SpeechSynthesisUtterance = jest.fn().mockImplementation(() => mockSpeechUtterance);
        
        // Mock speechSynthesis
        mockSpeechSynthesis = {
            speak: jest.fn(),
            cancel: jest.fn(),
            getVoices: jest.fn(() => [])
        };
        
        global.speechSynthesis = mockSpeechSynthesis;

        // Create game instance with speech functionality
        game = {
            objects: [],
            currentSpeech: null,
            speakObjectLabel: function(obj, language = 'en') {
                // This should be implemented to pass tests
                throw new Error('speakObjectLabel not implemented');
            }
        };
    });
    
    test('should throw error when speakObjectLabel is not implemented', () => {
        const obj = {
            data: { emoji: '🐶', en: 'Dog', es: 'Perro' }
        };
        
        expect(() => {
            game.speakObjectLabel(obj, 'en');
        }).toThrow('speakObjectLabel not implemented');
    });

    test('should speak English label when language is en', () => {
        // This test will fail until implementation
        const obj = {
            data: { emoji: '🐶', en: 'Dog', es: 'Perro' }
        };
        
        expect(() => {
            game.speakObjectLabel(obj, 'en');
        }).toThrow('speakObjectLabel not implemented');
    });

    test('should speak Spanish label when language is es', () => {
        const obj = {
            data: { emoji: '🐱', en: 'Cat', es: 'Gato' }
        };
        
        expect(() => {
            game.speakObjectLabel(obj, 'es');
        }).toThrow('speakObjectLabel not implemented');
    });

    test('should handle bilingual speech sequence', () => {
        const obj = {
            data: { emoji: '🐻', en: 'Bear', es: 'Oso' }
        };
        
        expect(() => {
            game.speakObjectLabel(obj, 'both');
        }).toThrow('speakObjectLabel not implemented');
    });
});