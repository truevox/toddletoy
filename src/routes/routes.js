/**
 * Route definitions for the toddler toy application
 */
import { Router } from './Router.js';
import { ConfigManager } from '../config/ConfigManager.js';
import { ConfigScreen } from '../config/ConfigScreen.js';
import { ToddlerToyGame } from '../game.js';
import { ToyModeSelector } from '../modes/ToyModeSelector.js';
import { OrreryToy } from '../toys/OrreryToy.js';

// GlobeToy is lazy-imported to avoid blocking startup if the file isn't ready
let GlobeToy = null;

export class AppRoutes {
    constructor() {
        this.router = new Router();
        this.configManager = new ConfigManager();

        // Screens / toys
        this.modeSelector = null;
        this.configScreen = null;
        this.game = null;
        this.orreryToy = null;
        this.globeToy = null;

        this.currentScreen = null;

        this.setupRoutes();
        this.router.init();
    }

    setupRoutes() {
        // Root: toy mode selector (new entry point)
        this.router.addRoute('/', () => {
            this.showModeSelector();
        });

        // Config screen (was previously '/')
        this.router.addRoute('/config', () => {
            this.showConfigScreen();
        });

        // Main sandbox toy – only accessible after going through /config
        this.router.addRoute('/toy', () => {
            if (!this.router.isToyAccessAllowed()) {
                console.log('Direct toy access denied, redirecting to mode selector');
                this.router.replace('/');
                return;
            }
            this.showToyScreen();
        });

        // Orrery solar-system toy
        this.router.addRoute('/orrery', () => {
            this.showOrreryScreen();
        });

        // Globe toy
        this.router.addRoute('/globe', () => {
            this.showGlobeScreen();
        });

        // Admin: force-show config with admin flag
        this.router.addRoute('/admin', () => {
            this.showConfigScreen(true, true);
        });
    }

    // ── Mode Selector ────────────────────────────────────────────────────────
    showModeSelector() {
        this.hideCurrentScreen();

        if (!this.modeSelector) {
            this.modeSelector = new ToyModeSelector(this.router, this.configManager);
        }

        this.modeSelector.show();
        this.currentScreen = 'selector';
        document.title = 'ToddleToy';
    }

    // ── Config Screen ────────────────────────────────────────────────────────
    showConfigScreen(forceShow = false, isAdmin = false) {
        console.log('showConfigScreen called, forceShow:', forceShow);

        // Honour "skip config" preference – jump straight to toy
        if (!forceShow && this.configManager.shouldSkipConfig()) {
            console.log('Skipping config, redirecting to toy');
            this.router.allowToyAccess();
            this.router.replace('/toy');
            return;
        }

        this.hideCurrentScreen();

        if (!this.configScreen) {
            this.configScreen = new ConfigScreen(this.configManager, this.router);
        }

        this.configScreen.show(isAdmin);
        this.currentScreen = 'config';
        document.title = isAdmin ? 'ToddleToy – Admin' : 'ToddleToy – Configure';
    }

    // ── Sandbox Toy ──────────────────────────────────────────────────────────
    showToyScreen() {
        const hasConfig = localStorage.getItem('toddleToyConfig') !== null;
        if (!hasConfig) {
            this.router.replace('/');
            return;
        }

        this.hideCurrentScreen();

        if (!this.game) {
            this.game = new ToddlerToyGame(this.configManager);
        } else {
            this.resetToyState();
        }

        this.currentScreen = 'toy';
        document.title = 'ToddleToy – Play';
    }

    // ── Orrery ───────────────────────────────────────────────────────────────
    showOrreryScreen() {
        this.hideCurrentScreen();

        if (!this.orreryToy) {
            this.orreryToy = new OrreryToy(this.router);
        }

        this.orreryToy.show();
        this.currentScreen = 'orrery';
        document.title = 'ToddleToy – Solar System';
    }

    // ── Globe ────────────────────────────────────────────────────────────────
    async showGlobeScreen() {
        this.hideCurrentScreen();

        if (!this.globeToy) {
            // Lazy-load so missing file doesn't crash startup
            if (!GlobeToy) {
                try {
                    const mod = await import('../toys/GlobeToy.js');
                    GlobeToy = mod.GlobeToy;
                } catch (err) {
                    console.error('GlobeToy failed to load:', err);
                    this.router.replace('/');
                    return;
                }
            }
            this.globeToy = new GlobeToy(this.router);
        }

        this.globeToy.show();
        this.currentScreen = 'globe';
        document.title = 'ToddleToy – World Globe';
    }

    // ── Helpers ──────────────────────────────────────────────────────────────
    hideCurrentScreen() {
        switch (this.currentScreen) {
            case 'selector':
                if (this.modeSelector) this.modeSelector.hide();
                break;
            case 'config':
                if (this.configScreen) this.configScreen.hide();
                break;
            case 'toy':
                if (this.game && this.game.game && this.game.game.scene) {
                    const scene = this.game.game.scene.scenes[0];
                    if (scene && scene.scene) scene.scene.pause();
                }
                break;
            case 'orrery':
                if (this.orreryToy) this.orreryToy.hide();
                break;
            case 'globe':
                if (this.globeToy) this.globeToy.hide();
                break;
        }
    }

    resetToyState() {
        if (this.game && this.game.game && this.game.game.scene) {
            const scene = this.game.game.scene.scenes[0];
            if (scene && scene.resetToyState) scene.resetToyState();
        }
    }

    getCurrentRoute() { return this.router.getCurrentRoute(); }
    navigate(path)    { this.router.navigate(path); }
    getConfigManager(){ return this.configManager; }
}
