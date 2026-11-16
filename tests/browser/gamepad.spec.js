import { test, expect } from '@playwright/test';
import { collectErrors, skipOnboarding, enterSandbox, objectCount, waitForObjectCount, waitForSpawnReady } from './helpers/app.js';
import { waitForMoveReady } from './helpers/scene.js';

/**
 * Gamepads: a fake navigator.getGamepads (axes and buttons settable per pad from the test).
 * Each pad has its own cursor; a face button is a finger at the cursor.
 */
const FAKE_PADS = () => {
    const pads = [null, null, null, null];
    const make = (i) => ({
        index: i, id: `Fake pad ${i}`, connected: true, mapping: 'standard', timestamp: 0,
        axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })),
    });
    Object.defineProperty(navigator, 'getGamepads', { value: () => pads, configurable: true });
    window.__pad = {
        connect(i) {
            pads[i] = make(i);
            window.dispatchEvent(Object.assign(new Event('gamepadconnected'), { gamepad: pads[i] }));
        },
        disconnect(i) {
            const p = pads[i];
            pads[i] = null;
            window.dispatchEvent(Object.assign(new Event('gamepaddisconnected'), { gamepad: p }));
        },
        axes(i, a) { pads[i].axes = a; },
        button(i, b, on) { pads[i].buttons[b] = { pressed: on, touched: on, value: on ? 1 : 0 }; },
    };
};

const connect = (page, i) => page.evaluate((i) => window.__pad.connect(i), i);
const disconnect = (page, i) => page.evaluate((i) => window.__pad.disconnect(i), i);
const axes = (page, i, a) => page.evaluate(([i, a]) => window.__pad.axes(i, a), [i, a]);
const button = (page, i, b, on) => page.evaluate(([i, b, on]) => window.__pad.button(i, b, on), [i, b, on]);
const cursor = (page, i) => page.evaluate((i) => window.appRoutes.getGameScene().inputManager.gamepad.cursor(i), i);
const cursorViews = (page) => page.evaluate(() => {
    const v = window.appRoutes.getGameScene().inputManager.gamepad.view;
    return v ? [...v.items.entries()].map(([i, it]) => ({ i, visible: it.g.visible, alpha: it.g.alpha, depth: it.g.depth })) : [];
});
const placeCursor = (page, i, x, y) => page.evaluate(([i, x, y]) => {
    const p = window.appRoutes.getGameScene().inputManager.gamepad.pads.get(i);
    p.x = x; p.y = y;
}, [i, x, y]);
/** Tap a face button for a moment (a quick press). */
async function quickPress(page, i, b = 0) {
    await button(page, i, b, true);
    await page.waitForTimeout(90);
    await button(page, i, b, false);
}

test.describe('Gamepads', () => {
    test.beforeEach(async ({ context, page }) => {
        await skipOnboarding(context);
        await page.addInitScript(FAKE_PADS);
    });

    test('a stick moves that pad\'s cursor, and the cursor shows above the objects', async ({ page }) => {
        const c = collectErrors(page);
        await enterSandbox(page);
        await connect(page, 0);
        const start = await cursor(page, 0);
        expect(start.visible).toBe(false); // not used yet
        await axes(page, 0, [1, 0, 0, 0]);
        await page.waitForTimeout(300);
        await axes(page, 0, [0, 1, 0, 0]);
        await page.waitForTimeout(300);
        await axes(page, 0, [0, 0, 0, 0]);
        const moved = await cursor(page, 0);
        expect(moved.x).toBeGreaterThan(start.x + 50);
        expect(moved.y).toBeGreaterThan(start.y + 50);
        expect(moved.visible).toBe(true);
        const views = await cursorViews(page);
        expect(views).toHaveLength(1);
        expect(views[0].visible).toBe(true);
        expect(views[0].depth).toBeGreaterThan(1000);
        expect(c.pageErrors).toEqual([]);
    });

    test('a button press on empty space spawns at the cursor', async ({ page }) => {
        const c = collectErrors(page);
        await enterSandbox(page);
        await connect(page, 0);
        await axes(page, 0, [0, 1, 0, 0]);   // wake it
        await page.waitForTimeout(80);
        await axes(page, 0, [0, 0, 0, 0]);
        const at = await cursor(page, 0);
        await waitForSpawnReady(page);
        await quickPress(page, 0, 0);
        await waitForObjectCount(page, 1);
        const o = await page.evaluate(() => { const s = window.appRoutes.getGameScene(); const o = s.objects[0]; return { x: o.x, y: o.y }; });
        expect(Math.abs(o.x - at.x)).toBeLessThan(120);
        expect(Math.abs(o.y - at.y)).toBeLessThan(160);
        expect(c.pageErrors).toEqual([]);
    });

    test('two pads have two cursors and both spawn', async ({ page }) => {
        const c = collectErrors(page);
        await enterSandbox(page);
        await connect(page, 0);
        await connect(page, 1);
        await axes(page, 0, [-1, 0, 0, 0]);
        await axes(page, 1, [1, 0, 0, 0]);
        await page.waitForTimeout(350);
        await axes(page, 0, [0, 0, 0, 0]);
        await axes(page, 1, [0, 0, 0, 0]);
        const views = await cursorViews(page);
        expect(views.map((v) => v.i).sort()).toEqual([0, 1]);
        const [a, b] = [await cursor(page, 0), await cursor(page, 1)];
        expect(a.x).toBeLessThan(b.x - 100);
        await button(page, 0, 0, true);
        await button(page, 1, 1, true);
        await page.waitForTimeout(100);
        await button(page, 0, 0, false);
        await button(page, 1, 1, false);
        await waitForObjectCount(page, 2);
        const xs = await page.evaluate(() => window.appRoutes.getGameScene().objects.map((o) => o.x));
        expect(Math.abs(xs[0] - xs[1])).toBeGreaterThan(100);
        expect(c.pageErrors).toEqual([]);
    });

    test('a quick press on an object is a tap: it reacts, and does not start a drag', async ({ page }) => {
        const c = collectErrors(page);
        await enterSandbox(page);
        const where = await page.evaluate(async () => {
            const s = window.appRoutes.getGameScene();
            const { width, height } = s.debugSnapshot();
            const o = await s.spawnAndAnnounce(width * 0.4, height * 0.5, 'shapes');
            s.awaitingSpawnInputRelease = false; // a programmatic spawn has no finger to lift
            s.__reacts = 0;
            const orig = s.objectMotion.react.bind(s.objectMotion);
            s.objectMotion.react = (...a) => { s.__reacts++; return orig(...a); };
            return { x: o.x, y: o.y };
        });
        await waitForMoveReady(page);
        await connect(page, 0);
        await axes(page, 0, [0.5, 0, 0, 0]); await page.waitForTimeout(60); await axes(page, 0, [0, 0, 0, 0]); // wake
        await placeCursor(page, 0, where.x, where.y);
        await quickPress(page, 0, 0);
        await expect.poll(() => page.evaluate(() => window.appRoutes.getGameScene().__reacts)).toBe(1);
        const after = await page.evaluate(() => { const s = window.appRoutes.getGameScene(); return { dragging: s.isDragging, n: s.objects.length }; });
        expect(after).toEqual({ dragging: false, n: 1 });
        expect(c.pageErrors).toEqual([]);
    });

    test('holding a button and moving drags the object, releasing drops it', async ({ page }) => {
        const c = collectErrors(page);
        await enterSandbox(page);
        const where = await page.evaluate(async () => {
            const s = window.appRoutes.getGameScene();
            const { width, height } = s.debugSnapshot();
            const o = await s.spawnAndAnnounce(width * 0.3, height * 0.5, 'shapes');
            s.awaitingSpawnInputRelease = false; // a programmatic spawn has no finger to lift
            return { x: o.x, y: o.y };
        });
        await waitForMoveReady(page);
        await connect(page, 0);
        await axes(page, 0, [0.5, 0, 0, 0]); await page.waitForTimeout(60); await axes(page, 0, [0, 0, 0, 0]);
        await placeCursor(page, 0, where.x, where.y);
        await button(page, 0, 0, true);
        await page.waitForTimeout(120);
        await axes(page, 0, [1, 0, 0, 0]);
        await page.waitForTimeout(350);
        expect(await page.evaluate(() => window.appRoutes.getGameScene().isDragging)).toBe(true);
        await axes(page, 0, [0, 0, 0, 0]);
        await page.waitForTimeout(250); // hold still: a plain drop, not a throw
        await button(page, 0, 0, false);
        await expect.poll(() => page.evaluate(() => window.appRoutes.getGameScene().isDragging)).toBe(false);
        const o = await page.evaluate(() => { const o = window.appRoutes.getGameScene().objects[0]; return { x: o.x, y: o.y }; });
        expect(o.x).toBeGreaterThan(where.x + 80);
        expect(await objectCount(page)).toBe(1);
        expect(c.pageErrors).toEqual([]);
    });

    test('disconnecting removes that pad\'s cursor and leaves the other one', async ({ page }) => {
        const c = collectErrors(page);
        await enterSandbox(page);
        await connect(page, 0);
        await connect(page, 1);
        await axes(page, 0, [0, 1, 0, 0]);
        await axes(page, 1, [0, 1, 0, 0]);
        await page.waitForTimeout(150);
        await axes(page, 0, [0, 0, 0, 0]);
        await axes(page, 1, [0, 0, 0, 0]);
        expect(await cursorViews(page)).toHaveLength(2);
        const before = await page.evaluate(() => window.appRoutes.getGameScene().children.list.length);
        await disconnect(page, 0);
        await expect.poll(async () => (await cursorViews(page)).map((v) => v.i)).toEqual([1]);
        expect(await cursor(page, 0)).toBeNull();
        expect(await page.evaluate(() => window.appRoutes.getGameScene().children.list.length)).toBe(before - 1);
        // the other pad still works
        await quickPress(page, 1, 0);
        await waitForObjectCount(page, 1);
        expect(c.pageErrors).toEqual([]);
    });

    test('the cursor fades when idle, or just disappears with reduced motion', async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await enterSandbox(page);
        await connect(page, 0);
        await axes(page, 0, [0, 1, 0, 0]);
        await page.waitForTimeout(100);
        await axes(page, 0, [0, 0, 0, 0]);
        expect((await cursorViews(page))[0].alpha).toBe(1);   // no fade-in
        await page.waitForTimeout(5500);
        const v = (await cursorViews(page))[0];
        expect(v.alpha).toBe(0);                              // no fade-out either: gone
        expect(v.visible).toBe(false);
    });

    test('shoulder and menu buttons spawn nothing', async ({ page }) => {
        const c = collectErrors(page);
        await enterSandbox(page);
        await connect(page, 0);
        for (const b of [4, 5, 6, 7, 8, 9, 10, 11, 16]) { await button(page, 0, b, true); await page.waitForTimeout(50); await button(page, 0, b, false); }
        await page.waitForTimeout(200);
        expect(await objectCount(page)).toBe(0);
        expect(c.pageErrors).toEqual([]);
    });
});
