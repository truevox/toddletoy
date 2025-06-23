import Phaser from 'phaser'

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        // Load any assets here
    }

    create() {
        // Set up input handlers
        this.input.on('pointerdown', this.onPointerDown, this);
        this.input.on('pointermove', this.onPointerMove, this);
        this.input.on('pointerup', this.onPointerUp, this);
        
        // Initialize keyboard input
        this.initKeyboardInput();
        
        // Initialize audio
        this.initAudio();
        
        // Initialize gamepad input
        this.initGamepadInput();
        
        // Create text style
        this.textStyle = {
            fontSize: '32px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            align: 'center'
        };
        
        // Initialize game state
        this.objects = [];
        this.currentSpeech = null;
        this.keyPositions = {};
        this.audioContext = null;
        this.activeTones = new Map();
        this.particleEmitters = new Map();
        this.currentGamepadPosition = { x: 400, y: 300 }; // Default to center
        this.gamepadDeadzone = 0.1;
        this.gamepadButtonStates = new Map();
        
        // Initialize dragging state
        this.isDragging = false;
        this.draggedObject = null;
        
        // Initialize speech queue state
        this.isSpeaking = false;
        this.currentSpeakingObject = null;
        
        // Initialize smooth movement state
        this.movingObjects = new Map(); // Objects currently lerping to target positions
        this.lerpSpeed = 0.15; // Lerp interpolation speed (0.1 = slow, 0.3 = fast)
        
        // Initialize auto-drag state
        this.holdTimer = null;
        this.holdDuration = 500; // 500ms hold to start auto-drag
        this.isHolding = false;
    }

    update() {
        // Update gamepad input
        this.updateGamepadInput();
        
        // Update smooth object movements
        this.updateObjectMovements();
    }

    onPointerDown(pointer) {
        // Check if we hit an existing object
        const hitObject = this.getObjectUnderPointer(pointer.x, pointer.y);
        
        if (hitObject) {
            // Start dragging the existing object
            this.isDragging = true;
            this.draggedObject = hitObject;
            this.startHoldTimer(hitObject);
        } else if (!this.isDragging && !this.isSpeaking) {
            // Spawn new object only if not currently dragging AND not speaking
            const obj = this.spawnObjectAt(pointer.x, pointer.y, 'random');
            this.displayTextLabels(obj);
            this.speakObjectLabel(obj, 'both');
            this.generateTone(pointer.x, pointer.y, obj.id);
            this.createSpawnBurst(pointer.x, pointer.y);
            this.startHoldTimer(obj);
        } else if (this.isSpeaking && this.currentSpeakingObject) {
            // Move the currently speaking object instead of spawning
            this.moveObjectTo(this.currentSpeakingObject, pointer.x, pointer.y, true);
            this.generateTone(pointer.x, pointer.y, this.currentSpeakingObject.id);
        } else if (this.isDragging) {
            // Move dragged object to new position (immediate for dragging)
            this.moveObjectTo(this.draggedObject, pointer.x, pointer.y, false);
        }
    }
    
    onPointerMove(pointer) {
        if (this.isDragging && this.draggedObject) {
            // Immediate movement during active dragging
            this.moveObjectTo(this.draggedObject, pointer.x, pointer.y, false);
        } else if (this.isHolding && this.draggedObject) {
            // Smooth movement during auto-drag mode
            this.moveObjectTo(this.draggedObject, pointer.x, pointer.y, true);
        }
    }
    
    onPointerUp(pointer) {
        // Clear hold timer and state
        this.clearHoldTimer();
        
        if (this.isDragging) {
            this.isDragging = false;
            this.draggedObject = null;
        }
        
        this.isHolding = false;
    }
    
    getObjectUnderPointer(x, y) {
        // Find the closest object within a reasonable distance (50 pixels)
        let closestObject = null;
        let closestDistance = 50; // Maximum hit distance
        
        for (const obj of this.objects) {
            const distance = Math.sqrt((x - obj.x) ** 2 + (y - obj.y) ** 2);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestObject = obj;
            }
        }
        
        return closestObject;
    }
    
    moveObjectTo(obj, x, y, useSmooth = true) {
        if (!obj) return;
        
        if (useSmooth) {
            // Start smooth lerp movement
            this.movingObjects.set(obj.id, {
                object: obj,
                targetX: x,
                targetY: y,
                startX: obj.x,
                startY: obj.y,
                progress: 0
            });
        } else {
            // Immediate movement
            this.setObjectPosition(obj, x, y);
        }
    }
    
    setObjectPosition(obj, x, y) {
        if (!obj) return;
        
        // Update object position
        obj.x = x;
        obj.y = y;
        
        // Update sprite position
        if (obj.sprite) {
            obj.sprite.setPosition(x, y);
        }
        
        // Update label positions
        if (obj.englishLabel) {
            obj.englishLabel.setPosition(x, y + 60);
        }
        if (obj.spanishLabel) {
            obj.spanishLabel.setPosition(x, y + 90);
        }
    }
    
    updateObjectMovements() {
        // Update all objects that are currently lerping
        for (const [objId, movement] of this.movingObjects) {
            movement.progress += this.lerpSpeed;
            
            if (movement.progress >= 1) {
                // Movement complete
                this.setObjectPosition(movement.object, movement.targetX, movement.targetY);
                this.movingObjects.delete(objId);
            } else {
                // Interpolate position
                const currentX = this.lerp(movement.startX, movement.targetX, movement.progress);
                const currentY = this.lerp(movement.startY, movement.targetY, movement.progress);
                this.setObjectPosition(movement.object, currentX, currentY);
            }
        }
    }
    
    lerp(start, end, progress) {
        return start + (end - start) * progress;
    }
    
    startHoldTimer(obj) {
        this.clearHoldTimer();
        this.holdTimer = setTimeout(() => {
            this.isHolding = true;
            this.draggedObject = obj;
            // Could add visual feedback here (e.g., pulse effect)
        }, this.holdDuration);
    }
    
    clearHoldTimer() {
        if (this.holdTimer) {
            clearTimeout(this.holdTimer);
            this.holdTimer = null;
        }
    }

    spawnObjectAt(x, y, type = 'random') {
        let selectedItem;
        
        if (type === 'random') {
            // Randomly choose between emoji, shape, letter, or number
            const types = ['emoji', 'shape', 'letter', 'number'];
            type = types[Math.floor(Math.random() * types.length)];
        }
        
        if (type === 'emoji') {
            selectedItem = this.getRandomEmoji();
        } else if (type === 'shape') {
            selectedItem = this.getRandomShape();
        } else if (type === 'letter') {
            selectedItem = this.getRandomLetter();
        } else if (type === 'number') {
            selectedItem = this.getRandomNumber();
        } else {
            // Fallback to emoji
            selectedItem = this.getRandomEmoji();
        }
        
        // Create visual object
        const obj = {
            x: x,
            y: y,
            type: type,
            id: Date.now() + Math.random(),
            data: selectedItem
        };
        
        // Add to objects array
        this.objects.push(obj);
        
        // Create Phaser text object with appropriate content
        const displayText = this.getDisplayText(selectedItem, type);
        const objectText = this.add.text(x, y, displayText, {
            fontSize: '64px',
            align: 'center',
            fill: selectedItem.color || '#ffffff'
        }).setOrigin(0.5);
        
        obj.sprite = objectText;
        
        return obj;
    }

    getRandomEmoji() {
        // Load from emojis.json data
        const emojis = [
            {"emoji":"🐶","en":"Dog","es":"Perro","type":"emoji"},
            {"emoji":"🐱","en":"Cat","es":"Gato","type":"emoji"},
            {"emoji":"🐭","en":"Mouse","es":"Ratón","type":"emoji"},
            {"emoji":"🐹","en":"Hamster","es":"Hámster","type":"emoji"},
            {"emoji":"🐰","en":"Rabbit","es":"Conejo","type":"emoji"},
            {"emoji":"🦊","en":"Fox","es":"Zorro","type":"emoji"},
            {"emoji":"🐻","en":"Bear","es":"Oso","type":"emoji"},
            {"emoji":"🐼","en":"Panda","es":"Panda","type":"emoji"},
            {"emoji":"🐨","en":"Koala","es":"Koala","type":"emoji"},
            {"emoji":"🐯","en":"Tiger","es":"Tigre","type":"emoji"},
            {"emoji":"🦁","en":"Lion","es":"León","type":"emoji"},
            {"emoji":"🐮","en":"Cow","es":"Vaca","type":"emoji"},
            {"emoji":"🐷","en":"Pig","es":"Cerdo","type":"emoji"},
            {"emoji":"🐸","en":"Frog","es":"Rana","type":"emoji"},
            {"emoji":"🐵","en":"Monkey","es":"Mono","type":"emoji"},
            {"emoji":"🐔","en":"Chicken","es":"Gallina","type":"emoji"},
            {"emoji":"🐤","en":"Chick","es":"Pollito","type":"emoji"},
            {"emoji":"🦆","en":"Duck","es":"Pato","type":"emoji"},
            {"emoji":"🐴","en":"Horse","es":"Caballo","type":"emoji"},
            {"emoji":"🦄","en":"Unicorn","es":"Unicornio","type":"emoji"},
            {"emoji":"🐢","en":"Turtle","es":"Tortuga","type":"emoji"},
            {"emoji":"🐛","en":"Caterpillar","es":"Oruga","type":"emoji"},
            {"emoji":"🦋","en":"Butterfly","es":"Mariposa","type":"emoji"},
            {"emoji":"🐝","en":"Bee","es":"Abeja","type":"emoji"},
            {"emoji":"🐞","en":"Ladybug","es":"Mariquita","type":"emoji"},
            {"emoji":"🐠","en":"Fish","es":"Pez","type":"emoji"},
            {"emoji":"🐳","en":"Whale","es":"Ballena","type":"emoji"},
            {"emoji":"🐬","en":"Dolphin","es":"Delfín","type":"emoji"},
            {"emoji":"🦀","en":"Crab","es":"Cangrejo","type":"emoji"},
            {"emoji":"🐙","en":"Octopus","es":"Pulpo","type":"emoji"},
            {"emoji":"🚗","en":"Car","es":"Coche","type":"emoji"},
            {"emoji":"🚂","en":"Train","es":"Tren","type":"emoji"},
            {"emoji":"✈️","en":"Airplane","es":"Avión","type":"emoji"},
            {"emoji":"🚀","en":"Rocket","es":"Cohete","type":"emoji"},
            {"emoji":"🍎","en":"Apple","es":"Manzana","type":"emoji"},
            {"emoji":"🍌","en":"Banana","es":"Banana","type":"emoji"},
            {"emoji":"🍓","en":"Strawberry","es":"Fresa","type":"emoji"},
            {"emoji":"🍇","en":"Grapes","es":"Uvas","type":"emoji"},
            {"emoji":"🍉","en":"Watermelon","es":"Sandía","type":"emoji"},
            {"emoji":"🍕","en":"Pizza","es":"Pizza","type":"emoji"},
            {"emoji":"🍦","en":"Ice Cream","es":"Helado","type":"emoji"},
            {"emoji":"🍪","en":"Cookie","es":"Galleta","type":"emoji"},
            {"emoji":"🍼","en":"Bottle","es":"Biberón","type":"emoji"},
            {"emoji":"🎈","en":"Balloon","es":"Globo","type":"emoji"},
            {"emoji":"🎁","en":"Gift","es":"Regalo","type":"emoji"},
            {"emoji":"🧸","en":"Teddy Bear","es":"Osito","type":"emoji"},
            {"emoji":"🎵","en":"Music Note","es":"Nota","type":"emoji"},
            {"emoji":"🎶","en":"Music Notes","es":"Notas","type":"emoji"},
            {"emoji":"😀","en":"Happy Face","es":"Cara Feliz","type":"emoji"},
            {"emoji":"😃","en":"Big Eyes","es":"Ojos Grandes","type":"emoji"},
            {"emoji":"😊","en":"Smiling Eyes","es":"Ojos Felices","type":"emoji"},
            {"emoji":"😎","en":"Cool Face","es":"Cara Cool","type":"emoji"},
            {"emoji":"😍","en":"Heart Eyes","es":"Ojos Corazón","type":"emoji"},
            {"emoji":"😢","en":"Sad Face","es":"Cara Triste","type":"emoji"},
            {"emoji":"😡","en":"Angry Face","es":"Cara Enfadada","type":"emoji"},
            {"emoji":"😂","en":"Laughing Face","es":"Cara Riendo","type":"emoji"},
            {"emoji":"❤️","en":"Red Heart","es":"Corazón Rojo","type":"emoji"}
        ];
        return emojis[Math.floor(Math.random() * emojis.length)];
    }

    getRandomShape() {
        const colors = [
            { value: "Red", en: "Red", es: "Rojo", hex: "#ff0000" },
            { value: "Blue", en: "Blue", es: "Azul", hex: "#0000ff" },
            { value: "Green", en: "Green", es: "Verde", hex: "#00ff00" },
            { value: "Yellow", en: "Yellow", es: "Amarillo", hex: "#ffff00" },
            { value: "Purple", en: "Purple", es: "Morado", hex: "#800080" },
            { value: "Orange", en: "Orange", es: "Naranja", hex: "#ffa500" }
        ];
        
        const shapes = [
            { value: "Circle", en: "Circle", es: "Círculo", symbol: "●" },
            { value: "Square", en: "Square", es: "Cuadro", symbol: "■" },
            { value: "Triangle", en: "Triangle", es: "Triángulo", symbol: "▲" },
            { value: "Star", en: "Star", es: "Estrella", symbol: "★" },
            { value: "Heart", en: "Heart", es: "Corazón", symbol: "♥" },
            { value: "Diamond", en: "Diamond", es: "Diamante", symbol: "♦" }
        ];
        
        const color = colors[Math.floor(Math.random() * colors.length)];
        const shape = shapes[Math.floor(Math.random() * shapes.length)];
        
        return {
            type: 'shape',
            symbol: shape.symbol,
            color: color.hex,
            en: `${color.en} ${shape.en}`,
            es: `${shape.es} ${color.es}`
        };
    }

    getRandomLetter() {
        const colors = [
            { value: "Red", en: "Red", es: "Rojo", hex: "#ff0000" },
            { value: "Blue", en: "Blue", es: "Azul", hex: "#0000ff" },
            { value: "Green", en: "Green", es: "Verde", hex: "#00ff00" },
            { value: "Yellow", en: "Yellow", es: "Amarillo", hex: "#ffff00" },
            { value: "Purple", en: "Purple", es: "Morado", hex: "#800080" },
            { value: "Orange", en: "Orange", es: "Naranja", hex: "#ffa500" }
        ];
        
        const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const letter = letters[Math.floor(Math.random() * letters.length)];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        return {
            type: 'letter',
            symbol: letter,
            color: color.hex,
            en: `${color.en} ${letter}`,
            es: `${letter} ${color.es}`
        };
    }

    getRandomNumber() {
        const colors = [
            { value: "Red", en: "Red", es: "Rojo", hex: "#ff0000" },
            { value: "Blue", en: "Blue", es: "Azul", hex: "#0000ff" },
            { value: "Green", en: "Green", es: "Verde", hex: "#00ff00" },
            { value: "Yellow", en: "Yellow", es: "Amarillo", hex: "#ffff00" },
            { value: "Purple", en: "Purple", es: "Morado", hex: "#800080" },
            { value: "Orange", en: "Orange", es: "Naranja", hex: "#ffa500" }
        ];
        
        // Weighted random number generation as per design doc
        let number;
        const rand = Math.random();
        if (rand < 0.6) {
            // 0-20: most frequent (60%)
            number = Math.floor(Math.random() * 21);
        } else if (rand < 0.9) {
            // 21-1000: less frequent (30%)
            number = 21 + Math.floor(Math.random() * 980);
        } else {
            // 1001-9999: least frequent (10%)
            number = 1001 + Math.floor(Math.random() * 8999);
        }
        
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        return {
            type: 'number',
            symbol: number.toString(),
            color: color.hex,
            en: `${color.en} ${number}`,
            es: `${number} ${color.es}`
        };
    }

    getDisplayText(item, type) {
        if (type === 'emoji') {
            return item.emoji;
        } else {
            return item.symbol;
        }
    }

    speakObjectLabel(obj, language = 'en') {
        if (!obj || !obj.data) return;
        
        // Cancel any current speech
        if (this.currentSpeech) {
            speechSynthesis.cancel();
        }
        
        // Set speaking state
        this.isSpeaking = true;
        this.currentSpeakingObject = obj;
        
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
            // Speech sequence complete - unlock the queue
            this.currentSpeech = null;
            this.isSpeaking = false;
            this.currentSpeakingObject = null;
            return;
        }
        
        const utterance = new SpeechSynthesisUtterance(texts[index]);
        utterance.lang = index === 0 ? 'en-US' : 'es-ES';
        utterance.rate = 0.8;
        utterance.volume = 0.7;
        
        utterance.onend = () => {
            this.speakTextSequence(texts, index + 1);
        };
        
        utterance.onerror = () => {
            // Handle speech errors by unlocking the queue
            this.isSpeaking = false;
            this.currentSpeakingObject = null;
            this.currentSpeech = null;
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
        const width = this.scale.width;
        const height = this.scale.height;
        
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
            if (!this.isSpeaking) {
                // Spawn new object only if not speaking
                const obj = this.spawnObjectAt(position.x, position.y, 'random');
                this.displayTextLabels(obj);
                this.speakObjectLabel(obj, 'both');
                this.generateTone(position.x, position.y, obj.id);
                this.createSpawnBurst(position.x, position.y);
            } else if (this.currentSpeakingObject) {
                // Move the currently speaking object
                this.moveObjectTo(this.currentSpeakingObject, position.x, position.y);
                this.generateTone(position.x, position.y, this.currentSpeakingObject.id);
            }
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
        const normalizedY = 1 - (y / this.scale.height);
        const minFreq = 200;
        const maxFreq = 800;
        return minFreq + (normalizedY * (maxFreq - minFreq));
    }

    getWaveformFromPosition(x, y) {
        // Map screen quadrants to different waveforms
        const midX = this.scale.width / 2;
        const midY = this.scale.height / 2;
        
        if (x < midX && y < midY) return 'sine';        // Top-left
        if (x >= midX && y < midY) return 'square';     // Top-right  
        if (x < midX && y >= midY) return 'sawtooth';   // Bottom-left
        return 'triangle';                              // Bottom-right
    }

    createParticleEffect(x, y, objId) {
        try {
            // Create a simple particle system using Phaser graphics
            const particles = this.add.particles(x, y, 'particle', {
                speed: { min: 50, max: 150 },
                scale: { start: 0.5, end: 0 },
                blendMode: 'ADD',
                lifespan: 300
            });

            // Store reference for cleanup
            this.particleEmitters.set(objId, particles);

            // Auto-cleanup after animation
            setTimeout(() => {
                this.cleanupParticles(objId);
            }, 1000);

            return particles;
        } catch (error) {
            // Fallback: create simple visual effect with graphics
            return this.createFallbackEffect(x, y, objId);
        }
    }

    createSpawnBurst(x, y) {
        try {
            // Create a burst effect using simple graphics since we don't have texture assets
            const graphics = this.add.graphics();
            
            // Create colorful burst circles
            const colors = [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0xf9ca24, 0xf0932b, 0xeb4d4b, 0x6c5ce7];
            
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const distance = 30 + Math.random() * 20;
                const particleX = x + Math.cos(angle) * distance;
                const particleY = y + Math.sin(angle) * distance;
                
                const color = colors[Math.floor(Math.random() * colors.length)];
                graphics.fillStyle(color);
                graphics.fillCircle(particleX, particleY, 3 + Math.random() * 3);
            }

            // Fade out the burst effect
            this.tweens.add({
                targets: graphics,
                alpha: 0,
                duration: 500,
                ease: 'Power2',
                onComplete: () => {
                    graphics.destroy();
                }
            });

        } catch (error) {
            console.warn('Error creating spawn burst:', error);
        }
    }

    createFallbackEffect(x, y, objId) {
        // Simple fallback effect using graphics
        const graphics = this.add.graphics();
        graphics.fillStyle(0xffffff);
        graphics.fillCircle(x, y, 20);
        
        // Fade out effect
        this.tweens.add({
            targets: graphics,
            alpha: 0,
            scaleX: 2,
            scaleY: 2,
            duration: 300,
            onComplete: () => {
                graphics.destroy();
                this.particleEmitters.delete(objId);
            }
        });

        this.particleEmitters.set(objId, graphics);
        return graphics;
    }

    cleanupParticles(objId) {
        const emitter = this.particleEmitters.get(objId);
        if (emitter) {
            try {
                emitter.destroy();
            } catch (error) {
                // Emitter may already be destroyed
            }
            this.particleEmitters.delete(objId);
        }
    }

    initGamepadInput() {
        // Set up gamepad event listeners if available
        if (this.input.gamepad) {
            this.input.gamepad.on('connected', (gamepad) => {
                console.log('Gamepad connected:', gamepad);
            });
            
            this.input.gamepad.on('disconnected', (gamepad) => {
                console.log('Gamepad disconnected:', gamepad);
            });
        }
    }

    updateGamepadInput() {
        // Get gamepad via native API (more reliable than Phaser gamepad)
        if (navigator.getGamepads) {
            const gamepads = navigator.getGamepads();
            
            for (let i = 0; i < gamepads.length; i++) {
                const gamepad = gamepads[i];
                if (gamepad && gamepad.connected) {
                    // Update position based on joystick input
                    const position = this.getGamepadPosition(gamepad);
                    this.currentGamepadPosition = position;
                    
                    // Check for button presses
                    for (let buttonIndex = 0; buttonIndex < gamepad.buttons.length; buttonIndex++) {
                        const button = gamepad.buttons[buttonIndex];
                        const wasPressed = this.gamepadButtonStates.get(`${i}-${buttonIndex}`) || false;
                        
                        if (button.pressed && !wasPressed) {
                            this.onGamepadButtonDown(gamepad, buttonIndex);
                        }
                        
                        this.gamepadButtonStates.set(`${i}-${buttonIndex}`, button.pressed);
                    }
                }
            }
        }
    }

    onGamepadButtonDown(gamepad, buttonIndex) {
        if (!this.isSpeaking) {
            // Spawn object at current gamepad cursor position
            const obj = this.spawnObjectAt(
                this.currentGamepadPosition.x, 
                this.currentGamepadPosition.y, 
                'random'
            );
            
            this.displayTextLabels(obj);
            this.speakObjectLabel(obj, 'both');
            this.generateTone(this.currentGamepadPosition.x, this.currentGamepadPosition.y, obj.id);
            this.createSpawnBurst(this.currentGamepadPosition.x, this.currentGamepadPosition.y);
        } else if (this.currentSpeakingObject) {
            // Move the currently speaking object
            this.moveObjectTo(this.currentSpeakingObject, this.currentGamepadPosition.x, this.currentGamepadPosition.y);
            this.generateTone(this.currentGamepadPosition.x, this.currentGamepadPosition.y, this.currentSpeakingObject.id);
        }
    }

    getGamepadPosition(gamepad) {
        // Average both analog sticks for position (as per design doc)
        const leftStickX = this.applyDeadzone(gamepad.axes[0], this.gamepadDeadzone);
        const leftStickY = this.applyDeadzone(gamepad.axes[1], this.gamepadDeadzone);
        const rightStickX = this.applyDeadzone(gamepad.axes[2], this.gamepadDeadzone);
        const rightStickY = this.applyDeadzone(gamepad.axes[3], this.gamepadDeadzone);
        
        // Average the stick inputs
        const avgX = (leftStickX + rightStickX) / 2;
        const avgY = (leftStickY + rightStickY) / 2;
        
        // Convert from gamepad coordinates (-1 to 1) to screen coordinates
        const screenX = (avgX + 1) * (this.scale.width / 2);
        const screenY = (avgY + 1) * (this.scale.height / 2);
        
        // Clamp to screen bounds
        return {
            x: Math.max(0, Math.min(this.scale.width, screenX)),
            y: Math.max(0, Math.min(this.scale.height, screenY))
        };
    }

    applyDeadzone(value, deadzone) {
        // Apply deadzone to prevent drift
        if (Math.abs(value) < deadzone) {
            return 0;
        }
        
        // Scale the remaining range to maintain smooth movement
        const sign = Math.sign(value);
        const scaledValue = (Math.abs(value) - deadzone) / (1 - deadzone);
        return sign * scaledValue;
    }
}

export class ToddlerToyGame {
    constructor() {
        this.config = {
            type: Phaser.AUTO,
            width: window.innerWidth,
            height: window.innerHeight,
            parent: 'game-container',
            scene: GameScene,
            scale: {
                mode: Phaser.Scale.RESIZE,
                autoCenter: Phaser.Scale.CENTER_BOTH
            }
        };
        
        this.game = new Phaser.Game(this.config);
    }
}

