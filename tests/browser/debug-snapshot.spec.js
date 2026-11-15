import { test, expect } from '@playwright/test';
import { collectErrors, enterSandbox } from './helpers/app.js';
import { tapFreeSpot } from './helpers/scene.js';

test.describe('scene.debugSnapshot()', () => {
    test('reports plain-JSON geometry for spawned objects', async ({ page }) => {
        const errs = collectErrors(page);
        await enterSandbox(page);
        await tapFreeSpot(page);
        await tapFreeSpot(page);

        const snap = await page.evaluate(() => JSON.parse(JSON.stringify(window.appRoutes.getGameScene().debugSnapshot())));

        expect(snap.width).toBeGreaterThan(0);
        expect(snap.height).toBeGreaterThan(0);
        expect(snap.dpr).toBeGreaterThan(0);
        expect(snap.canvas.width).toBeGreaterThan(0);
        expect(snap.canvas.height).toBeGreaterThan(0);
        expect(snap.objects).toHaveLength(2);
        for (const o of snap.objects) {
            expect(typeof o.id).toBe('string');
            expect(typeof o.type).toBe('string');
            for (const k of ['x', 'y']) expect(Number.isFinite(o[k])).toBe(true);
            for (const box of [o.glyph, o.bounds]) {
                for (const k of ['x', 'y', 'w', 'h']) expect(Number.isFinite(box[k])).toBe(true);
                expect(box.w).toBeGreaterThan(0);
                expect(box.h).toBeGreaterThan(0);
            }
            // bounds is the union, so it contains the glyph
            expect(o.bounds.x).toBeLessThanOrEqual(o.glyph.x + 0.5);
            expect(o.bounds.y).toBeLessThanOrEqual(o.glyph.y + 0.5);
            expect(o.bounds.x + o.bounds.w).toBeGreaterThanOrEqual(o.glyph.x + o.glyph.w - 0.5);
            expect(o.bounds.y + o.bounds.h).toBeGreaterThanOrEqual(o.glyph.y + o.glyph.h - 0.5);
        }
        expect(Number.isInteger(snap.overlaps)).toBe(true);
        expect(snap.overlaps).toBeGreaterThanOrEqual(0);
        expect(errs.all()).toEqual([]);
    });
});
