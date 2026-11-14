import { test, expect } from '@playwright/test';
import {
    collectErrors, skipOnboarding, gotoSelector, enterSandbox, tapSpawn, waitForScene,
    GLOBE_CARD, SANDBOX_CARD, allObjects, startPlaying, enterConfig,
} from './helpers/app.js';

/**
 * Offline PWA regression tests. They need the real service worker, so they
 * opt back in (the suite blocks it by default) and rely on the production
 * build served by the shared webServer (the SW only registers when
 * import.meta.env.PROD is true).
 *
 * History: data fetches used cache-busting query strings, defeating the
 * precache, so offline taps fell back to hardcoded items (one 3s-timeout
 * fetch per tap). Data is now bundled; the SW must also not reload the page
 * on first visit when it takes control.
 */
test.use({ serviceWorkers: 'allow' });

async function swReady(page) {
    await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
    });
    // wait until the SW actually controls this page and has finished precaching
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 });
}

test.describe('Service worker and offline', () => {
    test.beforeEach(async ({ context }) => {
        await skipOnboarding(context);
    });

    test('a first visit fires exactly one load event (no SW-triggered reload)', async ({ page }) => {
        let loads = 0;
        page.on('load', () => { loads++; });
        await page.goto('/');
        await expect(page.locator('#toy-mode-selector')).toBeVisible();
        await page.evaluate(() => navigator.serviceWorker.ready);
        // Give a SW-triggered reload ample time to (wrongly) happen.
        await page.waitForTimeout(4000);
        expect(loads).toBe(1);
        await expect(page.locator('#toy-mode-selector')).toBeVisible();
    });

    test('selector, globe and sandbox all still work offline after a warm visit', async ({ page, context }) => {
        const c = collectErrors(page);
        await page.goto('/');
        await expect(page.locator('#toy-mode-selector')).toBeVisible();
        await swReady(page);

        // Warm the lazy chunks online: visit globe and the sandbox once.
        await page.locator(GLOBE_CARD).click();
        await expect(page.locator('#globe-toy')).toBeVisible();
        await page.locator('#globe-toy button:has-text("Back")').click();
        await enterSandboxFromSelector(page);

        await context.setOffline(true);
        await page.goto('/');
        await expect(page.locator('#toy-mode-selector')).toBeVisible();

        // Globe (lazy import) offline
        await page.locator(GLOBE_CARD).click();
        await expect(page.locator('#globe-toy')).toBeVisible();
        await page.locator('#globe-toy button:has-text("Back")').click();
        await expect(page.locator('#toy-mode-selector')).toBeVisible();

        // Sandbox (lazy game-*.js chunk) offline
        await enterSandboxFromSelector(page);
        const obj = await tapSpawn(page, 0.5, 0.5);
        expect(obj).toBeTruthy();
        expect(c.pageErrors).toEqual([]);
    });

    test('tapping offline produces varied objects with at most one JSON request', async ({ page, context }) => {
        await page.goto('/');
        await expect(page.locator('#toy-mode-selector')).toBeVisible();
        await swReady(page);
        await enterSandboxFromSelector(page);

        await context.setOffline(true);
        await page.reload();
        await waitForScene(page).catch(async () => {
            // a reload on /toy without objects returns to the selector: go through the flow
            await enterSandboxFromSelector(page);
        });

        const jsonRequests = [];
        page.on('request', (r) => {
            if (/\.json(\?|$)/.test(r.url())) jsonRequests.push(r.url());
        });
        for (let i = 0; i < 12; i++) {
            await tapSpawn(page, 0.1 + (i % 6) * 0.15, 0.2 + Math.floor(i / 6) * 0.4);
        }
        // Regression: real offline play must not collapse to the hardcoded fallback item.
        const objs = await allObjects(page);
        expect(objs.length).toBe(12);
        const labels = objs.map((o) => `${o.type}:${o.text}`);
        expect(new Set(labels).size).toBeGreaterThan(1);
        expect(objs.every((o) => o.text === '🎯')).toBe(false);
        expect(jsonRequests.length).toBeLessThanOrEqual(1);
    });
});

async function enterSandboxFromSelector(page) {
    if (!(await page.locator('#toy-mode-selector').isVisible())) await gotoSelector(page);
    await page.locator(SANDBOX_CARD).click();
    await expect(page.locator('#config-screen')).toBeVisible();
    await startPlaying(page);
}

void enterSandbox; void enterConfig;
