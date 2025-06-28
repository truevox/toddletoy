/**
 * Route definitions for the toddler toy application
 */
import { Router } from './Router.js';
import { ConfigManager } from '../config/ConfigManager.js';
import { ConfigScreen } from '../config/ConfigScreen.js';
import { ToddlerToyGame } from '../game.js';

export class AppRoutes {
    constructor() {
        this.router = new Router();
        this.configManager = new ConfigManager();
        this.configScreen = null;
        this.game = null;
        this.currentScreen = null;
        
        this.setupRoutes();
    }

    setupRoutes() {
        // Default route: Configuration screen
        this.router.addRoute('/', () => this.showConfigScreen());
        
        // Main toy route
        this.router.addRoute('/toy', () => this.showToyScreen());
        
        // Admin route: Always show config (bypass skip setting)
        this.router.addRoute('/admin', () => this.showConfigScreen(true));
    }

    /**
     * Show configuration screen
     * @param {boolean} forceShow - Force show config even if skip is enabled
     */
    showConfigScreen(forceShow = false) {
        // Check if we should skip config and go straight to toy
        if (!forceShow && this.configManager.shouldSkipConfig()) {
            this.router.replace('/toy');
            return;
        }

        this.hideCurrentScreen();
        
        if (!this.configScreen) {
            this.configScreen = new ConfigScreen(this.configManager, this.router);
        }
        
        this.configScreen.show();
        this.currentScreen = 'config';
        
        // Update page title
        document.title = 'ToddleToy - Configure';
    }

    /**
     * Show toy/game screen
     */
    showToyScreen() {
        this.hideCurrentScreen();
        
        // Create game instance if it doesn't exist
        if (!this.game) {
            this.game = new ToddlerToyGame(this.configManager);
        }
        
        this.currentScreen = 'toy';
        
        // Update page title
        document.title = 'ToddleToy - Interactive Learning';
    }

    /**
     * Hide currently active screen
     */
    hideCurrentScreen() {
        if (this.currentScreen === 'config' && this.configScreen) {
            this.configScreen.hide();
        } else if (this.currentScreen === 'toy' && this.game) {
            // Pause or minimize game if needed
            if (this.game.game && this.game.game.scene) {
                const scene = this.game.game.scene.scenes[0];
                if (scene && scene.scene) {
                    scene.scene.pause();
                }
            }
        }
    }

    /**
     * Get current route
     */
    getCurrentRoute() {
        return this.router.getCurrentRoute();
    }

    /**
     * Navigate to specific route
     */
    navigate(path) {
        this.router.navigate(path);
    }

    /**
     * Get config manager instance
     */
    getConfigManager() {
        return this.configManager;
    }
}