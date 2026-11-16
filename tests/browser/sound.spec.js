import { test, expect } from '@playwright/test';
import {
    seedConfig, enterSandbox, gotoSelector, canvasPoint, tapSpawn, waitForSpawnReady, sceneSize,
} from './helpers/app.js';
import { waitForMoveReady } from './helpers/scene.js';
import { collectErrors } from './helpers/app.js';

/**
 * Sound (Stage 3, track A): short pentatonic notes, event sounds, nothing left sounding.
 * Headless cannot be heard, so these assert on audioManager.debugLog() and the voice pool.
 */

// C major pentatonic, C4..E6 (see src/game/audio/Scale.js)
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28].map((s) => 261.6256 * Math.pow(2, s / 12));
const inScale = (f) => SCALE.some((s) => Math.abs(s - f) < 0.05);

const CONFIG = { advanced: { autoCleanup: { enabled: false } } };
const log = (page, event) => page.evaluate((event) => {
    const l = window.appRoutes.getGameScene().audioManager.debugLog();
    return event ? l.filter((e) => e.event === event) : l;
}, event);
const voices = (page) => page.evaluate(() => window.appRoutes.getGameScene().audioManager.getToneCount());

async function spawnAt(page, fx, fy, type = 'emoji') {
    const { width, height } = await sceneSize(page);
    await page.evaluate(([x, y, type]) => window.appRoutes.getGameScene().spawnAndAnnounce(x, y, type), [width * fx, height * fy, type]);
    // programmatic spawns never get the pointer release that unlocks dragging
    await page.evaluate(() => { window.appRoutes.getGameScene().awaitingSpawnInputRelease = false; });
    await waitForMoveReady(page);
    return page.evaluate(() => { const o = window.appRoutes.getGameScene().objects.at(-1); return { x: o.x, y: o.y }; });
}

test.describe('sound', () => {
    test.beforeEach(async ({ context }) => {
        await seedConfig(context, CONFIG);
        // count every AudioContext the page makes (Phaser's own sound manager is not created for the toy)
        await context.addInitScript(() => {
            window.__contexts = 0;
            const Orig = window.AudioContext;
            if (Orig) {
                window.AudioContext = function (...a) { window.__contexts++; return new Orig(...a); };
                window.AudioContext.prototype = Orig.prototype;
            }
        });
    });

    test('no AudioContext exists before the first gesture, one exists after it', async ({ page }) => {
        const c = collectErrors(page);
        await gotoSelector(page);
        expect(await page.evaluate(() => window.__contexts)).toBe(0);
        await enterSandbox(page);
        await tapSpawn(page, 0.5, 0.5);
        expect(await page.evaluate(() => window.__contexts)).toBe(1);
        expect(await page.evaluate(() => window.appRoutes.getGameScene().audioManager.audioContext.state)).toBe('running');
        expect(c.pageErrors).toEqual([]);
    });

    test('a tap-spawn plays a scale note, higher near the top than near the bottom', async ({ page }) => {
        const c = collectErrors(page);
        await enterSandbox(page);
        await tapSpawn(page, 0.5, 0.12);
        await page.evaluate(() => window.appRoutes.getGameScene().resetToyState());
        await page.waitForTimeout(150);
        await tapSpawn(page, 0.5, 0.88);
        const spawns = await log(page, 'spawn');
        expect(spawns.length).toBe(2);
        for (const s of spawns) {
            expect(inScale(s.freq)).toBe(true);
            expect(s.played).toBe(true);
            expect(s.note).toMatch(/^[CDEGA][4-6]$/);
        }
        expect(spawns[0].freq).toBeGreaterThan(spawns[1].freq);
        expect(c.pageErrors).toEqual([]);
    });

    test('each kind of object has its own timbre in the log', async ({ page }) => {
        await enterSandbox(page);
        const kinds = { emoji: 'emoji', shapes: 'shape', smallNumbers: 'number', uppercaseLetters: 'letter' };
        for (const type of Object.keys(kinds)) {
            await spawnAt(page, 0.5, 0.5, type);
            await page.waitForTimeout(60);
            await page.evaluate(() => window.appRoutes.getGameScene().resetToyState());
        }
        expect((await log(page, 'spawn')).map((e) => e.kind)).toEqual(Object.values(kinds));
    });

    test('tapping an existing object plays its note again, without a drop', async ({ page }) => {
        const c = collectErrors(page);
        await enterSandbox(page);
        const o = await spawnAt(page, 0.5, 0.45);
        const p = await canvasPoint(page, 0, 0);
        await page.waitForTimeout(150);
        await page.mouse.click(p.x + o.x, p.y + o.y);
        await expect.poll(async () => (await log(page, 'tap')).length).toBe(1);
        const [tap] = await log(page, 'tap');
        expect(inScale(tap.freq)).toBe(true);
        expect((await log(page, 'drop')).length).toBe(0);
        expect((await log(page, 'pickup')).length).toBe(0);
        expect(c.pageErrors).toEqual([]);
    });

    test('dragging across the screen plays distinct rising notes, no faster than the rate limit', async ({ page }) => {
        const c = collectErrors(page);
        await enterSandbox(page);
        const { height } = await sceneSize(page);
        const o = await spawnAt(page, 0.5, 0.85);
        const p = await canvasPoint(page, 0, 0);
        await page.mouse.move(p.x + o.x, p.y + o.y);
        await page.mouse.down();
        const t0 = Date.now();
        const steps = 36;
        for (let i = 1; i <= steps; i++) {
            await page.mouse.move(p.x + o.x, p.y + o.y - ((o.y - height * 0.12) * i) / steps);
            await page.waitForTimeout(35);
        }
        const seconds = (Date.now() - t0) / 1000;
        await page.waitForTimeout(250);   // hold still before letting go: a plain drop
        await page.mouse.up();
        const drags = await log(page, 'dragStep');
        expect(drags.length).toBeGreaterThanOrEqual(4);
        expect(drags.length).toBeLessThanOrEqual(Math.floor((seconds * 1000) / 85) + 1);
        expect(new Set(drags.map((d) => d.freq)).size).toBe(drags.length);
        for (let i = 1; i < drags.length; i++) expect(drags[i].freq).toBeGreaterThan(drags[i - 1].freq);
        expect(drags.every((d) => inScale(d.freq))).toBe(true);
        expect((await log(page, 'pickup')).length).toBe(1);
        await expect.poll(async () => (await log(page, 'drop')).length).toBe(1);
        expect(c.pageErrors).toEqual([]);
    });

    test('a fast release is a throw', async ({ page }) => {
        const c = collectErrors(page);
        await enterSandbox(page);
        const { width } = await sceneSize(page);
        const o = await spawnAt(page, 0.5, 0.5);
        const dx = width * 0.04;
        const p = await canvasPoint(page, 0, 0);
        await page.mouse.move(p.x + o.x, p.y + o.y);
        await page.mouse.down();
        for (let i = 1; i <= 5; i++) { await page.mouse.move(p.x + o.x + i * dx, p.y + o.y); await page.waitForTimeout(12); }
        await page.mouse.up();
        await expect.poll(async () => (await log(page, 'throw')).length).toBe(1);
        expect((await log(page, 'drop')).length).toBe(0);
        expect(c.pageErrors).toEqual([]);
    });

    test('hitting the edge fast gives a boing, louder than a gentle one', async ({ page }) => {
        const c = collectErrors(page);
        await enterSandbox(page);
        await spawnAt(page, 0.8, 0.5);
        // launch the object at the right wall (the same state a throw leaves it in), hard, then softly
        for (const speed of [1500, 260]) {
            await page.evaluate((speed) => {
                const s = window.appRoutes.getGameScene();
                s.objects[0].__soft.vx = speed; s.objects[0].__soft.vy = 0;
                s.softPhysics.wake();
            }, speed);
            await page.waitForTimeout(1500);
            await page.evaluate(() => { const s = window.appRoutes.getGameScene(); const o = s.objects[0]; s.moveObjectTo(o, o.x - 400, o.y, false); });
            await page.waitForTimeout(400);
        }
        const bounces = await log(page, 'bounce');
        expect(bounces.length).toBeGreaterThanOrEqual(1);
        expect(bounces.every((b) => inScale(b.freq))).toBe(true);
        expect(bounces[0].level).toBeGreaterThan(0.5);               // the hard one
        if (bounces.length > 1) expect(bounces.at(-1).level).toBeLessThan(bounces[0].level);
        expect(c.pageErrors).toEqual([]);
    });

    test('removing an object plays a pop; so does auto-cleanup; a reset is silent', async ({ page, context }) => {
        await enterSandbox(page);
        await spawnAt(page, 0.3, 0.4);
        await page.evaluate(() => { const s = window.appRoutes.getGameScene(); s.removeObject(s.objects[0]); });
        expect((await log(page, 'pop')).length).toBe(1);
        const before = (await log(page)).length;
        await spawnAt(page, 0.3, 0.4);
        await spawnAt(page, 0.7, 0.6);
        await page.evaluate(() => window.appRoutes.getGameScene().resetToyState());
        expect((await log(page, 'pop')).length).toBe(1);
        expect((await log(page)).length).toBe(before + 2);        // just the two spawns
    });

    test('auto-cleanup of an idle object pops', async ({ page, context }) => {
        await seedConfig(context, { advanced: { autoCleanup: { enabled: true, timeoutSeconds: 5 } } });
        await enterSandbox(page);
        await tapSpawn(page, 0.5, 0.5);
        await expect.poll(async () => (await log(page, 'pop')).length, { timeout: 20000, intervals: [500] }).toBe(1);
    });

    test('notes end by themselves; exiting the toy leaves nothing sounding', async ({ page }) => {
        const c = collectErrors(page);
        await enterSandbox(page);
        const rightAfter = await page.evaluate(async () => {
            const s = window.appRoutes.getGameScene();
            await s.spawnAndAnnounce(300, 200, 'smallNumbers');
            return s.audioManager.getToneCount();
        });
        expect(rightAfter).toBeGreaterThan(0);
        await expect.poll(() => voices(page), { timeout: 3000 }).toBe(0);   // the longest ring is the bell, about 1 s
        const mashed = await page.evaluate(async () => {
            const s = window.appRoutes.getGameScene();
            for (let i = 0; i < 6; i++) { await s.spawnAndAnnounce(100 + i * 120, 150 + i * 60, 'emoji'); await new Promise((r) => setTimeout(r, 40)); }
            return s.audioManager.getToneCount();
        });
        expect(mashed).toBeGreaterThan(0);
        await page.evaluate(() => window.appRoutes.exitToy());
        await expect(page.locator('#toy-mode-selector')).toBeVisible();
        expect(await page.evaluate(() => {
            const s = window.appRoutes.getGameScene();
            return s ? s.audioManager.getToneCount() : 0;
        })).toBe(0);
        expect(c.pageErrors).toEqual([]);
    });

    test('mashing never exceeds the polyphony cap', async ({ page }) => {
        await enterSandbox(page);
        const peak = await page.evaluate(async () => {
            const s = window.appRoutes.getGameScene();
            let max = 0;
            for (let i = 0; i < 40; i++) {
                s.audioManager.playSpawn({ id: 'm' + i, type: ['emoji', 'smallNumbers', 'shapes'][i % 3], x: 100, y: 20 + i * 14 });
                max = Math.max(max, s.audioManager.getToneCount());
                await new Promise((r) => setTimeout(r, 8));
            }
            return max;
        });
        expect(peak).toBeLessThanOrEqual(12);
        expect(peak).toBeGreaterThan(3);
    });

    test('muted: nothing is played or logged', async ({ page, context }) => {
        await seedConfig(context, { audio: { mute: true }, advanced: { autoCleanup: { enabled: false } } });
        await enterSandbox(page);
        await tapSpawn(page, 0.5, 0.5);
        expect(await log(page)).toEqual([]);
        expect(await voices(page)).toBe(0);
    });
});
