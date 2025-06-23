import Phaser from 'phaser'

export class ToddlerToyGame {
    constructor() {
        this.config = {
            type: Phaser.AUTO,
            width: window.innerWidth,
            height: window.innerHeight,
            parent: 'game-container',
            scene: {
                preload: this.preload.bind(this),
                create: this.create.bind(this),
                update: this.update.bind(this)
            },
            scale: {
                mode: Phaser.Scale.RESIZE,
                autoCenter: Phaser.Scale.CENTER_BOTH
            }
        };
        
        this.game = new Phaser.Game(this.config);
        this.objects = [];
        this.currentSpeech = null;
        this.keyPositions = {};
        this.audioContext = null;
        this.activeTones = new Map();
    }

    preload() {
        // Load any assets here
    }

    create() {
        // Set up input handlers
        this.input.on('pointerdown', this.onPointerDown, this);
        
        // Initialize keyboard input
        this.initKeyboardInput();
        
        // Initialize audio
        this.initAudio();
        
        // Create text style
        this.textStyle = {
            fontSize: '32px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            align: 'center'
        };
    }

    update() {
        // Game update loop
    }

    onPointerDown(pointer) {
        const obj = this.spawnObjectAt(pointer.x, pointer.y, 'emoji');
        this.displayTextLabels(obj);
        this.speakObjectLabel(obj, 'both');
        this.generateTone(pointer.x, pointer.y, obj.id);
    }

    spawnObjectAt(x, y, type = 'emoji') {
        // Load emoji data
        const emojis = [
            {"emoji":"🐶","en":"Dog","es":"Perro","type":"emoji"},
            {"emoji":"🐱","en":"Cat","es":"Gato","type":"emoji"},
            {"emoji":"🐻","en":"Bear","es":"Oso","type":"emoji"}
        ];
        
        // Select random emoji for now
        const selectedEmoji = emojis[Math.floor(Math.random() * emojis.length)];
        
        // Create visual object
        const obj = {
            x: x,
            y: y,
            type: type,
            id: Date.now() + Math.random(),
            data: selectedEmoji
        };
        
        // Add to objects array
        this.objects.push(obj);
        
        // Create Phaser text object for the emoji
        const emojiText = this.add.text(x, y, selectedEmoji.emoji, {
            fontSize: '64px',
            align: 'center'
        }).setOrigin(0.5);
        
        obj.sprite = emojiText;
        
        return obj;
    }

    speakObjectLabel(obj, language = 'en') {
        if (!obj || !obj.data) return;
        
        // Cancel any current speech
        if (this.currentSpeech) {
            speechSynthesis.cancel();
        }
        
        const data = obj.data;
        let textsToSpeak = [];
        
        // Determine what to speak based on language parameter
        if (language === 'en') {
            textsToSpeak = [data.en];
        } else if (language === 'es') {
            textsToSpeak = [data.es];
        } else if (language === 'both') {
            textsToSpeak = [data.en, data.es];
        }
        
        // Speak each text in sequence
        this.speakTextSequence(textsToSpeak, 0);
    }
    
    speakTextSequence(texts, index) {
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

    displayTextLabels(obj) {
        if (!obj || !obj.data) return;
        
        const data = obj.data;
        const x = obj.x;
        const y = obj.y;
        
        // Text style for labels
        const labelStyle = {
            fontSize: '24px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            align: 'center',
            stroke: '#000000',
            strokeThickness: 2
        };
        
        // Create English label (positioned below emoji)
        const englishText = this.add.text(x, y + 60, data.en, labelStyle)
            .setOrigin(0.5);
        
        // Create Spanish label (positioned below English)
        const spanishText = this.add.text(x, y + 90, data.es, labelStyle)
            .setOrigin(0.5);
        
        // Store references to text objects for cleanup
        obj.englishLabel = englishText;
        obj.spanishLabel = spanishText;
        
        return {
            english: englishText,
            spanish: spanishText
        };
    }

    initKeyboardInput() {
        // Set up key position mappings (grid layout)
        const width = this.config.width;
        const height = this.config.height;
        
        this.keyPositions = {
            'KeyQ': { x: width * 0.2, y: height * 0.2 },  // Top-left
            'KeyW': { x: width * 0.5, y: height * 0.2 },  // Top-center
            'KeyE': { x: width * 0.8, y: height * 0.2 },  // Top-right
            'KeyA': { x: width * 0.2, y: height * 0.5 },  // Mid-left
            'KeyS': { x: width * 0.5, y: height * 0.5 },  // Center
            'KeyD': { x: width * 0.8, y: height * 0.5 },  // Mid-right
            'KeyZ': { x: width * 0.2, y: height * 0.8 },  // Bottom-left
            'KeyX': { x: width * 0.5, y: height * 0.8 },  // Bottom-center
            'KeyC': { x: width * 0.8, y: height * 0.8 }   // Bottom-right
        };
        
        // Set up keyboard event listeners
        this.input.keyboard.on('keydown', this.onKeyDown, this);
    }
    
    onKeyDown(event) {
        const position = this.getKeyPosition(event.code);
        if (position) {
            const obj = this.spawnObjectAt(position.x, position.y, 'emoji');
            this.displayTextLabels(obj);
            this.speakObjectLabel(obj, 'both');
            this.generateTone(position.x, position.y, obj.id);
        }
    }
    
    getKeyPosition(keyCode) {
        return this.keyPositions[keyCode] || null;
    }

    initAudio() {
        try {
            // Create AudioContext with fallback for older browsers
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (error) {
            console.warn('Web Audio API not supported:', error);
        }
    }

    generateTone(x, y, objId) {
        if (!this.audioContext) return;

        // Stop any existing tone for this object
        this.stopTone(objId);

        try {
            // Create oscillator and gain nodes
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            // Set frequency based on Y position (higher = higher pitch)
            const frequency = this.getFrequencyFromPosition(x, y);
            oscillator.frequency.value = frequency;

            // Set waveform based on X/Y position
            oscillator.type = this.getWaveformFromPosition(x, y);

            // Set volume (lower than speech)
            gainNode.gain.value = 0.1;

            // Connect audio nodes
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            // Start the tone
            oscillator.start();

            // Store reference for cleanup
            this.activeTones.set(objId, { oscillator, gainNode });

            // Auto-stop after 3 seconds to prevent endless tones
            setTimeout(() => {
                this.stopTone(objId);
            }, 3000);

        } catch (error) {
            console.warn('Error generating tone:', error);
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
        const normalizedY = 1 - (y / this.config.height);
        const minFreq = 200;
        const maxFreq = 800;
        return minFreq + (normalizedY * (maxFreq - minFreq));
    }

    getWaveformFromPosition(x, y) {
        // Map screen quadrants to different waveforms
        const midX = this.config.width / 2;
        const midY = this.config.height / 2;
        
        if (x < midX && y < midY) return 'sine';        // Top-left
        if (x >= midX && y < midY) return 'square';     // Top-right  
        if (x < midX && y >= midY) return 'sawtooth';   // Bottom-left
        return 'triangle';                              // Bottom-right
    }
}

