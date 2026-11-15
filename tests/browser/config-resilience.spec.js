import { test, expect } from '@playwright/test';
import {
    collectErrors, seedConfig, skipOnboarding, enterSandbox, enterConfig, startPlaying, gotoSelector,
    tapSpawn, savedConfig, acceptDialogs, waitForScene, START_BUTTON, SANDBOX_CARD, CONFIG_KEY,
} from './helpers/app.js';

/**
 * The config screen and sandbox must come up no matter what is (or is not)
 * in localStorage - real devices have corrupt, foreign or blocked storage.
 */
test.describe('Corrupt or unavailable storage', () => {
    async function fullFlowWorks(page, c) {
        await gotoSelector(page);
        await page.locator(SANDBOX_CARD).click();
        await expect(page.locator('#config-screen')).toBeVisible();
        await expect(page.locator(START_BUTTON).first()).toBeVisible();
        await startPlaying(page);
        const obj = await tapSpawn(page, 0.5, 0.5);
        expect(obj).toBeTruthy();
        expect(c.pageErrors).toEqual([]);
    }

    test('wrong-shaped saved config still renders config and can start playing', async ({ page, context }) => {
        await seedConfig(context, null, { raw: '{"content":null,"languages":7,"advanced":"x"}' });
        const c = collectErrors(page);
        await fullFlowWorks(page, c);
    });

    test('unparseable saved config still renders config and can start playing', async ({ page, context }) => {
        await seedConfig(context, null, { raw: '{not json at all' });
        const c = collectErrors(page);
        await fullFlowWorks(page, c);
    });

    test('config that is a JSON array or primitive is tolerated', async ({ page, context }) => {
        await seedConfig(context, null, { raw: '[1,2,3]' });
        const c = collectErrors(page);
        await fullFlowWorks(page, c);
    });

    test('a throwing localStorage getter still allows selector -> config -> toy', async ({ page, context }) => {
        await context.addInitScript(() => {
            Object.defineProperty(window, 'localStorage', {
                configurable: true,
                get() { throw new DOMException('The operation is insecure.', 'SecurityError'); },
            });
        });
        const c = collectErrors(page);
        await gotoSelector(page);
        await page.locator(SANDBOX_CARD).click();
        await expect(page.locator('#config-screen')).toBeVisible();
        await startPlaying(page);
        await tapSpawn(page, 0.4, 0.4);
        expect(c.pageErrors).toEqual([]);
    });
});

test.describe('Config persistence', () => {
    test.beforeEach(async ({ context, page }) => {
        await skipOnboarding(context);
        acceptDialogs(page);
    });

    test('a changed setting survives start -> /admin, and Reset to Defaults restores it', async ({ page }) => {
        await enterConfig(page);
        const mute = page.locator('#audio-mute');
        await expect(mute).not.toBeChecked();
        await mute.check();
        await startPlaying(page);

        // The change was written to storage when we started playing...
        expect((await savedConfig(page)).audio.mute).toBe(true);

        // ...and /admin always shows the config screen with the saved value.
        await page.goto('/admin');
        await expect(page.locator('#config-screen')).toBeVisible();
        await expect(page.locator('#audio-mute')).toBeChecked();

        await page.locator('#reset-undo-btn').click();
        await expect(page.locator('#audio-mute')).not.toBeChecked();
        await expect(page.locator('#reset-undo-btn')).toContainText(/Undo/);
        expect((await savedConfig(page)).audio.mute).toBe(false);

        // Undo brings the muted setting back.
        await page.locator('#reset-undo-btn').click();
        await expect(page.locator('#audio-mute')).toBeChecked();
    });

    test('skipConfig sends the Sandbox card straight to the toy', async ({ page, context }) => {
        await seedConfig(context, { advanced: { skipConfig: true } });
        await gotoSelector(page);
        await page.locator(SANDBOX_CARD).click();
        await waitForScene(page);
        await expect(page.locator('#config-screen')).toBeHidden();
    });

    test('config that is saved by playing is reused on the next load', async ({ page }) => {
        await enterConfig(page);
        await page.locator('#speech-mute').check();
        await startPlaying(page);
        await page.goto('/admin');
        await expect(page.locator('#speech-mute')).toBeChecked();
        await page.reload();
        await expect(page.locator('#speech-mute')).toBeChecked();
        expect(await page.evaluate((k) => localStorage.getItem(k) !== null, CONFIG_KEY)).toBe(true);
    });
});

test.describe('Config header layout', () => {
    test.use({ viewport: { width: 393, height: 851 } });

    test('Docs, Check for Updates, version, title and subtitle do not overlap at 393px', async ({ page, context }) => {
        await skipOnboarding(context);
        await enterConfig(page);
        const sels = {
            version: '#app-version',
            docs: '#documentation-btn',
            update: '#update-app-btn',
            title: '.config-title',
            subtitle: '.config-subtitle',
        };
        const boxes = {};
        for (const [k, sel] of Object.entries(sels)) {
            const loc = page.locator(sel);
            await expect(loc).toBeVisible();
            boxes[k] = await loc.boundingBox();
            expect(boxes[k].x).toBeGreaterThanOrEqual(-0.5);
            expect(boxes[k].x + boxes[k].width).toBeLessThanOrEqual(393 + 0.5);
        }
        const overlap = (a, b) =>
            Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 0.5 &&
            Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 0.5;
        const keys = Object.keys(boxes);
        for (let i = 0; i < keys.length; i++) {
            for (let j = i + 1; j < keys.length; j++) {
                expect(overlap(boxes[keys[i]], boxes[keys[j]]),
                    `${keys[i]} overlaps ${keys[j]}: ${JSON.stringify([boxes[keys[i]], boxes[keys[j]]])}`).toBe(false);
            }
        }
    });

    test('config page has no horizontal overflow on a phone', async ({ page, context }) => {
        await skipOnboarding(context);
        await enterConfig(page);
        const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(over).toBeLessThanOrEqual(1);
    });
});
