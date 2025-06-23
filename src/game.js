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
        this.spawnObjectAt(pointer.x, pointer.y, 'emoji');
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
}

// Start the game when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    new ToddlerToyGame();
});