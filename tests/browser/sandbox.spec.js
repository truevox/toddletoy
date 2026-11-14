import { test, expect } from '@playwright/test';
import {
    collectErrors, skipOnboarding, enterConfig, startPlaying, enterSandbox, tapSpawn, objectCount, allObjects,
    sceneSize, waitForObjectCount, waitForSpawnReady, canvasPoint,
} from './helpers/app.js';
import { dragScene, attachmentOffsets } from './helpers/scene.js';

/**
 * Behavioural smoke suite for the sandbox (replaces the old screenshot-based
 * cross-browser and layout-preservation specs). Runs on every project; only
 * the touch group needs a touch-enabled context.
 */
test.describe('Sandbox smoke', () => {
    test.beforeEach(async ({ context }) => {
        await skipOnboarding(context);
    });

    test('initialises with a sensibly sized canvas and no errors', async ({ page }) => {
        const c = collectErrors(page);
        await enterSandbox(page);
        const box = await page.locator('#game-container canvas').boundingBox();
        expect(box.width).toBeGreaterThan(200);
        expect(box.height).toBeGreaterThan(200);
        expect(c.all()).toEqual([]);
        expect(await objectCount(page)).toBe(0);
    });

    test('a click on empty space spawns one object with its labels attached', async ({ page }) => {
        await enterSandbox(page);
        await tapSpawn(page, 0.5, 0.5);
        const [o] = await allObjects(page);
        expect(o.text).toBeTruthy();
        const a = await attachmentOffsets(page);
        expect(a.words.length).toBeGreaterThan(0);
        // labels sit below the object
        expect(a.words.every((w) => w.dy > 0)).toBe(true);
    });

    test('keyboard Q, W and E spawn at the top row (left, centre, right)', async ({ page }) => {
        await enterSandbox(page);
        const { width, height } = await sceneSize(page);
        for (const key of ['KeyQ', 'KeyW', 'KeyE']) {
            await waitForSpawnReady(page);
            const before = await objectCount(page);
            await page.keyboard.press(key);
            await waitForObjectCount(page, before + 1);
        }
        const objs = await allObjects(page);
        expect(objs.map((o) => Math.round(o.x))).toEqual([0.1, 0.5, 0.9].map((f) => Math.round(width * f)));
        // objects may be nudged down so their attached numerals/labels stay on screen
        objs.forEach((o) => { expect(o.y).toBeGreaterThanOrEqual(height * 0.1 - 1); expect(o.y).toBeLessThan(height * 0.5); });
    });

    test('S spawns at the centre', async ({ page }) => {
        await enterSandbox(page);
        const { width, height } = await sceneSize(page);
        await waitForSpawnReady(page);
        await page.keyboard.press('KeyS');
        await waitForObjectCount(page, 1);
        const [o] = await allObjects(page);
        expect(o.x).toBeCloseTo(width / 2, 0);
        expect(o.y).toBeCloseTo(height / 2, 0);
    });

    test('platform APIs the game relies on exist and do not throw', async ({ page }) => {
        const c = collectErrors(page);
        await enterSandbox(page);
        const api = await page.evaluate(() => ({
            audio: !!(window.AudioContext || window.webkitAudioContext),
            speech: 'speechSynthesis' in window,
            pointer: 'PointerEvent' in window,
            fontFace: 'FontFace' in window,
            sw: 'serviceWorker' in navigator,
            manifest: !!document.querySelector('link[rel="manifest"]'),
            gamepad: (() => { try { return 'getGamepads' in navigator ? (navigator.getGamepads(), true) : true; } catch { return false; } })(),
        }));
        expect(api).toEqual({ audio: true, speech: true, pointer: true, fontFace: true, sw: true, manifest: true, gamepad: true });
        await tapSpawn(page, 0.4, 0.4);
        expect(c.all()).toEqual([]);
    });

    test('dragging moves the object and keeps labels attached with no cumulative drift', async ({ page }) => {
        await enterSandbox(page);
        const { width, height } = await sceneSize(page);
        await tapSpawn(page, 0.5, 0.4);
        await page.evaluate(() => { /* emulate release of the spawning click */ });
        const before = await attachmentOffsets(page);
        let pos = { x: before.x, y: before.y };
        for (const to of [{ x: width * 0.3, y: height * 0.3 }, { x: width * 0.7, y: height * 0.5 }, { x: width * 0.4, y: height * 0.6 }]) {
            await dragScene(page, pos, to);
            pos = to;
            const after = await attachmentOffsets(page);
            expect(after.x).toBeCloseTo(to.x, 0);
            expect(after.y).toBeCloseTo(to.y, 0);
            expect(after.text).toBe(before.text);
            after.words.forEach((w, i) => {
                expect(w.dx).toBeCloseTo(before.words[i].dx, 0);
                expect(w.dy).toBeCloseTo(before.words[i].dy, 0);
            });
            expect(await objectCount(page)).toBe(1); // dragging never spawns
        }
    });

    test('canvas follows the viewport when it is resized', async ({ page }) => {
        await enterSandbox(page);
        await page.setViewportSize({ width: 800, height: 600 });
        await expect.poll(async () => (await sceneSize(page)).width).toBeLessThanOrEqual(800);
        await page.setViewportSize({ width: 375, height: 667 });
        await expect.poll(async () => (await sceneSize(page)).width).toBeLessThanOrEqual(375);
        const box = await page.locator('#game-container canvas').boundingBox();
        expect(box.width).toBeLessThanOrEqual(376);
        await tapSpawn(page, 0.5, 0.5);
        const [o] = await allObjects(page);
        expect(o.x).toBeLessThanOrEqual(375);
        expect(o.y).toBeLessThanOrEqual(667);
    });
});

test.describe('Touch input', () => {
    test.use({ hasTouch: true, viewport: { width: 393, height: 851 } });

    test('a touch tap spawns an object', async ({ page, context }) => {
        await skipOnboarding(context);
        await enterSandbox(page);
        await waitForSpawnReady(page);
        const p = await canvasPoint(page, 0.5, 0.5);
        await page.touchscreen.tap(p.x, p.y);
        await waitForObjectCount(page, 1);
    });
});

test.describe('Grid mode', () => {
    test.beforeEach(async ({ context }) => {
        await skipOnboarding(context);
    });

    test('enabling grid mode in config starts the toy in grid mode and taps fill cells', async ({ page }) => {
        const c = collectErrors(page);
        await enterConfig(page);
        const grid = page.locator('#grid-mode-enabled');
        await grid.scrollIntoViewIfNeeded();
        await grid.check();
        await startPlaying(page);
        expect(await page.evaluate(() => window.appRoutes.getGameScene().gridMode.enabled)).toBe(true);

        const spots = [[0.2, 0.25], [0.8, 0.25], [0.5, 0.75]];
        const cells = [];
        for (const [fx, fy] of spots) {
            await tapSpawn(page, fx, fy);
            cells.push(await page.evaluate(([fx, fy]) => {
                const s = window.appRoutes.getGameScene();
                const o = s.objects.at(-1);
                const gm = s.gridMode.gridManager;
                return {
                    tapped: gm.getGridCell(s.scale.width * fx, s.scale.height * fy),
                    placed: gm.getGridCell(o.x, o.y),
                };
            }, [fx, fy]));
        }
        for (const cell of cells) expect(cell.placed).toEqual(cell.tapped);
        expect(await objectCount(page)).toBe(3);
        // distinct cells -> distinct positions
        const objs = await allObjects(page);
        expect(new Set(objs.map((o) => `${Math.round(o.x)},${Math.round(o.y)}`)).size).toBe(3);
        expect(c.pageErrors).toEqual([]);
    });

    test('tapping an occupied cell replaces its object instead of adding one', async ({ page }) => {
        await enterConfig(page);
        await page.locator('#grid-mode-enabled').check();
        await startPlaying(page);
        await tapSpawn(page, 0.3, 0.3).catch(() => {});
        await waitForObjectCount(page, 1);
        await waitForSpawnReady(page);
        await page.evaluate(() => { window.appRoutes.getGameScene().awaitingSpawnInputRelease = false; });
        const p = await canvasPoint(page, 0.3, 0.3);
        await page.mouse.click(p.x, p.y);
        await page.waitForTimeout(500); // allow a (wrong) extra spawn to land
        expect(await objectCount(page)).toBe(1);
    });

    test('grid mode is off by default', async ({ page }) => {
        await enterSandbox(page);
        expect(await page.evaluate(() => window.appRoutes.getGameScene().gridMode.enabled)).toBe(false);
    });
});
