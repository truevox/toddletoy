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
import { ResourceBar } from './ui/ResourceBar.js'
import { MovementManager } from './game/systems/MovementManager.js'
import { AutoCleanupManager } from './game/systems/AutoCleanupManager.js'
import GridManager from './game/systems/GridManager.js'
import packageJson from '../package.json'

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
        console.log(`🎯 TODDLER TOY v${packageJson.version} - Build:`, new Date().toISOString());

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

        // Create emoji-specific style (larger size)
        this.emojiStyle = {
            fontSize: '64px',
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

        // Spawn-after-movement cooldown: block spawns for 200ms (1/5s) after any movement
        this.lastMoveTime = 0;
        this.SPAWN_AFTER_MOVE_DELAY = 200;

        // Movement-after-spawn lock: block movement for 200ms after spawn
        // AND require the triggering input to be released first
        this.MOVE_AFTER_SPAWN_DELAY = 200;
        this.awaitingSpawnInputRelease = false;

        // Initialize Grid Mode state (extra feature - optional structured layout)
        this.gridMode = {
            enabled: false,              // Grid mode toggle
            gridManager: null,           // GridManager instance
            currentCell: { row: 0, col: 0 }, // Current cell for keyboard navigation
            gridOverlay: null,           // Phaser Graphics for grid lines
            cellHighlights: new Map(),   // Map of cell highlights
            occupiedCells: new Map()     // Map of {row,col} -> object
        };

        console.log('🎮 Game managers initialized successfully');

        // Expose cache clearing utility in development mode
        if (this.configManager.isDevelopmentMode()) {
            window.clearToddleToyCache = () => this.configManager.clearAllCaches();
            console.log('🔧 Development mode: Use clearToddleToyCache() to clear all caches');
        }

        // Pre-load critical data to avoid first-click delays
        this.preloadGameData();

        // Restore game state from previous session if available
        this.restoreGameState();

        // Initialize Grid Mode if enabled in configuration
        this.initializeGridMode();
    }

    /**
     * Initialize Grid Mode based on configuration
     */
    initializeGridMode() {
        const config = this.configManager.getConfig();
        if (config.gridMode && config.gridMode.enabled) {
            console.log('📐 Grid Mode enabled in configuration, initializing...');
            this.enableGridMode();
        } else {
            console.log('📐 Grid Mode disabled (free-form mode active)');
        }
    }

    /**
     * Enable Grid Mode - switch from free-form to structured grid layout
     */
    enableGridMode() {
        const config = this.configManager.getConfig();
        const gridConfig = config.gridMode;

        if (!gridConfig) {
            console.warn('📐 Grid Mode configuration not found');
            return;
        }

        console.log('📐 Enabling Grid Mode...', gridConfig);

        // Create GridManager instance with screen dimensions
        this.gridMode.gridManager = new GridManager(
            gridConfig.rows,
            gridConfig.cols,
            this.sys.game.config.width,
            this.sys.game.config.height,
            gridConfig.cellPadding
        );

        // Enable grid mode
        this.gridMode.enabled = true;

        // Create grid overlay if configured
        if (gridConfig.showGrid) {
            this.createGridOverlay();
        }

        // Disable object dragging in grid mode
        this.objects.forEach(obj => {
            if (obj.input) {
                obj.input.draggable = false;
            }
        });

        // Auto-populate grid if configured
        if (gridConfig.autoPopulate) {
            this.populateGrid();
        }

        console.log('✅ Grid Mode enabled successfully');
    }

    /**
     * Disable Grid Mode - switch from grid to free-form layout
     */
    disableGridMode() {
        console.log('📐 Disabling Grid Mode...');

        if (!this.gridMode.enabled) {
            console.log('📐 Grid Mode already disabled');
            return;
        }

        // Clear grid overlay
        if (this.gridMode.gridOverlay) {
            this.gridMode.gridOverlay.destroy();
            this.gridMode.gridOverlay = null;
        }

        // Clear all cell highlights
        this.gridMode.cellHighlights.forEach((highlight) => {
            if (highlight && highlight.destroy) {
                highlight.destroy();
            }
        });
        this.gridMode.cellHighlights.clear();

        // Clear occupied cells map
        this.gridMode.occupiedCells.clear();

        // Re-enable object dragging in free-form mode
        this.objects.forEach(obj => {
            if (obj.input) {
                obj.input.draggable = true;
            }
        });

        // Disable grid mode
        this.gridMode.enabled = false;
        this.gridMode.gridManager = null;

        console.log('✅ Grid Mode disabled, free-form mode active');
    }

    /**
     * Create visual grid overlay with lines
     */
    createGridOverlay() {
        if (!this.gridMode.gridManager) {
            console.warn('📐 Cannot create grid overlay: GridManager not initialized');
            return;
        }

        const gridManager = this.gridMode.gridManager;

        // Create graphics object for grid lines
        if (!this.gridMode.gridOverlay) {
            this.gridMode.gridOverlay = this.add.graphics();
        }

        // Clear existing graphics
        this.gridMode.gridOverlay.clear();

        // Set line style (semi-transparent white lines)
        this.gridMode.gridOverlay.lineStyle(1, 0xffffff, 0.2);

        // Draw vertical lines
        for (let col = 0; col <= gridManager.cols; col++) {
            const x = gridManager.offsetX + (col * (gridManager.cellWidth + gridManager.cellPadding));
            this.gridMode.gridOverlay.lineBetween(
                x,
                gridManager.offsetY,
                x,
                gridManager.offsetY + gridManager.actualGridHeight
            );
        }

        // Draw horizontal lines
        for (let row = 0; row <= gridManager.rows; row++) {
            const y = gridManager.offsetY + (row * (gridManager.cellHeight + gridManager.cellPadding));
            this.gridMode.gridOverlay.lineBetween(
                gridManager.offsetX,
                y,
                gridManager.offsetX + gridManager.actualGridWidth,
                y
            );
        }

        console.log('📐 Grid overlay created');
    }

    /**
     * Populate grid with random objects
     */
    populateGrid() {
        if (!this.gridMode.gridManager) {
            console.warn('📐 Cannot populate grid: GridManager not initialized');
            return;
        }

        const gridManager = this.gridMode.gridManager;
        console.log(`📐 Populating ${gridManager.rows}x${gridManager.cols} grid...`);

        // Spawn object in each grid cell
        for (let row = 0; row < gridManager.rows; row++) {
            for (let col = 0; col < gridManager.cols; col++) {
                const position = gridManager.getCellPosition(row, col);
                if (position) {
                    // Use existing spawnObjectAt method but mark for grid
                    this.spawnObjectInGridCell(row, col, 'random');
                }
            }
        }

        console.log('✅ Grid populated');
    }

    /**
     * Spawn object in specific grid cell
     */
    async spawnObjectInGridCell(row, col, type = 'random') {
        if (!this.gridMode.gridManager) {
            console.warn('📐 Cannot spawn in grid cell: GridManager not initialized');
            return null;
        }

        const gridManager = this.gridMode.gridManager;

        // Validate cell coordinates
        if (!gridManager.isValidCell(row, col)) {
            console.warn(`📐 Invalid grid cell: ${row},${col}`);
            return null;
        }

        // Get cell center position
        const position = gridManager.getCellPosition(row, col);
        if (!position) {
            console.warn(`📐 Could not get position for cell: ${row},${col}`);
            return null;
        }

        // Check if cell is already occupied
        const cellKey = `${row},${col}`;
        const existingObject = this.gridMode.occupiedCells.get(cellKey);
        if (existingObject) {
            // Remove existing object first (with particle effects, but no auto-respawn since we're about to spawn)
            console.log(`📐 Replacing object in cell ${cellKey}`);
            await this.removeObjectFromGridCell(row, col, false); // false = don't auto-respawn
        }

        // Spawn object at cell center using existing spawn logic
        const obj = await this.spawnObjectAt(position.x, position.y, type);

        if (obj) {
            // Mark object with grid cell info
            obj.gridCell = { row, col };

            // Disable dragging for grid objects
            if (obj.input) {
                obj.input.draggable = false;
            }

            // CRITICAL: Set lastTouchedTime to prevent immediate auto-cleanup
            obj.lastTouchedTime = Date.now();

            // Track in occupied cells map
            this.gridMode.occupiedCells.set(cellKey, obj);

            console.log(`📐 Spawned object in grid cell ${cellKey}:`, obj.data?.itemData);
        }

        return obj;
    }

    /**
     * Remove object from specific grid cell
     */
    async removeObjectFromGridCell(row, col, autoRespawn = true) {
        const cellKey = `${row},${col}`;
        const obj = this.gridMode.occupiedCells.get(cellKey);

        if (obj) {
            console.log(`📐 Removing object from grid cell ${cellKey}`);

            // Add fun particle effects before removal
            if (obj.x !== undefined && obj.y !== undefined) {
                this.particleManager.createSpawnBurst(obj.x, obj.y);
                // Add a small pop sound effect
                this.audioManager.generateContinuousTone(obj.x, obj.y, obj.id, 100); // Short 100ms tone
            }

            // Clear from occupied cells BEFORE removing (prevents double-respawn)
            this.gridMode.occupiedCells.delete(cellKey);

            // Remove the object (without triggering respawn from removeObject)
            this.removeObject(obj);

            // Auto-respawn a new object in this cell if in grid mode
            if (autoRespawn && this.gridMode.enabled && this.gridMode.gridManager) {
                console.log(`📐 Auto-respawning in empty cell ${cellKey}`);
                // Small delay for visual effect
                await new Promise(resolve => setTimeout(resolve, 300));
                await this.spawnObjectInGridCell(row, col, 'random');
            }
        }
    }

    async preloadGameData() {
        try {
            // Cache busting timestamp
            const timestamp = Date.now();

            // Pre-load emoji data with cache busting
            if (!this.emojiData) {
                const response = await fetch(`/emojis.json?v=${timestamp}`);
                this.emojiData = await response.json();
                console.log('📦 Emoji data preloaded:', this.emojiData.length, 'emojis');
            }

            // Pre-load things data with cache busting
            if (!this.thingsData) {
                const response = await fetch(`/things.json?v=${timestamp}`);
                this.thingsData = await response.json();
                console.log('📦 Things data preloaded');
            }

            this.dataLoaded = true;
            this.checkFullInitialization();
        } catch (error) {
            console.error('Error preloading game data:', error);
            this.dataLoaded = true; // Continue anyway
            this.checkFullInitialization();
        }
    }

    checkFullInitialization() {
        // Check if fonts are also loaded
        this.fontsLoaded = document.fonts.check('1em Kaktovik') && document.fonts.check('1em Cistercian');

        if (this.dataLoaded && this.fontsLoaded) {
            this.isFullyInitialized = true;
            console.log('✅ Game fully initialized - ready for interactions');
        } else if (this.dataLoaded) {
            // Wait a bit more for fonts
            setTimeout(() => this.checkFullInitialization(), 100);
        }
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
        this.events.on('input:gamepadButtonUp', this.onInputGamepadButtonUp, this);
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

        // Warn if system not fully initialized (race condition debugging)
        if (!this.isFullyInitialized) {
            console.warn('⚠️ Input received before full initialization (data:', this.dataLoaded, 'fonts:', this.fontsLoaded, ')');
        }

        // Grid Mode: Map click to grid cell and spawn there
        if (this.gridMode.enabled && this.gridMode.gridManager) {
            console.log('📐 Grid Mode active, mapping pointer to grid cell');
            const gridCell = this.gridMode.gridManager.getGridCell(x, y);

            if (gridCell) {
                const { row, col } = gridCell;
                console.log(`📐 Clicked grid cell: ${row},${col}`);

                if (!this.canSpawnAfterMovement()) {
                    console.log('🛑 Grid spawn blocked: too soon after movement');
                    return;
                }

                // Spawn object in grid cell (replaces existing if present)
                const obj = await this.spawnObjectInGridCell(row, col, 'random');
                if (obj) {
                    this.speechManager.speakText(obj, 'both');
                    this.audioManager.generateContinuousTone(x, y, obj.id);
                    this.particleManager.createSpawnBurst(x, y);
                }
            } else {
                console.log('📐 Click outside grid boundaries');
            }
            return; // Skip free-form mode handling
        }

        // Free-form Mode: Check spawn eligibility FIRST, then move/drag
        const hitObject = this.getObjectUnderPointer(x, y);
        const isSpeaking = this.speechManager.getIsSpeaking();
        console.log('🎯 hitObject:', hitObject, 'isSpeaking:', isSpeaking);

        // 1. SPAWN CHECK (first priority) — empty space, not speaking
        if (!hitObject && !isSpeaking) {
            if (this.canSpawnAfterMovement()) {
                console.log('🎯 Attempting to spawn object at', x, y);
                const obj = await this.spawnObjectAt(x, y, 'random');
                console.log('🎯 Spawn result:', obj);
                if (obj) {
                    this.speechManager.speakText(obj, 'both');
                    this.audioManager.generateContinuousTone(x, y, obj.id);
                    this.particleManager.createSpawnBurst(x, y);
                }
            } else {
                console.log('🛑 Spawn blocked: too soon after movement (%dms)',
                    Date.now() - this.lastMoveTime);
            }
            return;
        }

        // 2. DRAG/MOVE checks (only reached when spawn doesn't apply)
        // Block all movement if post-spawn lock is active
        if (!this.canMoveAfterSpawn()) {
            console.log('🛑 Movement blocked: post-spawn lock active');
            return;
        }

        if (hitObject && !isSpeaking) {
            // Start dragging existing object when not speaking
            this.startDragging(hitObject, x, y);
            this.autoCleanupManager.updateObjectTouchTime(hitObject);
        } else if (hitObject && isSpeaking) {
            // Allow dragging any object even during speech
            this.startDragging(hitObject, x, y);
            this.autoCleanupManager.updateObjectTouchTime(hitObject);
            // Re-voice the object being dragged
            this.speechManager.speakText(hitObject, 'both');
        } else if (isSpeaking && this.speechManager.getCurrentSpeakingObject()) {
            // Teleport speaking object to tap location with smooth lerp AND make it draggable
            const speakingObj = this.speechManager.getCurrentSpeakingObject();
            this.moveObjectTo(speakingObj, x, y, true); // true = smooth lerp animation
            this.audioManager.updateTonePosition(x, y, speakingObj.id);
            this.particleManager.createSpawnBurst(x, y);
            this.autoCleanupManager.updateObjectTouchTime(speakingObj);
            // Start dragging immediately so finger movement works during/after lerp
            this.startDragging(speakingObj, x, y);
        }
    }

    onInputPointerMove(data) {
        const { x, y } = data;

        if (this.isDragging && this.draggedObject && this.canMoveAfterSpawn()) {
            // Use immediate positioning during drag (no lerp lag)
            this.moveObjectTo(this.draggedObject, x, y, false); // false = instant, no smooth lerp
            this.audioManager.updateTonePosition(x, y, this.draggedObject.id);
            this.particleManager.updateDragTrail(this.draggedObject, x, y);
        }
    }

    onInputPointerUp(data) {
        this.awaitingSpawnInputRelease = false;
        if (this.isDragging && this.draggedObject) {
            this.stopDragging();
        }
    }

    /**
     * Start dragging an object with visual feedback
     * @param {Object} obj - The object to start dragging
     * @param {number} x - Current pointer X position
     * @param {number} y - Current pointer Y position
     */
    startDragging(obj, x, y) {
        if (!obj || !obj.active) return;

        // Don't cancel smooth movements - let finger movement naturally take over
        // This allows smooth lerp animations to complete if user doesn't move finger

        // Set drag state
        this.isDragging = true;
        this.draggedObject = obj;

        // Visual feedback: scale up slightly for modern feel
        this.scene.tweens.add({
            targets: obj,
            scaleX: 1.15,
            scaleY: 1.15,
            duration: 100,
            ease: 'Back.easeOut'
        });

        // Start particle trail
        this.particleManager.startDragTrail(obj);

        console.log('👆 Started dragging object:', obj.id);
    }

    /**
     * Stop dragging with smooth scale-down animation
     */
    stopDragging() {
        if (!this.draggedObject) return;

        const obj = this.draggedObject;

        // Visual feedback: scale back to normal
        this.scene.tweens.add({
            targets: obj,
            scaleX: 1.0,
            scaleY: 1.0,
            duration: 150,
            ease: 'Back.easeOut'
        });

        // Stop particle trail
        this.particleManager.stopDragTrail(obj);

        // Clear drag state
        this.isDragging = false;
        this.draggedObject = null;

        console.log('✋ Stopped dragging object:', obj.id);
    }

    async onInputKeyPress(data) {
        const { key, position } = data;

        if (!this.speechManager.getIsSpeaking()) {
            if (!this.canSpawnAfterMovement()) {
                console.log('🛑 Key spawn blocked: too soon after movement');
                return;
            }
            const obj = await this.spawnObjectAt(position.x, position.y, 'random');
            this.speechManager.speakText(obj, 'both');
            this.audioManager.generateContinuousTone(position.x, position.y, obj.id);
            this.particleManager.createSpawnBurst(position.x, position.y);
        } else if (this.speechManager.getCurrentSpeakingObject() && this.canMoveAfterSpawn()) {
            this.moveObjectTo(this.speechManager.getCurrentSpeakingObject(), position.x, position.y);
        }
    }

    onInputKeyInterpolate(data) {
        const { position } = data;

        if (this.speechManager.getCurrentSpeakingObject() && this.canMoveAfterSpawn()) {
            this.moveObjectTo(this.speechManager.getCurrentSpeakingObject(), position.x, position.y);
        }
    }

    onInputKeyRelease(data) {
        this.awaitingSpawnInputRelease = false;
    }

    async onInputGamepadButtonDown(data) {
        const { position } = data;

        if (!this.speechManager.getIsSpeaking()) {
            if (!this.canSpawnAfterMovement()) {
                console.log('🛑 Gamepad spawn blocked: too soon after movement');
                return;
            }
            const obj = await this.spawnObjectAt(position.x, position.y, 'random');
            this.speechManager.speakText(obj, 'both');
            this.audioManager.generateContinuousTone(position.x, position.y, obj.id);
            this.particleManager.createSpawnBurst(position.x, position.y);
        } else if (this.speechManager.getCurrentSpeakingObject() && this.canMoveAfterSpawn()) {
            this.autoCleanupManager.updateObjectTouchTime(this.speechManager.getCurrentSpeakingObject());
            this.moveObjectTo(this.speechManager.getCurrentSpeakingObject(), position.x, position.y);
            this.audioManager.updateTonePosition(position.x, position.y, this.speechManager.getCurrentSpeakingObject().id);
        }
    }

    onInputGamepadButtonUp(data) {
        this.awaitingSpawnInputRelease = false;
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

        // Track movement time for spawn cooldown
        this.lastMoveTime = Date.now();

        if (useSmooth) {
            // Delegate to movement manager
            this.movementManager.moveObjectTo(obj, x, y);
        } else {
            // Immediate positioning
            this.movementManager.setObjectPosition(obj, x, y);
        }
    }

    /**
     * Check if enough time has passed since the last movement to allow spawning.
     * Prevents accidental spawns when toddler is dragging/moving objects.
     * @returns {boolean} true if spawning is allowed
     */
    canSpawnAfterMovement() {
        if (this.lastMoveTime === 0) return true;
        return (Date.now() - this.lastMoveTime) >= this.SPAWN_AFTER_MOVE_DELAY;
    }

    /**
     * Check if movement is allowed after a spawn.
     * Requires BOTH: the triggering input to be released AND 200ms elapsed.
     * @returns {boolean} true if movement is allowed
     */
    canMoveAfterSpawn() {
        if (this.awaitingSpawnInputRelease) return false;
        if (this.lastSpawnTime === 0) return true;
        return (Date.now() - this.lastSpawnTime) >= this.MOVE_AFTER_SPAWN_DELAY;
    }

    createPrimaryDisplayObject(actualType, itemData, displayText, x, y) {
        if (actualType === 'shape') {
            return this.createShapeObject(itemData, x, y, displayText);
        }

        let style = actualType === 'emoji' ? this.emojiStyle : this.textStyle;
        if ((actualType === 'number' || actualType === 'letter') && itemData?.color?.hex) {
            style = { ...style, fill: itemData.color.hex };
        }

        const obj = this.add.text(x, y, displayText, style)
            .setOrigin(0.5, 0.5)
            .setInteractive();

        obj.text = displayText;
        return obj;
    }

    createShapeObject(itemData, x, y, labelText = '') {
        const fallbackWidth = typeof window !== 'undefined' ? window.innerWidth : 800;
        const fallbackHeight = typeof window !== 'undefined' ? window.innerHeight : 600;
        const minDimension = Math.min(this.scale.width || fallbackWidth, this.scale.height || fallbackHeight);
        const dynamicSize = Math.round(minDimension * 0.04);
        const size = Math.max(28, Math.min(40, dynamicSize || 32));
        const container = this.add.container(x, y);

        const colorHex = itemData?.color?.hex || '#ffffff';
        let fillColorInt = 0xffffff;
        try {
            fillColorInt = Phaser.Display.Color.HexStringToColor(colorHex).color;
        } catch (error) {
            console.warn('Failed to parse shape color hex:', colorHex, error);
        }

        const strokeColor = 0xffffff;
        const strokeAlpha = 0.85;
        const strokeWidth = Math.max(2, Math.round(size * 0.15));
        const normalizedValue = (itemData?.value || '').toLowerCase();
        let shape = null;

        const addShape = (gameObject, { skipStroke = false } = {}) => {
            if (!gameObject) return;
            gameObject.setPosition(0, 0);
            if (gameObject.setOrigin) {
                gameObject.setOrigin(0.5, 0.5);
            }
            if (!skipStroke && gameObject.setStrokeStyle) {
                gameObject.setStrokeStyle(strokeWidth, strokeColor, strokeAlpha);
            }
            container.add(gameObject);
            shape = gameObject;
        };

        switch (normalizedValue) {
            case 'circle':
                addShape(this.add.circle(0, 0, size / 2, fillColorInt));
                break;
            case 'square':
                addShape(this.add.rectangle(0, 0, size * 0.9, size * 0.9, fillColorInt));
                break;
            case 'triangle':
                addShape(this.add.polygon(0, 0, [
                    0, -size / 2,
                    size / 2, size / 2,
                    -size / 2, size / 2
                ], fillColorInt));
                break;
            case 'star':
                addShape(this.add.star(0, 0, 5, size * 0.5, size * 0.2, fillColorInt));
                break;
            case 'diamond':
                addShape(this.add.polygon(0, 0, [
                    0, -size / 2,
                    size / 2, 0,
                    0, size / 2,
                    -size / 2, 0
                ], fillColorInt));
                break;
            case 'heart': {
                const graphics = this.add.graphics({ x: 0, y: 0 });
                graphics.fillStyle(fillColorInt, 1);
                graphics.lineStyle(strokeWidth, strokeColor, strokeAlpha);
                const curveDepth = size * 0.35;
                graphics.beginPath();
                graphics.moveTo(0, size / 2);
                graphics.bezierCurveTo(size / 2, size / 2 - curveDepth, size / 2, -size / 6, 0, -size / 3);
                graphics.bezierCurveTo(-size / 2, -size / 6, -size / 2, size / 2 - curveDepth, 0, size / 2);
                graphics.closePath();
                graphics.fillPath();
                graphics.strokePath();
                addShape(graphics, { skipStroke: true });
                break;
            }
            default:
                addShape(this.add.circle(0, 0, size / 2, fillColorInt));
                break;
        }

        container.mainShape = shape;
        container.shapeSize = size;
        container.text = labelText || itemData?.value || '';
        container.componentLayout = container.componentLayout || {};
        container.componentLayout.labelVerticalOffset = Math.round(size * 1.2);
        const hitSize = size + 12;
        container.setSize(hitSize, hitSize);
        container.setInteractive(new Phaser.Geom.Rectangle(-hitSize / 2, -hitSize / 2, hitSize, hitSize), Phaser.Geom.Rectangle.Contains);

        return container;
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
                    selectedItem = await this.getRandomLetter(spawnType);
                    actualType = 'letter';
                    break;
                case 'smallNumbers':
                case 'largeNumbers':
                    selectedItem = await this.getRandomNumber(spawnType);
                    actualType = 'number';
                    break;
                case 'shapes':
                    selectedItem = await this.getRandomShape();
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

            if (actualType === 'letter') {
                const letterColor = await this.getRandomColor();
                selectedItem.color = letterColor;
            } else if (actualType === 'shape') {
                const allowedCategories = Array.isArray(selectedItem.colors) ? selectedItem.colors : null;
                const shapeColor = await this.getRandomColor(allowedCategories);
                selectedItem.color = shapeColor;
            }

            selectedItem.type = actualType;

            const displayText = this.renderManager.getDisplayText(selectedItem, actualType);
            const obj = this.createPrimaryDisplayObject(actualType, selectedItem, displayText, x, y);

            if (!obj) {
                console.warn('Failed to create object for type:', actualType);
                return null;
            }

            // Store object data and metadata
            obj.itemData = selectedItem;
            obj.type = actualType;
            obj.id = `object_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            obj.lastTouchedTime = Date.now();

            // Add to objects array
            this.objects.push(obj);

            // Render number modes FIRST if this is a number (to calculate layout offset)
            if (actualType === 'number') {
                this.renderAllNumberModes(obj, selectedItem.value, x, y);
            }

            // Display text labels with dynamic vertical offset (for object counting layout)
            const verticalOffset = obj.componentLayout?.labelVerticalOffset || 0;
            this.renderManager.displayTextLabels(obj, verticalOffset);


            console.log(`✨ Spawned ${actualType}:`, displayText, 'at', x, y);

            // Track spawn time to prevent accidental immediate interaction
            this.lastSpawnTime = Date.now();
            this.awaitingSpawnInputRelease = true;

            // Save game state after spawning
            this.saveGameState();

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

        // VERTICAL LAYOUT STACK (from top to bottom):
        // 1. Cistercian numerals (top, above main object)
        // 2. Kaktovik numerals (above main object)
        // 3. Binary hearts (above main object)
        // 4. Main emoji/number (at centerY)
        // 5. Text labels (below main object, ~60px down)
        // 6. Object counting (BELOW labels, with proper spacing)

        // Calculate counting mode position BELOW text labels (for both objectCounting and onlyApples)
        let objectCountingYOffset = 0;
        if (numberModes.objectCounting || numberModes.onlyApples) {
            // Get ACTUAL responsive text style (not hardcoded!) to match real label positioning
            const styleInfo = this.renderManager.textLayoutManager.calculateResponsiveTextStyle();

            // Get language count
            const languagesConfig = this.configManager ? this.configManager.getLanguages() : null;
            const enabledLanguages = languagesConfig?.enabled || [{ code: 'en' }, { code: 'es' }];
            const languageCount = enabledLanguages.length;

            // Use ACTUAL responsive values from TextLayoutManager (scales with screen size!)
            const actualLabelOffset = styleInfo.labelOffset;   // Math.floor(60 * scaleFactor)
            const actualLineSpacing = styleInfo.lineSpacing;   // Math.floor(30 * scaleFactor)

            // Calculate total label area:
            // - First label at: actualLabelOffset
            // - Each additional label adds: actualLineSpacing
            // - lineSpacing includes both text height and gap, so no need to add fontSize separately
            const totalLabelArea = actualLabelOffset + (languageCount * actualLineSpacing);

            // Mode-specific buffer (also responsive to screen size)
            const buffer = numberModes.onlyApples
                ? Math.floor(20 * styleInfo.scaleFactor)  // Smaller buffer for apples (scaled 20px)
                : Math.floor(10 * styleInfo.scaleFactor); // Minimal buffer for compact bar (scaled 10px)

            objectCountingYOffset = totalLabelArea + buffer;

            const modeName = numberModes.objectCounting ? 'place values' : 'only apples';
            console.log(`📐 Responsive layout (scale=${styleInfo.scaleFactor.toFixed(2)}): ${numberValue}, ${languageCount} langs, labelOffset=${actualLabelOffset}px, lineSpacing=${actualLineSpacing}px, ${modeName} at Y+${objectCountingYOffset}px`);
        }

        // Render Cistercian numerals (furthest from center, above labels)
        if (numberModes.cistercian) {
            const cistercianYOffset = -107;
            const cistercianObj = this.renderManager.renderCistercianNumeral(numberValue, centerX, centerY + cistercianYOffset);
            if (cistercianObj) {
                components.push({ type: 'cistercian', object: cistercianObj, offsetX: 0, offsetY: cistercianYOffset });
            }
        }

        // Render Kaktovik numerals (middle distance, above labels)
        if (numberModes.kaktovik) {
            const baseOffset = numberModes.cistercian ? -60 : -80;
            const kaktovikYOffset = baseOffset - 4;
            const kaktovikObj = this.renderManager.renderKaktovikNumeral(numberValue, centerX, centerY + kaktovikYOffset);
            if (kaktovikObj) {
                components.push({ type: 'kaktovik', object: kaktovikObj, offsetX: 0, offsetY: kaktovikYOffset });
            }
        }

        // Render binary hearts (above labels)
        if (numberModes.binary) {
            let yOffset = -40;
            if (numberModes.cistercian) yOffset = -20;
            if (numberModes.kaktovik) yOffset = -20;

            const binaryObj = this.renderManager.renderBinaryHearts(numberValue, centerX, centerY + yOffset);
            if (binaryObj) {
                components.push({ type: 'binary', object: binaryObj, offsetX: 0, offsetY: yOffset });
            }
        }

        // Render object counting modes BELOW labels
        if (numberModes.objectCounting) {
            // Place values mode: 🚛📦🛍️🍎 (using ResourceBar for compact horizontal layout)
            const placeValues = {
                thousands: Math.floor(numberValue / 1000),
                hundreds: Math.floor((numberValue % 1000) / 100),
                tens: Math.floor((numberValue % 100) / 10),
                ones: numberValue % 10
            };

            const resourceBar = new ResourceBar(this, {
                x: centerX,
                y: centerY + objectCountingYOffset,
                iconSize: { w: 32, h: 32 },
                iconGapX: 4,
                groupGapX: 12,
                maxIconsPerType: Infinity,
                fontSize: 16
            });

            resourceBar.setCounts({
                apples: placeValues.ones,
                bags: placeValues.tens,
                crates: placeValues.hundreds,
                trucks: placeValues.thousands
            });

            components.push({
                type: 'objectCounting',
                object: resourceBar,
                offsetX: 0,
                offsetY: objectCountingYOffset
            });

            console.log(`🔢 Rendered place values for ${numberValue} using ResourceBar`);
        } else if (numberModes.onlyApples) {
            // Only apples mode: 🍎🍎🍎 (simple counting with educational layouts)
            const appleComponents = this.objectCountingRenderer.renderStackedApples(
                numberValue,
                centerX,
                centerY + objectCountingYOffset
            );

            // Add each apple component with proper offset tracking
            appleComponents.forEach(comp => {
                components.push({
                    type: 'onlyApples',
                    object: comp,
                    offsetX: comp.x - centerX, // Calculate offset from center
                    offsetY: comp.y - centerY  // Calculate offset from center
                });
            });

            console.log(`🍎 Rendered only apples for ${numberValue}: ${appleComponents.length} apples`);
        }

        // Store component layout (no label offset needed - labels stay in normal position)
        if (!obj.componentLayout) {
            obj.componentLayout = {};
        }
        obj.componentLayout.numberModes = components;
        obj.componentLayout.labelVerticalOffset = 0; // Labels stay in normal position
    }

    // Configuration and content selection methods
    selectSpawnType() {
        const config = this.configManager ? this.configManager.getConfig() : null;
        if (!config) return 'emoji';

        const types = config.content || {};
        const weights = [];

        if (types.shapes?.enabled && types.shapes?.weight > 0) weights.push({ type: 'shapes', weight: types.shapes.weight });
        if (types.smallNumbers?.enabled && types.smallNumbers?.weight > 0) weights.push({ type: 'smallNumbers', weight: types.smallNumbers.weight });
        if (types.largeNumbers?.enabled && types.largeNumbers?.weight > 0) weights.push({ type: 'largeNumbers', weight: types.largeNumbers.weight });
        if (types.uppercaseLetters?.enabled && types.uppercaseLetters?.weight > 0) weights.push({ type: 'uppercaseLetters', weight: types.uppercaseLetters.weight });
        if (types.lowercaseLetters?.enabled && types.lowercaseLetters?.weight > 0) weights.push({ type: 'lowercaseLetters', weight: types.lowercaseLetters.weight });
        if (types.emojis?.enabled && types.emojis?.weight > 0) weights.push({ type: 'emoji', weight: types.emojis.weight });

        if (weights.length === 0) return 'emoji';

        // Weighted random selection with debug logging
        const totalWeight = weights.reduce((sum, item) => sum + item.weight, 0);
        let random = Math.random() * totalWeight;

        // DEBUG: Log weight distribution (disable after testing)
        const weightSummary = weights.map(w => `${w.type}:${w.weight}`).join(', ');

        for (const item of weights) {
            random -= item.weight;
            if (random <= 0) {
                // DEBUG: Log selection details
                console.log(`🎲 Spawn weights [${weightSummary}] total:${totalWeight} → Selected: ${item.type}`);
                return item.type;
            }
        }

        console.log(`🎲 Spawn weights [${weightSummary}] → Fallback: ${weights[0].type}`);
        return weights[0].type;
    }

    async getRandomEmoji() {
        try {
            // Load emoji data if not already cached
            if (!this.emojiData) {
                const response = await fetch(`/emojis.json?v=${Date.now()}`);
                this.emojiData = await response.json();
            }

            // Get filtered emojis based on enabled emoji categories
            const config = this.configManager ? this.configManager.getConfig() : null;
            let availableEmojis = this.emojiData;

            // Filter by enabled emoji categories (animals, food, vehicles, etc.)
            if (config && config.emojiCategories) {
                const enabledCategories = Object.entries(config.emojiCategories)
                    .filter(([key, val]) => val.enabled)
                    .map(([key]) => key);

                if (enabledCategories.length > 0) {
                    availableEmojis = availableEmojis.filter(emoji =>
                        emoji.categories && emoji.categories.some(cat =>
                            enabledCategories.includes(cat)
                        )
                    );

                    console.log(`🎯 Filtered emojis: ${availableEmojis.length} available from categories [${enabledCategories.join(', ')}]`);
                }
            }

            // Fallback to all emojis if no valid ones after filtering
            if (availableEmojis.length === 0) {
                console.warn('⚠️ No emojis matched enabled categories, using all emojis as fallback');
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
                const response = await fetch(`/things.json?v=${Date.now()}`);
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
                const response = await fetch(`/things.json?v=${Date.now()}`);
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

    async getRandomColor(allowedCategories = null) {
        try {
            // Load things data if not already cached
            if (!this.thingsData) {
                const response = await fetch(`/things.json?v=${Date.now()}`);
                this.thingsData = await response.json();
            }

            // Get enabled color categories from config
            const config = this.configManager ? this.configManager.getConfig() : null;
            const colorCategories = config?.colorCategories || {};

            // Get enabled category names
            const enabledCategories = Object.entries(colorCategories)
                .filter(([key, value]) => value.enabled)
                .map(([key, value]) => key);

            // Filter colors by enabled categories
            const colors = this.thingsData.colors || [];
            const allowedSet = Array.isArray(allowedCategories) && allowedCategories.length > 0
                ? new Set(allowedCategories)
                : null;

            const matchesAllowed = (color) => {
                if (!allowedSet) return true;
                if (color.category && allowedSet.has(color.category)) return true;
                if (Array.isArray(color.categories)) {
                    return color.categories.some(cat => allowedSet.has(cat));
                }
                return false;
            };

            let availableColors = colors.filter(color =>
                (enabledCategories.length === 0 || enabledCategories.includes(color.category)) && matchesAllowed(color)
            );

            // If filtering by enabled categories removed all options, fallback to allowed categories regardless of config
            if (availableColors.length === 0 && allowedSet) {
                availableColors = colors.filter(matchesAllowed);
            }

            // Fallback to all colors if none available
            if (availableColors.length === 0) {
                availableColors = colors;
            }

            // Select random color
            if (availableColors.length === 0) {
                return { value: 'White', en: 'White', hex: '#ffffff' };
            }

            const randomIndex = Math.floor(Math.random() * availableColors.length);
            const chosenColor = availableColors[randomIndex];
            return { ...chosenColor };

        } catch (error) {
            console.error('Error loading color data:', error);
            return { value: 'White', en: 'White', hex: '#ffffff' };
        }
    }

    async getRandomNumber(configType = 'smallNumbers') {
        try {
            // Load things data if not already cached
            if (!this.thingsData) {
                const response = await fetch(`/things.json?v=${Date.now()}`);
                this.thingsData = await response.json();
            }

            const numbers = this.thingsData.numbers || [];

            if (numbers.length === 0) {
                return { value: 1, type: 'number' };
            }

            const getRangeForType = () => {
                if (!this.configManager) return null;

                if (configType === 'smallNumbers' && this.configManager.getSmallNumberRange) {
                    return this.configManager.getSmallNumberRange();
                }

                if (configType === 'largeNumbers' && this.configManager.getLargeNumberRange) {
                    return this.configManager.getLargeNumberRange();
                }

                return null;
            };

            const range = getRangeForType();

            const normaliseBound = (value, fallback) => {
                if (value === undefined || value === null) {
                    return fallback;
                }

                const numeric = Number(value);
                return Number.isFinite(numeric) ? numeric : fallback;
            };

            const min = normaliseBound(range?.min, undefined);
            const max = normaliseBound(range?.max, undefined);

            const applyRangeFilter = (list) => {
                if (min === undefined && max === undefined) {
                    return list;
                }

                return list.filter(num => {
                    const value = typeof num.value === 'number' ? num.value : Number(num.value);
                    if (Number.isNaN(value)) return false;
                    if (min !== undefined && value < min) return false;
                    if (max !== undefined && value > max) return false;
                    return true;
                });
            };

            const generateRangeFallback = () => {
                // Only attempt generation when we have a valid numeric span
                const fallbackMin = normaliseBound(min, configType === 'smallNumbers' ? 0 : 12);
                const fallbackMax = normaliseBound(max, configType === 'smallNumbers' ? 10 : 9999);

                if (fallbackMin > fallbackMax) {
                    return null;
                }

                const randomValue = Math.floor(Math.random() * (fallbackMax - fallbackMin + 1)) + fallbackMin;

                const languageLocales = {
                    en: 'en-US',
                    es: 'es-ES',
                    zh: 'zh-CN',
                    hi: 'hi-IN',
                    ar: 'ar-SA',
                    fr: 'fr-FR',
                    bn: 'bn-BD',
                    pt: 'pt-PT',
                    ru: 'ru-RU',
                    id: 'id-ID'
                };

                const enabledLanguages = this.configManager?.getConfig()?.languages?.enabled || [];
                const generated = {
                    value: randomValue,
                    type: 'number',
                    categories: ['counting', 'generated'],
                    source: 'generated-range'
                };

                const ensureEntry = (code, formatter) => {
                    try {
                        generated[code] = formatter ? formatter.format(randomValue) : String(randomValue);
                    } catch (fmtError) {
                        console.warn('Failed to format number for language', code, fmtError);
                        generated[code] = String(randomValue);
                    }
                };

                // Always provide English fallback even if not explicitly enabled
                const getFormatter = (locale) => {
                    if (!locale || typeof Intl === 'undefined' || !Intl.NumberFormat) {
                        return null;
                    }

                    try {
                        return new Intl.NumberFormat(locale);
                    } catch (err) {
                        console.warn('Failed to create number formatter for locale', locale, err);
                        return null;
                    }
                };

                ensureEntry('en', getFormatter(languageLocales.en));

                enabledLanguages.forEach(lang => {
                    const locale = languageLocales[lang.code];
                    ensureEntry(lang.code, getFormatter(locale));
                });

                return generated;
            };

            let filteredNumbers = applyRangeFilter(numbers);
            let selectedNumber;

            if (filteredNumbers.length === 0) {
                if (range) {
                    console.warn(`No numbers available for ${configType} in range ${min ?? '-∞'}-${max ?? '+∞'}. Attempting to generate values.`);
                }

                selectedNumber = generateRangeFallback();

                if (!selectedNumber) {
                    // Fall back to legacy heuristics before finally resorting to the raw dataset
                    if (configType === 'smallNumbers') {
                        filteredNumbers = numbers.filter(num => num.value <= 10);
                    } else if (configType === 'largeNumbers') {
                        filteredNumbers = numbers.filter(num => num.value >= 12);
                    }

                    if (filteredNumbers.length > 0) {
                        const legacyIndex = Math.floor(Math.random() * filteredNumbers.length);
                        selectedNumber = { ...filteredNumbers[legacyIndex], type: 'number' };
                    }
                }
            }

            if (!selectedNumber) {
                // Normal path: use filtered dataset values
                const pool = filteredNumbers.length > 0 ? filteredNumbers : numbers;
                const randomIndex = Math.floor(Math.random() * pool.length);
                selectedNumber = { ...pool[randomIndex], type: 'number' };
            }

            const number = { ...selectedNumber };

            // Assign a random color to the number
            const color = await this.getRandomColor();
            number.color = color;

            return number;

        } catch (error) {
            console.error('Error loading number data:', error);
            return { value: 1, type: 'number' };
        }
    }

    // Auto-cleanup system

    removeObject(obj) {
        if (!obj) return;

        // Check if this is a grid object that should be respawned
        const shouldRespawnInGrid = this.gridMode.enabled && obj.gridCell;
        const gridCell = obj.gridCell; // Store before removal

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

            // Remove from grid occupied cells if in grid mode
            if (gridCell) {
                const cellKey = `${gridCell.row},${gridCell.col}`;
                this.gridMode.occupiedCells.delete(cellKey);
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

        // Save game state after removing object
        this.saveGameState();
    }


    // State preservation methods
    saveGameState() {
        if (!this.objects || this.objects.length === 0) {
            // Clear saved state if no objects exist
            localStorage.removeItem('toddleToyGameState');
            return;
        }

        const gameState = {
            objects: this.objects.map(obj => ({
                id: obj.id,
                x: obj.x,
                y: obj.y,
                text: obj.text,
                itemData: obj.itemData,
                type: obj.type,
                lastTouchedTime: obj.lastTouchedTime || Date.now()
            })),
            timestamp: Date.now()
        };

        try {
            localStorage.setItem('toddleToyGameState', JSON.stringify(gameState));
            console.log('💾 Game state saved:', gameState.objects.length, 'objects');
        } catch (error) {
            console.warn('Failed to save game state:', error);
        }
    }

    async restoreGameState() {
        try {
            const savedState = localStorage.getItem('toddleToyGameState');
            if (!savedState) return;

            const gameState = JSON.parse(savedState);

            // Check if saved state is recent (within 1 hour to avoid stale data)
            const ageHours = (Date.now() - gameState.timestamp) / (1000 * 60 * 60);
            if (ageHours > 1) {
                console.log('🕐 Saved state too old, clearing');
                localStorage.removeItem('toddleToyGameState');
                return;
            }

            // Wait for game to be fully initialized before restoring
            if (!this.isFullyInitialized) {
                setTimeout(() => this.restoreGameState(), 100);
                return;
            }

            console.log('📦 Restoring game state:', gameState.objects.length, 'objects');

            // Restore each object
            for (const objData of gameState.objects) {
                try {
                    await this.restoreObject(objData);
                } catch (error) {
                    console.warn('Failed to restore object:', objData, error);
                }
            }

            console.log('✨ Game state restoration complete');

        } catch (error) {
            console.warn('Failed to restore game state:', error);
            localStorage.removeItem('toddleToyGameState');
        }
    }

    async restoreObject(objData) {
        if (!objData || !objData.itemData || !objData.type) return;

        // Ensure restored items have color information when expected
        if (objData.type === 'letter' && (!objData.itemData.color || !objData.itemData.color.hex)) {
            objData.itemData.color = await this.getRandomColor();
        } else if (objData.type === 'shape' && (!objData.itemData.color || !objData.itemData.color.hex)) {
            const allowedCategories = Array.isArray(objData.itemData.colors) ? objData.itemData.colors : null;
            objData.itemData.color = await this.getRandomColor(allowedCategories);
        }

        // Get display text using the same logic as spawnObjectAt
        const displayText = this.renderManager.getDisplayText(objData.itemData, objData.type);

        const obj = this.createPrimaryDisplayObject(objData.type, objData.itemData, displayText, objData.x, objData.y);

        if (!obj) {
            console.warn('Failed to restore object of type:', objData.type);
            return;
        }

        // Restore object data and metadata
        obj.itemData = objData.itemData;
        obj.type = objData.type;
        obj.id = objData.id;
        obj.lastTouchedTime = objData.lastTouchedTime || Date.now();

        // Add to objects array
        this.objects.push(obj);

        // Render number modes FIRST if this is a number (to calculate layout offset)
        if (objData.type === 'number' && objData.itemData.value) {
            this.renderAllNumberModes(obj, objData.itemData.value, objData.x, objData.y);
        }

        // Display text labels with dynamic vertical offset (for object counting layout)
        const verticalOffset = obj.componentLayout?.labelVerticalOffset || 0;
        this.renderManager.displayTextLabels(obj, verticalOffset);

        console.log(`✨ Restored ${objData.type}:`, displayText, 'at', objData.x, objData.y);
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

        // Wait for scene to be ready, then pass configManager
        this.gameInstance.events.once('ready', () => {
            const scene = this.gameInstance.scene.getScene('GameScene');
            if (scene && this.configManager) {
                scene.configManager = this.configManager;
                console.log('📋 ConfigManager passed to GameScene after ready event');
            }
        });

        // Global click debugging (remove in production)
        // window.addEventListener('click', (e) => {
        //     console.log('🔍 GLOBAL CLICK DETECTED:', e.clientX, e.clientY, e.target.tagName, e.target.className);
        // });

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
export { ResponsiveGameManager, GameScene };

// Legacy export alias for compatibility
export { ResponsiveGameManager as ToddlerToyGame };
