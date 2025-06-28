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
        
        // Initialize router after routes are set up
        this.router.init();
    }

    setupRoutes() {
        console.log('Setting up routes...');
        
        // Default route: Configuration screen
        this.router.addRoute('/', () => {
            console.log('Handling root route /');
            this.showConfigScreen();
        });
        
        // Main toy route
        this.router.addRoute('/toy', () => {
            console.log('Handling toy route /toy');
            this.showToyScreen();
        });
        
        // Admin route: Always show config (bypass skip setting)
        this.router.addRoute('/admin', () => {
            console.log('Handling admin route /admin');
            this.showConfigScreen(true);
        });
        
        console.log('Routes setup complete. Registered routes:', Array.from(this.router.routes.keys()));
    }

    /**
     * Show configuration screen
     * @param {boolean} forceShow - Force show config even if skip is enabled
     */
    showConfigScreen(forceShow = false) {
        console.log('showConfigScreen called, forceShow:', forceShow);
        
        // Check if we should skip config and go straight to toy
        if (!forceShow && this.configManager.shouldSkipConfig()) {
            console.log('Skipping config, redirecting to toy');
            this.router.replace('/toy');
            return;
        }

        console.log('Showing config screen');
        this.hideCurrentScreen();
        
        // Test: Add a simple visible element first to debug
        const testDiv = document.createElement('div');
        testDiv.id = 'debug-test';
        testDiv.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: red; z-index: 10000; color: white; padding: 20px; font-size: 24px;';
        testDiv.innerHTML = 'DEBUG: This proves routing works! Config screen should load here.';
        document.body.appendChild(testDiv);
        
        // Remove test div after 2 seconds and show real config
        setTimeout(() => {
            document.body.removeChild(testDiv);
            
            if (!this.configScreen) {
                console.log('Creating new ConfigScreen instance');
                this.configScreen = new ConfigScreen(this.configManager, this.router);
            }
            
            this.configScreen.show();
            this.currentScreen = 'config';
            
            // Update page title
            document.title = 'ToddleToy - Configure';
            console.log('Config screen should now be visible');
        }, 2000);
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