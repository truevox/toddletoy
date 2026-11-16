import Phaser from 'phaser'
import { GameScene } from '../game.js'
import { deviceDpr } from './systems/DisplayScale.js'

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
        // Canvas backing store = CSS size x device pixel ratio (capped at 3); the CSS rule in
        // index.html stretches the canvas to the window. The scene zooms its camera by the ratio
        // so game logic stays in CSS pixels (see DisplayScale.js).
        const cssW = window.innerWidth;
        const cssH = window.innerHeight;
        const width = Math.round(cssW * deviceDpr());
        const height = Math.round(cssH * deviceDpr());

        this.config = {
            type: Phaser.AUTO,
            width: width,
            height: height,
            parent: 'game-container',
            scene: GameScene,
            // Hand the app's ConfigManager to the scene before it is created
            callbacks: {
                preBoot: (game) => {
                    game.displayInfo = { cssW, cssH };
                    if (this.configManager) game.registry.set('configManager', this.configManager);
                }
            },
            transparent: true, // the soft backdrop is a DOM layer behind the canvas (see Backdrop.js)
            scale: {
                mode: Phaser.Scale.NONE
            },
            // the toy makes its own sound (src/game/audio/): no second, unused Phaser AudioContext
            audio: { noAudio: true },
            input: {
                gamepad: true,
                activePointers: 10   // the mouse plus ten fingers (Phaser defaults to one finger)
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

        // Global click debugging (remove in production)
        // window.addEventListener('click', (e) => {
        //     console.log('🔍 GLOBAL CLICK DETECTED:', e.clientX, e.clientY, e.target.tagName, e.target.className);
        // });

        console.log('🎮 Responsive game initialized:', cssW, 'x', cssH, '@', deviceDpr(), 'x');
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
        this.handleResize(); // the window may have been resized or rotated while away
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
            const cssW = window.innerWidth;
            const cssH = window.innerHeight;
            const dpr = deviceDpr();
            this.gameInstance.displayInfo = { cssW, cssH };
            this.gameInstance.scale.resize(Math.round(cssW * dpr), Math.round(cssH * dpr));
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
