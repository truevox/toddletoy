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
                if (!obj || !obj.data) return;
                
                if (this.currentSpeech) {
                    speechSynthesis.cancel();
                }
                
                const data = obj.data;
                let textsToSpeak = [];
                
                if (language === 'en') {
                    textsToSpeak = [data.en];
                } else if (language === 'es') {
                    textsToSpeak = [data.es];
                } else if (language === 'both') {
                    textsToSpeak = [data.en, data.es];
                }
                
                this.speakTextSequence(textsToSpeak, 0);
            },
            speakTextSequence: function(texts, index) {
                if (index >= texts.length) {
                    this.currentSpeech = null;
                    return;
                }
                
                const utterance = new SpeechSynthesisUtterance(texts[index]);
                utterance.lang = index === 0 ? 'en-US' : 'es-ES';
                utterance.rate = 0.8;
                utterance.volume = 0.7;
                
                utterance.onend = () => {
                    this.speakTextSequence(texts, index + 1);
                };
                
                this.currentSpeech = utterance;
                speechSynthesis.speak(utterance);
            }
        };
    });
    
    test('should speak English label when language is en', () => {
        const obj = {
            data: { emoji: '🐶', en: 'Dog', es: 'Perro' }
        };
        
        game.speakObjectLabel(obj, 'en');
        
        expect(global.SpeechSynthesisUtterance).toHaveBeenCalledWith('Dog');
        expect(mockSpeechSynthesis.speak).toHaveBeenCalledWith(expect.any(Object));
    });

    test('should speak Spanish label when language is es', () => {
        const obj = {
            data: { emoji: '🐱', en: 'Cat', es: 'Gato' }
        };
        
        game.speakObjectLabel(obj, 'es');
        
        expect(global.SpeechSynthesisUtterance).toHaveBeenCalledWith('Gato');
        expect(mockSpeechSynthesis.speak).toHaveBeenCalledWith(expect.any(Object));
    });

    test('should handle bilingual speech sequence', () => {
        const obj = {
            data: { emoji: '🐻', en: 'Bear', es: 'Oso' }
        };
        
        game.speakObjectLabel(obj, 'both');
        
        expect(global.SpeechSynthesisUtterance).toHaveBeenCalledWith('Bear');
        expect(mockSpeechSynthesis.speak).toHaveBeenCalledWith(expect.any(Object));
    });

    test('should cancel current speech before starting new speech', () => {
        const obj = {
            data: { emoji: '🐶', en: 'Dog', es: 'Perro' }
        };
        
        game.currentSpeech = {}; // Simulate ongoing speech
        game.speakObjectLabel(obj, 'en');
        
        expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
    });
});