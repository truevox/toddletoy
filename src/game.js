import Phaser from 'phaser'
import { ConfigManager } from './config/ConfigManager.js'

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        // Create particle texture programmatically immediately
        this.load.once('complete', () => {
            this.createParticleTexture();
        });
    }
    
    createParticleTexture() {
        // Create a simple white circle texture for particles
        const graphics = this.add.graphics();
        graphics.fillStyle(0xffffff);
        graphics.fillCircle(8, 8, 8);
        graphics.generateTexture('particle', 16, 16);
        graphics.destroy();
        console.log('Particle texture created');
    }

    create() {
        // Version logging for troubleshooting  
        console.log('🎯 TODDLER TOY v2.1.2 - Layout Fix Complete - Build:', new Date().toISOString());
        
        // Initialize configuration manager
        this.configManager = new ConfigManager();
        
        // Create particle texture first
        this.createParticleTexture();
        
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
        
        // Initialize drag trail state
        this.dragTrails = new Map(); // Map of object IDs to trail emitters
        
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
        
        // Preload fonts by rendering invisible characters
        this.preloadKaktovikFont();
        this.preloadCistercianFont();
        
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
    
    async checkKeyboardInput() {
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
                        const obj = await this.spawnObjectAt(position.x, position.y, 'random');
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

    async onPointerDown(pointer) {
        this.pointerIsDown = true;
        
        // Check if we hit an existing object
        const hitObject = this.getObjectUnderPointer(pointer.x, pointer.y);
        
        if (hitObject && !this.isSpeaking) {
            // Revoice the object if nothing is currently speaking
            this.speakObjectLabel(hitObject, 'both');
            this.generateTone(pointer.x, pointer.y, hitObject.id);
            // Also start dragging the existing object
            this.isDragging = true;
            this.draggedObject = hitObject;
            this.startDragTrail(hitObject);
            this.startHoldTimer(hitObject);
        } else if (hitObject && this.isSpeaking) {
            // Currently speaking - just start dragging without revoicing
            this.isDragging = true;
            this.draggedObject = hitObject;
            this.startDragTrail(hitObject);
            this.startHoldTimer(hitObject);
        } else if (!this.isDragging && !this.isSpeaking) {
            // Spawn new object only if not currently dragging AND not speaking
            const obj = await this.spawnObjectAt(pointer.x, pointer.y, 'random');
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
            this.startDragTrail(this.currentSpeakingObject);
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
            this.updateDragTrail(this.draggedObject, pointer.x, pointer.y);
        } else if (this.isHolding && this.draggedObject) {
            // Smooth movement during auto-drag mode
            this.moveObjectTo(this.draggedObject, pointer.x, pointer.y, true);
            this.updateDragTrail(this.draggedObject, pointer.x, pointer.y);
        } else if (this.pointerIsDown && this.isSpeaking && this.currentSpeakingObject) {
            // Speaking object follows mouse when pointer is held down during speech
            this.moveObjectTo(this.currentSpeakingObject, pointer.x, pointer.y, true);
            this.updateTonePosition(pointer.x, pointer.y, this.currentSpeakingObject.id);
            this.updateDragTrail(this.currentSpeakingObject, pointer.x, pointer.y);
        }
    }
    
    onPointerUp(pointer) {
        this.pointerIsDown = false;
        
        // Clear hold timer and state
        this.clearHoldTimer();
        
        if (this.isDragging) {
            this.stopDragTrail(this.draggedObject);
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
        
        // CRITICAL: Save the target position BEFORE any modifications
        const targetX = x;
        const targetY = y;
        
        // Update object position
        obj.x = targetX;
        obj.y = targetY;
        
        // Update sprite position
        if (obj.sprite) {
            obj.sprite.setPosition(targetX, targetY);
        }
        
        // CRITICAL FIX: Use stored component layout instead of hardcoded offsets
        // This preserves the exact relative positioning from spawn time
        if (obj.componentLayout) {
            // Update English words using stored relative positions
            if (obj.englishWords && obj.componentLayout.englishWords) {
                obj.englishWords.forEach((wordObj, index) => {
                    const storedOffset = obj.componentLayout.englishWords[index];
                    if (storedOffset && wordObj) {
                        // Convert from center-based offset to left-edge position
                        const newWordCenterX = targetX + storedOffset.offsetX;
                        const newWordLeftX = newWordCenterX - (wordObj.width / 2);
                        const newWordY = targetY + storedOffset.offsetY;
                        wordObj.setPosition(newWordLeftX, newWordY);
                    }
                });
            }
            
            // Update Spanish words using stored relative positions
            if (obj.spanishWords && obj.componentLayout.spanishWords) {
                obj.spanishWords.forEach((wordObj, index) => {
                    const storedOffset = obj.componentLayout.spanishWords[index];
                    if (storedOffset && wordObj) {
                        // Convert from center-based offset to left-edge position
                        const newWordCenterX = targetX + storedOffset.offsetX;
                        const newWordLeftX = newWordCenterX - (wordObj.width / 2);
                        const newWordY = targetY + storedOffset.offsetY;
                        wordObj.setPosition(newWordLeftX, newWordY);
                    }
                });
            }
            
            // Update Kaktovik numeral using stored relative position
            if (obj.kaktovikNumeral && obj.componentLayout.kaktovikNumeral) {
                const offset = obj.componentLayout.kaktovikNumeral;
                obj.kaktovikNumeral.setPosition(targetX + offset.offsetX, targetY + offset.offsetY);
            }
            
            // Update binary hearts using stored relative position
            if (obj.binaryHearts && obj.componentLayout.binaryHearts) {
                const offset = obj.componentLayout.binaryHearts;
                obj.binaryHearts.setPosition(targetX + offset.offsetX, targetY + offset.offsetY);
            }
            
            // Update Cistercian numeral using stored relative position
            if (obj.cistercianNumeral && obj.componentLayout.cistercianNumeral) {
                const offset = obj.componentLayout.cistercianNumeral;
                obj.cistercianNumeral.setPosition(targetX + offset.offsetX, targetY + offset.offsetY);
            }
        } else {
            // FALLBACK: Use old hardcoded method if no component layout stored
            // This ensures backward compatibility with objects created before the fix
            if (obj.englishWords && obj.englishWords.length > 0) {
                this.repositionWordObjects(obj.englishWords, targetX, targetY + 60);
            }
            if (obj.spanishWords && obj.spanishWords.length > 0) {
                this.repositionWordObjects(obj.spanishWords, targetX, targetY + 90);
            }
            
            if (obj.kaktovikNumeral) {
                // Use new improved positioning: original was targetY - 60, now 4 pixels higher
                obj.kaktovikNumeral.setPosition(targetX, targetY - 64);
            }
            
            if (obj.binaryHearts) {
                obj.binaryHearts.setPosition(targetX, targetY - 30);
            }
            
            if (obj.cistercianNumeral) {
                // Use new improved positioning: 100 pixels higher (was 80, now 100)
                obj.cistercianNumeral.setPosition(targetX, targetY - 100);
            }
        }
        
        // Update legacy label positions (for backward compatibility)
        // DISABLED: Skip legacy positioning when componentLayout exists to prevent conflicts
        if (!obj.componentLayout) {
            if (obj.englishLabel) {
                obj.englishLabel.setPosition(targetX, targetY + 60);
            }
            if (obj.spanishLabel) {
                obj.spanishLabel.setPosition(targetX, targetY + 90);
            }
        }
        
    }

    repositionWordObjects(wordObjects, centerX, y) {
        if (!wordObjects || wordObjects.length === 0) return;
        
        // Always recalculate spacing from scratch to ensure proper positioning
        // This prevents any corruption from offset-based positioning
        const layoutInfo = wordObjects._layoutInfo;
        const spaceWidth = layoutInfo?.spaceWidth || 8;
        let totalWidth = 0;
        
        // Calculate total width needed
        wordObjects.forEach((wordObj, index) => {
            totalWidth += wordObj.width;
            if (index < wordObjects.length - 1) {
                totalWidth += spaceWidth;
            }
        });
        
        // Position words starting from the left edge of the centered group
        let currentX = centerX - (totalWidth / 2);
        
        wordObjects.forEach((wordObj, index) => {
            wordObj.setPosition(currentX, y);
            currentX += wordObj.width + (index < wordObjects.length - 1 ? spaceWidth : 0);
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

    async spawnObjectAt(x, y, type = 'random') {
        let selectedItem;
        
        if (type === 'random') {
            // Use configuration-based weighted selection
            type = this.selectSpawnType();
        }
        
        if (type === 'emoji') {
            selectedItem = await this.getRandomEmoji();
        } else if (type === 'shape') {
            selectedItem = this.getRandomShape();
        } else if (type === 'letter') {
            selectedItem = this.getRandomLetter();
        } else if (type === 'number') {
            selectedItem = this.getRandomNumber();
        } else {
            // Fallback to emoji
            selectedItem = await this.getRandomEmoji();
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
        // Positioning improved: moved 4 pixels higher for better visual alignment
        if (type === 'number') {
            const numberValue = parseInt(selectedItem.symbol);
            if (numberValue >= 0) {
                const kaktovikText = this.renderKaktovikNumeral(numberValue, safeX, safeY - (fontSize * 0.9) - 4);
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
        
        // CRITICAL: Store number display component layout for locked relative positioning
        // This prevents misalignment when number objects are moved after spawn
        if (type === 'number') {
            if (!obj.componentLayout) {
                obj.componentLayout = {};
            }
            
            // Store Kaktovik numeral relative position if it exists
            if (obj.kaktovikNumeral) {
                obj.componentLayout.kaktovikNumeral = {
                    offsetX: obj.kaktovikNumeral.x - safeX,
                    offsetY: obj.kaktovikNumeral.y - safeY
                };
            }
            
            // Store binary hearts relative position if it exists
            if (obj.binaryHearts) {
                obj.componentLayout.binaryHearts = {
                    offsetX: obj.binaryHearts.x - safeX,
                    offsetY: obj.binaryHearts.y - safeY
                };
            }
            
        }

        // Cistercian numerals using font-based rendering
        // Positioning improved: moved 20 pixels higher for better visual alignment
        if (type === 'number') {
            const numberValue = parseInt(selectedItem.symbol);
            if (numberValue >= 0 && numberValue <= 9999) {
                const cistercianText = this.renderCistercianNumeral(numberValue, safeX, safeY - 100);
                obj.cistercianNumeral = cistercianText;
                
                // Store Cistercian numeral in component layout for this object
                if (!obj.componentLayout) {
                    obj.componentLayout = {};
                }
                obj.componentLayout.cistercianNumeral = {
                    offsetX: obj.cistercianNumeral.x - safeX,
                    offsetY: obj.cistercianNumeral.y - safeY
                };
            }
        }
        
        // CRITICAL: Create text labels and store componentLayout at spawn position
        // This must happen before any movement to ensure correct relative positioning
        console.log(`About to call displayTextLabels for object at spawn position (${x}, ${y})`);
        this.displayTextLabels(obj);
        console.log(`ComponentLayout stored:`, obj.componentLayout);
        
        return obj;
    }

    /**
     * Select object type based on configuration weights
     * Returns: 'emoji', 'shape', 'letter', or 'number'
     */
    selectSpawnType() {
        const contentWeights = this.configManager.getContentWeights();
        
        // Build weighted selection array
        const weightedTypes = [];
        contentWeights.forEach(item => {
            // Add type to array based on its probability (0-1)
            const count = Math.floor(item.probability * 1000); // Scale to integer for selection
            for (let i = 0; i < count; i++) {
                weightedTypes.push(item.type);
            }
        });
        
        // Fallback if no weights configured
        if (weightedTypes.length === 0) {
            const fallbackTypes = ['emoji', 'shape', 'letter', 'number'];
            return fallbackTypes[Math.floor(Math.random() * fallbackTypes.length)];
        }
        
        // Select weighted random type
        const randomIndex = Math.floor(Math.random() * weightedTypes.length);
        return weightedTypes[randomIndex];
    }

    async getRandomEmoji() {
        // Load filtered emojis based on configuration
        try {
            const response = await fetch('/emojis.json');
            const emojiData = await response.json();
            
            // Filter emojis based on enabled categories
            const config = this.configManager.getConfig();
            const enabledCategories = Object.keys(config.emojiCategories)
                .filter(category => config.emojiCategories[category].enabled);
            
            const filteredEmojis = emojiData.filter(emoji => {
                // Include emoji if it has at least one enabled category
                return emoji.categories && emoji.categories.some(cat => enabledCategories.includes(cat));
            });
            
            // Fallback to all emojis if none match filters
            const availableEmojis = filteredEmojis.length > 0 ? filteredEmojis : emojiData;
            
            // Select weighted random emoji based on category weights
            if (availableEmojis.length === 0) {
                // Ultimate fallback
                return {"emoji":"🐶","en":"Dog","es":"Perro","type":"emoji"};
            }
            
            // For now, simple random selection (can be enhanced with category weighting later)
            return availableEmojis[Math.floor(Math.random() * availableEmojis.length)];
            
        } catch (error) {
            console.warn('Failed to load emojis.json, using fallback:', error);
            return {"emoji":"🐶","en":"Dog","es":"Perro","type":"emoji"};
        }
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
            // Speech sequence complete - unlock the queue and cleanup sparkles
            if (this.currentSpeakingObject) {
                this.cleanupWordSparkles(this.currentSpeakingObject);
            }
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
        
        // CRITICAL: Store component layout for locked relative positioning
        // This prevents word overlap when objects are moved after spawn
        if (!obj.componentLayout) {
            obj.componentLayout = {};
        }
        
        // Store English words relative positions FROM WORD CENTER, not left edge
        obj.componentLayout.englishWords = englishWords.map((wordObj, index) => {
            // Calculate offset from word center to object center
            const wordCenterX = wordObj.x + (wordObj.width / 2);
            const offsetX = wordCenterX - x;
            const offsetY = wordObj.y - y;
            return { offsetX, offsetY };
        });
        
        // Store Spanish words relative positions FROM WORD CENTER, not left edge
        obj.componentLayout.spanishWords = spanishWords.map((wordObj, index) => {
            // Calculate offset from word center to object center
            const wordCenterX = wordObj.x + (wordObj.width / 2);
            const offsetX = wordCenterX - x;
            const offsetY = wordObj.y - y;
            return { offsetX, offsetY };
        });
        
        
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
    
    async onKeyDown(event) {
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
                const obj = await this.spawnObjectAt(position.x, position.y, 'random');
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

    async onGamepadButtonDown(gamepad, buttonIndex) {
        if (!this.isSpeaking) {
            // Spawn object at current gamepad cursor position
            const obj = await this.spawnObjectAt(
                this.currentGamepadPosition.x, 
                this.currentGamepadPosition.y, 
                'random'
            );
            
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

    getCistercianKeyMapping(digit, position) {
        // Cistercian font uses different key sections for different positions
        // Position: 'units' (1-9,0), 'tens' (q-p), 'hundreds' (a-;), 'thousands' (z-/)
        // Based on keyboard layout in the font documentation
        
        if (position === 'units') {
            const mapping = { 1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 0: '0' };
            return mapping[digit] || '0';
        } else if (position === 'tens') {
            const mapping = { 1: 'q', 2: 'w', 3: 'e', 4: 'r', 5: 't', 6: 'y', 7: 'u', 8: 'i', 9: 'o', 0: 'p' };
            return mapping[digit] || 'p';
        } else if (position === 'hundreds') {
            const mapping = { 1: 'a', 2: 's', 3: 'd', 4: 'f', 5: 'g', 6: 'h', 7: 'j', 8: 'k', 9: 'l', 0: ';' };
            return mapping[digit] || ';';
        } else if (position === 'thousands') {
            const mapping = { 1: 'z', 2: 'x', 3: 'c', 4: 'v', 5: 'b', 6: 'n', 7: 'm', 8: ',', 9: '.', 0: '/' };
            return mapping[digit] || '/';
        }
        return '0';
    }
    
    renderCistercianNumeral(number, x, y) {
        // Font-based Cistercian numeral rendering using Cistercian QWERTY font
        // Cistercian numerals are base-1000 with compound glyph formation
        if (number === 0) {
            // For zero, just show the central vertical line character
            return this.add.text(x, y, '0', {
                fontSize: '32px',
                fontFamily: 'Cistercian, monospace',
                fill: '#ffffff',
                align: 'center'
            }).setOrigin(0.5, 0.5);
        }
        
        // Parse the number into components (supporting up to 9999)
        const units = number % 10;
        const tens = Math.floor((number % 100) / 10);
        const hundreds = Math.floor((number % 1000) / 100);
        const thousands = Math.floor(number / 1000);
        
        // Build the Cistercian compound glyph using position-aware character mapping
        // CRITICAL: Order must be units→tens→hundreds→thousands (least to most significant)
        // CRITICAL: Always start with units (from number row), omit zeros except for units
        let cistercianChars = '';
        
        // Always include units digit (from number row 0-9)
        cistercianChars += this.getCistercianKeyMapping(units, 'units');
        
        // Add tens, hundreds, thousands only if non-zero (omit zero positions)
        if (tens > 0) cistercianChars += this.getCistercianKeyMapping(tens, 'tens');
        if (hundreds > 0) cistercianChars += this.getCistercianKeyMapping(hundreds, 'hundreds');
        if (thousands > 0) cistercianChars += this.getCistercianKeyMapping(thousands, 'thousands');
        
        return this.add.text(x, y, cistercianChars, {
            fontSize: '32px',
            fontFamily: 'Cistercian, monospace',
            fill: '#ffffff',
            align: 'center'
        }).setOrigin(0.5, 0.5);
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

    createWordSparkleEffect(wordObj, duration = 1000) {
        if (!wordObj) return null;
        
        try {
            // Create sparkle particle emitter around the word
            const sparkleEmitter = this.add.particles(wordObj.x, wordObj.y, 'particle', {
                scale: { start: 0.8, end: 0.1 },
                speed: { min: 50, max: 100 },
                lifespan: duration * 0.8, // Sparkles last most of the word duration
                frequency: 30, // Emit every 30ms for continuous effect
                quantity: 2, // 2 particles per emission
                blendMode: 'ADD',
                tint: [0xFFD700, 0xFFFFAA, 0xFFF8DC, 0xFFFF00, 0xFFFACD], // Gold/yellow sparkle colors
                emitZone: {
                    type: 'edge',
                    source: new Phaser.Geom.Rectangle(
                        -wordObj.width/2 - 10, 
                        -wordObj.height/2 - 10, 
                        wordObj.width + 20, 
                        wordObj.height + 20
                    ),
                    quantity: 8 // 8 points around the word boundary
                }
            });
            
            // Position the emitter at the word location
            sparkleEmitter.setPosition(wordObj.x + wordObj.width/2, wordObj.y);
            
            // Start the effect
            sparkleEmitter.start();
            
            // Auto-cleanup after duration
            this.time.delayedCall(duration, () => {
                if (sparkleEmitter && sparkleEmitter.destroy) {
                    sparkleEmitter.destroy();
                }
            });
            
            return sparkleEmitter;
        } catch (error) {
            console.error('Error creating word sparkle effect:', error);
            return null;
        }
    }

    triggerWordSparkles(obj, wordIndex) {
        if (!obj || !obj.englishWords || !obj.englishWords[wordIndex]) {
            return false;
        }
        
        const wordObj = obj.englishWords[wordIndex];
        const sparkleEmitter = this.createWordSparkleEffect(wordObj);
        
        // Store the emitter for cleanup
        if (!obj.sparkleEmitters) {
            obj.sparkleEmitters = new Map();
        }
        obj.sparkleEmitters.set(wordIndex, sparkleEmitter);
        
        return sparkleEmitter !== null;
    }
    
    cleanupWordSparkles(obj) {
        if (!obj || !obj.sparkleEmitters) return;
        
        obj.sparkleEmitters.forEach((emitter, wordIndex) => {
            if (emitter && emitter.destroy) {
                emitter.destroy();
            }
        });
        obj.sparkleEmitters.clear();
    }

    highlightWord(textObject, wordIndex, totalWords) {
        if (!textObject || wordIndex < 0) return;
        
        // Create sparkle effects during highlighting
        if (this.currentSpeakingObject) {
            this.triggerWordSparkles(this.currentSpeakingObject, wordIndex);
        }
        
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
        
        // Create all word objects first to measure actual layout
        const spaceWidth = labelStyle.fontSize ? parseInt(labelStyle.fontSize) * 0.3 : 8;
        let totalActualWidth = 0;
        
        // Create word objects and calculate actual total width
        words.forEach((word, index) => {
            const wordText = this.add.text(0, y, word, labelStyle)
                .setOrigin(0, 0.5);
            wordObjects.push(wordText);
            
            totalActualWidth += wordText.width;
            if (index < words.length - 1) {
                totalActualWidth += spaceWidth;
            }
        });
        
        // Position words to be centered at x
        let currentX = x - (totalActualWidth / 2);
        
        wordObjects.forEach((wordObj, index) => {
            wordObj.setPosition(currentX, y);
            currentX += wordObj.width + (index < words.length - 1 ? spaceWidth : 0);
        });
        
        // Store layout metadata for spacing calculations
        if (wordObjects.length > 0) {
            wordObjects._layoutInfo = {
                originalText: text,
                totalWidth: totalActualWidth,
                spaceWidth: spaceWidth,
                style: { ...labelStyle }
            };
        }
        
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
    
    preloadCistercianFont() {
        // Try to use the Font Loading API if available
        if (document.fonts && document.fonts.load) {
            document.fonts.load('32px Cistercian').then(() => {
                console.log('Cistercian font loaded via Font Loading API');
            }).catch(() => {
                console.log('Cistercian Font Loading API failed, using fallback method');
            });
        }
        
        // Fallback: Create invisible text objects with sample Cistercian characters
        const cistercianSamples = ['1', '2', '5', '9', '0']; // Sample keyboard chars for font
        const preloadTexts = [];
        
        for (const sample of cistercianSamples) {
            const preloadText = this.add.text(-1000, -1000, sample, {
                fontSize: '32px',
                fontFamily: 'Cistercian, monospace',
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
        
        console.log('Cistercian font preloaded with sample characters');
    }

    // Drag Trail Visual Effects
    startDragTrail(object) {
        if (!object || this.dragTrails.has(object.id)) {
            // Reuse existing trail if available
            const existingTrail = this.dragTrails.get(object.id);
            if (existingTrail) {
                existingTrail.setPosition(object.x, object.y);
                existingTrail.start();
                object.trailActive = true;
                object.isBeingDragged = true;
                return;
            }
        }
        
        try {
            // Create trail particle emitter using the particle texture
            const trailEmitter = this.add.particles(0, 0, 'particle', {
                scale: { start: 0.3, end: 0 },
                speed: { min: 20, max: 40 },
                lifespan: 300,
                blendMode: 'ADD',
                tint: [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0xf7b731, 0x5f27cd]
            });
            
            trailEmitter.setPosition(object.x, object.y);
            trailEmitter.start();
            
            // Store trail emitter
            this.dragTrails.set(object.id, trailEmitter);
            object.trailEmitter = trailEmitter;
            object.trailActive = true;
            object.isBeingDragged = true;
        } catch (error) {
            console.warn('Error creating drag trail:', error);
            // Fallback to simple graphics trail
            this.createFallbackTrail(object);
        }
    }
    
    createFallbackTrail(object) {
        const graphics = this.add.graphics();
        graphics.fillStyle(0xff6b6b);
        graphics.fillCircle(object.x, object.y, 3);
        
        this.tweens.add({
            targets: graphics,
            alpha: 0,
            duration: 200,
            onComplete: () => graphics.destroy()
        });
    }
    
    updateDragTrail(object, x, y) {
        if (!object || !object.trailActive) return;
        
        const trailEmitter = this.dragTrails.get(object.id);
        if (trailEmitter) {
            trailEmitter.setPosition(x, y);
        }
    }
    
    stopDragTrail(object) {
        if (!object) return;
        
        const trailEmitter = this.dragTrails.get(object.id);
        if (trailEmitter && object.trailActive) {
            trailEmitter.stop();
            object.trailActive = false;
            object.isBeingDragged = false;
            
            // Schedule destruction after fade-out
            this.time.addEvent({
                delay: 500,
                callback: () => {
                    if (trailEmitter) {
                        trailEmitter.destroy();
                        this.dragTrails.delete(object.id);
                        object.trailEmitter = null;
                    }
                }
            });
        }
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

