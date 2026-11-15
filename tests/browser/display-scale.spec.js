import { test, expect, devices } from '@playwright/test';
import {
    collectErrors, seedConfig, enterSandbox, canvasPoint, waitForSpawnReady, objectCount, waitForObjectCount, lastObject,
} from './helpers/app.js';

/**
 * Device-pixel rendering and screen-relative sizes (Stage 1 of the sandbox plan).
 *
 * The canvas backing store is CSS size x min(devicePixelRatio, 2); the scene's world
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
        expect(Math.abs(snap.canvas.width - Math.round(css.w * Math.min(css.dpr, 2)))).toBeLessThanOrEqual(1);
        expect(Math.abs(snap.canvas.height - Math.round(css.h * Math.min(css.dpr, 2)))).toBeLessThanOrEqual(1);

        // the canvas element still fills the window in CSS px (no letterboxing)
        const box = await page.locator('#game-container canvas:not(.tt-backdrop)').boundingBox();
        expect(Math.round(box.width)).toBe(css.w);
        expect(Math.abs(box.height - css.h)).toBeLessThanOrEqual(1);
        expect(errs.all()).toEqual([]);
    });

    test('a tap at CSS (x, y) spawns the object at (x, y)', async ({ page }) => {
        await enterSandbox(page);
        // centred horizontally: long captions near a side edge are legitimately nudged inward
        for (const [x, y] of [[196, 190], [196, 400], [196, 610]]) {
            const o = await tapAt(page, x, y);
            expect(Math.abs(o.x - x)).toBeLessThanOrEqual(4);
            expect(Math.abs(o.y - y)).toBeLessThanOrEqual(4);
        }
    });

    test('the mapping stays exact after the viewport is resized or rotated', async ({ page }) => {
        const errs = collectErrors(page);
        await enterSandbox(page);
        // objects keep their fractional position on resize, so tap somewhere new each time
        for (const [size, fx, fy] of [[{ width: 700, height: 420 }, 0.5, 0.3], [{ width: 420, height: 800 }, 0.5, 0.78]]) {
            await page.setViewportSize(size);
            await page.waitForFunction((w) => window.appRoutes.getGameScene().debugSnapshot().width === w, size.width);
            const snap = await snapshot(page);
            expect(Math.abs(snap.height - size.height)).toBeLessThanOrEqual(1);
            const dpr = Math.min(snap.dpr, 2);
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

/**
 * Screen-relative sizes: the main glyph is ~20% of the short edge (clamped 72..220),
 * captions are clearly secondary, and every composite stays on screen.
 */
const MIXED = ['emoji', 'shapes', 'largeNumbers', 'uppercaseLetters', 'smallNumbers', 'emoji',
    'lowercaseLetters', 'largeNumbers', 'shapes', 'largeNumbers'];

for (const [name, profile] of Object.entries(PROFILES)) {
    test.describe(`screen-relative sizes: ${name}`, () => {
        test.use(profile);

        test.beforeEach(async ({ context }) => {
            await seedConfig(context, { advanced: { autoCleanup: { enabled: false } } });
        });

        test('the first emoji is about 20% of the short edge, caption clearly secondary', async ({ page }) => {
            const errs = collectErrors(page);
            await enterSandbox(page);
            await page.evaluate(() => {
                const s = window.appRoutes.getGameScene();
                const { width, height } = s.debugSnapshot();
                return s.spawnObjectAt(width * 0.4, height * 0.45, 'emoji');
            });
            const snap = await snapshot(page);
            const short = Math.min(snap.width, snap.height);
            const o = snap.objects[0];
            const clampedLow = o.glyph.h <= 72 * 1.1, clampedHigh = o.glyph.h >= 220 * 0.95;
            if (!clampedLow && !clampedHigh) {
                expect(o.glyph.h / short).toBeGreaterThanOrEqual(0.17);
                expect(o.glyph.h / short).toBeLessThanOrEqual(0.23);
            }
            expect(o.captionFont).toBeGreaterThanOrEqual(15);
            expect(o.captionFont / o.glyph.h).toBeLessThan(0.35);
            expect(errs.all()).toEqual([]);
        });

        test('letters, numerals and shapes use the same unit', async ({ page }) => {
            await enterSandbox(page);
            for (const [i, type] of ['uppercaseLetters', 'smallNumbers', 'shapes'].entries()) {
                await page.evaluate(([i, type]) => {
                    const s = window.appRoutes.getGameScene();
                    const { width, height } = s.debugSnapshot();
                    return s.spawnObjectAt(width * (0.2 + 0.3 * i), height * 0.5, type);
                }, [i, type]);
            }
            const snap = await snapshot(page);
            const short = Math.min(snap.width, snap.height);
            for (const o of snap.objects) {
                expect(o.glyph.h / short, `${o.type} glyph`).toBeGreaterThanOrEqual(0.14);
                expect(o.glyph.h / short, `${o.type} glyph`).toBeLessThanOrEqual(0.25);
            }
        });

        test('10 mixed spawns, including large numbers with every mode on, stay inside the screen', async ({ page }) => {
            test.setTimeout(90000); // software GL at 2-3x pixel ratio makes each spawn round trip slow
            const errs = collectErrors(page);
            await enterSandbox(page);
            for (const type of MIXED) {
                await page.evaluate((type) => {
                    const s = window.appRoutes.getGameScene();
                    const { width, height } = s.debugSnapshot();
                    return s.spawnObjectAt(Math.random() * width, Math.random() * height, type);
                }, type);
            }
            const snap = await snapshot(page);
            expect(snap.objects).toHaveLength(MIXED.length);
            for (const o of snap.objects) {
                expect(o.bounds.x, `${o.type} left`).toBeGreaterThanOrEqual(-0.5);
                expect(o.bounds.y, `${o.type} top`).toBeGreaterThanOrEqual(-0.5);
                expect(o.bounds.x + o.bounds.w, `${o.type} right`).toBeLessThanOrEqual(snap.width + 0.5);
                expect(o.bounds.y + o.bounds.h, `${o.type} bottom`).toBeLessThanOrEqual(snap.height + 0.5);
            }
            expect(errs.all()).toEqual([]);
        });
    });
}

test.describe('screen-relative sizes: tiny screen and resize', () => {
    test.beforeEach(async ({ context }) => {
        await seedConfig(context, { advanced: { autoCleanup: { enabled: false } } });
    });

    test('a number with every mode on fits a 360x640 screen', async ({ page }) => {
        await page.setViewportSize({ width: 360, height: 640 });
        await enterSandbox(page);
        for (const y of [0.1, 0.5, 0.95]) {
            await page.evaluate((fy) => {
                const s = window.appRoutes.getGameScene();
                const orig = s.__orig || (s.__orig = s.getRandomNumber.bind(s));
                s.getRandomNumber = async (t) => ({ ...(await orig(t)), value: 9876 });
                return s.spawnObjectAt(180, 640 * fy, 'largeNumbers');
            }, y);
        }
        const snap = await snapshot(page);
        for (const o of snap.objects) {
            expect(o.bounds.x).toBeGreaterThanOrEqual(-0.5);
            expect(o.bounds.y).toBeGreaterThanOrEqual(-0.5);
            expect(o.bounds.x + o.bounds.w).toBeLessThanOrEqual(360.5);
            expect(o.bounds.y + o.bounds.h).toBeLessThanOrEqual(640.5);
        }
    });

    test('resizing re-sizes existing objects to the new unit', async ({ page }) => {
        const errs = collectErrors(page);
        await page.setViewportSize({ width: 1280, height: 800 });
        await enterSandbox(page);
        await page.evaluate(() => window.appRoutes.getGameScene().spawnObjectAt(400, 300, 'emoji'));
        const big = (await snapshot(page)).objects[0].glyph.h;
        expect(big).toBeGreaterThan(130);

        await page.setViewportSize({ width: 700, height: 420 });
        await page.waitForFunction(() => {
            const s = window.appRoutes.getGameScene().debugSnapshot();
            return s.width === 700 && s.objects.length === 1 && s.objects[0].glyph.h < 110;
        }, null, { timeout: 8000 });
        const snap = await snapshot(page);
        expect(snap.objects).toHaveLength(1);
        expect(snap.objects[0].glyph.h / 420).toBeGreaterThan(0.17);
        expect(snap.objects[0].glyph.h / 420).toBeLessThan(0.23);
        expect(snap.objects[0].bounds.x + snap.objects[0].bounds.w).toBeLessThanOrEqual(700.5);
        expect(errs.all()).toEqual([]);
    });
});
