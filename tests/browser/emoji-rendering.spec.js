import { test, expect } from '@playwright/test';
import { seedConfig, skipOnboarding, enterSandbox, tapSpawn, spawnForced, allObjects, sceneSize, waitForSpawnReady, waitForObjectCount, objectCount } from './helpers/app.js';
import { regionHasContent, attachmentOffsets, dragScene, tapFreeSpot, allowManyObjects } from './helpers/scene.js';

/**
 * Emoji rendering checks without pixel baselines: scene state says what was
 * spawned, and a screenshot region is decoded in-page to confirm real pixels
 * were drawn where the emoji is (it was "empty space" once).
 */
const EMOJIS_ONLY = { content: {
    shapes: { enabled: false }, smallNumbers: { enabled: false }, largeNumbers: { enabled: false },
    uppercaseLetters: { enabled: false }, lowercaseLetters: { enabled: false }, emojis: { enabled: true, weight: 20 },
} };

test.describe('Emoji rendering', () => {
    test.beforeEach(async ({ context }) => {
        await skipOnboarding(context);
        await seedConfig(context, EMOJIS_ONLY);
        await allowManyObjects(context);
    });

    test('a spawned emoji draws visible pixels where it is, and nothing is drawn there before', async ({ page }) => {
        await enterSandbox(page);
        const { width, height } = await sceneSize(page);
        const clip = { x: width / 2 - 40, y: height / 2 - 40, width: 80, height: 80 };
        expect(await regionHasContent(page, clip)).toBe(false);
        const o = await tapSpawn(page, 0.5, 0.5);
        expect(o.type).toBe('emoji');
        expect(o.text.length).toBeGreaterThan(0);
        await expect.poll(() => regionHasContent(page, clip), { timeout: 5000 }).toBe(true);
    });

    test('different taps give a variety of emojis, each with a label', async ({ page }) => {
        await enterSandbox(page);
        for (let i = 0; i < 8; i++) {
            await tapFreeSpot(page);
        }
        const objs = await allObjects(page);
        expect(objs).toHaveLength(8);
        expect(objs.every((o) => o.type === 'emoji' && o.text)).toBe(true);
        expect(new Set(objs.map((o) => o.text)).size).toBeGreaterThan(1);
        const a = await attachmentOffsets(page);
        expect(a.words.length).toBeGreaterThan(0);
    });

    test('keyboard-spawned emojis (letter keys fall back to emoji here) land on nine distinct positions', async ({ page }) => {
        await enterSandbox(page);
        for (const key of ['KeyQ', 'KeyW', 'KeyE', 'KeyA', 'KeyS', 'KeyD', 'KeyZ', 'KeyX', 'KeyC']) {
            await waitForSpawnReady(page);
            const before = await objectCount(page);
            await page.keyboard.press(key);
            await waitForObjectCount(page, before + 1);
        }
        const objs = await allObjects(page);
        expect(new Set(objs.map((o) => `${Math.round(o.x)},${Math.round(o.y)}`)).size).toBe(9);
    });

    test('moving an emoji changes where pixels are drawn', async ({ page, isMobile }) => {
        await enterSandbox(page);
        const o = await tapSpawn(page, 0.3, 0.4);
        const { width, height } = await sceneSize(page);
        const at = (x, y) => ({ x: Math.max(0, x - 30), y: Math.max(0, y - 30), width: 60, height: 60 });
        await expect.poll(() => regionHasContent(page, at(o.x, o.y))).toBe(true);
        const to = { x: width * 0.75, y: height * 0.35 };
        await dragScene(page, { x: o.x, y: o.y }, to);
        await expect.poll(() => regionHasContent(page, at(to.x, to.y))).toBe(true);
        // (on phones the two spots can overlap after edge clamping)
        // polled: the drag trail takes a moment to fade from the old spot
        if (!isMobile) await expect.poll(() => regionHasContent(page, at(o.x, o.y), 200)).toBe(false);
    });

    test('the platform can draw emoji glyphs at all', async ({ page }) => {
        await enterSandbox(page);
        const px = await page.evaluate(() => {
            const c = document.createElement('canvas');
            c.width = 200; c.height = 100;
            const ctx = c.getContext('2d');
            ctx.font = '32px Arial';
            ctx.fillText('🐶😢🐛', 10, 50);
            const d = ctx.getImageData(0, 0, 200, 100).data;
            let n = 0;
            for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
            return n;
        });
        expect(px).toBeGreaterThan(100);
    });

    for (const vp of [{ width: 375, height: 667 }, { width: 1920, height: 1080 }]) {
        test(`emoji renders and stays on screen at ${vp.width}x${vp.height}`, async ({ page }) => {
            await page.setViewportSize(vp);
            await enterSandbox(page);
            const o = await tapSpawn(page, 0.5, 0.5);
            const { width, height } = await sceneSize(page);
            expect(o.x).toBeGreaterThan(0);
            expect(o.x).toBeLessThan(width);
            expect(o.y).toBeLessThan(height);
            await expect.poll(() => regionHasContent(page, {
                x: Math.max(0, o.x - 30), y: Math.max(0, o.y - 30), width: 60, height: 60,
            })).toBe(true);
        });
    }

    test('forcing the emoji type spawns an emoji with its translations', async ({ page }) => {
        await enterSandbox(page);
        await spawnForced(page, 300, 300, 'emoji');
        const d = await page.evaluate(() => window.appRoutes.getGameScene().objects[0].itemData);
        expect(d.emoji || d.value).toBeTruthy();
        expect(d.en).toBeTruthy();
    });
});
