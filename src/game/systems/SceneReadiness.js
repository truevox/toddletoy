/**
 * SceneReadiness - one place that decides when the sandbox scene is ready to play.
 *
 * `scene.ready` (a Promise) resolves when game data, the numeral font and the
 * config are available. A missing font can never block play: font loading is
 * capped by a timeout and the scene is marked initialised either way.
 */

export const FONT_TIMEOUT_MS = 3000;
export const KAKTOVIK_FONT = '1em Kaktovik';

/**
 * Resolve true when the Kaktovik font is usable, false if it failed or timed
 * out. Never rejects and never takes longer than `timeoutMs`.
 */
export function waitForFonts(timeoutMs = FONT_TIMEOUT_MS) {
    const fonts = typeof document !== 'undefined' ? document.fonts : null;
    if (!fonts || typeof fonts.load !== 'function') return Promise.resolve(true);

    let timer;
    const timeout = new Promise((resolve) => { timer = setTimeout(() => resolve(false), timeoutMs); });
    const loaded = Promise.resolve()
        .then(() => Promise.all([fonts.load(KAKTOVIK_FONT), fonts.ready]))
        .then(() => (typeof fonts.check === 'function' ? fonts.check(KAKTOVIK_FONT) : true))
        .catch(() => false);
    return Promise.race([loaded, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Build the scene's ready promise. Sets dataLoaded / fontsLoaded /
 * isFullyInitialized on the scene (kept for existing callers and tests).
 */
export function createSceneReady(scene, { fontTimeoutMs = FONT_TIMEOUT_MS } = {}) {
    return (async () => {
        await scene.preloadGameData();
        scene.dataLoaded = true;
        scene.fontsLoaded = await waitForFonts(fontTimeoutMs);
        scene.isFullyInitialized = true;
        console.log('✅ Game fully initialized - ready for interactions' + (scene.fontsLoaded ? '' : ' (numeral font unavailable)'));
    })();
}

/**
 * Make the scene use the app's ConfigManager (put in the Phaser registry by
 * ResponsiveGameManager before boot). Falls back to `makeOwn()` if none.
 */
export function adoptAppConfigManager(scene, makeOwn) {
    if (!scene.configManager) {
        const fromApp = scene.registry && scene.registry.get ? scene.registry.get('configManager') : null;
        scene.configManager = fromApp || makeOwn();
    }
    return scene.configManager;
}
