import { test, expect } from '@playwright/test';
import {
    collectErrors, seedConfig, skipOnboarding, enterSandbox, tapSpawn, objectCount, waitForObjectCount,
    waitForSpawnReady, allObjects, sceneSize, clickCanvas, spawnForced, canvasPoint,
} from './helpers/app.js';

/**
 * Regression coverage for real-browser sandbox bugs found by hand.
 */
test.describe('Sandbox regressions', () => {
    test.beforeEach(async ({ context }) => {
        await skipOnboarding(context);
    });

    test('a heart shape spawns without an "Error spawning object"', async ({ page }) => {
        const c = collectErrors(page);
        await enterSandbox(page);
        await page.evaluate(() => {
            const s = window.appRoutes.getGameScene();
            s.getRandomShape = async () => ({ value: 'Heart', type: 'shape', en: 'Heart', es: 'Corazón' });
        });
        const before = await objectCount(page);
        await page.evaluate(() => window.appRoutes.getGameScene().spawnObjectAt(400, 300, 'shapes'));
        expect(await objectCount(page)).toBe(before + 1);
        expect(c.errors.filter((e) => /Error spawning object/.test(e))).toEqual([]);
        expect(c.pageErrors).toEqual([]);
    });

    test('every shape in the data set can be spawned', async ({ page }) => {
        const c = collectErrors(page);
        await enterSandbox(page);
        const names = await page.evaluate(() => window.appRoutes.getGameScene().thingsData.shapes.map((s) => s.value));
        expect(names.length).toBeGreaterThan(3);
        for (const [i, name] of names.entries()) {
            const made = await page.evaluate(async ([name, i]) => {
                const s = window.appRoutes.getGameScene();
                s.getRandomShape = async () => ({ value: name, type: 'shape', en: name, es: name });
                return !!(await s.spawnObjectAt(100 + i * 60, 300, 'shapes'));
            }, [name, i]);
            expect(made, `shape ${name} should spawn`).toBe(true);
        }
        expect(await objectCount(page)).toBe(names.length);
        expect(c.errors.filter((e) => /Error spawning object/.test(e))).toEqual([]);
    });

    test.describe('without the Web Speech API', () => {
        test('three spaced taps spawn three objects and never throw', async ({ page, context }) => {
            await context.addInitScript(() => {
                for (const k of ['speechSynthesis', 'SpeechSynthesisUtterance']) {
                    try { delete window[k]; } catch (e) { /* ignore */ }
                    Object.defineProperty(window, k, { value: undefined, configurable: true, writable: true });
                }
            });
            const c = collectErrors(page);
            await enterSandbox(page);
            expect(await page.evaluate(() => typeof window.speechSynthesis)).toBe('undefined');
            for (let i = 0; i < 3; i++) {
                // The app's fallback speech lock lasts a few seconds without the API;
                // wait for it to release, as a child's next tap would.
                await waitForSpawnReady(page, 15000);
                const before = await objectCount(page);
                await clickCanvas(page, 0.2 + i * 0.3, 0.5);
                await waitForObjectCount(page, before + 1);
            }
            expect(await objectCount(page)).toBe(3);
            expect(c.pageErrors).toEqual([]);
        });
    });

    test('taps at the screen edges keep the object inside the canvas', async ({ page }) => {
        await enterSandbox(page);
        const { width, height } = await sceneSize(page);
        const spots = [[0.001, 0.001], [0.999, 0.001], [0.001, 0.999], [0.999, 0.999], [0.5, 0.999], [0.999, 0.5]];
        for (const [fx, fy] of spots) await tapSpawn(page, fx, fy);
        for (const o of await allObjects(page)) {
            expect(o.x, `x of ${o.text}`).toBeGreaterThanOrEqual(0);
            expect(o.x).toBeLessThanOrEqual(width);
            expect(o.y).toBeGreaterThanOrEqual(0);
            expect(o.y).toBeLessThanOrEqual(height);
        }
    });

    test('a 4-digit number spawned at the bottom stays inside the canvas', async ({ page }) => {
        await enterSandbox(page);
        const { width, height } = await sceneSize(page);
        await page.evaluate(() => {
            const s = window.appRoutes.getGameScene();
            const orig = s.getRandomNumber.bind(s);
            s.getRandomNumber = async (t) => ({ ...(await orig(t)), value: 9999 });
        });
        await spawnForced(page, width / 2, height - 2, 'largeNumbers');
        const objs = await allObjects(page);
        expect(objs.length).toBe(1);
        expect(objs[0].text).toBe('9999');
        expect(objs[0].y).toBeLessThanOrEqual(height);
        expect(objs[0].y).toBeGreaterThanOrEqual(0);
        expect(objs[0].x).toBeGreaterThanOrEqual(0);
        expect(objs[0].x).toBeLessThanOrEqual(width);
    });

    test('shrinking the viewport pulls every object inside the new bounds', async ({ page }) => {
        await enterSandbox(page);
        await tapSpawn(page, 0.9, 0.9);
        await tapSpawn(page, 0.5, 0.95);
        await tapSpawn(page, 0.95, 0.1);
        await page.setViewportSize({ width: 500, height: 400 });
        await page.waitForFunction(() => {
            const s = window.appRoutes.getGameScene();
            return s.scale.width <= 500 && s.scale.height <= 400;
        });
        const { width, height } = await sceneSize(page);
        for (const o of await allObjects(page)) {
            expect(o.x).toBeGreaterThanOrEqual(0);
            expect(o.x).toBeLessThanOrEqual(width);
            expect(o.y).toBeGreaterThanOrEqual(0);
            expect(o.y).toBeLessThanOrEqual(height);
        }
    });

    test('L, 5 and Space each spawn an object; Q spawns at 10% / 10%', async ({ page, context }) => {
        // emojis only: numbers are legitimately nudged down to fit their numerals on screen
        await seedConfig(context, { content: {
            shapes: { enabled: false }, smallNumbers: { enabled: false }, largeNumbers: { enabled: false },
            uppercaseLetters: { enabled: false }, lowercaseLetters: { enabled: false }, emojis: { enabled: true, weight: 20 },
        } });
        const c = collectErrors(page);
        await enterSandbox(page);
        for (const key of ['KeyL', 'Digit5', 'Space']) {
            await waitForSpawnReady(page);
            const before = await objectCount(page);
            await page.keyboard.press(key);
            await waitForObjectCount(page, before + 1);
        }
        await waitForSpawnReady(page);
        const { width, height } = await sceneSize(page);
        const before = await objectCount(page);
        await page.keyboard.press('KeyQ');
        await waitForObjectCount(page, before + 1);
        const objs = await allObjects(page);
        const q = objs[objs.length - 1];
        expect(q.x).toBeCloseTo(width * 0.1, 0);
        expect(q.y).toBeCloseTo(height * 0.1, 0);
        expect(c.pageErrors).toEqual([]);
    });

    test('a click plus a drag emits no console.log output from the game', async ({ page }) => {
        await enterSandbox(page);
        const c = collectErrors(page); // attach after boot: only interaction output counts
        const o = await tapSpawn(page, 0.4, 0.4);
        await page.waitForFunction(() => window.appRoutes.getGameScene().canMoveAfterSpawn());
        const p = await canvasPoint(page, 0, 0);
        await page.mouse.move(p.x + o.x, p.y + o.y);
        await page.mouse.down();
        await page.mouse.move(p.x + o.x + 120, p.y + o.y + 80, { steps: 6 });
        await page.mouse.up();
        await page.waitForTimeout(300);
        expect(c.logs).toEqual([]);
    });
});
