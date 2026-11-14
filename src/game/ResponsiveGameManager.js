import Phaser from 'phaser'
import { GameScene } from '../game.js'

/**
 * ResponsiveGameManager - Creates the Phaser game and handles lifecycle (visibility, WebGL, resize).
 * Imports GameScene from game.js (circular, but only used at runtime inside initGame).
 */
class ResponsiveGameManager {
    constructor(configManager = null) {
        this.gameInstance = null;
        this.config = null;
        this.configManager = configManager;
        this.isAppPaused = false;
        this.boundVisibilityHandler = this.handleVisibilityChange.bind(this);
        this.boundPageHideHandler = this.pauseForBackground.bind(this);
        this.boundPageShowHandler = this.resumeFromBackground.bind(this);
        this.boundWebglContextLostHandler = this.handleWebGlContextLost.bind(this);
        this.boundWebglContextRestoredHandler = this.handleWebGlContextRestored.bind(this);

        this.initGame();
        this.setupResizeHandler();
        this.setupLifecycleHandlers();
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

    setupLifecycleHandlers() {
        document.addEventListener('visibilitychange', this.boundVisibilityHandler);
        window.addEventListener('pagehide', this.boundPageHideHandler);
        window.addEventListener('pageshow', this.boundPageShowHandler);

        this.gameInstance?.events?.once('ready', () => {
            const canvas = this.gameInstance?.canvas;
            if (canvas) {
                canvas.addEventListener('webglcontextlost', this.boundWebglContextLostHandler, false);
                canvas.addEventListener('webglcontextrestored', this.boundWebglContextRestoredHandler, false);
            }
        });
    }

    handleVisibilityChange() {
        if (document.hidden) {
            this.pauseForBackground();
            return;
        }

        this.resumeFromBackground();
    }

    pauseForBackground() {
        if (!this.gameInstance || this.isAppPaused) return;

        this.isAppPaused = true;
        this.gameInstance.loop.sleep();
        this.gameInstance.sound.mute = true;
        this.gameInstance.scene.pause('GameScene');
        console.log('⏸️ Game paused for background/lock state');
    }

    resumeFromBackground() {
        if (!this.gameInstance || !this.isAppPaused) return;

        this.gameInstance.loop.wake();
        if (typeof this.gameInstance.loop.resetDelta === 'function') {
            this.gameInstance.loop.resetDelta();
        }
        this.gameInstance.scene.resume('GameScene');
        const audioConfig = this.configManager?.getAudioConfig();
        const shouldRemainMuted = Boolean(audioConfig?.mute);
        this.gameInstance.sound.mute = shouldRemainMuted;
        this.isAppPaused = false;
        console.log('▶️ Game resumed after background/lock state');
    }

    handleWebGlContextLost(event) {
        event.preventDefault();
        console.warn('⚠️ WebGL context lost while app was backgrounded');
        this.pauseForBackground();
    }

    handleWebGlContextRestored() {
        console.log('✅ WebGL context restored');
        this.resumeFromBackground();
    }

    handleResize() {
        if (this.gameInstance && this.gameInstance.scene.scenes[0]) {
            const scene = this.gameInstance.scene.scenes[0];
            const newWidth = Math.min(window.innerWidth, 1200);
            const newHeight = Math.min(window.innerHeight, 800);

            this.gameInstance.scale.resize(newWidth, newHeight);
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

    destroy() {
        document.removeEventListener('visibilitychange', this.boundVisibilityHandler);
        window.removeEventListener('pagehide', this.boundPageHideHandler);
        window.removeEventListener('pageshow', this.boundPageShowHandler);

        const canvas = this.gameInstance?.canvas;
        if (canvas) {
            canvas.removeEventListener('webglcontextlost', this.boundWebglContextLostHandler, false);
            canvas.removeEventListener('webglcontextrestored', this.boundWebglContextRestoredHandler, false);
        }
    }
}

export { ResponsiveGameManager };
