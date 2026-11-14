import { test, expect } from '@playwright/test';
import { seedConfig, skipOnboarding, enterSandbox, spawnForced, sceneSize, lastObject, collectErrors } from './helpers/app.js';
import { forceNumberValue, dragScene, attachmentOffsets } from './helpers/scene.js';

/**
 * Number-mode rendering (Cistercian, Kaktovik, binary hearts, object counting).
 * Behavioural assertions on scene state: which components a number gets, where
 * they sit relative to the numeral, and that they follow it when dragged.
 * The Cistercian numeral is being re-implemented as drawn graphics, so nothing
 * here depends on fonts or text content of that component.
 */
const modes = (m) => ({
    advanced: { numberModes: { cistercian: false, kaktovik: false, binary: false, objectCounting: false, onlyApples: false, ...m } },
    content: { smallNumbers: { enabled: true, min: 0, max: 20, weight: 30 } },
});

// object-counting / apples components are governed by a separate radio group
const isNumeral = (c) => ['cistercian', 'kaktovik', 'binary'].includes(c.type);

async function spawnNumber(page, value, x, y, type = 'smallNumbers') {
    await forceNumberValue(page, value);
    await spawnForced(page, x, y, type);
    return page.evaluate(() => {
        const s = window.appRoutes.getGameScene();
        const o = s.objects.at(-1);
        return {
            x: o.x, y: o.y, text: o.text, type: o.type,
            comps: (o.componentLayout?.numberModes || []).map((c) => {
                const b = c.object.getBounds();
                return { type: c.type, offsetY: c.offsetY, x: c.object.x, y: c.object.y, bx: b.x, by: b.y, bw: b.width, bh: b.height };
            }),
        };
    });
}

test.describe('Number modes', () => {
    test.beforeEach(async ({ context }) => {
        await skipOnboarding(context);
    });

    test('Cistercian: a number gets a Cistercian component above it, inside the screen', async ({ page, context }) => {
        await seedConfig(context, modes({ cistercian: true }));
        const c = collectErrors(page);
        await enterSandbox(page);
        const { width, height } = await sceneSize(page);
        for (const value of [0, 5, 20, 1111]) {
            const n = await spawnNumber(page, value, width / 2, height / 2, value > 20 ? 'largeNumbers' : 'smallNumbers');
            expect(n.type).toBe('number');
            expect(n.text).toBe(String(value));
            const cis = n.comps.filter((x) => x.type === 'cistercian');
            expect(cis, `number ${value} should have one cistercian component`).toHaveLength(1);
            expect(cis[0].offsetY).toBeLessThan(0);          // above the numeral
            expect(cis[0].y).toBeLessThan(n.y);
            expect(cis[0].x).toBeGreaterThan(0);              // inside the screen
            expect(cis[0].x).toBeLessThan(width);
            expect(cis[0].y).toBeGreaterThan(0);
            expect(cis[0].y).toBeLessThan(height);
        }
        expect(c.errors).toEqual([]);
        expect(c.pageErrors).toEqual([]);
    });

    test('Cistercian disabled: no Cistercian component is created', async ({ page, context }) => {
        await seedConfig(context, modes({ kaktovik: true }));
        await enterSandbox(page);
        const { width, height } = await sceneSize(page);
        const n = await spawnNumber(page, 7, width / 2, height / 2);
        expect(n.comps.some((x) => x.type === 'cistercian')).toBe(false);
        expect(n.comps.some((x) => x.type === 'kaktovik')).toBe(true);
    });

    test('Kaktovik: font is loaded and the numeral has a non-zero width', async ({ page, context }) => {
        await seedConfig(context, modes({ kaktovik: true }));
        await enterSandbox(page);
        const { width, height } = await sceneSize(page);
        const n = await spawnNumber(page, 13, width / 2, height / 2);
        const k = n.comps.find((x) => x.type === 'kaktovik');
        expect(k).toBeTruthy();
        expect(k.bw).toBeGreaterThan(0);
        expect(k.bh).toBeGreaterThan(0);
        expect(k.offsetY).toBeLessThan(0);
        await page.waitForFunction(() => document.fonts.check('32px Kaktovik'));
    });

    test('binary hearts render for a number when enabled and not otherwise', async ({ page, context }) => {
        await seedConfig(context, modes({ binary: true }));
        await enterSandbox(page);
        const { width, height } = await sceneSize(page);
        const n = await spawnNumber(page, 5, width / 2, height / 2);
        const b = n.comps.find((x) => x.type === 'binary');
        expect(b).toBeTruthy();
        expect(b.bw).toBeGreaterThan(0);
        expect(n.comps.some((x) => x.type === 'cistercian' || x.type === 'kaktovik')).toBe(false);
    });

    test('with every mode off a number has no extra components', async ({ page, context }) => {
        await seedConfig(context, modes({}));
        await enterSandbox(page);
        const { width, height } = await sceneSize(page);
        const n = await spawnNumber(page, 4, width / 2, height / 2);
        expect(n.comps.filter(isNumeral)).toEqual([]);
    });

    test('stack order top-to-bottom: Cistercian, Kaktovik, binary, then the numeral', async ({ page, context }) => {
        await seedConfig(context, modes({ cistercian: true, kaktovik: true, binary: true }));
        await enterSandbox(page);
        const { width, height } = await sceneSize(page);
        const n = await spawnNumber(page, 8, width / 2, height / 2);
        const y = Object.fromEntries(n.comps.map((c) => [c.type, c.offsetY]));
        expect(y.cistercian).toBeLessThan(y.kaktovik);
        expect(y.kaktovik).toBeLessThan(y.binary);
        expect(y.binary).toBeLessThan(0);
    });

    test('non-number objects never get number components', async ({ page, context }) => {
        await seedConfig(context, modes({ cistercian: true, kaktovik: true, binary: true }));
        await enterSandbox(page);
        await spawnForced(page, 300, 300, 'emoji');
        const o = await lastObject(page);
        expect(o.type).toBe('emoji');
        expect(o.components).not.toContain('numberModes');
    });

    test('numeral components keep their offsets after the number is dragged repeatedly', async ({ page, context }) => {
        await seedConfig(context, modes({ cistercian: true, kaktovik: true, binary: true }));
        await enterSandbox(page);
        const { width, height } = await sceneSize(page);
        await spawnNumber(page, 6, width / 2, height / 2);
        // a forced spawn has no pointer to release; emulate the release
        await page.evaluate(() => { window.appRoutes.getGameScene().awaitingSpawnInputRelease = false; });
        const before = await attachmentOffsets(page);
        let pos = { x: before.x, y: before.y };
        for (const to of [{ x: width * 0.3, y: height * 0.6 }, { x: width * 0.7, y: height * 0.55 }, { x: width * 0.5, y: height * 0.65 }]) {
            await dragScene(page, pos, to);
            pos = to;
            const after = await attachmentOffsets(page);
            expect(after.x).toBeCloseTo(to.x, 0);
            expect(after.y).toBeCloseTo(to.y, 0);
            expect(after.text).toBe(before.text);
            after.comps.forEach((c, i) => {
                expect(c.type).toBe(before.comps[i].type);
                expect(c.dx).toBeCloseTo(before.comps[i].dx, 0);
                expect(c.dy).toBeCloseTo(before.comps[i].dy, 0);
            });
            after.words.forEach((w, i) => {
                expect(w.dx).toBeCloseTo(before.words[i].dx, 0);
                expect(w.dy).toBeCloseTo(before.words[i].dy, 0);
            });
        }
    });

    test('a 4-digit number spawns every enabled component', async ({ page, context }) => {
        await seedConfig(context, modes({ cistercian: true, kaktovik: true, binary: true }));
        await enterSandbox(page);
        const { width, height } = await sceneSize(page);
        const n = await spawnNumber(page, 1111, width / 2, height / 2, 'largeNumbers');
        expect(n.text).toBe('1111');
        expect(n.comps.filter(isNumeral).map((c) => c.type).sort()).toEqual(['binary', 'cistercian', 'kaktovik']);
    });
});
