import { safeStorage } from '../../utils/safeStorage.js';

/**
 * GameStateStore - Persists/restores spawned objects (localStorage) and resets toy state.
 * State stays on the scene; calls go back through the scene so spies intercept.
 */
export class GameStateStore {
    constructor(scene) {
        this.scene = scene;
    }

    // State preservation methods
    saveGameState() {
        if (!this.scene.objects || this.scene.objects.length === 0) {
            // Clear saved state if no objects exist
            safeStorage.removeItem('toddleToyGameState');
            return;
        }

        const gameState = {
            objects: this.scene.objects.map(obj => ({
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
            safeStorage.setItem('toddleToyGameState', JSON.stringify(gameState));
        } catch (error) {
            console.warn('Failed to save game state:', error);
        }
    }

    async restoreGameState() {
        try {
            const savedState = safeStorage.getItem('toddleToyGameState');
            if (!savedState) return;

            const gameState = JSON.parse(savedState);

            // Wrong-shaped saved state (null, array, missing/garbage fields): discard it
            if (!gameState || typeof gameState !== 'object' || Array.isArray(gameState) ||
                !Array.isArray(gameState.objects) || !Number.isFinite(gameState.timestamp)) {
                console.warn('Saved game state has an unexpected shape, clearing');
                safeStorage.removeItem('toddleToyGameState');
                return;
            }

            // Check if saved state is recent (within 1 hour to avoid stale data)
            const ageHours = (Date.now() - gameState.timestamp) / (1000 * 60 * 60);
            if (ageHours > 1) {
                console.log('🕐 Saved state too old, clearing');
                safeStorage.removeItem('toddleToyGameState');
                return;
            }

            // Wait for game to be fully initialized before restoring
            if (!this.scene.isFullyInitialized) {
                setTimeout(() => this.scene.restoreGameState(), 100);
                return;
            }

            console.log('📦 Restoring game state:', gameState.objects.length, 'objects');
            // Restore each object
            for (const objData of gameState.objects) {
                try {
                    await this.scene.restoreObject(objData);
                } catch (error) {
                    console.warn('Failed to restore object:', objData, error);
                }
            }

            console.log('✨ Game state restoration complete');

        } catch (error) {
            console.warn('Failed to restore game state:', error);
            safeStorage.removeItem('toddleToyGameState');
        }
    }

    async restoreObject(objData) {
        if (!objData || typeof objData !== 'object' || !objData.itemData || typeof objData.itemData !== 'object' ||
            typeof objData.type !== 'string' || !objData.type ||
            !Number.isFinite(objData.x) || !Number.isFinite(objData.y)) return;

        // Ensure restored items have color information when expected
        if (objData.type === 'letter' && (!objData.itemData.color || !objData.itemData.color.hex)) {
            objData.itemData.color = await this.scene.getRandomColor();
        } else if (objData.type === 'shape' && (!objData.itemData.color || !objData.itemData.color.hex)) {
            const allowedCategories = Array.isArray(objData.itemData.colors) ? objData.itemData.colors : null;
            objData.itemData.color = await this.scene.getRandomColor(allowedCategories);
        }

        // Get display text using the same logic as spawnObjectAt
        const displayText = this.scene.renderManager.getDisplayText(objData.itemData, objData.type);

        const obj = this.scene.createPrimaryDisplayObject(objData.type, objData.itemData, displayText, objData.x, objData.y);

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
        this.scene.objects.push(obj);

        // Render number modes FIRST if this is a number (to calculate layout offset)
        if (objData.type === 'number' && Number.isFinite(objData.itemData.value)) {
            this.scene.renderAllNumberModes(obj, objData.itemData.value, objData.x, objData.y);
        }

        // Display text labels with dynamic vertical offset (for object counting layout)
        const verticalOffset = obj.componentLayout?.labelVerticalOffset || 0;
        this.scene.renderManager.displayTextLabels(obj, verticalOffset);
        if (this.scene.keepObjectInBounds) this.scene.keepObjectInBounds(obj);

        console.log(`✨ Restored ${objData.type}:`, displayText, 'at', objData.x, objData.y);
        return obj;
    }

    // Cleanup methods
    resetToyState() {
        // Stop all audio tones
        if (this.scene.audioManager) {
            this.scene.audioManager.stopAllTones();
        }

        // Cancel speech
        if (this.scene.speechManager) {
            this.scene.speechManager.cancelSpeech();
        }

        // Clean up all objects
        // Iterate over a copy: removeObject() splices scene.objects as it goes
        [...this.scene.objects].forEach(obj => this.scene.removeObject(obj));
        this.scene.objects = [];

        // Sparkles and spawn bursts normally clean themselves up on scene timers,
        // which do not run once the scene is paused behind another screen.
        if (this.scene.particleManager && this.scene.particleManager.clearTransientEffects) {
            this.scene.particleManager.clearTransientEffects();
        }

        // Clear movement queue
        this.scene.movementManager.clearAllMovements();

        // Reset state
        if (this.scene.inputManager && this.scene.inputManager.clearHeldKeys) {
            this.scene.inputManager.clearHeldKeys();
        }
        this.scene.isDragging = false;
        this.scene.draggedObject = null;
        this.scene.currentSpeakingObject = null;

        console.log('🧹 Toy state reset complete');
    }
}
