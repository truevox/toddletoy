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
        // Setting up application routes
        
        // Default route: Configuration screen
        this.router.addRoute('/', () => {
            // Handling root route
            this.showConfigScreen();
        });
        
        // Main toy route - only accessible via config screen
        this.router.addRoute('/toy', () => {
            // Check if access is allowed (user came through config)
            if (!this.router.isToyAccessAllowed()) {
                // Redirect to config if trying to access toy directly
                console.log('Direct toy access denied, redirecting to config');
                this.router.replace('/');
                return;
            }
            
            // Handling toy route
            this.showToyScreen();
        });
        
        // Admin route: Always show config (bypass skip setting)
        this.router.addRoute('/admin', () => {
            // Handling admin route - show config with admin features
            this.showConfigScreen(true, true); // forceShow=true, isAdmin=true
        });
        
        // Routes setup complete
    }

    /**
     * Show configuration screen
     * @param {boolean} forceShow - Force show config even if skip is enabled
     * @param {boolean} isAdmin - Whether this is admin access
     */
    showConfigScreen(forceShow = false, isAdmin = false) {
        console.log('showConfigScreen called, forceShow:', forceShow);
        
        // Check if we should skip config and go straight to toy
        if (!forceShow && this.configManager.shouldSkipConfig()) {
            console.log('Skipping config, redirecting to toy');
            this.router.replace('/toy');
            return;
        }

        console.log('Showing config screen');
        this.hideCurrentScreen();
        
        if (!this.configScreen) {
            console.log('Creating new ConfigScreen instance');
            this.configScreen = new ConfigScreen(this.configManager, this.router);
        }
        
        this.configScreen.show(isAdmin);
        this.currentScreen = 'config';
        
        // Update page title
        if (isAdmin) {
            document.title = 'ToddleToy - Admin Configuration';
        } else {
            document.title = 'ToddleToy - Configure';
        }
        console.log('Config screen should now be visible');
    }

    /**
     * Show toy/game screen
     */
    showToyScreen() {
        console.log('showToyScreen called');
        
        // Check if user has been through config - if not, redirect them
        const hasVisitedConfig = localStorage.getItem('toddleToyConfig') !== null;
        if (!hasVisitedConfig) {
            console.log('No config found, redirecting to config screen');
            this.router.replace('/');
            return;
        }
        
        console.log('Config found, proceeding to toy screen');
        this.hideCurrentScreen();
        
        // Create game instance if it doesn't exist
        if (!this.game) {
            this.game = new ToddlerToyGame(this.configManager);
        } else {
            // Reset toy state when navigating from config
            console.log('Resetting existing toy state');
            this.resetToyState();
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
     * Reset toy state - clear all objects and reset game
     */
    resetToyState() {
        if (this.game && this.game.game && this.game.game.scene) {
            const scene = this.game.game.scene.scenes[0];
            if (scene && scene.resetToyState) {
                scene.resetToyState();
            }
        }
    }

    /**
     * Get config manager instance
     */
    getConfigManager() {
        return this.configManager;
    }
}