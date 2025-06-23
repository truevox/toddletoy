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
    }

    preload() {
        // Load any assets here
    }

    create() {
        // Set up input handlers
        this.input.on('pointerdown', this.onPointerDown, this);
        
        // Initialize keyboard input
        this.initKeyboardInput();
        
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
        }
    }
    
    getKeyPosition(keyCode) {
        return this.keyPositions[keyCode] || null;
    }
}

