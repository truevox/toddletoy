import { test, expect } from '@playwright/test';
import { collectErrors, skipOnboarding, enterSandbox, canvasPoint, waitForSpawnReady, objectCount } from './helpers/app.js';
import { tapFreeSpot, dragScene, waitForMoveReady } from './helpers/scene.js';

/**
 * Stage 2 track A: objects feel alive. Everything is measured on the real
 * rendered glyph (getBounds), not on mechanisms.
 */

/** Sample the last object's logical position and glyph box every frame for `ms`. */
async function sampleGlyph(page, ms) {
    return page.evaluate((ms) => new Promise((resolve) => {
        const s = window.appRoutes.getGameScene();
        const o = s.objects.at(-1);
        const rows = [];
        const t0 = performance.now();
        const tick = () => {
            const b = o.getBounds();
            rows.push({ x: o.x, y: o.y, w: b.width, h: b.height, by: b.y, scale: o.scaleX, angle: o.angle });
            if (performance.now() - t0 < ms) requestAnimationFrame(tick); else resolve(rows);
        };
        tick();
    }), ms);
}

async function restState(page) {
    return page.evaluate(() => {
        const s = window.appRoutes.getGameScene();
        const o = s.objects.at(-1);
        return { scale: o.scaleX, scaleY: o.scaleY, base: (o.baseScale || 1) * (o.gridFitScale || 1), angle: o.angle };
    });
}

async function spawnOf(page, type) {
    await waitForSpawnReady(page);
    await page.evaluate((type) => {
        const s = window.appRoutes.getGameScene();
        const { width, height } = s.debugSnapshot();
        // keep clear of earlier objects
        const x = width * (0.3 + 0.4 * Math.random()), y = height * (0.35 + 0.3 * Math.random());
        return s.spawnObjectAt(x, y, type);
    }, type);
}

test.describe('Object motion', () => {
    test.beforeEach(async ({ context }) => { await skipOnboarding(context); });

    test('idle: x/y never change, the glyph visibly does', async ({ page }) => {
        const c = collectErrors(page);
        await enterSandbox(page);
        await spawnOf(page, 'emoji');
        await page.waitForTimeout(900); // pop-in settled, idle eased in
        const rows = await sampleGlyph(page, 2000);
        const x0 = rows[0].x, y0 = rows[0].y;
        for (const r of rows) {
            expect(Math.abs(r.x - x0)).toBeLessThan(0.01);
            expect(Math.abs(r.y - y0)).toBeLessThan(0.01);
        }
        const span = (k) => Math.max(...rows.map((r) => r[k])) - Math.min(...rows.map((r) => r[k]));
        expect(span('by') + span('h') + span('w')).toBeGreaterThan(0.5);
        expect(c.all()).toEqual([]);
    });

    for (const type of ['emoji', 'uppercaseLetters', 'smallNumbers', 'shapes']) {
        test(`pop-in and reaction return ${type} to exact rest`, async ({ page }) => {
            await enterSandbox(page);
            await page.evaluate(() => { window.appRoutes.getGameScene().objectMotion.idleEnabled = false; });
            await spawnOf(page, type);
            await page.waitForTimeout(100);
            const early = await restState(page);
            expect(early.scale).toBeLessThan(early.base * 1.3); // mid-pop
            await page.waitForTimeout(900);
            let r = await restState(page);
            expect(Math.abs(r.scale / r.base - 1)).toBeLessThan(0.01);
            expect(Math.abs(r.angle)).toBeLessThan(0.01);

            await page.evaluate(() => { const s = window.appRoutes.getGameScene(); s.objectMotion.react(s.objects.at(-1)); });
            const rows = await sampleGlyph(page, 380);
            const moved = rows.some((q) => Math.abs(q.angle) > 2 || Math.abs(q.scale / r.base - 1) > 0.03 || Math.abs(q.by - rows[0].by) > 3);
            expect(moved).toBe(true);
            await page.waitForTimeout(500);
            r = await restState(page);
            expect(Math.abs(r.scale / r.base - 1)).toBeLessThan(0.01);
            expect(Math.abs(r.angle)).toBeLessThan(0.01);
        });
    }

    test('first frame after spawn is already small and visible', async ({ page }) => {
        await enterSandbox(page);
        await waitForSpawnReady(page);
        const first = await page.evaluate(() => new Promise((resolve) => {
            const s = window.appRoutes.getGameScene();
            s.spawnObjectAt(s.debugSnapshot().width / 2, s.debugSnapshot().height / 2, 'emoji').then((o) => {
                const check = () => resolve({ scale: o.scaleX, base: o.baseScale || 1, alpha: o.alpha, visible: o.visible });
                s.events.once('postupdate', check);
            });
        }));
        expect(first.scale).toBeLessThan(first.base * 0.7);
        expect(first.visible).toBe(true);
    });

    test('a tap reacts and re-speaks without spawning or moving; a drag moves and does not react', async ({ page }) => {
        const c = collectErrors(page);
        await enterSandbox(page);
        const o = await tapFreeSpot(page);
        await page.evaluate(() => {
            const s = window.appRoutes.getGameScene();
            window.__speaks = 0; window.__reacts = 0;
            const sp = s.speechManager.speakText.bind(s.speechManager);
            s.speechManager.speakText = (...a) => { window.__speaks++; return sp(...a); };
            const re = s.objectMotion.react.bind(s.objectMotion);
            s.objectMotion.react = (...a) => { window.__reacts++; return re(...a); };
        });
        await page.waitForTimeout(700);
        await waitForMoveReady(page);
        const before = await objectCount(page);
        const org = await canvasPoint(page, 0, 0);

        await page.mouse.move(org.x + o.x + 3, org.y + o.y + 2);
        await page.mouse.down();
        await page.mouse.move(org.x + o.x + 6, org.y + o.y + 3);
        await page.waitForTimeout(80);
        await page.mouse.up();
        await page.waitForTimeout(100);
        const tapped = await page.evaluate(() => {
            const s = window.appRoutes.getGameScene(); const ob = s.objects.at(-1);
            return { n: s.objects.length, x: ob.x, y: ob.y, speaks: window.__speaks, reacts: window.__reacts, reactMs: ob.motionState.reactMs };
        });
        expect(tapped.n).toBe(before);
        expect(Math.abs(tapped.x - o.x) + Math.abs(tapped.y - o.y)).toBeLessThan(0.5);
        expect(tapped.reacts).toBe(1);
        expect(tapped.speaks).toBe(1);
        expect(tapped.reactMs).toBeGreaterThanOrEqual(0);

        await page.waitForTimeout(700);
        await page.evaluate(() => { window.__speaks = 0; window.__reacts = 0; });
        await waitForMoveReady(page);
        const to = { x: o.x < 200 ? o.x + 90 : o.x - 90, y: o.y };
        await dragScene(page, { x: o.x, y: o.y }, to);
        await page.waitForTimeout(150);
        const dragged = await page.evaluate(() => {
            const s = window.appRoutes.getGameScene(); const ob = s.objects.at(-1);
            return { x: ob.x, y: ob.y, reacts: window.__reacts };
        });
        expect(Math.abs(dragged.x - o.x)).toBeGreaterThan(30);
        expect(dragged.reacts).toBe(0);
        expect(c.all()).toEqual([]);
    });

    test('removeObject pops out: gone from the list at once, visuals gone within 600 ms; reset clears at once', async ({ page }) => {
        await enterSandbox(page);
        const o = await tapFreeSpot(page);
        expect(o).toBeTruthy();
        const r = await page.evaluate(() => new Promise((resolve) => {
            const s = window.appRoutes.getGameScene();
            const ob = s.objects.at(-1);
            const before = s.children.list.length;
            s.removeObject(ob);
            const immediate = { n: s.objects.length, ghosts: s.objectMotion.ghosts.count, stillThere: s.children.list.includes(ob) };
            setTimeout(() => resolve({ immediate, after: { ghosts: s.objectMotion.ghosts.count, stillThere: s.children.list.includes(ob), active: ob.scene != null } }), 600);
        }));
        expect(r.immediate.n).toBe(0);
        expect(r.immediate.ghosts).toBe(1);
        expect(r.immediate.stillThere).toBe(true);
        expect(r.after.ghosts).toBe(0);
        expect(r.after.stillThere).toBe(false);

        await spawnOf(page, 'emoji');
        const z = await page.evaluate(() => {
            const s = window.appRoutes.getGameScene();
            const ob = s.objects.at(-1); s.removeObject(ob);
            const g = s.objectMotion.ghosts.count;
            s.resetToyState();
            return { g, after: s.objectMotion.ghosts.count, destroyed: ob.scene == null };
        });
        expect(z.g).toBe(1);
        expect(z.after).toBe(0);
        expect(z.destroyed).toBe(true);
    });
});

test.describe('Object motion with reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });
    test.beforeEach(async ({ context }) => { await skipOnboarding(context); });

    test('the glyph box is static at idle', async ({ page }) => {
        await enterSandbox(page);
        await spawnOf(page, 'emoji');
        await page.waitForTimeout(700);
        const rows = await sampleGlyph(page, 1500);
        const span = (k) => Math.max(...rows.map((r) => r[k])) - Math.min(...rows.map((r) => r[k]));
        expect(span('by')).toBeLessThan(0.01);
        expect(span('w')).toBeLessThan(0.01);
        expect(span('h')).toBeLessThan(0.01);
        expect(rows.every((r) => r.angle === 0)).toBe(true);
    });
});
