/**
 * AutoCleanupManager - Handles automatic object cleanup based on time since last interaction
 * Extracted from GameScene to follow "wide and shallow" principle
 */
export class AutoCleanupManager {
    constructor(scene) {
        this.scene = scene;
        this.autoCleanupConfig = null;
        this.lastCleanupCheck = Date.now();
        this.cleanupCheckInterval = 1000; // Check every second
        
        this.updateAutoCleanupConfig();
        console.log('AutoCleanupManager initialized');
    }

    /**
     * Update auto-cleanup configuration from the scene's config manager
     */
    updateAutoCleanupConfig() {
        const config = this.scene.configManager ? this.scene.configManager.getConfig() : null;
        this.autoCleanupConfig = config?.autoCleanup || null;
    }

    /**
     * Check for objects that need to be cleaned up based on time since last interaction
     * This is called periodically from the game update loop
     */
    checkAutoCleanup() {
        const now = Date.now();
        if (now - this.lastCleanupCheck < this.cleanupCheckInterval) return;
        
        this.lastCleanupCheck = now;
        
        if (!this.autoCleanupConfig || !this.autoCleanupConfig.enabled || !this.autoCleanupConfig.timeout) {
            return;
        }
        
        const objectsToCleanup = this.scene.objects.filter(obj => {
            if (!obj || !obj.active) return false;
            
            const timeSinceLastTouch = now - (obj.lastTouchedTime || obj.spawnTime || now);
            return timeSinceLastTouch > this.autoCleanupConfig.timeout;
        });
        
        objectsToCleanup.forEach(obj => {
            this.cleanupObjectWithEffects(obj);
        });
    }

    /**
     * Clean up an object with visual and audio effects
     * @param {Object} obj - Phaser game object to clean up
     */
    cleanupObjectWithEffects(obj) {
        if (!obj || !obj.active) return;
        
        // Create cleanup particle effect
        this.scene.particleManager.createCleanupParticleEffect(obj.x, obj.y);
        
        // Play cleanup sound (implement if needed)
        // this.playCleanupSound();
        
        // Remove the object
        this.scene.removeObject(obj);
    }

    /**
     * Update the last touched time for an object to prevent cleanup
     * @param {Object} obj - Phaser game object that was interacted with
     */
    updateObjectTouchTime(obj) {
        if (obj) {
            obj.lastTouchedTime = Date.now();
        }
    }

    /**
     * Check if auto-cleanup is currently enabled
     * @returns {boolean} True if auto-cleanup is enabled
     */
    isEnabled() {
        return this.autoCleanupConfig && this.autoCleanupConfig.enabled;
    }

    /**
     * Get the current cleanup timeout in milliseconds
     * @returns {number|null} Timeout in milliseconds or null if not configured
     */
    getTimeout() {
        return this.autoCleanupConfig ? this.autoCleanupConfig.timeout : null;
    }

    /**
     * Get the current cleanup check interval
     * @returns {number} Check interval in milliseconds
     */
    getCheckInterval() {
        return this.cleanupCheckInterval;
    }

    /**
     * Set the cleanup check interval
     * @param {number} interval - Check interval in milliseconds (minimum 100ms)
     */
    setCheckInterval(interval) {
        this.cleanupCheckInterval = Math.max(100, interval); // Minimum 100ms
    }

    /**
     * Get the time since last cleanup check
     * @returns {number} Time in milliseconds since last check
     */
    getTimeSinceLastCheck() {
        return Date.now() - this.lastCleanupCheck;
    }

    /**
     * Force an immediate cleanup check (bypasses interval)
     */
    forceCleanupCheck() {
        this.lastCleanupCheck = 0;
        this.checkAutoCleanup();
    }

    /**
     * Reset the cleanup system (useful for when clearing all objects)
     */
    reset() {
        this.lastCleanupCheck = Date.now();
    }

    /**
     * Cleanup resources
     */
    destroy() {
        // Reset timers and state
        this.reset();
        this.autoCleanupConfig = null;
        console.log('AutoCleanupManager destroyed');
    }
}