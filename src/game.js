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
import { GridModeController } from './game/systems/GridModeController.js'
import packageJson from '../package.json'
import emojiDataBundled from '../public/emojis.json'
import thingsDataBundled from '../public/things.json'
import { GameStateStore } from './game/systems/GameStateStore.js'
import { NumberModeRenderer } from './game/systems/NumberModeRenderer.js'
import { SceneInputHandler } from './game/systems/SceneInputHandler.js'
import { ResponsiveGameManager } from './game/ResponsiveGameManager.js'
import { ObjectFactory } from './game/objects/ObjectFactory.js'
import { ObjectLifecycle } from './game/objects/ObjectLifecycle.js'
import { remapPosition, defaultKeepOutRects } from './positioning/BoundsClamp.js'
import { ContentSelector } from './game/systems/ContentSelector.js'

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    // Lazily-built helper modules (work even when create() has not run)
    get gameStateStore() { return this._gameStateStore ??= new GameStateStore(this); }
    get numberModeRenderer() { return this._numberModeRenderer ??= new NumberModeRenderer(this); }
    get sceneInputHandler() { return this._sceneInputHandler ??= new SceneInputHandler(this); }
    get objectFactory() { return this._objectFactory ??= new ObjectFactory(this); }
    get objectLifecycle() { return this._objectLifecycle ??= new ObjectLifecycle(this); }
    get contentSelector() { return this._contentSelector ??= new ContentSelector(this); }
    get gridModeController() { return this._gridModeController ??= new GridModeController(this); }

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

        // Keep objects reachable when the viewport changes (resize / rotation)
        this.lastKnownSize = { width: this.scale.width, height: this.scale.height };
        if (this.updateKeepOutRects) this.updateKeepOutRects();
        this.scale.on('resize', this.handleScaleResize, this);
        this.events.once('shutdown', () => this.scale.off('resize', this.handleScaleResize, this));

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
    initializeGridMode() { return this.gridModeController.initializeGridMode(); }

    /**
     * Enable Grid Mode - switch from free-form to structured grid layout
     */
    enableGridMode() { return this.gridModeController.enableGridMode(); }

    /**
     * Disable Grid Mode - switch from grid to free-form layout
     */
    disableGridMode() { return this.gridModeController.disableGridMode(); }

    /**
     * Create visual grid overlay with lines
     */
    createGridOverlay() { return this.gridModeController.createGridOverlay(); }

    /**
     * Populate grid with random objects
     */
    populateGrid() { return this.gridModeController.populateGrid(); }

    /**
     * Spawn object in specific grid cell
     */
    async spawnObjectInGridCell(row, col, type = 'random') { return this.gridModeController.spawnObjectInGridCell(row, col, type); }

    /**
     * Remove object from specific grid cell
     */
    async removeObjectFromGridCell(row, col, autoRespawn = true) { return this.gridModeController.removeObjectFromGridCell(row, col, autoRespawn); }

    async preloadGameData() {
        // Emoji/things data is bundled at build time (imported directly from
        // public/emojis.json and public/things.json) rather than fetched at
        // runtime. This makes offline play structurally impossible to break:
        // there is no network request to fail, no cache-busting query string
        // to defeat the Workbox precache, and no per-tap fetch cost.
        if (!this.emojiData) {
            this.emojiData = emojiDataBundled;
            console.log('📦 Emoji data ready (bundled):', this.emojiData.length, 'emojis');
        }

        if (!this.thingsData) {
            this.thingsData = thingsDataBundled;
            console.log('📦 Things data ready (bundled)');
        }

        this.dataLoaded = true;
        this.checkFullInitialization();
    }

    checkFullInitialization() {
        // Check if fonts are also loaded
        this.fontsLoaded = document.fonts.check('1em Kaktovik');

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
    async onInputPointerDown(data) { return this.sceneInputHandler.onInputPointerDown(data); }

    onInputPointerMove(data) { return this.sceneInputHandler.onInputPointerMove(data); }

    onInputPointerUp(data) { return this.sceneInputHandler.onInputPointerUp(data); }

    /**
     * Start dragging an object with visual feedback
     * @param {Object} obj - The object to start dragging
     * @param {number} x - Current pointer X position
     * @param {number} y - Current pointer Y position
     */
    startDragging(obj, x, y) { return this.sceneInputHandler.startDragging(obj, x, y); }

    /**
     * Stop dragging with smooth scale-down animation
     */
    stopDragging() { return this.sceneInputHandler.stopDragging(); }

    async onInputKeyPress(data) { return this.sceneInputHandler.onInputKeyPress(data); }

    onInputKeyInterpolate(data) { return this.sceneInputHandler.onInputKeyInterpolate(data); }

    onInputKeyRelease(data) { return this.sceneInputHandler.onInputKeyRelease(data); }

    async onInputGamepadButtonDown(data) { return this.sceneInputHandler.onInputGamepadButtonDown(data); }

    onInputGamepadButtonUp(data) { return this.sceneInputHandler.onInputGamepadButtonUp(data); }

    onInputGamepadMove(data) { return this.sceneInputHandler.onInputGamepadMove(data); }

    onInputHoldStart(data) { return this.sceneInputHandler.onInputHoldStart(data); }

    // Object management methods
    getObjectUnderPointer(x, y) { return this.sceneInputHandler.getObjectUnderPointer(x, y); }

    moveObjectTo(obj, x, y, useSmooth = true) {
        if (!obj || !obj.active) return;

        // Track movement time for spawn cooldown
        this.lastMoveTime = Date.now();

        if (useSmooth) {
            // Delegate to movement manager
            this.movementManager.moveObjectTo(obj, x, y);
        } else {
            // Immediate positioning (still clamped to the visible area)
            this.movementManager.moveObjectTo(obj, x, y, false);
        }
    }

    /**
     * Pull an object (with all its labels and number-mode rows) fully inside the
     * visible area. Used after spawn/restore and on resize.
     * @returns {boolean} true if the object had to move
     */
    keepObjectInBounds(obj) {
        if (!obj || !obj.active || !this.movementManager || !this.movementManager.clampPosition) return false;
        const target = this.movementManager.clampPosition(obj, obj.x, obj.y);
        if (Math.abs(target.x - obj.x) < 0.5 && Math.abs(target.y - obj.y) < 0.5) return false;
        this.movementManager.setObjectPosition(obj, target.x, target.y);
        return true;
    }

    /**
     * Canvas-space rectangles objects must stay out of. Default: the square under
     * the DOM parent exit button in the top-right corner (data only; no DOM query).
     */
    updateKeepOutRects() {
        this.keepOutRects = defaultKeepOutRects({ width: this.scale.width, height: this.scale.height });
    }

    /**
     * Scale resize / device rotation: bring every object back inside the new
     * bounds (proportional remap, then clamp so components stay attached).
     */
    handleScaleResize() {
        const width = this.scale?.width;
        const height = this.scale?.height;
        if (!width || !height) return;

        const previous = this.lastKnownSize || { width, height };
        this.lastKnownSize = { width, height };
        if (this.updateKeepOutRects) this.updateKeepOutRects();

        // Grid mode: refit the grid to the new size and rebuild each cell's object inside its cell
        if (this.gridMode && this.gridMode.enabled) {
            this.gridModeController.handleResize();
            if (this.inputManager && this.inputManager.handleResize) this.inputManager.handleResize(previous);
            return;
        }

        (this.objects || []).forEach(obj => {
            if (!obj || !obj.active) return;
            if (this.movementManager) this.movementManager.clearMovement(obj.id);
            const target = remapPosition(obj.x, obj.y, previous, { width, height });
            this.movementManager.setObjectPosition(obj, target.x, target.y);
            this.keepObjectInBounds(obj);
        });

        if (this.inputManager && this.inputManager.handleResize) {
            this.inputManager.handleResize(previous);
        }
        // Never persist an empty list from a resize: the initial resize fires before saved state is restored
        if ((this.objects || []).length > 0) this.saveGameState();
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
        // No spawn yet this session (e.g. objects restored after a reload)
        if (!this.lastSpawnTime) return true;
        return (Date.now() - this.lastSpawnTime) >= this.MOVE_AFTER_SPAWN_DELAY;
    }

    createPrimaryDisplayObject(actualType, itemData, displayText, x, y) { return this.objectFactory.createPrimaryDisplayObject(actualType, itemData, displayText, x, y); }

    createShapeObject(itemData, x, y, labelText = '') { return this.objectFactory.createShapeObject(itemData, x, y, labelText); }

    async spawnObjectAt(x, y, type = 'random') { return this.objectLifecycle.spawnObjectAt(x, y, type); }

    /**
     * Spawn an object and announce it with speech, audio, and particle effects.
     * This helper consolidates the common pattern of spawning + announcing used across input handlers.
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {string} type - Spawn type (default: 'random')
     * @returns {Promise<Object|null>} The spawned object or null if spawn failed
     */
    async spawnAndAnnounce(x, y, type = 'random') { return this.objectLifecycle.spawnAndAnnounce(x, y, type); }

    /**
     * Announce an already-spawned object with speech, audio, and particle effects.
     * Used after spawnObjectInGridCell or other specialized spawn methods.
     * @param {Object} obj - The spawned object
     * @param {number} x - X coordinate for audio/particles
     * @param {number} y - Y coordinate for audio/particles
     */
    announceObject(obj, x, y) { return this.objectLifecycle.announceObject(obj, x, y); }

    renderAllNumberModes(obj, numberValue, centerX, centerY) { return this.numberModeRenderer.renderAllNumberModes(obj, numberValue, centerX, centerY); }

    // Configuration and content selection methods
    selectSpawnType() { return this.contentSelector.selectSpawnType(); }

    async getRandomEmoji() { return this.contentSelector.getRandomEmoji(); }

    async getRandomShape() { return this.contentSelector.getRandomShape(); }

    async getRandomLetter(configType = 'uppercaseLetters') { return this.contentSelector.getRandomLetter(configType); }

    async getRandomColor(allowedCategories = null) { return this.contentSelector.getRandomColor(allowedCategories); }

    async getRandomNumber(configType = 'smallNumbers') { return this.contentSelector.getRandomNumber(configType); }

    getNumberRangeForType(configType) { return this.contentSelector.getNumberRangeForType(configType); }

    // Auto-cleanup system

    removeObject(obj) { return this.objectLifecycle.removeObject(obj); }


    // State preservation methods
    saveGameState() { return this.gameStateStore.saveGameState(); }

    async restoreGameState() { return this.gameStateStore.restoreGameState(); }

    async restoreObject(objData) { return this.gameStateStore.restoreObject(objData); }

    // Cleanup methods
    resetToyState() { return this.gameStateStore.resetToyState(); }

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

// Export for main.js and routes
export { ResponsiveGameManager, GameScene };

// Legacy export alias for compatibility
export { ResponsiveGameManager as ToddlerToyGame };
