import { test, expect } from '@playwright/test';
import { collectErrors, seedConfig, skipOnboarding, enterSandbox, objectCount, waitForObjectCount, canvasPoint } from './helpers/app.js';

/**
 * Real multi-touch: several fingers spawn, tap, drag and throw independently (src/game/input/).
 * Fingers are injected through CDP Input.dispatchTouchEvent (page.mouse is one pointer), so the
 * spec needs a Chromium touch context.
 */
test.use({ hasTouch: true });

// Chromium logs this when Phaser calls preventDefault on a touchcancel (an environment note, not an app failure)
const notNoise = (list) => list.filter((e) => !/touchcancel event with cancelable=false/.test(e));

test.describe('Multi-touch sandbox', () => {
    let cdp, origin;

    test.beforeEach(async ({ context, browserName }) => {
        test.skip(browserName !== 'chromium', 'CDP touch input is Chromium only');
        await skipOnboarding(context);
        await seedConfig(context, { advanced: { autoCleanup: { enabled: false }, maxObjects: 40 } });
    });

    async function start(page, context) {
        await enterSandbox(page);
        cdp = await context.newCDPSession(page);
        origin = await canvasPoint(page, 0, 0);
    }

    /** Finger set: { id: {x, y} } in scene (CSS px) coordinates. */
    const pts = (fingers) => Object.entries(fingers).map(([id, p]) => ({ id: Number(id), x: origin.x + p.x, y: origin.y + p.y }));
    const send = (type, fingers) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts(fingers) });
    const size = (page) => page.evaluate(() => { const { width, height } = window.appRoutes.getGameScene().debugSnapshot(); return { width, height }; });
    const state = (page) => page.evaluate(() => {
        const s = window.appRoutes.getGameScene();
        return {
            n: s.objects.length, dragged: s.getDraggedObjects().map(o => o.id), isDragging: s.isDragging,
            voices: s.audioManager.getToneCount(), drags: s.audioManager.drags.size, open: s.pointerRegistry.size,
            objs: s.objects.map(o => ({ id: o.id, x: o.x, y: o.y })),
            bounds: Object.fromEntries(s.debugSnapshot().objects.map(o => [o.id, o.bounds])),
        };
    });
    const settle = (page, ms = 700) => page.waitForTimeout(ms);

    test('three fingers down at spread-out points make three objects', async ({ page, context }) => {
        const c = collectErrors(page);
        await start(page, context);
        const { width: W, height: H } = await size(page);
        const f = { 1: { x: W * 0.2, y: H * 0.25 }, 2: { x: W * 0.75, y: H * 0.5 }, 3: { x: W * 0.3, y: H * 0.8 } };
        await send('touchStart', f);
        await waitForObjectCount(page, 3);
        await send('touchEnd', {});
        await settle(page);
        expect(await objectCount(page)).toBe(3);
        expect(notNoise(c.all())).toEqual([]);
    });

    test('two fingers drag two different objects at once and both end where their fingers did', async ({ page, context }) => {
        const c = collectErrors(page);
        await start(page, context);
        const { width: W, height: H } = await size(page);
        await send('touchStart', { 1: { x: W * 0.25, y: H * 0.3 }, 2: { x: W * 0.75, y: H * 0.7 } });
        await waitForObjectCount(page, 2);
        await send('touchEnd', {});
        await settle(page, 1200);
        const before = (await state(page)).objs;
        expect(before).toHaveLength(2);
        const [a, b] = before;
        const toA = { x: Math.min(a.x + 20, W * 0.4), y: H * 0.18 };
        const toB = { x: Math.max(b.x - 20, W * 0.6), y: H * 0.82 };
        await send('touchStart', { 1: { x: a.x, y: a.y }, 2: { x: b.x, y: b.y } });
        await expect.poll(async () => (await state(page)).dragged.length).toBe(2);
        for (let i = 1; i <= 8; i++) {
            const k = i / 8;
            await send('touchMove', { 1: { x: a.x + (toA.x - a.x) * k, y: a.y + (toA.y - a.y) * k }, 2: { x: b.x + (toB.x - b.x) * k, y: b.y + (toB.y - b.y) * k } });
            await page.waitForTimeout(30);
        }
        await page.waitForTimeout(300); // hold still: a plain drop, not a throw
        await send('touchEnd', {});
        await settle(page, 900);
        const after = await state(page);
        expect(after.dragged).toEqual([]);
        const ea = after.objs.find(o => o.id === a.id), eb = after.objs.find(o => o.id === b.id);
        // each ends under its own finger, unless its whole composite is clamped against an edge / the exit corner
        for (const [end, to] of [[ea, toA], [eb, toB]]) {
            const bd = after.bounds[end.id];
            const clampX = bd.x <= 9 || bd.x + bd.w >= W - 9, clampY = bd.y <= 9 || bd.y + bd.h >= H - 9;
            const keepOut = bd.y < 61 && bd.x + bd.w >= W - 61;
            if (!clampX && !keepOut) expect(Math.abs(end.x - to.x), JSON.stringify({ end, to, bd })).toBeLessThan(2);
            if (!clampY && !keepOut) expect(Math.abs(end.y - to.y), JSON.stringify({ end, to, bd })).toBeLessThan(2);
        }
        expect(Math.hypot(ea.x - a.x, ea.y - a.y)).toBeGreaterThan(20); // it really moved
        expect(Math.hypot(eb.x - b.x, eb.y - b.y)).toBeGreaterThan(20);
        expect(notNoise(c.all())).toEqual([]);
    });

    test('one finger holds an object while another taps empty space: that still spawns', async ({ page, context }) => {
        await start(page, context);
        const { width: W, height: H } = await size(page);
        await send('touchStart', { 1: { x: W * 0.3, y: H * 0.35 } });
        await waitForObjectCount(page, 1);
        await send('touchEnd', {});
        await settle(page, 1200);
        const o = (await state(page)).objs[0];
        await send('touchStart', { 1: { x: o.x, y: o.y } });
        await expect.poll(async () => (await state(page)).dragged.length).toBe(1);
        await send('touchMove', { 1: { x: o.x, y: o.y + 4 } });
        const free = { x: W * 0.8, y: H * 0.85 };
        await send('touchStart', { 1: { x: o.x, y: o.y + 4 }, 2: free });
        await waitForObjectCount(page, 2);
        await send('touchEnd', { 1: { x: o.x, y: o.y + 4 } });
        await send('touchEnd', {});
        await settle(page);
        expect(await objectCount(page)).toBe(2);
    });

    test('a five-contact palm cluster makes exactly one object', async ({ page, context }) => {
        await start(page, context);
        const { width: W, height: H } = await size(page);
        const cx = W * 0.5, cy = H * 0.5;
        const palm = { 1: { x: cx - 40, y: cy - 30 }, 2: { x: cx, y: cy - 50 }, 3: { x: cx + 40, y: cy - 30 }, 4: { x: cx - 20, y: cy + 30 }, 5: { x: cx + 25, y: cy + 40 } };
        await send('touchStart', palm);
        await waitForObjectCount(page, 1);
        await page.waitForTimeout(600);
        await send('touchEnd', {});
        await settle(page, 900);
        expect(await objectCount(page)).toBe(1);
    });

    test('a second finger on an already-dragged object does nothing', async ({ page, context }) => {
        const c = collectErrors(page);
        await start(page, context);
        const { width: W, height: H } = await size(page);
        await send('touchStart', { 1: { x: W * 0.4, y: H * 0.4 } });
        await waitForObjectCount(page, 1);
        await send('touchEnd', {});
        await settle(page, 1200);
        const o = (await state(page)).objs[0];
        await send('touchStart', { 1: { x: o.x, y: o.y } });
        await expect.poll(async () => (await state(page)).dragged.length).toBe(1);
        await send('touchStart', { 1: { x: o.x, y: o.y }, 2: { x: o.x, y: o.y } }); // exactly where finger 1 is holding it
        await send('touchMove', { 1: { x: o.x, y: o.y }, 2: { x: o.x + 120, y: o.y + 120 } });
        await settle(page, 400);
        const s = await state(page);
        expect(s.n).toBe(1);
        expect(s.dragged).toEqual([o.id]);
        const now = s.objs[0];
        expect(Math.hypot(now.x - o.x, now.y - o.y)).toBeLessThan(15); // finger 2 did not tug it away
        await send('touchEnd', {});
        await settle(page);
        expect(notNoise(c.all())).toEqual([]);
    });

    test('touchcancel during a drag leaves no dragged object, no stuck finger and no sound', async ({ page, context }) => {
        const c = collectErrors(page);
        await start(page, context);
        const { width: W, height: H } = await size(page);
        await send('touchStart', { 1: { x: W * 0.3, y: H * 0.3 }, 2: { x: W * 0.7, y: H * 0.7 } });
        await waitForObjectCount(page, 2);
        await send('touchEnd', {});
        await settle(page, 1200);
        const [a, b] = (await state(page)).objs;
        await send('touchStart', { 1: { x: a.x, y: a.y }, 2: { x: b.x, y: b.y } });
        await expect.poll(async () => (await state(page)).dragged.length).toBe(2);
        for (let i = 1; i <= 5; i++) {
            await send('touchMove', { 1: { x: a.x + i * 12, y: a.y + i * 6 }, 2: { x: b.x - i * 12, y: b.y - i * 6 } });
            await page.waitForTimeout(25);
        }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
        await expect.poll(async () => (await state(page)).dragged.length).toBe(0);
        await expect.poll(async () => (await state(page)).voices, { timeout: 4000 }).toBe(0);
        const s = await state(page);
        expect(s.isDragging).toBe(false);
        expect(s.drags).toBe(0);
        expect(s.open).toBe(0);
        // the toy still works afterwards
        await send('touchStart', { 1: { x: W * 0.5, y: H * 0.9 } });
        await waitForObjectCount(page, 3);
        await send('touchEnd', {});
        expect(notNoise(c.all())).toEqual([]);
    });

    test('ten fingers drumming for two seconds: no errors, nothing stuck, the count stays within capacity', async ({ page, context }) => {
        const c = collectErrors(page);
        await start(page, context);
        const { width: W, height: H } = await size(page);
        const cap = await page.evaluate(() => window.appRoutes.getGameScene().softPhysics.capacity());
        let maxSeen = 0;
        const t0 = Date.now();
        let round = 0;
        while (Date.now() - t0 < 2000) {
            const fingers = {};
            for (let i = 1; i <= 10; i++) fingers[i] = { x: 30 + ((i * 97 + round * 53) % (W - 60)), y: 70 + ((i * 131 + round * 71) % (H - 140)) };
            await send('touchStart', fingers);
            await page.waitForTimeout(60);
            const moved = {};
            for (const [i, p] of Object.entries(fingers)) moved[i] = { x: p.x + 15, y: p.y + 10 };
            await send('touchMove', moved);
            await page.waitForTimeout(40);
            await send('touchEnd', {});
            maxSeen = Math.max(maxSeen, (await state(page)).n);
            round++;
        }
        await settle(page, 1500);
        const s = await state(page);
        expect(s.n).toBeLessThanOrEqual(cap);
        expect(maxSeen).toBeLessThanOrEqual(cap + 4); // a burst can be a frame ahead of the eviction
        expect(s.dragged).toEqual([]);
        expect(s.open).toBe(0);
        await expect.poll(async () => (await state(page)).voices, { timeout: 4000 }).toBe(0);
        expect(notNoise(c.all())).toEqual([]);
    });

    test('a finger sliding off the screen edge lets go', async ({ page, context }) => {
        await start(page, context);
        const { width: W, height: H } = await size(page);
        await send('touchStart', { 1: { x: W * 0.5, y: H * 0.5 } });
        await waitForObjectCount(page, 1);
        await send('touchEnd', {});
        await settle(page, 1200);
        const o = (await state(page)).objs[0];
        await send('touchStart', { 1: { x: o.x, y: o.y } });
        await expect.poll(async () => (await state(page)).dragged.length).toBe(1);
        await send('touchMove', { 1: { x: W + 40, y: o.y } });
        await send('touchEnd', {});
        await expect.poll(async () => (await state(page)).dragged.length).toBe(0);
        expect((await state(page)).open).toBe(0);
    });

    test('a finger on the hold-to-exit button spawns and drags nothing, with other fingers down', async ({ page, context }) => {
        await start(page, context);
        const { width: W, height: H } = await size(page);
        const box = await page.locator('.parent-exit-btn').boundingBox();
        const bx = box.x + box.width / 2 - origin.x, by = box.y + box.height / 2 - origin.y;
        await send('touchStart', { 1: { x: bx, y: by } });
        await page.waitForTimeout(300);
        await send('touchStart', { 1: { x: bx, y: by }, 2: { x: bx - 8, y: by + 6 }, 3: { x: bx + 2, y: by + 10 } });
        await page.waitForTimeout(300);
        await send('touchEnd', {});
        await settle(page);
        expect(await objectCount(page)).toBe(0);
        void W; void H;
    });
});

test.describe('Single tap on a phone', () => {
    test.beforeEach(async ({ context, browserName }) => {
        test.skip(browserName !== 'chromium', 'Chromium touch emulation');
        await skipOnboarding(context);
        await seedConfig(context, { advanced: { autoCleanup: { enabled: false } } });
    });

    test('one tap makes exactly one object (no duplicate from touch plus emulated mouse)', async ({ page }) => {
        await enterSandbox(page);
        const p = await canvasPoint(page, 0.5, 0.5);
        await page.touchscreen.tap(p.x, p.y);
        await waitForObjectCount(page, 1);
        await page.waitForTimeout(900);
        expect(await objectCount(page)).toBe(1);
    });
});
