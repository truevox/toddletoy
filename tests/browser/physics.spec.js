import { test, expect } from '@playwright/test';
import {
    seedConfig, enterSandbox, canvasPoint, objectCount, waitForObjectCount, waitForScene,
} from './helpers/app.js';
import { waitForMoveReady } from './helpers/scene.js';

/**
 * Soft physics (Stage 2, track B): objects nudge apart, the screen holds only so many,
 * and a released drag glides, bounces softly and settles.
 */

const PROFILES = {
    'phone 360x640': { viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, hasTouch: false },
    'phone 393x727': { viewport: { width: 393, height: 727 }, deviceScaleFactor: 2.75, hasTouch: false },
    'desktop 1280x800': { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
};
// no idle auto-cleanup: it would remove objects mid-test
const CONFIG = { advanced: { autoCleanup: { enabled: false } } };

const snap = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window.appRoutes.getGameScene().debugSnapshot())));
const capacity = (page) => page.evaluate(() => window.appRoutes.getGameScene().softPhysics.capacity());
const positions = (page) => page.evaluate(() => window.appRoutes.getGameScene().objects.map((o) => [o.x, o.y]));

function inside(s, o, slack = 0.5) {
    return o.bounds.x >= -slack && o.bounds.y >= -slack &&
        o.bounds.x + o.bounds.w <= s.width + slack && o.bounds.y + o.bounds.h <= s.height + slack;
}

/** Spawn n objects at the given logical points (several share a spot). */
async function spawnAll(page, points) {
    for (const [x, y, type] of points) {
        await page.evaluate(([x, y, type]) => window.appRoutes.getGameScene().spawnObjectAt(x, y, type), [x, y, type]);
        await page.waitForTimeout(60);
    }
    // programmatic spawns never get the pointer release that unlocks dragging
    await page.evaluate(() => { window.appRoutes.getGameScene().awaitingSpawnInputRelease = false; });
}

async function waitAsleep(page, timeout = 6000) {
    await page.waitForFunction(() => !window.appRoutes.getGameScene().softPhysics.awake, null, { timeout });
}

for (const [name, profile] of Object.entries(PROFILES)) {
    test.describe(`physics on ${name}`, () => {
        test.use(profile);
        test.beforeEach(async ({ context, page }) => {
            await seedConfig(context, CONFIG);
            await enterSandbox(page);
        });

        test('spawning past capacity removes the oldest and leaves nothing overlapping', async ({ page }) => {
            test.setTimeout(90000); // software GL on a shared machine is slow
            const { width, height } = await snap(page);
            const types = ['emoji', 'shapes', 'smallNumbers', 'uppercaseLetters', 'emoji', 'largeNumbers'];
            const points = [];
            for (let i = 0; i < 16; i++) {
                const same = i % 3 === 0;
                points.push([same ? width / 2 : 40 + ((i * 97) % (width - 80)), same ? height / 2 : 40 + ((i * 181) % (height - 80)), types[i % 6]]);
            }
            await spawnAll(page, points);
            await page.waitForTimeout(1500);
            const s = await snap(page);
            const cap = await capacity(page);
            // full to capacity; removing the oldest can shift the mean body size by one slot
            expect(s.objects.length).toBeLessThanOrEqual(cap);
            expect(s.objects.length).toBeGreaterThanOrEqual(cap - 1);
            expect(s.objects.length).toBeGreaterThanOrEqual(3);
            expect(cap).toBeGreaterThanOrEqual(3);
            expect(s.overlaps).toBe(0);
            for (const o of s.objects) expect(inside(s, o), JSON.stringify(o.bounds)).toBe(true);

            // settled objects do not move
            const a = await positions(page);
            await page.waitForTimeout(1000);
            const b = await positions(page);
            a.forEach((p, i) => { expect(Math.abs(p[0] - b[i][0])).toBeLessThan(0.01); expect(Math.abs(p[1] - b[i][1])).toBeLessThan(0.01); });
        });
    });
}

test.describe('throw, bounce and restore', () => {
    test.use(PROFILES['desktop 1280x800']);

    test.beforeEach(async ({ context, page }) => {
        await seedConfig(context, CONFIG);
        await enterSandbox(page);
        // a calm, emoji-only toy keeps geometry predictable
        await page.evaluate(() => {
            const s = window.appRoutes.getGameScene();
            s.__releases = [];
            let last = null; s.events.on('input:pointerMove', () => { const d = s.draggedObject; if (d) last = { x: d.x, y: d.y }; });
            s.events.on('input:pointerUp', () => { if (last) s.__releases.push(last); last = null; });
        });
    });

    async function dragObject(page, fromIdx, to, { hold = 0 } = {}) {
        await waitForMoveReady(page);
        const from = await page.evaluate((i) => { const o = window.appRoutes.getGameScene().objects[i]; return { x: o.x, y: o.y }; }, fromIdx);
        const origin = await canvasPoint(page, 0, 0);
        await page.mouse.move(origin.x + from.x, origin.y + from.y);
        await page.mouse.down();
        await page.mouse.move(origin.x + to.x, origin.y + to.y, { steps: 6 });
        if (hold) await page.waitForTimeout(hold);
        await page.mouse.up();
        return page.evaluate(() => window.appRoutes.getGameScene().__releases.at(-1));
    }

    test('a fast release glides at least 80 px and rests inside the screen; a slow one stays put', async ({ page }) => {
        await spawnAll(page, [[500, 400, 'emoji']]);
        await waitAsleep(page);
        const release = await dragObject(page, 0, { x: 760, y: 400 });
        await page.waitForTimeout(1800);
        const s = await snap(page);
        const o = s.objects[0];
        expect(Math.hypot(o.x - release.x, o.y - release.y)).toBeGreaterThan(80);
        expect(inside(s, o)).toBe(true);

        await waitAsleep(page);
        const slowRelease = await dragObject(page, 0, { x: o.x - 120, y: o.y }, { hold: 250 });
        await page.waitForTimeout(1200);
        const after = (await snap(page)).objects[0];
        expect(Math.hypot(after.x - slowRelease.x, after.y - slowRelease.y)).toBeLessThan(1);
    });

    test('throwing one object at another ends with nothing overlapping', async ({ page }) => {
        await spawnAll(page, [[300, 400, 'emoji'], [700, 400, 'emoji']]);
        await waitAsleep(page);
        await dragObject(page, 0, { x: 640, y: 400 });
        await page.waitForTimeout(2500);
        const s = await snap(page);
        expect(s.objects.length).toBe(2);
        expect(s.overlaps).toBe(0);
        for (const o of s.objects) expect(inside(s, o)).toBe(true);
    });

    test('a reload restores the settled positions', async ({ page }) => {
        await spawnAll(page, [[300, 300, 'emoji'], [330, 310, 'shapes'], [320, 320, 'emoji']]);
        await page.waitForTimeout(1500);
        await waitAsleep(page);
        const before = await positions(page);
        await page.reload();
        await waitForScene(page);
        await waitForObjectCount(page, before.length);
        await page.waitForTimeout(800);
        const after = await positions(page);
        before.forEach((p, i) => { expect(Math.abs(p[0] - after[i][0])).toBeLessThan(1); expect(Math.abs(p[1] - after[i][1])).toBeLessThan(1); });
    });

    test('maxObjects overrides the automatic capacity', async ({ page }) => {
        await page.evaluate(() => { window.appRoutes.getGameScene().configManager.config.advanced.maxObjects = 2; });
        await spawnAll(page, [[200, 200, 'emoji'], [600, 200, 'emoji'], [1000, 200, 'emoji'], [400, 600, 'emoji']]);
        await page.waitForTimeout(500);
        expect(await objectCount(page)).toBe(2);
    });
});

test.describe('reduced motion', () => {
    test.use({ ...PROFILES['desktop 1280x800'], reducedMotion: 'reduce' });

    test('a fast release stops where it is released', async ({ context, page }) => {
        await seedConfig(context, CONFIG);
        await enterSandbox(page);
        await spawnAll(page, [[500, 400, 'emoji']]);
        await waitAsleep(page);
        await page.evaluate(() => {
            const s = window.appRoutes.getGameScene(); s.__releases = [];
            let last = null; s.events.on('input:pointerMove', () => { const d = s.draggedObject; if (d) last = { x: d.x, y: d.y }; });
            s.events.on('input:pointerUp', () => { if (last) s.__releases.push(last); last = null; });
        });
        await waitForMoveReady(page);
        const origin = await canvasPoint(page, 0, 0);
        await page.mouse.move(origin.x + 500, origin.y + 400);
        await page.mouse.down();
        await page.mouse.move(origin.x + 760, origin.y + 400, { steps: 6 });
        await page.mouse.up();
        const rel = await page.evaluate(() => window.appRoutes.getGameScene().__releases.at(-1));
        await page.waitForTimeout(1500);
        const o = (await snap(page)).objects[0];
        expect(Math.hypot(o.x - rel.x, o.y - rel.y)).toBeLessThan(1);
    });
});
