import Phaser from 'phaser'
import { ConfigManager } from './config/ConfigManager.js'
import { PositioningSystem } from './positioning/PositioningSystem.js'
import { AudioManager } from './game/systems/AudioManager.js'
import { InputManager } from './game/systems/InputManager.js'
import { ParticleManager } from './game/systems/ParticleManager.js'
import { RenderManager } from './game/systems/RenderManager.js'
import { SpeechManager } from './game/systems/SpeechManager.js'
import { ObjectManager } from './game/objects/ObjectManager.js'
import { ObjectCountingRenderer } from './game/systems/ObjectCountingRenderer.js'
import { MovementManager } from './game/systems/MovementManager.js'
import { AutoCleanupManager } from './game/systems/AutoCleanupManager.js'

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        // Particle texture will be created by ParticleManager
        this.load.once('complete', () => {
            console.log('Game preload complete');
        });
    }

    create() {
        // Version logging for troubleshooting  
        console.log('🎯 TODDLER TOY v0.2.18 - Fix getRandomEmoji and Data Loading - Build:', new Date().toISOString());
        
        // Initialize configuration manager if not already provided
        if (!this.configManager) {
            this.configManager = new ConfigManager();
            console.log('📋 Created new ConfigManager in GameScene');
        } else {
            console.log('📋 Using provided ConfigManager in GameScene');
        }
        
        // Initialize positioning system for collision detection
        try {
            this.positioningSystem = new PositioningSystem(this);
            console.log('PositioningSystem initialized successfully');
        } catch (error) {
            console.error('Failed to initialize PositioningSystem:', error);
            this.positioningSystem = null;
        }
        
        // Initialize manager systems
        this.audioManager = new AudioManager(this);
        this.particleManager = new ParticleManager(this);
        this.renderManager = new RenderManager(this);
        this.speechManager = new SpeechManager(this);
        this.objectManager = new ObjectManager(this);
        this.objectCountingRenderer = new ObjectCountingRenderer(this);
        this.inputManager = new InputManager(this);
        this.movementManager = new MovementManager(this);
        this.autoCleanupManager = new AutoCleanupManager(this);
        
        // Set up input event handlers from InputManager
        this.setupInputHandlers();
        
        // Create text style with emoji support
        this.textStyle = {
            fontSize: '32px',
            fill: '#ffffff',
            fontFamily: 'Arial, "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif',
            align: 'center'
        };
        
        // Initialize game state
        this.objects = [];
        this.currentSpeech = null;
        this.currentSpeakingObject = null;
        
        // Initialize dragging state
        this.isDragging = false;
        this.draggedObject = null;
        
        
        console.log('🎮 Game managers initialized successfully');
    }

    setupInputHandlers() {
        // Set up input event listeners from InputManager
        this.events.on('input:pointerDown', this.onInputPointerDown, this);
        this.events.on('input:pointerMove', this.onInputPointerMove, this);
        this.events.on('input:pointerUp', this.onInputPointerUp, this);
        this.events.on('input:keyPress', this.onInputKeyPress, this);
        this.events.on('input:keyInterpolate', this.onInputKeyInterpolate, this);
        this.events.on('input:keyRelease', this.onInputKeyRelease, this);
        this.events.on('input:gamepadButtonDown', this.onInputGamepadButtonDown, this);
        this.events.on('input:gamepadMove', this.onInputGamepadMove, this);
        this.events.on('input:holdStart', this.onInputHoldStart, this);
    }

    update() {
        // Update input manager for gamepad polling
        if (this.inputManager) {
            this.inputManager.update();
        }
        
        // Update object movements (smooth lerping)
        this.movementManager.updateObjectMovements();
        
        // Check for auto-cleanup
        this.autoCleanupManager.checkAutoCleanup();
    }

    // Input event handlers
    async onInputPointerDown(data) {
        console.log('🎯 onInputPointerDown called with data:', data);
        const { x, y } = data;
        
        // Check for existing object at pointer position
        const hitObject = this.getObjectUnderPointer(x, y);
        console.log('🎯 hitObject:', hitObject, 'isSpeaking:', this.speechManager.getIsSpeaking());
        
        if (hitObject && !this.speechManager.getIsSpeaking()) {
            // Start dragging existing object
            this.isDragging = true;
            this.draggedObject = hitObject;
            this.particleManager.startDragTrail(hitObject);
            this.autoCleanupManager.updateObjectTouchTime(hitObject);
        } else if (hitObject && this.speechManager.getCurrentSpeakingObject() === hitObject) {
            // Revoice the currently speaking object if clicked
            this.speechManager.speakText(hitObject, 'both');
            this.autoCleanupManager.updateObjectTouchTime(hitObject);
        } else if (hitObject && this.speechManager.getIsSpeaking()) {
            // Move speaking object to click point
            this.particleManager.startDragTrail(this.speechManager.getCurrentSpeakingObject());
            this.moveObjectTo(this.speechManager.getCurrentSpeakingObject(), x, y);
        } else if (!this.speechManager.getIsSpeaking()) {
            // Spawn new object
            console.log('🎯 Attempting to spawn object at', x, y);
            const obj = await this.spawnObjectAt(x, y, 'random');
            console.log('🎯 Spawn result:', obj);
            if (obj) {
                this.speechManager.speakText(obj, 'both');
                this.audioManager.generateContinuousTone(x, y, obj.id);
                this.particleManager.createSpawnBurst(x, y);
            }
        }
    }

    onInputPointerMove(data) {
        const { x, y } = data;
        
        if (this.isDragging && this.draggedObject) {
            this.moveObjectTo(this.draggedObject, x, y);
            this.audioManager.updateTonePosition(x, y, this.draggedObject.id);
            this.particleManager.updateDragTrail(this.draggedObject, x, y);
        }
    }

    onInputPointerUp(data) {
        if (this.isDragging && this.draggedObject) {
            this.particleManager.stopDragTrail(this.draggedObject);
            this.isDragging = false;
            this.draggedObject = null;
        }
    }

    async onInputKeyPress(data) {
        const { key, position } = data;
        
        if (!this.speechManager.getIsSpeaking()) {
            const obj = await this.spawnObjectAt(position.x, position.y, 'random');
            this.speechManager.speakText(obj, 'both');
            this.audioManager.generateContinuousTone(position.x, position.y, obj.id);
            this.particleManager.createSpawnBurst(position.x, position.y);
        } else if (this.speechManager.getCurrentSpeakingObject()) {
            this.moveObjectTo(this.speechManager.getCurrentSpeakingObject(), position.x, position.y);
        }
    }

    onInputKeyInterpolate(data) {
        const { position } = data;
        
        if (this.speechManager.getCurrentSpeakingObject()) {
            this.moveObjectTo(this.speechManager.getCurrentSpeakingObject(), position.x, position.y);
        }
    }

    onInputKeyRelease(data) {
        // Handle key release if needed
    }

    async onInputGamepadButtonDown(data) {
        const { position } = data;
        
        if (!this.speechManager.getIsSpeaking()) {
            const obj = await this.spawnObjectAt(position.x, position.y, 'random');
            this.speechManager.speakText(obj, 'both');
            this.audioManager.generateContinuousTone(position.x, position.y, obj.id);
            this.particleManager.createSpawnBurst(position.x, position.y);
        } else if (this.speechManager.getCurrentSpeakingObject()) {
            this.autoCleanupManager.updateObjectTouchTime(this.speechManager.getCurrentSpeakingObject());
            this.moveObjectTo(this.speechManager.getCurrentSpeakingObject(), position.x, position.y);
            this.audioManager.updateTonePosition(position.x, position.y, this.speechManager.getCurrentSpeakingObject().id);
        }
    }

    onInputGamepadMove(data) {
        // Handle gamepad movement if needed
    }

    onInputHoldStart(data) {
        // Handle hold start if needed
    }

    // Object management methods
    getObjectUnderPointer(x, y) {
        // Find the topmost object at the given coordinates
        for (let i = this.objects.length - 1; i >= 0; i--) {
            const obj = this.objects[i];
            if (obj.active && obj.getBounds().contains(x, y)) {
                return obj;
            }
        }
        return null;
    }

    moveObjectTo(obj, x, y, useSmooth = true) {
        if (!obj || !obj.active) return;
        
        if (useSmooth) {
            // Delegate to movement manager
            this.movementManager.moveObjectTo(obj, x, y);
        } else {
            // Immediate positioning
            this.movementManager.setObjectPosition(obj, x, y);
        }
    }


    async spawnObjectAt(x, y, type = 'random') {
        try {
            // Get spawn type based on configuration
            const spawnType = type === 'random' ? this.selectSpawnType() : type;
            let selectedItem;
            let actualType = spawnType;
            
            // Get item based on type
            switch (spawnType) {
                case 'emoji':
                    selectedItem = await this.getRandomEmoji();
                    break;
                case 'uppercaseLetters':
                case 'lowercaseLetters':
                    selectedItem = this.getRandomLetter(spawnType);
                    actualType = 'letter';
                    break;
                case 'smallNumbers':
                case 'largeNumbers':
                    selectedItem = await this.getRandomNumber(spawnType);
                    actualType = 'number';
                    break;
                case 'shapes':
                    selectedItem = this.getRandomShape();
                    actualType = 'shape';
                    break;
                default:
                    selectedItem = await this.getRandomEmoji();
                    actualType = 'emoji';
            }
            
            if (!selectedItem) {
                console.warn('No item selected for spawn');
                return null;
            }
            
            // Get display text
            const displayText = this.renderManager.getDisplayText(selectedItem, actualType);
            
            // Create the main object sprite
            const obj = this.add.text(x, y, displayText, this.textStyle)
                .setOrigin(0.5, 0.5)
                .setInteractive();
            
            // Store object data and metadata
            obj.data = selectedItem;
            obj.type = actualType;
            obj.id = `object_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            obj.lastTouchedTime = Date.now();
            
            // Add to objects array
            this.objects.push(obj);
            
            // Display text labels for all enabled languages
            this.renderManager.displayTextLabels(obj);
            
            // Render number modes if this is a number
            if (actualType === 'number') {
                this.renderAllNumberModes(obj, selectedItem.value, x, y);
            }
            
            console.log(`✨ Spawned ${actualType}:`, displayText, 'at', x, y);
            return obj;
            
        } catch (error) {
            console.error('Error spawning object:', error);
            return null;
        }
    }

    renderAllNumberModes(obj, numberValue, centerX, centerY) {
        if (!obj || typeof numberValue !== 'number') return;
        
        const numberModes = this.configManager ? this.configManager.getNumberModes() : {};
        const components = [];
        
        // Render Cistercian numerals (furthest from center)
        // POSITIONING FIX: Move Cistercian numerals 7 pixels higher for improved visual alignment
        if (numberModes.cistercian) {
            const cistercianYOffset = -107; // Was -100, now 7 pixels higher
            const cistercianObj = this.renderManager.renderCistercianNumeral(numberValue, centerX, centerY + cistercianYOffset);
            if (cistercianObj) {
                components.push({ type: 'cistercian', object: cistercianObj, offsetX: 0, offsetY: cistercianYOffset });
            }
        }
        
        // Render Kaktovik numerals (middle distance)
        // POSITIONING FIX: Move Kaktovik numerals 4 pixels higher for improved visual alignment
        if (numberModes.kaktovik) {
            const baseOffset = numberModes.cistercian ? -60 : -80;
            const kaktovikYOffset = baseOffset - 4; // 4 pixels higher: -64 or -84
            const kaktovikObj = this.renderManager.renderKaktovikNumeral(numberValue, centerX, centerY + kaktovikYOffset);
            if (kaktovikObj) {
                components.push({ type: 'kaktovik', object: kaktovikObj, offsetX: 0, offsetY: kaktovikYOffset });
            }
        }
        
        // Render binary hearts (closest to center)
        if (numberModes.binary) {
            let yOffset = -40;
            if (numberModes.cistercian) yOffset = -20;
            if (numberModes.kaktovik) yOffset = -20;
            
            const binaryObj = this.renderManager.renderBinaryHearts(numberValue, centerX, centerY + yOffset);
            if (binaryObj) {
                components.push({ type: 'binary', object: binaryObj, offsetX: 0, offsetY: yOffset });
            }
        }
        
        // Render object counting numerals (above main number)
        if (numberModes.objectCounting) {
            const countingComponents = this.objectCountingRenderer.renderObjectCountingNumeralAtPosition(
                numberValue, centerX, centerY
            );
            if (countingComponents && countingComponents.length > 0) {
                countingComponents.forEach(comp => {
                    components.push({ 
                        type: 'objectCounting', 
                        object: comp.object, 
                        offsetX: comp.offsetX, 
                        offsetY: comp.offsetY 
                    });
                });
            }
        }
        
        // Store component layout
        if (!obj.componentLayout) {
            obj.componentLayout = {};
        }
        obj.componentLayout.numberModes = components;
    }

    // Configuration and content selection methods
    selectSpawnType() {
        const config = this.configManager ? this.configManager.getConfig() : null;
        if (!config) return 'emoji';
        
        const types = config.contentTypes || {};
        const weights = [];
        
        if (types.shapes?.weight > 0) weights.push({ type: 'shapes', weight: types.shapes.weight });
        if (types.smallNumbers?.weight > 0) weights.push({ type: 'smallNumbers', weight: types.smallNumbers.weight });
        if (types.largeNumbers?.weight > 0) weights.push({ type: 'largeNumbers', weight: types.largeNumbers.weight });
        if (types.uppercaseLetters?.weight > 0) weights.push({ type: 'uppercaseLetters', weight: types.uppercaseLetters.weight });
        if (types.lowercaseLetters?.weight > 0) weights.push({ type: 'lowercaseLetters', weight: types.lowercaseLetters.weight });
        if (types.emojis?.weight > 0) weights.push({ type: 'emoji', weight: types.emojis.weight });
        
        if (weights.length === 0) return 'emoji';
        
        // Weighted random selection
        const totalWeight = weights.reduce((sum, item) => sum + item.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const item of weights) {
            random -= item.weight;
            if (random <= 0) {
                return item.type;
            }
        }
        
        return weights[0].type;
    }

    async getRandomEmoji() {
        try {
            // Load emoji data if not already cached
            if (!this.emojiData) {
                const response = await fetch('/emojis.json');
                this.emojiData = await response.json();
            }
            
            // Get filtered emojis based on configuration
            const config = this.configManager ? this.configManager.getConfig() : null;
            let availableEmojis = this.emojiData;
            
            // Apply content filters if configured
            if (config && config.contentFilters) {
                // Filter by categories if specified
                if (config.contentFilters.categories && config.contentFilters.categories.length > 0) {
                    availableEmojis = availableEmojis.filter(emoji => 
                        emoji.categories && emoji.categories.some(cat => 
                            config.contentFilters.categories.includes(cat)
                        )
                    );
                }
            }
            
            // Fallback to all emojis if no valid ones after filtering
            if (availableEmojis.length === 0) {
                availableEmojis = this.emojiData;
            }
            
            // Select random emoji
            const randomIndex = Math.floor(Math.random() * availableEmojis.length);
            return availableEmojis[randomIndex];
            
        } catch (error) {
            console.error('Error loading emoji data:', error);
            // Fallback emoji object
            return {
                emoji: '🎯',
                en: 'Target',
                type: 'emoji',
                categories: ['fun'],
                colors: ['red', 'white']
            };
        }
    }

    async getRandomShape() {
        try {
            // Load things data if not already cached
            if (!this.thingsData) {
                const response = await fetch('/things.json');
                this.thingsData = await response.json();
            }
            
            const shapes = this.thingsData.shapes || [];
            if (shapes.length === 0) {
                return { value: 'Circle', type: 'shape' };
            }
            
            const randomIndex = Math.floor(Math.random() * shapes.length);
            return { ...shapes[randomIndex], type: 'shape' };
            
        } catch (error) {
            console.error('Error loading shape data:', error);
            return { value: 'Circle', type: 'shape' };
        }
    }

    async getRandomLetter(configType = 'uppercaseLetters') {
        try {
            // Load things data if not already cached
            if (!this.thingsData) {
                const response = await fetch('/things.json');
                this.thingsData = await response.json();
            }
            
            const letters = this.thingsData.letters || [];
            const isUppercase = configType === 'uppercaseLetters';
            const filteredLetters = letters.filter(letter => 
                isUppercase ? letter.case === 'upper' : letter.case === 'lower'
            );
            
            if (filteredLetters.length === 0) {
                return { value: isUppercase ? 'A' : 'a', type: 'letter' };
            }
            
            const randomIndex = Math.floor(Math.random() * filteredLetters.length);
            return { ...filteredLetters[randomIndex], type: 'letter' };
            
        } catch (error) {
            console.error('Error loading letter data:', error);
            return { value: 'A', type: 'letter' };
        }
    }

    async getRandomNumber(configType = 'smallNumbers') {
        try {
            // Load things data if not already cached
            if (!this.thingsData) {
                const response = await fetch('/things.json');
                this.thingsData = await response.json();
            }
            
            const numbers = this.thingsData.numbers || [];
            let filteredNumbers = numbers;
            
            // Filter by config type if specified
            if (configType === 'smallNumbers') {
                filteredNumbers = numbers.filter(num => num.value <= 10);
            }
            
            if (filteredNumbers.length === 0) {
                return { value: 1, type: 'number' };
            }
            
            const randomIndex = Math.floor(Math.random() * filteredNumbers.length);
            return { ...filteredNumbers[randomIndex], type: 'number' };
            
        } catch (error) {
            console.error('Error loading number data:', error);
            return { value: 1, type: 'number' };
        }
    }

    // Auto-cleanup system

    removeObject(obj) {
        if (!obj) return;
        
        try {
            // Stop any audio tones
            if (this.audioManager.hasTone(obj.id)) {
                this.audioManager.stopTone(obj.id);
            }
            
            // Clean up particles
            this.particleManager.cleanupParticles(obj.id);
            
            // Stop drag trails
            this.particleManager.stopDragTrail(obj);
            
            // Clean up word sparkles
            this.particleManager.cleanupWordSparkles(obj);
            
            // Remove from objects array
            const index = this.objects.indexOf(obj);
            if (index !== -1) {
                this.objects.splice(index, 1);
            }
            
            // Clean up component layout objects
            if (obj.componentLayout) {
                // Clean up number mode components
                if (obj.componentLayout.numberModes) {
                    obj.componentLayout.numberModes.forEach(comp => {
                        if (comp.object && comp.object.destroy) {
                            comp.object.destroy();
                        }
                    });
                }
                
                // Clean up word objects
                if (obj.allLanguageWords) {
                    obj.allLanguageWords.forEach(langGroup => {
                        if (langGroup.words) {
                            langGroup.words.forEach(wordObj => {
                                if (wordObj && wordObj.destroy) {
                                    wordObj.destroy();
                                }
                            });
                        }
                    });
                }
            }
            
            // Destroy main object
            if (obj.destroy) {
                obj.destroy();
            }
            
        } catch (error) {
            console.warn('Error removing object:', error);
        }
    }


    // Cleanup methods
    resetToyState() {
        // Stop all audio tones
        if (this.audioManager) {
            this.audioManager.stopAllTones();
        }
        
        // Cancel speech
        if (this.speechManager) {
            this.speechManager.cancelSpeech();
        }
        
        // Clean up all objects
        this.objects.forEach(obj => this.removeObject(obj));
        this.objects = [];
        
        // Clear movement queue
        this.movementManager.clearAllMovements();
        
        // Reset state
        this.isDragging = false;
        this.draggedObject = null;
        this.currentSpeakingObject = null;
        
        console.log('🧹 Toy state reset complete');
    }

    destroy() {
        // Clean up all managers
        if (this.audioManager) this.audioManager.destroy();
        if (this.particleManager) this.particleManager.destroy();
        if (this.renderManager) this.renderManager.destroy();
        if (this.speechManager) this.speechManager.destroy();
        if (this.objectManager) this.objectManager.destroy();
        if (this.inputManager) this.inputManager.destroy();
        if (this.movementManager) this.movementManager.destroy();
        if (this.autoCleanupManager) this.autoCleanupManager.destroy();
        
        // Clean up objects
        this.resetToyState();
        
        // Call parent destroy
        super.destroy();
    }
}

class ResponsiveGameManager {
    constructor(configManager = null) {
        this.gameInstance = null;
        this.config = null;
        this.configManager = configManager;
        
        this.initGame();
        this.setupResizeHandler();
    }

    initGame() {
        // Calculate responsive dimensions
        const width = Math.min(window.innerWidth, 1200);
        const height = Math.min(window.innerHeight, 800);

        this.config = {
            type: Phaser.AUTO,
            width: width,
            height: height,
            parent: 'game-container',
            backgroundColor: '#2c3e50',
            scene: GameScene,
            scale: {
                mode: Phaser.Scale.RESIZE,
                autoCenter: Phaser.Scale.CENTER_BOTH
            },
            input: {
                gamepad: true
            },
            physics: {
                default: 'arcade',
                arcade: {
                    gravity: { y: 0 },
                    debug: false
                }
            }
        };

        this.gameInstance = new Phaser.Game(this.config);
        
        // Pass configManager to the scene after creation
        if (this.configManager && this.gameInstance.scene.scenes[0]) {
            this.gameInstance.scene.scenes[0].configManager = this.configManager;
            console.log('📋 ConfigManager passed to GameScene');
        }
        
        // Add global click listener for debugging
        window.addEventListener('click', (e) => {
            console.log('🔍 GLOBAL CLICK DETECTED:', e.clientX, e.clientY, e.target.tagName, e.target.className);
        });
        
        console.log('🎮 Responsive game initialized:', width, 'x', height);
    }

    handleResize() {
        if (this.gameInstance && this.gameInstance.scene.scenes[0]) {
            const scene = this.gameInstance.scene.scenes[0];
            const newWidth = Math.min(window.innerWidth, 1200);
            const newHeight = Math.min(window.innerHeight, 800);
            
            this.gameInstance.scale.resize(newWidth, newHeight);
            console.log('🔄 Game resized to:', newWidth, 'x', newHeight);
        }
    }

    setupResizeHandler() {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.handleResize();
            }, 250);
        });
    }
}

// Export for main.js and routes
export { ResponsiveGameManager };

// Legacy export alias for compatibility
export { ResponsiveGameManager as ToddlerToyGame };