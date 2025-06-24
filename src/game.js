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
        this.pointerIsDown = false; // Track if pointer is currently pressed
        
        // Initialize advanced keyboard state
        this.heldKeys = new Set(); // Track currently held keys
        this.keyboardObject = null; // Object controlled by keyboard
        
        // Preload Kaktovik font by rendering invisible characters
        this.preloadKaktovikFont();
        
        // Initialization complete - ready for user interaction
        
    }

    update() {
        // Update gamepad input
        this.updateGamepadInput();
        
        // Update smooth object movements
        this.updateObjectMovements();
        
        // Alternative keyboard check using Phaser key objects
        if (this.keys) {
            this.checkKeyboardInput();
        }
    }
    
    checkKeyboardInput() {
        // Check if any of our mapped keys are currently down
        const keyMapping = {
            'Q': 'KeyQ', 'W': 'KeyW', 'E': 'KeyE',
            'A': 'KeyA', 'S': 'KeyS', 'D': 'KeyD',
            'Z': 'KeyZ', 'X': 'KeyX', 'C': 'KeyC'
        };
        
        let currentlyHeld = new Set();
        
        for (const [key, keyCode] of Object.entries(keyMapping)) {
            if (this.keys[key] && this.keys[key].isDown) {
                currentlyHeld.add(keyCode);
            }
        }
        
        // Check if the held keys have changed
        const heldKeysArray = Array.from(this.heldKeys);
        const currentlyHeldArray = Array.from(currentlyHeld);
        
        if (heldKeysArray.length !== currentlyHeldArray.length || 
            !heldKeysArray.every(key => currentlyHeld.has(key))) {
            
            console.log('Keys changed:', currentlyHeldArray);
            this.heldKeys = currentlyHeld;
            
            if (this.heldKeys.size > 0) {
                if (!this.keyboardObject && !this.isSpeaking) {
                    // Create new keyboard object
                    const firstKey = Array.from(this.heldKeys)[0];
                    const position = this.getKeyPosition(firstKey);
                    if (position) {
                        const obj = this.spawnObjectAt(position.x, position.y, 'random');
                        this.displayTextLabels(obj);
                        this.speakObjectLabel(obj, 'both');
                        this.generateTone(position.x, position.y, obj.id);
                        this.createSpawnBurst(position.x, position.y);
                        this.keyboardObject = obj;
                    }
                } else if (this.isSpeaking && !this.keyboardObject) {
                    this.keyboardObject = this.currentSpeakingObject;
                }
                
                this.updateKeyboardObjectPosition();
            } else {
                this.keyboardObject = null;
            }
        }
    }

    onPointerDown(pointer) {
        this.pointerIsDown = true;
        
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
            this.updateTonePosition(pointer.x, pointer.y, this.currentSpeakingObject.id);
            // Set up dragging state for the speaking object to follow mouse
            this.isDragging = true;
            this.draggedObject = this.currentSpeakingObject;
            this.startHoldTimer(this.currentSpeakingObject);
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
        } else if (this.pointerIsDown && this.isSpeaking && this.currentSpeakingObject) {
            // Speaking object follows mouse when pointer is held down during speech
            this.moveObjectTo(this.currentSpeakingObject, pointer.x, pointer.y, true);
            this.updateTonePosition(pointer.x, pointer.y, this.currentSpeakingObject.id);
        }
    }
    
    onPointerUp(pointer) {
        this.pointerIsDown = false;
        
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
        
        // Update word object positions
        if (obj.englishWords && obj.englishWords.length > 0) {
            this.repositionWordObjects(obj.englishWords, x, y + 60);
        }
        if (obj.spanishWords && obj.spanishWords.length > 0) {
            this.repositionWordObjects(obj.spanishWords, x, y + 90);
        }
        
        // Update legacy label positions (for backward compatibility)
        if (obj.englishLabel) {
            obj.englishLabel.setPosition(x, y + 60);
        }
        if (obj.spanishLabel) {
            obj.spanishLabel.setPosition(x, y + 90);
        }
        
        // Update Kaktovik numeral position
        if (obj.kaktovikNumeral) {
            obj.kaktovikNumeral.setPosition(x, y - 60);
        }
        
        // Update binary hearts position
        if (obj.binaryHearts) {
            obj.binaryHearts.setPosition(x, y - 30);
        }
        
        // Update Cistercian numeral position (currently disabled)
        if (obj.cistercianNumeral) {
            obj.cistercianNumeral.setPosition(x, y - 80);
        }
    }

    repositionWordObjects(wordObjects, centerX, y) {
        if (!wordObjects || wordObjects.length === 0) return;
        
        // Calculate total width of all words
        let totalWidth = 0;
        wordObjects.forEach((wordObj, index) => {
            totalWidth += wordObj.width;
            if (index < wordObjects.length - 1) {
                // Add space width between words
                totalWidth += wordObj.style.fontSize ? parseInt(wordObj.style.fontSize) * 0.3 : 8;
            }
        });
        
        // Position words starting from the left edge of the centered group
        let currentX = centerX - (totalWidth / 2);
        
        wordObjects.forEach((wordObj, index) => {
            wordObj.setPosition(currentX, y);
            currentX += wordObj.width;
            
            // Add space after word (except for the last word)
            if (index < wordObjects.length - 1) {
                currentX += wordObj.style.fontSize ? parseInt(wordObj.style.fontSize) * 0.3 : 8;
            }
        });
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
        
        // Create Phaser text object with appropriate content and responsive sizing
        const displayText = this.getDisplayText(selectedItem, type);
        
        // Calculate responsive font size based on screen dimensions
        const baseSize = 64;
        const screenWidth = this.scale.width || window.innerWidth || 800;
        const screenHeight = this.scale.height || window.innerHeight || 600;
        const minDimension = Math.min(screenWidth, screenHeight);
        const scaleFactor = Math.max(0.4, Math.min(1.2, minDimension / 600));
        const fontSize = Math.floor(baseSize * scaleFactor);
        
        // Ensure objects stay within safe bounds to prevent clipping
        const safeMargin = fontSize * 0.8; // 80% of font size as margin
        const safeX = Math.max(safeMargin, Math.min(screenWidth - safeMargin, x));
        const safeY = Math.max(safeMargin + 60, Math.min(screenHeight - safeMargin - 120, y)); // Extra margin for labels
        
        const objectText = this.add.text(safeX, safeY, displayText, {
            fontSize: `${fontSize}px`,
            align: 'center',
            fill: selectedItem.color || '#ffffff'
        }).setOrigin(0.5);
        
        // Update object position to match safe position
        obj.x = safeX;
        obj.y = safeY;
        
        obj.sprite = objectText;
        
        // Add Kaktovik numeral above numbers as per design specification (using safe position)
        if (type === 'number') {
            const numberValue = parseInt(selectedItem.symbol);
            if (numberValue >= 0) {
                const kaktovikText = this.renderKaktovikNumeral(numberValue, safeX, safeY - (fontSize * 0.9));
                obj.kaktovikNumeral = kaktovikText;
            }
        }

        // Add binary hearts above Kaktovik numerals (above numbers, using safe position)
        if (type === 'number') {
            const numberValue = parseInt(selectedItem.symbol);
            if (numberValue >= 0) {
                const binaryHeartsText = this.renderBinaryHearts(numberValue, safeX, safeY - (fontSize * 0.5));
                obj.binaryHearts = binaryHeartsText;
            }
        }
        
        // Cistercian numerals temporarily disabled (buggy, on hold)
        // if (type === 'number') {
        //     const numberValue = parseInt(selectedItem.symbol);
        //     if (numberValue >= 1 && numberValue <= 9999) {
        //         const cistercianGraphics = this.renderCistercianNumeral(numberValue, x, y - 80);
        //         obj.cistercianNumeral = cistercianGraphics;
        //     }
        // }
        
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
        
        // Trigger word highlighting animation
        if (this.currentSpeakingObject) {
            const obj = this.currentSpeakingObject;
            let wordObjects = null;
            
            // Get the appropriate word objects based on language
            if (index === 0 && obj.englishWords) {
                wordObjects = obj.englishWords;
            } else if (index === 1 && obj.spanishWords) {
                wordObjects = obj.spanishWords;
            }
            
            // Estimate speech duration and animate words
            if (wordObjects && wordObjects.length > 0) {
                const estimatedDuration = (texts[index].length * 100) + 500; // Rough estimate
                this.animateWordsSequentially(wordObjects, estimatedDuration);
            }
        }
        
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
        
        // Text style for labels with responsive sizing
        const screenWidth = this.scale.width || window.innerWidth || 800;
        const screenHeight = this.scale.height || window.innerHeight || 600;
        const minDimension = Math.min(screenWidth, screenHeight);
        const scaleFactor = Math.max(0.4, Math.min(1.2, minDimension / 600));
        const labelFontSize = Math.floor(24 * scaleFactor);
        
        const labelStyle = {
            fontSize: `${labelFontSize}px`,
            fill: '#ffffff',
            fontFamily: 'Arial',
            align: 'center',
            stroke: '#000000',
            strokeThickness: Math.max(1, Math.floor(2 * scaleFactor))
        };
        
        // Create individual word objects for English text with responsive positioning
        const labelOffset = Math.floor(60 * scaleFactor);
        const englishWords = this.createWordObjects(data.en, x, y + labelOffset, labelStyle);
        
        // Create individual word objects for Spanish text with responsive positioning
        const spanishWords = this.createWordObjects(data.es, x, y + labelOffset + Math.floor(30 * scaleFactor), labelStyle);
        
        // Store references to word objects for cleanup and animation
        obj.englishWords = englishWords;
        obj.spanishWords = spanishWords;
        
        // Keep legacy single text references for compatibility
        obj.englishLabel = englishWords.length > 0 ? englishWords[0] : null;
        obj.spanishLabel = spanishWords.length > 0 ? spanishWords[0] : null;
        
        return {
            englishWords: englishWords,
            spanishWords: spanishWords,
            english: obj.englishLabel,
            spanish: obj.spanishLabel
        };
    }

    initKeyboardInput() {
        // Initialize empty keyPositions - will be populated when first accessed
        this.keyPositions = {};
        this.ensureKeyPositions();
        
        // Set up keyboard event listeners
        this.input.keyboard.on('keydown', this.onKeyDown, this);
        this.input.keyboard.on('keyup', this.onKeyUp, this);
        
        // Set up individual key objects for the entire keyboard
        const allKeys = [
            // Letters
            'Q','W','E','R','T','Y','U','I','O','P',
            'A','S','D','F','G','H','J','K','L',
            'Z','X','C','V','B','N','M',
            // Numbers
            'ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT','NINE','ZERO',
            // Function keys
            'F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12',
            // Special keys
            'SPACE','ENTER','BACKSPACE','TAB','SHIFT','CTRL','ALT',
            // Arrows
            'UP','DOWN','LEFT','RIGHT',
            // Punctuation
            'MINUS','PLUS','OPEN_BRACKET','CLOSED_BRACKET','BACKSLASH',
            'SEMICOLON','QUOTES','COMMA','PERIOD','FORWARD_SLASH','BACKTICK'
        ];
        this.keys = this.input.keyboard.addKeys(allKeys.join(','));
        
        // Ensure the game canvas can receive keyboard events
        this.input.keyboard.enabled = true;
    }
    
    ensureKeyPositions() {
        // Always recreate key positions to ensure they're current
        const width = this.scale.width || window.innerWidth || 800;
        const height = this.scale.height || window.innerHeight || 600;
        
        console.log('Setting up key positions with dimensions:', width, 'x', height);
        
        // Create a comprehensive mapping for the entire keyboard
        this.keyPositions = {};
        
        // Number row (0-9)
        const numberKeys = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0'];
        numberKeys.forEach((key, index) => {
            this.keyPositions[key] = { x: (width * 0.1) + (index * width * 0.08), y: height * 0.1 };
        });
        
        // Top row (QWERTYUIOP)
        const topRowKeys = ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP'];
        topRowKeys.forEach((key, index) => {
            this.keyPositions[key] = { x: (width * 0.1) + (index * width * 0.08), y: height * 0.25 };
        });
        
        // Middle row (ASDFGHJKL)
        const middleRowKeys = ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL'];
        middleRowKeys.forEach((key, index) => {
            this.keyPositions[key] = { x: (width * 0.14) + (index * width * 0.08), y: height * 0.4 };
        });
        
        // Bottom row (ZXCVBNM)
        const bottomRowKeys = ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM'];
        bottomRowKeys.forEach((key, index) => {
            this.keyPositions[key] = { x: (width * 0.18) + (index * width * 0.08), y: height * 0.55 };
        });
        
        // Special keys
        this.keyPositions['Space'] = { x: width * 0.5, y: height * 0.7 };
        this.keyPositions['Enter'] = { x: width * 0.85, y: height * 0.4 };
        this.keyPositions['Backspace'] = { x: width * 0.9, y: height * 0.1 };
        this.keyPositions['Tab'] = { x: width * 0.05, y: height * 0.25 };
        this.keyPositions['ShiftLeft'] = { x: width * 0.05, y: height * 0.55 };
        this.keyPositions['ShiftRight'] = { x: width * 0.9, y: height * 0.55 };
        this.keyPositions['ControlLeft'] = { x: width * 0.05, y: height * 0.7 };
        this.keyPositions['ControlRight'] = { x: width * 0.9, y: height * 0.7 };
        this.keyPositions['AltLeft'] = { x: width * 0.15, y: height * 0.7 };
        this.keyPositions['AltRight'] = { x: width * 0.8, y: height * 0.7 };
        
        // Punctuation and symbols
        this.keyPositions['Minus'] = { x: width * 0.82, y: height * 0.1 };
        this.keyPositions['Equal'] = { x: width * 0.86, y: height * 0.1 };
        this.keyPositions['BracketLeft'] = { x: width * 0.82, y: height * 0.25 };
        this.keyPositions['BracketRight'] = { x: width * 0.86, y: height * 0.25 };
        this.keyPositions['Backslash'] = { x: width * 0.9, y: height * 0.25 };
        this.keyPositions['Semicolon'] = { x: width * 0.78, y: height * 0.4 };
        this.keyPositions['Quote'] = { x: width * 0.82, y: height * 0.4 };
        this.keyPositions['Comma'] = { x: width * 0.74, y: height * 0.55 };
        this.keyPositions['Period'] = { x: width * 0.78, y: height * 0.55 };
        this.keyPositions['Slash'] = { x: width * 0.82, y: height * 0.55 };
        this.keyPositions['Backquote'] = { x: width * 0.05, y: height * 0.1 };
        
        // Arrow keys
        this.keyPositions['ArrowUp'] = { x: width * 0.85, y: height * 0.8 };
        this.keyPositions['ArrowDown'] = { x: width * 0.85, y: height * 0.85 };
        this.keyPositions['ArrowLeft'] = { x: width * 0.8, y: height * 0.85 };
        this.keyPositions['ArrowRight'] = { x: width * 0.9, y: height * 0.85 };
        
        // Function keys (F1-F12) - spread across top
        for (let i = 1; i <= 12; i++) {
            this.keyPositions[`F${i}`] = { x: (width * 0.05) + ((i-1) * width * 0.075), y: height * 0.03 };
        }
        
        // Detect and map numpad if available
        if (this.hasNumpad()) {
            this.addNumpadMapping(width, height);
        }
        
        console.log('Key positions created for', Object.keys(this.keyPositions).length, 'keys');
        console.log('All key codes:', Object.keys(this.keyPositions));
    }
    
    hasNumpad() {
        // Simple heuristic: if screen is wide enough, assume numpad might be present
        const width = this.scale.width || window.innerWidth || 800;
        return width > 1200; // Assume numpad on wider screens
    }
    
    addNumpadMapping(width, height) {
        // Numpad layout (right side of screen)
        const numpadKeys = [
            'Numpad7', 'Numpad8', 'Numpad9',
            'Numpad4', 'Numpad5', 'Numpad6', 
            'Numpad1', 'Numpad2', 'Numpad3',
            'Numpad0'
        ];
        
        // 3x3 grid for numpad 1-9
        for (let i = 0; i < 9; i++) {
            const row = Math.floor(i / 3);
            const col = i % 3;
            this.keyPositions[numpadKeys[i]] = {
                x: width * 0.92 + (col * width * 0.025),
                y: height * 0.25 + (row * height * 0.08)
            };
        }
        
        // Numpad 0 (wider, bottom row)
        this.keyPositions['Numpad0'] = { x: width * 0.93, y: height * 0.49 };
        
        // Numpad operators
        this.keyPositions['NumpadAdd'] = { x: width * 0.985, y: height * 0.33 };
        this.keyPositions['NumpadSubtract'] = { x: width * 0.985, y: height * 0.25 };
        this.keyPositions['NumpadMultiply'] = { x: width * 0.985, y: height * 0.17 };
        this.keyPositions['NumpadDivide'] = { x: width * 0.985, y: height * 0.09 };
        this.keyPositions['NumpadEnter'] = { x: width * 0.985, y: height * 0.45 };
        this.keyPositions['NumpadDecimal'] = { x: width * 0.97, y: height * 0.49 };
        
        console.log('Numpad mapping added');
    }
    
    onKeyDown(event) {
        // Handle both event.code (from Phaser) and event.keyCode/key
        let keyCode = event.code || event.key;
        console.log('Key down:', keyCode, 'Event:', event);
        
        const position = this.getKeyPosition(keyCode);
        if (!position) {
            console.log('No position found for key:', keyCode);
            return;
        }
        
        // Add key to held keys set
        const wasEmpty = this.heldKeys.size === 0;
        this.heldKeys.add(keyCode);
        
        if (wasEmpty) {
            // First key pressed - create or identify keyboard object
            if (!this.isSpeaking) {
                // Spawn new object only if not speaking
                const obj = this.spawnObjectAt(position.x, position.y, 'random');
                this.displayTextLabels(obj);
                this.speakObjectLabel(obj, 'both');
                this.generateTone(position.x, position.y, obj.id);
                this.createSpawnBurst(position.x, position.y);
                this.keyboardObject = obj;
            } else if (this.currentSpeakingObject) {
                // Use the currently speaking object as keyboard object
                this.keyboardObject = this.currentSpeakingObject;
            }
        }
        
        // Update object position based on interpolated key positions
        this.updateKeyboardObjectPosition();
    }
    
    onKeyUp(event) {
        // Handle both event.code (from Phaser) and event.keyCode/key
        let keyCode = event.code || event.key;
        
        // Remove key from held keys set
        this.heldKeys.delete(keyCode);
        
        if (this.heldKeys.size === 0) {
            // No more keys held - clear keyboard object
            this.keyboardObject = null;
        } else {
            // Update position based on remaining held keys
            this.updateKeyboardObjectPosition();
        }
    }
    
    updateKeyboardObjectPosition() {
        if (!this.keyboardObject || this.heldKeys.size === 0) return;
        
        // Calculate interpolated position from all held keys
        const interpolatedPosition = this.getInterpolatedKeyPosition();
        if (interpolatedPosition) {
            this.moveObjectTo(this.keyboardObject, interpolatedPosition.x, interpolatedPosition.y, true);
            this.updateTonePosition(interpolatedPosition.x, interpolatedPosition.y, this.keyboardObject.id);
        }
    }
    
    getInterpolatedKeyPosition() {
        if (this.heldKeys.size === 0) return null;
        
        let totalX = 0;
        let totalY = 0;
        let validKeys = 0;
        
        // Sum all positions from held keys
        for (const keyCode of this.heldKeys) {
            const position = this.getKeyPosition(keyCode);
            if (position) {
                totalX += position.x;
                totalY += position.y;
                validKeys++;
            }
        }
        
        if (validKeys === 0) return null;
        
        // Return average position
        return {
            x: totalX / validKeys,
            y: totalY / validKeys
        };
    }
    
    getKeyPosition(keyCode) {
        this.ensureKeyPositions();
        console.log('Available key positions:', Object.keys(this.keyPositions));
        console.log('Looking for keyCode:', keyCode);
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
        // For backward compatibility, start a continuous tone
        this.startContinuousTone(x, y, objId);
    }

    startContinuousTone(x, y, objId) {
        if (!this.audioContext) return null;

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
            this.updateTonePosition(this.currentGamepadPosition.x, this.currentGamepadPosition.y, this.currentSpeakingObject.id);
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

    renderCistercianNumeral(number, x, y) {
        // Create a graphics object for drawing the Cistercian numeral
        const graphics = this.add.graphics();
        graphics.lineStyle(3, 0xffffff); // White lines, 3px thick
        
        // Draw the central vertical line (always present)
        const centerX = x;
        const centerY = y;
        const height = 60; // Total height of the numeral
        const extension = height * 0.15; // Extend line by 15% on each end
        
        graphics.lineBetween(centerX, centerY - height/2 - extension, centerX, centerY + height/2 + extension);
        
        // Parse the number into components
        const units = number % 10;
        const tens = Math.floor((number % 100) / 10);
        const hundreds = Math.floor((number % 1000) / 100);
        const thousands = Math.floor(number / 1000);
        
        // Draw each component
        if (units > 0) this.drawCistercianDigit(graphics, units, centerX, centerY, 'units');
        if (tens > 0) this.drawCistercianDigit(graphics, tens, centerX, centerY, 'tens');
        if (hundreds > 0) this.drawCistercianDigit(graphics, hundreds, centerX, centerY, 'hundreds');
        if (thousands > 0) this.drawCistercianDigit(graphics, thousands, centerX, centerY, 'thousands');
        
        return graphics;
    }
    
    drawCistercianDigit(graphics, digit, centerX, centerY, position) {
        const halfHeight = 30;
        const lineLength = 20;
        
        // Determine position offsets
        let xOffset, yOffset;
        switch(position) {
            case 'units':    // Upper right
                xOffset = 1; yOffset = -1; break;
            case 'tens':     // Upper left  
                xOffset = -1; yOffset = -1; break;
            case 'hundreds': // Lower right
                xOffset = 1; yOffset = 1; break;
            case 'thousands': // Lower left
                xOffset = -1; yOffset = 1; break;
        }
        
        const baseX = centerX + (xOffset * 0);
        const baseY = centerY + (yOffset * halfHeight / 2);
        
        // Draw the digit pattern based on traditional Cistercian numerals
        switch(digit) {
            case 1: // Horizontal line
                graphics.lineBetween(baseX, baseY, baseX + (xOffset * lineLength), baseY);
                break;
            case 2: // Angled down line
                graphics.lineBetween(baseX, baseY, baseX + (xOffset * lineLength), baseY + (yOffset * 8));
                break;
            case 3: // Angled up line
                graphics.lineBetween(baseX, baseY, baseX + (xOffset * lineLength), baseY - (yOffset * 8));
                break;
            case 4: // Vertical line
                graphics.lineBetween(baseX, baseY, baseX, baseY + (yOffset * lineLength));
                break;
            case 5: // Diagonal to corner
                graphics.lineBetween(baseX, baseY, baseX + (xOffset * lineLength), baseY + (yOffset * halfHeight));
                break;
            case 6: // Diagonal + horizontal
                graphics.lineBetween(baseX, baseY, baseX + (xOffset * lineLength), baseY + (yOffset * halfHeight));
                graphics.lineBetween(baseX, baseY, baseX + (xOffset * lineLength), baseY);
                break;
            case 7: // Diagonal + angled down
                graphics.lineBetween(baseX, baseY, baseX + (xOffset * lineLength), baseY + (yOffset * halfHeight));
                graphics.lineBetween(baseX, baseY, baseX + (xOffset * lineLength), baseY + (yOffset * 8));
                break;
            case 8: // Diagonal + angled up
                graphics.lineBetween(baseX, baseY, baseX + (xOffset * lineLength), baseY + (yOffset * halfHeight));
                graphics.lineBetween(baseX, baseY, baseX + (xOffset * lineLength), baseY - (yOffset * 8));
                break;
            case 9: // Diagonal + vertical
                graphics.lineBetween(baseX, baseY, baseX + (xOffset * lineLength), baseY + (yOffset * halfHeight));
                graphics.lineBetween(baseX, baseY, baseX, baseY + (yOffset * lineLength));
                break;
        }
    }

    renderKaktovikNumeral(number, x, y) {
        if (number < 0) return null;
        
        // Convert number to base-20 representation
        const base20Digits = this.convertToBase20(number);
        
        // Create Unicode string for Kaktovik numerals
        let kaktovikString = '';
        for (const digit of base20Digits) {
            // Kaktovik Unicode range: U+1D2C0 (0) to U+1D2D3 (19)
            const unicodeCodePoint = 0x1D2C0 + digit;
            kaktovikString += String.fromCodePoint(unicodeCodePoint);
        }
        
        // Create text object with Kaktovik font and responsive sizing
        const screenWidth = this.scale.width || window.innerWidth || 800;
        const screenHeight = this.scale.height || window.innerHeight || 600;
        const minDimension = Math.min(screenWidth, screenHeight);
        const scaleFactor = Math.max(0.4, Math.min(1.2, minDimension / 600));
        const fontSize = Math.floor(32 * scaleFactor);
        
        const textObj = this.add.text(x, y, kaktovikString, {
            fontSize: `${fontSize}px`,
            fontFamily: 'Kaktovik, monospace',
            fill: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
        
        return textObj;
    }
    
    convertToBase20(number) {
        if (number === 0) return [0];
        
        const digits = [];
        let remaining = number;
        
        while (remaining > 0) {
            digits.unshift(remaining % 20);
            remaining = Math.floor(remaining / 20);
        }
        
        return digits;
    }

    renderBinaryHearts(number, x, y) {
        if (number < 0) return null;
        
        // Convert number to binary string
        const binaryString = this.convertToBinary(number);
        
        // Convert binary to hearts: 1 = ❤️, 0 = 🤍
        let heartString = '';
        for (const bit of binaryString) {
            heartString += bit === '1' ? '❤️' : '🤍';
        }
        
        // Create text object with heart emojis and responsive sizing
        const screenWidth = this.scale.width || window.innerWidth || 800;
        const screenHeight = this.scale.height || window.innerHeight || 600;
        const minDimension = Math.min(screenWidth, screenHeight);
        const scaleFactor = Math.max(0.4, Math.min(1.2, minDimension / 600));
        const fontSize = Math.floor(16 * scaleFactor);
        
        const textObj = this.add.text(x, y, heartString, {
            fontSize: `${fontSize}px`,
            fontFamily: 'Arial, sans-serif',
            fill: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
        
        return textObj;
    }

    convertToBinary(number) {
        if (number === 0) return '0';
        return number.toString(2);
    }

    highlightWord(textObject, wordIndex, totalWords) {
        if (!textObject || wordIndex < 0) return;
        
        // Create highlight animation with tint and scale
        const highlightTween = this.tweens.add({
            targets: textObject,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 300,
            ease: 'Back.easeOut',
            yoyo: true,
            onStart: () => {
                textObject.setTint(0xffff00); // Yellow highlight
            },
            onComplete: () => {
                textObject.setTint(0xffffff); // Back to white
            }
        });
        
        return highlightTween;
    }

    animateWordsSequentially(textObjects, speechDuration) {
        if (!textObjects || textObjects.length === 0) return [];
        
        const animations = [];
        const wordDuration = speechDuration / textObjects.length;
        
        textObjects.forEach((textObj, index) => {
            const delay = index * wordDuration;
            
            // Set up delayed highlighting
            setTimeout(() => {
                this.highlightWord(textObj, index, textObjects.length);
            }, delay);
            
            animations.push({
                delay: delay,
                wordIndex: index,
                textObject: textObj
            });
        });
        
        return animations;
    }

    createWordObjects(text, x, y, labelStyle) {
        if (!text || text.trim() === '') return [];
        
        const words = text.split(' ');
        const wordObjects = [];
        
        // Calculate total text width to center the word group
        const tempText = this.add.text(0, 0, text, labelStyle);
        const totalWidth = tempText.width;
        tempText.destroy();
        
        let currentX = x - (totalWidth / 2);
        
        words.forEach((word, index) => {
            // Create individual word text object
            const wordText = this.add.text(currentX, y, word, labelStyle)
                .setOrigin(0, 0.5);
            
            wordObjects.push(wordText);
            
            // Move X position for next word (including space)
            currentX += wordText.width + (labelStyle.fontSize ? parseInt(labelStyle.fontSize) * 0.3 : 8);
        });
        
        return wordObjects;
    }

    preloadKaktovikFont() {
        // Try to use the Font Loading API if available
        if (document.fonts && document.fonts.load) {
            document.fonts.load('32px Kaktovik').then(() => {
                console.log('Kaktovik font loaded via Font Loading API');
            }).catch(() => {
                console.log('Font Loading API failed, using fallback method');
            });
        }
        
        // Fallback: Create invisible text objects with various Kaktovik characters to trigger font loading
        const kaktovikSamples = [
            String.fromCodePoint(0x1D2C0), // 0
            String.fromCodePoint(0x1D2C1), // 1
            String.fromCodePoint(0x1D2C5), // 5
            String.fromCodePoint(0x1D2CA), // 10
            String.fromCodePoint(0x1D2D3)  // 19
        ];
        
        const preloadTexts = [];
        
        for (const sample of kaktovikSamples) {
            const preloadText = this.add.text(-1000, -1000, sample, {
                fontSize: '32px',
                fontFamily: 'Kaktovik, monospace',
                fill: '#ffffff',
                alpha: 0 // Make completely invisible
            });
            preloadTexts.push(preloadText);
        }
        
        // Clean up preload texts after a short delay
        setTimeout(() => {
            for (const text of preloadTexts) {
                if (text && text.destroy) {
                    text.destroy();
                }
            }
        }, 100);
        
        console.log('Kaktovik font preloaded with sample characters');
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
                autoCenter: Phaser.Scale.CENTER_BOTH,
                min: {
                    width: 320,
                    height: 240
                },
                max: {
                    width: 1920,
                    height: 1080
                },
                zoom: 1
            },
            physics: {
                default: 'arcade',
                arcade: {
                    gravity: { y: 0 },
                    debug: false
                }
            }
        };
        
        this.game = new Phaser.Game(this.config);
        
        // Add window resize handler for responsive scaling
        window.addEventListener('resize', () => {
            this.handleResize();
        });
        
        // Handle orientation changes for mobile
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.handleResize();
            }, 100);
        });
    }
    
    handleResize() {
        const canvas = this.game.canvas;
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        // Calculate scale factor for responsive design
        const baseWidth = 800;
        const baseHeight = 600;
        const scaleX = width / baseWidth;
        const scaleY = height / baseHeight;
        const scale = Math.min(scaleX, scaleY);
        
        // Ensure minimum scale for mobile readability
        const minScale = 0.5;
        const finalScale = Math.max(scale, minScale);
        
        // Update game size
        this.game.scale.resize(width, height);
        
        // Update canvas styling for better mobile experience
        if (canvas) {
            canvas.style.width = width + 'px';
            canvas.style.height = height + 'px';
            canvas.style.display = 'block';
            canvas.style.margin = '0 auto';
        }
        
        console.log(`Resized to ${width}x${height}, scale: ${finalScale}`);
    }
}

