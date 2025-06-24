describe('Continuous Background Tones', () => {
    let game;
    let mockAudioContext;
    let mockOscillator;
    let mockGainNode;

    beforeEach(() => {
        // Mock Web Audio API
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
            destination: {}
        };

        // Create game instance with continuous tone functionality
        game = {
            audioContext: mockAudioContext,
            activeTones: new Map(),
            scale: { width: 800, height: 600 },
            
            startContinuousTone: function(x, y, objId) {
                // Stop any existing tone for this object
                this.stopTone(objId);
                
                try {
                    // Create oscillator and gain node
                    const oscillator = this.audioContext.createOscillator();
                    const gainNode = this.audioContext.createGain();
                    
                    // Configure oscillator
                    oscillator.frequency.value = this.getFrequencyFromPosition(x, y);
                    oscillator.type = this.getWaveformFromPosition(x, y);
                    
                    // Configure gain (volume)
                    gainNode.gain.value = 0.1; // Lower volume than speech
                    
                    // Connect audio nodes
                    oscillator.connect(gainNode);
                    gainNode.connect(this.audioContext.destination);
                    
                    // Start the tone
                    oscillator.start();
                    
                    // Store reference for cleanup (no timeout for continuous play)
                    this.activeTones.set(objId, { oscillator, gainNode });
                    
                    return { oscillator, gainNode };
                } catch (error) {
                    console.warn('Error generating continuous tone:', error);
                    return null;
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
            
            updateTonePosition: function(x, y, objId) {
                const tone = this.activeTones.get(objId);
                if (tone) {
                    // Update frequency and waveform based on new position
                    tone.oscillator.frequency.value = this.getFrequencyFromPosition(x, y);
                    tone.oscillator.type = this.getWaveformFromPosition(x, y);
                }
            },
            
            stopAllTones: function() {
                for (const objId of this.activeTones.keys()) {
                    this.stopTone(objId);
                }
            },
            
            getFrequencyFromPosition: function(x, y) {
                // Map Y position to frequency range (200Hz - 800Hz)
                const normalizedY = 1 - (y / this.scale.height);
                const minFreq = 200;
                const maxFreq = 800;
                return minFreq + (normalizedY * (maxFreq - minFreq));
            },
            
            getWaveformFromPosition: function(x, y) {
                // Map screen quadrants to different waveforms
                const midX = this.scale.width / 2;
                const midY = this.scale.height / 2;
                
                if (x < midX && y < midY) return 'sine';
                if (x >= midX && y < midY) return 'square';
                if (x < midX && y >= midY) return 'sawtooth';
                return 'triangle';
            }
        };
    });

    test('should start continuous tone without timeout', () => {
        const objId = 'test-obj-1';
        
        game.startContinuousTone(400, 300, objId);
        
        expect(mockAudioContext.createOscillator).toHaveBeenCalled();
        expect(mockAudioContext.createGain).toHaveBeenCalled();
        expect(mockOscillator.start).toHaveBeenCalled();
        expect(game.activeTones.has(objId)).toBe(true);
    });

    test('should configure tone based on position', () => {
        const objId = 'test-obj-1';
        
        game.startContinuousTone(200, 150, objId);
        
        // Should set frequency based on Y position
        expect(mockOscillator.frequency.value).toBeGreaterThan(0);
        // Should set waveform based on screen quadrant
        expect(mockOscillator.type).toBeDefined();
    });

    test('should store tone reference for cleanup', () => {
        const objId = 'test-obj-1';
        
        game.startContinuousTone(400, 300, objId);
        
        const storedTone = game.activeTones.get(objId);
        expect(storedTone).toBeDefined();
        expect(storedTone.oscillator).toBe(mockOscillator);
        expect(storedTone.gainNode).toBe(mockGainNode);
    });

    test('should stop existing tone before starting new one for same object', () => {
        const objId = 'test-obj-1';
        
        // Start first tone
        game.startContinuousTone(400, 300, objId);
        const firstOscillator = mockOscillator;
        
        // Mock new oscillator for second tone
        const mockOscillator2 = {
            connect: jest.fn(),
            start: jest.fn(),
            stop: jest.fn(),
            frequency: { value: 440 },
            type: 'sine'
        };
        mockAudioContext.createOscillator.mockReturnValue(mockOscillator2);
        
        // Start second tone (should stop first)
        game.startContinuousTone(600, 400, objId);
        
        expect(firstOscillator.stop).toHaveBeenCalled();
        expect(mockOscillator2.start).toHaveBeenCalled();
    });

    test('should update tone position without restarting', () => {
        const objId = 'test-obj-1';
        
        game.startContinuousTone(400, 300, objId);
        const originalFreq = mockOscillator.frequency.value;
        
        // Update position
        game.updateTonePosition(400, 150, objId);
        
        // Frequency should change based on new Y position
        expect(mockOscillator.frequency.value).not.toBe(originalFreq);
    });

    test('should stop individual tone by object ID', () => {
        const objId = 'test-obj-1';
        
        game.startContinuousTone(400, 300, objId);
        expect(game.activeTones.has(objId)).toBe(true);
        
        game.stopTone(objId);
        
        expect(mockOscillator.stop).toHaveBeenCalled();
        expect(game.activeTones.has(objId)).toBe(false);
    });

    test('should stop all active tones', () => {
        const objId1 = 'test-obj-1';
        const objId2 = 'test-obj-2';
        
        // Start multiple tones
        game.startContinuousTone(400, 300, objId1);
        game.startContinuousTone(600, 400, objId2);
        
        expect(game.activeTones.size).toBe(2);
        
        game.stopAllTones();
        
        expect(game.activeTones.size).toBe(0);
    });

    test('should handle tone creation errors gracefully', () => {
        const objId = 'test-obj-1';
        mockAudioContext.createOscillator.mockImplementation(() => {
            throw new Error('Audio context error');
        });
        
        const result = game.startContinuousTone(400, 300, objId);
        
        expect(result).toBeNull();
        expect(game.activeTones.has(objId)).toBe(false);
    });

    test('should handle stopping non-existent tone gracefully', () => {
        const objId = 'non-existent';
        
        // Should not throw error
        expect(() => game.stopTone(objId)).not.toThrow();
    });
});