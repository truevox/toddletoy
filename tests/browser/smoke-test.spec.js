import { test, expect } from '@playwright/test';
import { collectErrors, skipOnboarding, enterSandbox, waitForSpawnReady, waitForObjectCount, allObjects } from './helpers/app.js';

test.describe('Application smoke test', () => {
    test('loads, starts the sandbox through the real flow and spawns an object by key', async ({ page, context }) => {
        await skipOnboarding(context);
        const c = collectErrors(page);
        await enterSandbox(page);
        await waitForSpawnReady(page);
        await page.keyboard.press('KeyS');
        await waitForObjectCount(page, 1);
        const [o] = await allObjects(page);
        expect(o.text).toBeTruthy();
        expect(c.all()).toEqual([]);
    });
});
