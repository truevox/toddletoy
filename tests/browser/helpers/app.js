/**
 * Shared helpers for the ToddleToy Playwright suite.
 *
 * Navigation model (see src/routes/routes.js):
 *   /          toy selector  (#toy-mode-selector, three cards)
 *   /config    parent config (#config-screen) -> "START PLAYING" -> /toy
 *   /toy       Phaser sandbox (#game-container > canvas); locked, hold-to-exit
 *   /admin     config, always shown
 *   /orrery /globe   separate toys with a "Back" button
 */
import { expect } from '@playwright/test';

export const SANDBOX_CARD = '#toy-mode-selector [aria-label*="Toddler Sandbox"]';
export const ORRERY_CARD = '#toy-mode-selector [aria-label*="Solar System"]';
export const GLOBE_CARD = '#toy-mode-selector [aria-label*="World Globe"]';
export const START_BUTTON = 'button:has-text("START PLAYING")';

// Headless Chromium has no speech voices, so every utterance errors instantly.
// That is an environment limit, not an app failure.
const KNOWN_NOISE = [/Speech error/i];

export const ONBOARDING_KEY = 'toddletoy-seen-onboarding';
export const CONFIG_KEY = 'toddleToyConfig';

/**
 * Record page errors and console errors (minus known environment noise).
 * `logs` holds console.log lines (used to assert the game stays quiet).
 */
export function collectErrors(page) {
    const errors = [];
    const pageErrors = [];
    const logs = [];
    page.on('pageerror', (e) => pageErrors.push(String(e && e.message ? e.message : e)));
    page.on('console', (msg) => {
        const text = msg.text();
        if (msg.type() === 'error') {
            if (KNOWN_NOISE.some((re) => re.test(text))) return;
            errors.push(text);
        } else if (msg.type() === 'log') {
            logs.push(text);
        }
    });
    return {
        errors,
        pageErrors,
        logs,
        all: () => [...pageErrors, ...errors],
    };
}

/**
 * Seed localStorage before any page script runs (first document of the tab
 * only, so changes made during a test survive reloads). `partialConfig` is
 * merged with defaults by the app's ConfigManager. Pass `raw` to store an
 * arbitrary (possibly corrupt) string instead. Onboarding is marked as seen
 * unless `onboarding: true`.
 */
export async function seedConfig(context, partialConfig, { onboarding = false, raw = null } = {}) {
    await context.addInitScript(
        ({ partialConfig, onboarding, raw, CONFIG_KEY, ONBOARDING_KEY }) => {
            try {
                // one application per distinct seed (later seeds override earlier ones)
                const guard = '__seeded:' + JSON.stringify([partialConfig, onboarding, raw]);
                if (sessionStorage.getItem(guard)) return;
                sessionStorage.setItem(guard, '1');
                if (!onboarding) localStorage.setItem(ONBOARDING_KEY, 'true');
                if (raw !== null) localStorage.setItem(CONFIG_KEY, raw);
                else if (partialConfig) localStorage.setItem(CONFIG_KEY, JSON.stringify(partialConfig));
            } catch (e) { /* storage unavailable */ }
        },
        { partialConfig, onboarding, raw, CONFIG_KEY, ONBOARDING_KEY }
    );
}

/** Mark onboarding as seen without touching the config. */
export async function skipOnboarding(context) {
    await context.addInitScript(({ k }) => {
        try { localStorage.setItem(k, 'true'); } catch (e) { /* ignore */ }
    }, { k: ONBOARDING_KEY });
}

export async function gotoSelector(page) {
    await page.goto('/');
    await expect(page.locator('#toy-mode-selector')).toBeVisible();
    await expect(page.locator(SANDBOX_CARD)).toBeVisible();
}

/** Dismiss the first-run onboarding modal if it is covering the config screen. */
export async function dismissOnboarding(page) {
    const close = page.locator('.help-modal-close, button:has-text("Get Started!")').first();
    if (await close.isVisible().catch(() => false)) {
        await close.click();
        await expect(close).toBeHidden();
    }
}

/** Selector -> Sandbox card -> config screen (onboarding dismissed). */
export async function enterConfig(page) {
    await gotoSelector(page);
    await page.locator(SANDBOX_CARD).click();
    await expect(page).toHaveURL(/\/config$/);
    await expect(page.locator('#config-screen')).toBeVisible();
    await dismissOnboarding(page);
}

/** Wait until /toy is up with an initialized Phaser scene. */
export async function waitForScene(page) {
    await expect(page).toHaveURL(/\/toy$/);
    await page.waitForSelector('#game-container canvas');
    await page.waitForFunction(() => {
        const s = window.appRoutes?.getGameScene?.();
        return !!s && s.isFullyInitialized === true && !!s.speechManager;
    }, null, { timeout: 15000 });
}

/** Click START PLAYING on the config screen and wait for a live scene. */
export async function startPlaying(page) {
    await dismissOnboarding(page);
    await page.locator(START_BUTTON).first().click();
    await waitForScene(page);
}

/** Full happy path: selector -> sandbox -> config -> /toy with a ready scene. */
export async function enterSandbox(page) {
    await enterConfig(page);
    await startPlaying(page);
}

/** Tab-local fractional canvas position -> page coordinates. */
export async function canvasPoint(page, fx, fy) {
    const box = await page.locator('#game-container canvas').boundingBox();
    return { x: box.x + box.width * fx, y: box.y + box.height * fy };
}

/** Click a canvas point given as fractions (0..1). */
export async function clickCanvas(page, fx, fy) {
    const { x, y } = await canvasPoint(page, fx, fy);
    await page.mouse.click(x, y);
    return { x, y };
}

export async function objectCount(page) {
    return page.evaluate(() => window.appRoutes?.getGameScene?.()?.objects?.length ?? -1);
}

export async function waitForObjectCount(page, n, timeout = 10000) {
    await page.waitForFunction(
        (n) => (window.appRoutes?.getGameScene?.()?.objects?.length ?? -1) === n,
        n,
        { timeout }
    );
}

/**
 * Wait until the scene will accept a new spawn: speech lock free and the
 * post-movement/post-spawn input locks released.
 */
export async function waitForSpawnReady(page, timeout = 10000) {
    try {
        await page.waitForFunction(
            () => {
                const s = window.appRoutes?.getGameScene?.();
                if (!s || s.speechManager.getIsSpeaking()) return false;
                if (s.awaitingSpawnInputRelease) return false;
                return s.canSpawnAfterMovement ? s.canSpawnAfterMovement() : true;
            },
            null,
            { timeout }
        );
    } catch (e) {
        const state = await page.evaluate(() => {
            const s = window.appRoutes?.getGameScene?.();
            return s && {
                speaking: s.speechManager.getIsSpeaking(), awaitingRelease: s.awaitingSpawnInputRelease,
                canSpawn: s.canSpawnAfterMovement(), n: s.objects.length, dragging: s.isDragging,
            };
        }).catch(() => null);
        throw new Error(`scene never became ready for a spawn within ${timeout}ms: ${JSON.stringify(state)}`);
    }
}

const SUMMARISE = `(o) => ({
    x: o.x, y: o.y, type: o.type,
    value: o.itemData && o.itemData.value,
    text: o.text,
    components: Object.keys(o.componentLayout || {}),
})`;

export async function lastObject(page) {
    return page.evaluate(`(() => {
        const s = window.appRoutes.getGameScene();
        const o = s.objects[s.objects.length - 1];
        return o ? (${SUMMARISE})(o) : null;
    })()`);
}

export async function allObjects(page) {
    return page.evaluate(`(() => {
        const s = window.appRoutes.getGameScene();
        return s.objects.map(${SUMMARISE});
    })()`);
}

export async function sceneSize(page) {
    return page.evaluate(() => {
        const s = window.appRoutes.getGameScene();
        return { width: s.scale.width, height: s.scale.height };
    });
}

/**
 * Click empty canvas space (once the scene accepts spawns) and wait for one
 * new object. Returns the summary of the newest object.
 */
export async function tapSpawn(page, fx, fy) {
    await waitForSpawnReady(page);
    const before = await objectCount(page);
    await clickCanvas(page, fx, fy);
    try {
        await waitForObjectCount(page, before + 1);
    } catch (e) {
        const state = await page.evaluate(() => {
            const s = window.appRoutes?.getGameScene?.();
            return s && {
                n: s.objects.length, speaking: s.speechManager.getIsSpeaking(),
                awaitingRelease: s.awaitingSpawnInputRelease, canSpawn: s.canSpawnAfterMovement(),
                dragging: s.isDragging, paused: s.scene.isPaused(), url: location.pathname,
            };
        });
        throw new Error(`tap at (${fx},${fy}) did not spawn; scene state ${JSON.stringify(state)}`);
    }
    return lastObject(page);
}

/** Force-spawn a specific kind via the scene; resolves to the new object summary (or null). */
export async function spawnForced(page, x, y, type) {
    await page.evaluate(([x, y, type]) => window.appRoutes.getGameScene().spawnObjectAt(x, y, type), [x, y, type]);
    return lastObject(page);
}

/** Hold the top-right parent-exit button for `ms` with a real pointer. */
export async function holdExit(page, ms = 2300) {
    const btn = page.locator('.parent-exit-btn');
    await expect(btn).toBeVisible();
    const box = await btn.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(ms); // a real-time hold is the behaviour under test
    await page.mouse.up();
}

/** Auto-accept confirm() dialogs. */
export function acceptDialogs(page) {
    page.on('dialog', (d) => d.accept().catch(() => {}));
}

/** Read the saved config object straight from localStorage. */
export async function savedConfig(page) {
    return page.evaluate((k) => {
        try { return JSON.parse(localStorage.getItem(k)); } catch { return null; }
    }, CONFIG_KEY);
}
