import { test, expect } from '@playwright/test';
import {
    collectErrors, seedConfig, skipOnboarding, gotoSelector, enterSandbox, startPlaying, waitForScene,
    tapSpawn, objectCount, waitForObjectCount, savedConfig, CONFIG_KEY, SANDBOX_CARD,
} from './helpers/app.js';

/**
 * Routing rules (src/routes/routes.js, Router.js):
 *   /          toy selector
 *   /config    parent config
 *   /toy       sandbox; only reachable via the app flow (config -> START) or a
 *              reload while playing (saved game state + config). Otherwise it
 *              redirects to `/`. While on /toy the router is locked.
 *   /admin     config, always (ignores skipConfig)
 *   unknown    redirects to `/`
 */
const atRoot = (page) => expect(page).toHaveURL(/^[^?#]*\/$/);

test.describe('Routing protection', () => {
    test.beforeEach(async ({ context }) => {
        await skipOnboarding(context);
    });

    test('/toy without any saved config redirects to the selector', async ({ page }) => {
        await page.goto('/toy');
        await atRoot(page);
        await expect(page.locator('#toy-mode-selector')).toBeVisible();
        await expect(page.locator('#game-container canvas')).toHaveCount(0);
    });

    test('/toy redirect drops query parameters and still lands on the selector', async ({ page }) => {
        await page.goto('/toy?test=123&param=value');
        await atRoot(page);
        await expect(page.locator('#toy-mode-selector')).toBeVisible();
    });

    test('/toy with a saved config but no flow/game state is still protected', async ({ page, context }) => {
        await seedConfig(context, { advanced: { skipConfig: false } });
        await page.goto('/toy');
        await atRoot(page);
        await expect(page.locator('#toy-mode-selector')).toBeVisible();
    });

    test('/toy with corrupt or empty saved config redirects to the selector', async ({ page, context }) => {
        await seedConfig(context, null, { raw: 'invalid-json' });
        await page.goto('/toy');
        await atRoot(page);
        await page.evaluate((k) => localStorage.setItem(k, '{}'), CONFIG_KEY);
        await page.goto('/toy');
        await atRoot(page);
        await expect(page.locator('#toy-mode-selector')).toBeVisible();
    });

    test('the normal flow selector -> /config -> /toy works and shows the canvas', async ({ page }) => {
        const c = collectErrors(page);
        await gotoSelector(page);
        await expect(page).toHaveTitle(/ToddleToy/);
        await page.locator(SANDBOX_CARD).click();
        await expect(page).toHaveURL(/\/config$/);
        await expect(page.locator('#config-screen')).toBeVisible();
        await startPlaying(page);
        await expect(page.locator('#game-container canvas')).toBeVisible();
        await expect(page.locator('#config-screen')).toBeHidden();
        await expect(page.locator('#toy-mode-selector')).toBeHidden();
        expect(c.pageErrors).toEqual([]);
    });

    test('/admin shows the config screen even when skipConfig is enabled', async ({ page, context }) => {
        await seedConfig(context, { advanced: { skipConfig: true } });
        await page.goto('/admin');
        await expect(page).toHaveURL(/\/admin$/);
        await expect(page.locator('#config-screen')).toBeVisible();
        await expect(page.locator('#game-container canvas')).toHaveCount(0);
    });

    test('/config with skipConfig enabled jumps straight into the toy', async ({ page, context }) => {
        await seedConfig(context, { advanced: { skipConfig: true } });
        await page.goto('/config');
        await waitForScene(page);
    });

    test('unknown routes fall back to the selector', async ({ page }) => {
        await page.goto('/nonexistent');
        await atRoot(page);
        await expect(page.locator('#toy-mode-selector')).toBeVisible();
        await page.goto('/toy/extra/segments');
        await atRoot(page);
    });

    test('rapid navigation between routes ends in a stable, working state', async ({ page }) => {
        const c = collectErrors(page);
        for (const route of ['/', '/toy', '/admin', '/', '/toy', '/orrery', '/']) {
            await page.goto(route);
        }
        await atRoot(page);
        await expect(page.locator('#toy-mode-selector')).toBeVisible();
        expect(c.pageErrors).toEqual([]);
    });

    test('config is written to localStorage when playing starts and survives navigation', async ({ page }) => {
        expect(await page.goto('/').then(() => page.evaluate((k) => localStorage.getItem(k), CONFIG_KEY))).toBeNull();
        await enterSandbox(page);
        const saved = await savedConfig(page);
        expect(saved).toBeTruthy();
        expect(saved.content).toBeTruthy();
        await page.goto('/admin');
        expect(await savedConfig(page)).toEqual(saved);
    });

    test('hash/trailing navigation via the router API uses registered routes only', async ({ page }) => {
        await gotoSelector(page);
        await page.evaluate(() => window.appRoutes.navigate('/definitely-not-a-route'));
        await atRoot(page);
        await expect(page.locator('#toy-mode-selector')).toBeVisible();
    });
});

test.describe('Sandbox is locked while playing', () => {
    test.beforeEach(async ({ context }) => {
        await skipOnboarding(context);
    });

    test('browser Back is blocked on /toy and the toy keeps running', async ({ page }) => {
        const c = collectErrors(page);
        await enterSandbox(page);
        await page.goBack();
        await expect(page).toHaveURL(/\/toy$/);
        await expect(page.locator('#game-container canvas')).toBeVisible();
        await expect(page.locator('#config-screen')).toBeHidden();
        await expect(page.locator('#toy-mode-selector')).toBeHidden();
        // Still playable afterwards.
        await tapSpawn(page, 0.5, 0.5);
        expect(c.pageErrors).toEqual([]);
    });

    test('Back is blocked repeatedly, however many times it is pressed', async ({ page }) => {
        await enterSandbox(page);
        for (let i = 0; i < 3; i++) {
            await page.goBack().catch(() => {});
            await expect(page).toHaveURL(/\/toy$/);
        }
        await expect(page.locator('#game-container canvas')).toBeVisible();
    });

    test('Back does not wipe the objects the child already made', async ({ page }) => {
        await enterSandbox(page);
        await tapSpawn(page, 0.3, 0.3);
        await tapSpawn(page, 0.7, 0.6);
        expect(await objectCount(page)).toBe(2);
        await page.goBack();
        await expect(page).toHaveURL(/\/toy$/);
        // Blocking Back should be a no-op for the scene.
        expect(await objectCount(page)).toBe(2);
    });

    test('reloading /toy restores the spawned objects', async ({ page }) => {
        await enterSandbox(page);
        const a = await tapSpawn(page, 0.3, 0.3);
        const b = await tapSpawn(page, 0.7, 0.6);
        await page.reload();
        await waitForScene(page);
        await waitForObjectCount(page, 2);
        const restored = await page.evaluate(() =>
            window.appRoutes.getGameScene().objects.map((o) => ({ x: o.x, y: o.y, type: o.type })));
        expect(restored).toEqual([
            { x: a.x, y: a.y, type: a.type },
            { x: b.x, y: b.y, type: b.type },
        ]);
    });

    test('a programmatic route change to an unknown path is blocked while playing', async ({ page }) => {
        await enterSandbox(page);
        await page.evaluate(() => window.appRoutes.navigate('/nowhere'));
        await expect(page).toHaveURL(/\/toy$/);
        await expect(page.locator('#game-container canvas')).toBeVisible();
    });
});
