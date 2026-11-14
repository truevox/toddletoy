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
            localStorage.removeItem('toddleToyGameState');
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
            localStorage.removeItem('toddleToyGameState');
        }
    }

    async restoreObject(objData) {
        if (!objData || !objData.itemData || !objData.type) return;

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
        if (objData.type === 'number' && objData.itemData.value) {
            this.scene.renderAllNumberModes(obj, objData.itemData.value, objData.x, objData.y);
        }

        // Display text labels with dynamic vertical offset (for object counting layout)
        const verticalOffset = obj.componentLayout?.labelVerticalOffset || 0;
        this.scene.renderManager.displayTextLabels(obj, verticalOffset);

        console.log(`✨ Restored ${objData.type}:`, displayText, 'at', objData.x, objData.y);
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
        this.scene.objects.forEach(obj => this.scene.removeObject(obj));
        this.scene.objects = [];

        // Clear movement queue
        this.scene.movementManager.clearAllMovements();

        // Reset state
        this.scene.isDragging = false;
        this.scene.draggedObject = null;
        this.scene.currentSpeakingObject = null;

        console.log('🧹 Toy state reset complete');
    }
}
