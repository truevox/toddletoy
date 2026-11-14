import { test, expect } from '@playwright/test';
import {
    collectErrors, skipOnboarding, gotoSelector, enterSandbox, enterConfig, startPlaying, holdExit,
    tapSpawn, objectCount, waitForScene, ORRERY_CARD, GLOBE_CARD, SANDBOX_CARD,
} from './helpers/app.js';

/**
 * Parent hold-to-exit (src/ui/ParentExitButton.js): the only way out of the
 * locked sandbox is holding the top-right control for 2s.
 */
test.describe('Parent hold-to-exit', () => {
    test.beforeEach(async ({ context }) => {
        await skipOnboarding(context);
    });

    test('the exit control is visible in the top-right corner of the sandbox', async ({ page }) => {
        await enterSandbox(page);
        const btn = page.locator('.parent-exit-btn');
        await expect(btn).toBeVisible();
        const box = await btn.boundingBox();
        const vp = page.viewportSize();
        expect(box.x + box.width).toBeGreaterThan(vp.width - 80);
        expect(box.y).toBeLessThan(80);
        expect(box.width).toBeGreaterThanOrEqual(40);
    });

    test('a short tap neither exits nor spawns an object', async ({ page }) => {
        await enterSandbox(page);
        const btn = page.locator('.parent-exit-btn');
        await btn.click(); // press + release, far below the 2s hold
        await expect(page).toHaveURL(/\/toy$/);
        await expect(page.locator('#toy-mode-selector')).toBeHidden();
        // Give a stray spawn every chance to appear, then assert none did.
        await page.waitForTimeout(400);
        expect(await objectCount(page)).toBe(0);
    });

    test('releasing before 2s cancels the exit', async ({ page }) => {
        await enterSandbox(page);
        await holdExit(page, 1000);
        await expect(page).toHaveURL(/\/toy$/);
        await expect(page.locator('.parent-exit-btn')).toBeVisible();
        expect(await objectCount(page)).toBe(0);
    });

    test('holding for 2s returns to the selector', async ({ page }) => {
        const c = collectErrors(page);
        await enterSandbox(page);
        await holdExit(page, 2400);
        await expect(page).toHaveURL(/^[^?#]*\/$/);
        await expect(page.locator('#toy-mode-selector')).toBeVisible();
        await expect(page.locator('.parent-exit-btn')).toBeHidden();
        expect(c.pageErrors).toEqual([]);
    });

    test('keyboard hold (Enter) on the focused control also exits', async ({ page }) => {
        await enterSandbox(page);
        await page.locator('.parent-exit-btn').focus();
        await page.keyboard.down('Enter');
        await page.waitForTimeout(2300); // hold duration is the behaviour under test
        await page.keyboard.up('Enter');
        await expect(page.locator('#toy-mode-selector')).toBeVisible();
    });

    test('after exiting, re-entering the sandbox gives an empty scene', async ({ page }) => {
        await enterSandbox(page);
        await tapSpawn(page, 0.3, 0.3);
        await tapSpawn(page, 0.6, 0.6);
        expect(await objectCount(page)).toBe(2);

        await holdExit(page, 2400);
        await expect(page.locator('#toy-mode-selector')).toBeVisible();

        await page.locator(SANDBOX_CARD).click();
        await startPlaying(page);
        expect(await objectCount(page)).toBe(0);
        // and the fresh scene still works
        await tapSpawn(page, 0.5, 0.5);
        expect(await objectCount(page)).toBe(1);
    });

    test('exit control is hidden on the selector, config, orrery and globe', async ({ page }) => {
        const exitBtn = page.locator('.parent-exit-btn');
        await gotoSelector(page);
        await expect(exitBtn).toBeHidden();

        await enterConfig(page);
        await expect(exitBtn).toBeHidden();

        await startPlaying(page);
        await expect(exitBtn).toBeVisible();
        await holdExit(page, 2400);
        await expect(page.locator('#toy-mode-selector')).toBeVisible();
        await expect(exitBtn).toBeHidden(); // hidden again after leaving the toy

        await page.locator(ORRERY_CARD).click();
        await expect(page.locator('#orrery-toy')).toBeVisible();
        await expect(exitBtn).toBeHidden();
        await page.locator('#orrery-toy button:has-text("Back")').click();

        await page.locator(GLOBE_CARD).click();
        await expect(page.locator('#globe-toy')).toBeVisible();
        await expect(exitBtn).toBeHidden();
    });

    test('after exit, the router is unlocked: Back works from the selector again', async ({ page }) => {
        await enterSandbox(page);
        await holdExit(page, 2400);
        await expect(page.locator('#toy-mode-selector')).toBeVisible();
        await page.locator(ORRERY_CARD).click();
        await expect(page).toHaveURL(/\/orrery$/);
        await page.goBack();
        await expect(page).toHaveURL(/^[^?#]*\/$/);
        await expect(page.locator('#toy-mode-selector')).toBeVisible();
    });

    test('exit works by touch on a touch device', async ({ browser }) => {
        const context = await browser.newContext({ hasTouch: true, viewport: { width: 393, height: 851 } });
        await skipOnboarding(context);
        const page = await context.newPage();
        try {
            await enterSandbox(page);
            // A touch tap must not exit.
            const box = await page.locator('.parent-exit-btn').boundingBox();
            await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
            await expect(page).toHaveURL(/\/toy$/);
            expect(await objectCount(page)).toBe(0);
        } finally {
            await context.close();
        }
    });
});

/** Same toy-state-reset concerns as before, but through the real exit path. */
test.describe('Toy state reset on exit', () => {
    test.beforeEach(async ({ context }) => {
        await skipOnboarding(context);
    });

    const reenter = async (page) => {
        await page.locator(SANDBOX_CARD).click();
        await startPlaying(page);
    };

    test('objects, speech and tones are cleared and input state is reset', async ({ page }) => {
        const c = collectErrors(page);
        await enterSandbox(page);
        await tapSpawn(page, 0.25, 0.3);
        await tapSpawn(page, 0.5, 0.5);
        await tapSpawn(page, 0.75, 0.7);
        expect(await objectCount(page)).toBe(3);

        await page.evaluate(() => window.appRoutes.exitToy());
        await expect(page.locator('#toy-mode-selector')).toBeVisible();
        const afterExit = await page.evaluate(() => {
            const s = window.appRoutes.getGameScene();
            return {
                objects: s.objects.length,
                speaking: s.speechManager.getIsSpeaking(),
                tones: s.audioManager.activeTones.size,
                dragging: s.isDragging,
                dragged: s.draggedObject,
            };
        });
        expect(afterExit).toEqual({ objects: 0, speaking: false, tones: 0, dragging: false, dragged: null });

        await reenter(page);
        expect(await objectCount(page)).toBe(0);
        expect(c.pageErrors).toEqual([]);
    });

    test('exiting mid-drag leaves no stuck drag and the next session works', async ({ page }) => {
        const c = collectErrors(page);
        await enterSandbox(page);
        const o = await tapSpawn(page, 0.4, 0.4);
        await page.waitForFunction(() => window.appRoutes.getGameScene().canMoveAfterSpawn());
        await page.mouse.move(o.x, o.y);
        await page.mouse.down();
        await page.mouse.move(o.x + 80, o.y + 60, { steps: 4 });
        expect(await page.evaluate(() => window.appRoutes.getGameScene().isDragging)).toBe(true);

        await page.evaluate(() => window.appRoutes.exitToy());
        await expect(page.locator('#toy-mode-selector')).toBeVisible();
        await page.mouse.up();

        await reenter(page);
        expect(await page.evaluate(() => window.appRoutes.getGameScene().isDragging)).toBe(false);
        await tapSpawn(page, 0.3, 0.3);
        expect(c.pageErrors).toEqual([]);
    });

    test('exiting with keys held does not break the next session', async ({ page }) => {
        const c = collectErrors(page);
        await enterSandbox(page);
        await page.keyboard.down('KeyQ');
        await page.keyboard.down('KeyW');
        await page.evaluate(() => window.appRoutes.exitToy());
        await expect(page.locator('#toy-mode-selector')).toBeVisible();
        await page.keyboard.up('KeyQ');
        await page.keyboard.up('KeyW');
        await reenter(page);
        await page.keyboard.press('KeyA');
        await expect.poll(() => objectCount(page)).toBe(1);
        expect(c.pageErrors).toEqual([]);
    });

    test('three enter/exit cycles stay clean and the final session spawns normally', async ({ page }) => {
        const c = collectErrors(page);
        await enterSandbox(page);
        for (let i = 0; i < 3; i++) {
            await tapSpawn(page, 0.3 + i * 0.1, 0.3 + i * 0.1);
            await page.evaluate(() => window.appRoutes.exitToy());
            await expect(page.locator('#toy-mode-selector')).toBeVisible();
            await reenter(page);
            expect(await objectCount(page)).toBe(0);
        }
        await tapSpawn(page, 0.5, 0.5);
        expect(await objectCount(page)).toBe(1);
        // Exactly one canvas, however many times we re-entered.
        await expect(page.locator('#game-container canvas')).toHaveCount(1);
        expect(c.pageErrors).toEqual([]);
        void waitForScene;
    });
});
