import { test, expect, devices } from '@playwright/test';
import {
    collectErrors, seedConfig, enterSandbox, canvasPoint, waitForSpawnReady, objectCount, waitForObjectCount, lastObject,
} from './helpers/app.js';

/**
 * Device-pixel rendering and screen-relative sizes (Stage 1 of the sandbox plan).
 *
 * The canvas backing store is CSS size x min(devicePixelRatio, 3); the scene's world
 * stays in CSS pixels, so a tap at CSS (x, y) must spawn an object at (x, y).
 */

const { defaultBrowserType, ...pixel5 } = devices['Pixel 5']; // describe-level use() may not set the browser type
const PROFILES = {
    phone: { ...pixel5 },
    tablet: { viewport: { width: 1024, height: 768 }, deviceScaleFactor: 2, hasTouch: true },
    desktop: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
};

const snapshot = (page) =>
    page.evaluate(() => JSON.parse(JSON.stringify(window.appRoutes.getGameScene().debugSnapshot())));

/** Real click at a CSS point; resolves with the object that appeared. */
async function tapAt(page, x, y) {
    await waitForSpawnReady(page);
    const before = await objectCount(page);
    const origin = await canvasPoint(page, 0, 0);
    await page.mouse.click(origin.x + x, origin.y + y);
    await waitForObjectCount(page, before + 1, 8000);
    return lastObject(page);
}

test.describe('display scale: crisp canvas and exact tap mapping', () => {
    test.use(PROFILES.phone);

    test.beforeEach(async ({ context }) => {
        // emoji and shapes only (numbers are legitimately nudged to fit their rows); no idle auto-cleanup
        await seedConfig(context, {
            content: { smallNumbers: { enabled: false }, largeNumbers: { enabled: false },
                uppercaseLetters: { enabled: false }, lowercaseLetters: { enabled: false } },
            advanced: { autoCleanup: { enabled: false } },
        });
    });

    test('canvas backing store is CSS size x device pixel ratio; snapshot stays logical', async ({ page }) => {
        const errs = collectErrors(page);
        await enterSandbox(page);
        const snap = await snapshot(page);
        const css = await page.evaluate(() => ({ w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio }));

        expect(css.dpr).toBeGreaterThan(1.5);
        expect(snap.width).toBe(css.w);
        expect(Math.abs(snap.height - css.h)).toBeLessThanOrEqual(1);
        expect(Math.abs(snap.canvas.width - Math.round(css.w * Math.min(css.dpr, 3)))).toBeLessThanOrEqual(1);
        expect(Math.abs(snap.canvas.height - Math.round(css.h * Math.min(css.dpr, 3)))).toBeLessThanOrEqual(1);

        // the canvas element still fills the window in CSS px (no letterboxing)
        const box = await page.locator('#game-container canvas').boundingBox();
        expect(Math.round(box.width)).toBe(css.w);
        expect(Math.abs(box.height - css.h)).toBeLessThanOrEqual(1);
        expect(errs.all()).toEqual([]);
    });

    test('a tap at CSS (x, y) spawns the object at (x, y)', async ({ page }) => {
        await enterSandbox(page);
        for (const [x, y] of [[120, 260], [260, 480], [150, 380]]) {
            const o = await tapAt(page, x, y);
            expect(Math.abs(o.x - x)).toBeLessThanOrEqual(4);
            expect(Math.abs(o.y - y)).toBeLessThanOrEqual(4);
        }
    });

    test('the mapping stays exact after the viewport is resized or rotated', async ({ page }) => {
        const errs = collectErrors(page);
        await enterSandbox(page);
        // objects keep their fractional position on resize, so tap somewhere new each time
        for (const [size, fx, fy] of [[{ width: 700, height: 420 }, 0.3, 0.55], [{ width: 420, height: 800 }, 0.75, 0.25]]) {
            await page.setViewportSize(size);
            await page.waitForFunction((w) => window.appRoutes.getGameScene().debugSnapshot().width === w, size.width);
            const snap = await snapshot(page);
            expect(Math.abs(snap.height - size.height)).toBeLessThanOrEqual(1);
            const dpr = Math.min(snap.dpr, 3);
            expect(Math.abs(snap.canvas.width - Math.round(size.width * dpr))).toBeLessThanOrEqual(1);

            const x = Math.round(size.width * fx), y = Math.round(size.height * fy);
            const o = await tapAt(page, x, y);
            expect(Math.abs(o.x - x)).toBeLessThanOrEqual(4);
            expect(Math.abs(o.y - y)).toBeLessThanOrEqual(4);
        }
        expect(errs.all()).toEqual([]);
    });

    test('captions render at device resolution', async ({ page }) => {
        await enterSandbox(page);
        await page.evaluate(() => window.appRoutes.getGameScene().spawnObjectAt(200, 300, 'emoji'));
        const res = await page.evaluate(() => {
            const o = window.appRoutes.getGameScene().objects.at(-1);
            const words = o.allLanguageWords.flatMap((g) => g.words);
            return { glyph: o.style.resolution, words: words.map((w) => w.style.resolution), dpr: window.devicePixelRatio };
        });
        expect(res.glyph).toBeCloseTo(res.dpr, 1);
        expect(res.words.length).toBeGreaterThan(0);
        res.words.forEach((r) => expect(r).toBeCloseTo(res.dpr, 1));
    });
});
