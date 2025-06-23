class ToddlerToyGame {
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
    }

    preload() {
        // Load any assets here
    }

    create() {
        // Set up input handlers
        this.input.on('pointerdown', this.onPointerDown, this);
        
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
}

// Start the game when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    new ToddlerToyGame();
});