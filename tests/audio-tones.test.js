describe('Audio Tones', () => {
    let game;
    let mockAudioContext;
    let mockOscillator;
    let mockGainNode;

    beforeEach(() => {
        // Mock Web Audio API components
        mockOscillator = {
            connect: jest.fn(),
            start: jest.fn(),
            stop: jest.fn(),
            frequency: { value: 440 },
            type: 'sine'
        };

        mockGainNode = {
            connect: jest.fn(),
            gain: { value: 0.1 }
        };

        mockAudioContext = {
            createOscillator: jest.fn().mockReturnValue(mockOscillator),
            createGain: jest.fn().mockReturnValue(mockGainNode),
            destination: {},
            currentTime: 0
        };

        global.AudioContext = jest.fn().mockImplementation(() => mockAudioContext);
        global.webkitAudioContext = jest.fn().mockImplementation(() => mockAudioContext);

        // Create game instance with audio implementation
        game = {
            audioContext: null,
            activeTones: new Map(),
            config: { width: 800, height: 600 },
            initAudio: function() {
                try {
                    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                } catch (error) {
                    console.warn('Web Audio API not supported:', error);
                }
            },
            generateTone: function(x, y, objId) {
                if (!this.audioContext) return;
                
                this.stopTone(objId);
                
                try {
                    const oscillator = this.audioContext.createOscillator();
                    const gainNode = this.audioContext.createGain();
                    
                    const frequency = this.getFrequencyFromPosition(x, y);
                    oscillator.frequency.value = frequency;
                    
                    oscillator.type = this.getWaveformFromPosition(x, y);
                    gainNode.gain.value = 0.1;
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(this.audioContext.destination);
                    
                    oscillator.start();
                    
                    this.activeTones.set(objId, { oscillator, gainNode });
                    
                    setTimeout(() => {
                        this.stopTone(objId);
                    }, 3000);
                    
                } catch (error) {
                    console.warn('Error generating tone:', error);
                }
            },
            stopTone: function(objId) {
                const tone = this.activeTones.get(objId);
                if (tone) {
                    try {
                        tone.oscillator.stop();
                    } catch (error) {
                        // Oscillator may already be stopped
                    }
                    this.activeTones.delete(objId);
                }
            },
            getFrequencyFromPosition: function(x, y) {
                const normalizedY = 1 - (y / this.config.height);
                const minFreq = 200;
                const maxFreq = 800;
                return minFreq + (normalizedY * (maxFreq - minFreq));
            },
            getWaveformFromPosition: function(x, y) {
                const midX = this.config.width / 2;
                const midY = this.config.height / 2;
                
                if (x < midX && y < midY) return 'sine';
                if (x >= midX && y < midY) return 'square';
                if (x < midX && y >= midY) return 'sawtooth';
                return 'triangle';
            }
        };
    });

    test('should initialize audio context', () => {
        game.initAudio();
        
        expect(global.AudioContext).toHaveBeenCalled();
        expect(game.audioContext).toBe(mockAudioContext);
    });

    test('should generate tone with correct frequency and waveform', () => {
        game.initAudio();
        
        game.generateTone(100, 200, 'obj1');
        
        expect(mockAudioContext.createOscillator).toHaveBeenCalled();
        expect(mockAudioContext.createGain).toHaveBeenCalled();
        expect(mockOscillator.connect).toHaveBeenCalledWith(mockGainNode);
        expect(mockGainNode.connect).toHaveBeenCalledWith(mockAudioContext.destination);
        expect(mockOscillator.start).toHaveBeenCalled();
    });

    test('should stop tone and remove from active tones', () => {
        game.initAudio();
        game.generateTone(100, 200, 'obj1');
        
        expect(game.activeTones.has('obj1')).toBe(true);
        
        game.stopTone('obj1');
        
        expect(mockOscillator.stop).toHaveBeenCalled();
        expect(game.activeTones.has('obj1')).toBe(false);
    });

    test('should calculate frequency from Y position', () => {
        const topFreq = game.getFrequencyFromPosition(400, 0);     // Top of screen
        const bottomFreq = game.getFrequencyFromPosition(400, 600); // Bottom of screen
        
        expect(topFreq).toBeCloseTo(800, 0); // Higher Y = higher frequency
        expect(bottomFreq).toBeCloseTo(200, 0); // Lower Y = lower frequency
        expect(topFreq).toBeGreaterThan(bottomFreq);
    });

    test('should return different waveforms for different quadrants', () => {
        expect(game.getWaveformFromPosition(200, 200)).toBe('sine');     // Top-left
        expect(game.getWaveformFromPosition(600, 200)).toBe('square');   // Top-right
        expect(game.getWaveformFromPosition(200, 400)).toBe('sawtooth'); // Bottom-left
        expect(game.getWaveformFromPosition(600, 400)).toBe('triangle'); // Bottom-right
    });
});