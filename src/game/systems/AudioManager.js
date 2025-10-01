/**
 * AudioManager - Handles Web Audio API tone generation and management
 * Manages position-based audio tones with continuous playback
 */
export class AudioManager {
    constructor(scene) {
        this.scene = scene;
        this.audioContext = null;
        this.activeTones = new Map();
        
        this.initAudio();
    }

    initAudio() {
        try {
            // Initialize Web Audio Context (suspended until user interaction)
            if (typeof AudioContext !== 'undefined') {
                this.audioContext = new AudioContext();
            } else if (typeof webkitAudioContext !== 'undefined') {
                this.audioContext = new webkitAudioContext();
            }
            
            if (this.audioContext) {
                console.log('Web Audio API initialized successfully');
            }
        } catch (error) {
            console.warn('Web Audio API not supported or failed to initialize:', error);
        }
    }

    async resumeAudioContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            try {
                await this.audioContext.resume();
                console.log('Audio context resumed');
            } catch (error) {
                console.warn('Failed to resume audio context:', error);
            }
        }
    }

    generateContinuousTone(x, y, objId) {
        if (!this.audioContext) {
            console.warn('Audio context not available');
            return null;
        }

        // Check if audio is muted in config
        const audioConfig = this.scene.configManager ? this.scene.configManager.getAudioConfig() : null;
        if (audioConfig && audioConfig.mute) {
            console.log('🔇 Audio tones are muted');
            return null;
        }

        try {
            // Resume audio context if needed
            this.resumeAudioContext();

            // Stop any existing tone for this object
            this.stopTone(objId);

            // Create oscillator and gain nodes
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            // Set frequency based on Y position
            const frequency = this.getFrequencyFromPosition(x, y);
            oscillator.frequency.value = frequency;

            // Set waveform based on X/Y position
            oscillator.type = this.getWaveformFromPosition(x, y);

            // Set volume from config (0-100 scale to 0-1 scale)
            const volumeMultiplier = audioConfig ? (audioConfig.volume / 100) : 0.1;
            gainNode.gain.value = volumeMultiplier;

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
    }

    updateTonePosition(x, y, objId) {
        const tone = this.activeTones.get(objId);
        if (tone) {
            try {
                // Update frequency and waveform based on new position
                tone.oscillator.frequency.value = this.getFrequencyFromPosition(x, y);
                tone.oscillator.type = this.getWaveformFromPosition(x, y);
            } catch (error) {
                // Oscillator may have been stopped, ignore
            }
        }
    }

    stopAllTones() {
        for (const objId of this.activeTones.keys()) {
            this.stopTone(objId);
        }
    }

    stopTone(objId) {
        const tone = this.activeTones.get(objId);
        if (tone) {
            try {
                tone.oscillator.stop();
            } catch (error) {
                // Oscillator may already be stopped
            }
            this.activeTones.delete(objId);
        }
    }

    getFrequencyFromPosition(x, y) {
        // Map Y position to frequency range (200Hz - 800Hz)
        // Higher Y = lower frequency (like a piano)
        const normalizedY = 1 - (y / this.scene.scale.height);
        const minFreq = 200;
        const maxFreq = 800;
        return minFreq + (normalizedY * (maxFreq - minFreq));
    }

    getWaveformFromPosition(x, y) {
        // Map screen quadrants to different waveforms
        const midX = this.scene.scale.width / 2;
        const midY = this.scene.scale.height / 2;
        
        if (x < midX && y < midY) return 'sine';        // Top-left
        if (x >= midX && y < midY) return 'square';     // Top-right  
        if (x < midX && y >= midY) return 'sawtooth';   // Bottom-left
        return 'triangle';                              // Bottom-right
    }

    hasTone(objId) {
        return this.activeTones.has(objId);
    }

    getToneCount() {
        return this.activeTones.size;
    }

    destroy() {
        // Stop all active tones
        this.stopAllTones();
        
        // Close audio context if available
        if (this.audioContext && this.audioContext.close) {
            this.audioContext.close().catch(error => {
                console.warn('Error closing audio context:', error);
            });
        }
        
        this.audioContext = null;
    }
}