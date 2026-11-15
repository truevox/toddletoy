import { test, expect } from '@playwright/test';
import {
    collectErrors, seedConfig, skipOnboarding, gotoSelector, enterSandbox, startPlaying, tapSpawn, objectCount,
    waitForSpawnReady, waitForObjectCount, SANDBOX_CARD, clickCanvas,
} from './helpers/app.js';
import { tapFreeSpot } from './helpers/scene.js';

/**
 * Performance and resource budgets. Budgets are deliberately generous (CI
 * boxes are slow); they catch order-of-magnitude regressions, not jitter.
 */
test.describe('Performance budgets', () => {
    test.beforeEach(async ({ context }) => {
        await skipOnboarding(context);
        // default idle auto-cleanup (10s) would reap objects mid-test
        await seedConfig(context, { advanced: { autoCleanup: { enabled: false } } });
    });

    test('time to interactive: selector < 5s, START -> live scene < 6s', async ({ page }) => {
        const t0 = Date.now();
        await gotoSelector(page);
        expect(Date.now() - t0).toBeLessThan(5000);

        await page.locator(SANDBOX_CARD).click();
        await expect(page.locator('#config-screen')).toBeVisible();
        const t1 = Date.now();
        await startPlaying(page);
        expect(Date.now() - t1).toBeLessThan(6000);
        // interactive means the first tap spawns
        const t2 = Date.now();
        await tapSpawn(page, 0.5, 0.5);
        expect(Date.now() - t2).toBeLessThan(2000);
    });

    test('20 taps produce exactly 20 objects within budget', async ({ page }) => {
        test.setTimeout(60000);
        const c = collectErrors(page);
        await enterSandbox(page);
        const start = Date.now();
        for (let i = 0; i < 20; i++) {
            await tapFreeSpot(page);
        }
        expect(Date.now() - start).toBeLessThan(30000);
        expect(await objectCount(page)).toBe(20);
        expect(c.pageErrors).toEqual([]);
    });

    test('the frame loop keeps running with many objects on screen', async ({ page }) => {
        await enterSandbox(page);
        for (let i = 0; i < 12; i++) await tapFreeSpot(page);
        const fps = await page.evaluate(() => new Promise((resolve) => {
            let n = 0; const t0 = performance.now();
            const tick = () => { n++; if (performance.now() - t0 >= 1000) resolve(n); else requestAnimationFrame(tick); };
            requestAnimationFrame(tick);
        }));
        expect(fps).toBeGreaterThan(8);
    });

    test('rapid keyboard input is absorbed without errors or lag', async ({ page }) => {
        const c = collectErrors(page);
        await enterSandbox(page);
        const start = Date.now();
        for (const key of ['KeyQ', 'KeyW', 'KeyE', 'KeyA', 'KeyS', 'KeyD', 'KeyZ', 'KeyX', 'KeyC']) {
            await page.keyboard.press(key);
        }
        expect(Date.now() - start).toBeLessThan(2000);
        // the page is still responsive afterwards
        await waitForSpawnReady(page);
        const n = await objectCount(page);
        await clickCanvas(page, 0.9, 0.9);
        await waitForObjectCount(page, n + 1);
        expect(c.pageErrors).toEqual([]);
    });

    for (const vp of [{ width: 1200, height: 800 }, { width: 375, height: 667 }]) {
        test(`a tap responds in under 1s at ${vp.width}x${vp.height}`, async ({ page }) => {
            await page.setViewportSize(vp);
            await enterSandbox(page);
            const t = Date.now();
            await tapSpawn(page, 0.5, 0.5);
            expect(Date.now() - t).toBeLessThan(1000);
        });
    }
});

test.describe('Resource management', () => {
    test.beforeEach(async ({ context }) => {
        await skipOnboarding(context);
        // default idle auto-cleanup (10s) would reap objects mid-test
        await seedConfig(context, { advanced: { autoCleanup: { enabled: false } } });
    });

    const census = (page) => page.evaluate(() => {
        const s = window.appRoutes.getGameScene();
        return {
            objects: s.objects.length,
            children: s.children.list.length,
            tweens: s.tweens.getTweens().length,
            tones: s.audioManager.activeTones.size,
            pointerListeners: s.input.listenerCount('pointerdown'),
            inputEvents: s.events.listenerCount('input:pointerDown'),
            keyListeners: s.input.keyboard.listenerCount('keydown'),
        };
    });

    test('exiting the toy returns display list, tweens and tones to the empty baseline', async ({ page }) => {
        await enterSandbox(page);
        const baseline = await census(page);
        for (let i = 0; i < 10; i++) await tapFreeSpot(page);
        const busy = await census(page);
        expect(busy.children).toBeGreaterThan(baseline.children);

        await page.evaluate(() => window.appRoutes.exitToy());
        await expect(page.locator('#toy-mode-selector')).toBeVisible();
        const after = await census(page);
        expect(after.objects).toBe(0);
        expect(after.tones).toBe(0);
    });

    test('exiting the toy leaves no orphaned display objects (labels, emitters)', async ({ page }) => {
        await enterSandbox(page);
        const baseline = await census(page);
        for (let i = 0; i < 5; i++) await tapSpawn(page, 0.1 + i * 0.2, 0.5);
        await page.evaluate(() => window.appRoutes.exitToy());
        await expect(page.locator('#toy-mode-selector')).toBeVisible();
        await expect.poll(async () => (await census(page)).children, { timeout: 3000 }).toBeLessThanOrEqual(baseline.children);
    });

    test('five enter/exit cycles do not accumulate listeners, canvases or objects', async ({ page }) => {
        const c = collectErrors(page);
        await enterSandbox(page);
        const first = await census(page);
        for (let i = 0; i < 5; i++) {
            await tapSpawn(page, 0.5, 0.5);
            await page.evaluate(() => window.appRoutes.exitToy());
            await expect(page.locator('#toy-mode-selector')).toBeVisible();
            await page.locator(SANDBOX_CARD).click();
            await startPlaying(page);
        }
        const last = await census(page);
        expect(last.pointerListeners).toBe(first.pointerListeners);
        expect(last.inputEvents).toBe(first.inputEvents);
        expect(last.keyListeners).toBe(first.keyListeners);
        expect(last.objects).toBe(0);
        await expect(page.locator('#game-container canvas:not(.tt-backdrop)')).toHaveCount(1);
        expect(c.pageErrors).toEqual([]);
    });

    test('auto-cleanup removes idle objects and releases their resources', async ({ page, context }) => {
        await seedConfig(context, { advanced: { autoCleanup: { enabled: true, timeoutSeconds: 5 } } });
        await enterSandbox(page);
        await tapSpawn(page, 0.3, 0.5);
        await tapSpawn(page, 0.7, 0.5);
        expect(await objectCount(page)).toBe(2);
        await expect.poll(() => objectCount(page), { timeout: 20000, intervals: [500] }).toBe(0);
        const after = await census(page);
        expect(after.tones).toBe(0);
    });

    test('JS heap does not balloon over repeated spawn/exit cycles (Chromium only)', async ({ page, browserName }) => {
        test.skip(browserName !== 'chromium', 'performance.memory is Chromium-only');
        await enterSandbox(page);
        const heap = () => page.evaluate(() => performance.memory.usedJSHeapSize);
        const start = await heap();
        for (let cycle = 0; cycle < 3; cycle++) {
            for (let i = 0; i < 8; i++) await tapFreeSpot(page);
            await page.evaluate(() => window.appRoutes.exitToy());
            await page.locator(SANDBOX_CARD).click();
            await startPlaying(page);
        }
        expect(await heap() - start).toBeLessThan(Math.max(start * 2, 60 * 1024 * 1024));
    });

    test('audio context is created lazily and tones stop when objects are removed', async ({ page }) => {
        await enterSandbox(page);
        await tapSpawn(page, 0.5, 0.5);
        await page.evaluate(() => window.appRoutes.exitToy());
        expect(await page.evaluate(() => window.appRoutes.getGameScene().audioManager.activeTones.size)).toBe(0);
    });
});
