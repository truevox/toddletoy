import { test, expect } from '@playwright/test';
import {
    collectErrors, skipOnboarding, seedConfig, enterSandbox, objectCount, lastObject, waitForObjectCount, waitForSpawnReady, sceneSize,
} from './helpers/app.js';

/**
 * The baby keyboard: every key gives one big response, letters and digits show themselves,
 * position follows the key's place on a standard keyboard, shortcuts are never touched.
 */

// Headless Chromium has no speech voices: a fake speechSynthesis that really takes a while to speak.
const FAKE_SPEECH = () => {
    let inflight = null;
    const synth = {
        paused: false, pending: false, speaking: false, getVoices: () => [],
        addEventListener() {}, removeEventListener() {}, resume() {}, pause() {},
        cancel() { if (inflight) { const u = inflight; inflight = null; setTimeout(() => u.onerror && u.onerror({ error: 'canceled' }), 0); } },
        speak(u) {
            inflight = u;
            setTimeout(() => { u.onstart && u.onstart({}); }, 20);
            setTimeout(() => { if (inflight === u) { inflight = null; u.onend && u.onend({}); } }, 900);
        },
    };
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
    window.SpeechSynthesisUtterance = function (text) { this.text = text; };
};

const LETTERS_OFF = { content: {
    shapes: { enabled: true, weight: 20 }, smallNumbers: { enabled: true, weight: 20 }, largeNumbers: { enabled: false },
    uppercaseLetters: { enabled: false }, lowercaseLetters: { enabled: false }, emojis: { enabled: true, weight: 20 },
} };

/** Record where each object is born (before neighbours make room). */
const recordBirths = (page) => page.evaluate(() => {
    const s = window.appRoutes.getGameScene();
    window.__births = [];
    const orig = s.spawnObjectAt.bind(s);
    s.spawnObjectAt = async (...args) => {
        const o = await orig(...args);
        if (o) window.__births.push({ x: o.x, y: o.y, type: o.type, value: o.itemData && o.itemData.value });
        return o;
    };
});
const births = (page) => page.evaluate(() => window.__births);

test.describe('Baby keyboard', () => {
    test.beforeEach(async ({ context }) => {
        await skipOnboarding(context);
    });

    test('pressing A, B and C shows an A, a B and a C', async ({ page }) => {
        const c = collectErrors(page);
        await enterSandbox(page);
        for (const [i, key] of ['KeyA', 'KeyB', 'KeyC'].entries()) {
            await page.keyboard.press(key);
            await waitForObjectCount(page, i + 1);
            const o = await lastObject(page);
            expect(o.type).toBe('letter');
            expect(o.text).toBe(key.slice(3));
        }
        expect(c.pageErrors).toEqual([]);
    });

    test('pressing 7 shows the number 7, on the top row and on the number pad', async ({ page }) => {
        await enterSandbox(page);
        await page.keyboard.press('Digit7');
        await waitForObjectCount(page, 1);
        let o = await lastObject(page);
        expect(o.type).toBe('number');
        expect(o.value).toBe(7);
        await page.keyboard.press('Numpad3');
        await waitForObjectCount(page, 2);
        o = await lastObject(page);
        expect(o.type).toBe('number');
        expect(o.value).toBe(3);
    });

    test('with letters switched off a letter key still spawns something, never a letter', async ({ page, context }) => {
        await seedConfig(context, LETTERS_OFF);
        await enterSandbox(page);
        for (const [i, key] of ['KeyB', 'KeyQ', 'KeyZ', 'KeyM'].entries()) {
            await page.keyboard.press(key);
            await waitForObjectCount(page, i + 1);
            expect((await lastObject(page)).type).not.toBe('letter');
        }
    });

    test('positions follow the keyboard: Q is left of P, both high up, Z below Q', async ({ page }) => {
        const c = collectErrors(page);
        await enterSandbox(page);
        await recordBirths(page);
        const { width, height } = await sceneSize(page);
        for (const key of ['KeyQ', 'KeyP', 'KeyZ']) {
            await page.keyboard.press(key);
            await page.waitForTimeout(160);
        }
        const [q, p, z] = await births(page);
        expect(q.x).toBeLessThan(p.x);
        expect(q.y).toBeLessThan(height * 0.5);
        expect(p.y).toBeLessThan(height * 0.5);
        expect(z.y).toBeGreaterThan(q.y);
        expect(q.x).toBeGreaterThan(0);
        expect(p.x).toBeLessThan(width);
        expect(c.pageErrors).toEqual([]);
    });

    test('Space, Enter, arrows and punctuation each spawn something', async ({ page }) => {
        const c = collectErrors(page);
        await enterSandbox(page);
        await page.keyboard.press('Space');
        await page.keyboard.press('Enter');
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('Period');
        await page.keyboard.press('Backspace');
        await page.waitForTimeout(300);
        expect(await objectCount(page)).toBeGreaterThanOrEqual(1);
        await expect.poll(() => page.evaluate(() => window.appRoutes.getGameScene().speechManager.getIsSpeaking() || true)).toBe(true);
        expect(c.pageErrors).toEqual([]);
    });

    test('holding a key down for a second makes exactly one object', async ({ page }) => {
        await enterSandbox(page);
        await page.keyboard.down('KeyH');
        for (let i = 0; i < 5; i++) { await page.waitForTimeout(200); await page.keyboard.down('KeyH'); } // auto-repeat
        await page.keyboard.up('KeyH');
        expect(await objectCount(page)).toBe(1);
        // letting go and pressing again is a new press
        await page.waitForTimeout(200);
        await page.keyboard.press('KeyH');
        await waitForObjectCount(page, 2);
    });

    test('ten different keys in quick succession stay within capacity and raise no errors', async ({ page }) => {
        const c = collectErrors(page);
        await enterSandbox(page);
        for (const key of ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP']) {
            await page.keyboard.press(key, { delay: 5 });
        }
        await page.waitForTimeout(600);
        const { n, cap } = await page.evaluate(() => {
            const s = window.appRoutes.getGameScene();
            return { n: s.objects.length, cap: s.softPhysics.capacity() };
        });
        expect(n).toBeGreaterThan(0);
        expect(n).toBeLessThanOrEqual(cap);
        expect(c.pageErrors).toEqual([]);
        expect(c.errors).toEqual([]);
    });

    test('shortcut combinations are left alone and spawn nothing', async ({ page }) => {
        await enterSandbox(page);
        await page.evaluate(() => {
            window.__seen = [];
            // registered after the toy's own listener, so it sees whether the toy prevented the event
            window.addEventListener('keydown', (e) => window.__seen.push({ code: e.code, prevented: e.defaultPrevented }));
        });
        for (const combo of ['Control+KeyR', 'Meta+KeyL', 'Alt+KeyD', 'Control+KeyC', 'Tab', 'Escape']) {
            await page.keyboard.press(combo);
        }
        await page.waitForTimeout(200);
        const seen = await page.evaluate(() => window.__seen);
        expect(seen.length).toBeGreaterThanOrEqual(6);
        expect(seen.filter((e) => e.prevented)).toEqual([]);
        expect(await objectCount(page)).toBe(0);
    });

    test('a key pressed while an earlier object is still being spoken still spawns', async ({ page }) => {
        await page.addInitScript(FAKE_SPEECH);
        const c = collectErrors(page);
        await enterSandbox(page);
        await page.keyboard.press('KeyA');
        await waitForObjectCount(page, 1);
        await page.waitForTimeout(60);
        expect(await page.evaluate(() => window.appRoutes.getGameScene().speechManager.getIsSpeaking())).toBe(true);
        await page.keyboard.press('KeyB');
        await waitForObjectCount(page, 2);
        const first = await page.evaluate(() => { const s = window.appRoutes.getGameScene(); return s.objects[0].itemData.value; });
        expect(first).toBe('A');
        expect((await lastObject(page)).text).toBe('B');
        expect(c.pageErrors).toEqual([]);
    });

    test('grid mode: a key fills the cell at its place', async ({ page, context }) => {
        await seedConfig(context, { gridMode: { enabled: true, rows: 4, cols: 4, showGrid: true, autoPopulate: false } });
        const c = collectErrors(page);
        await enterSandbox(page);
        await page.keyboard.press('KeyQ');
        await waitForObjectCount(page, 1);
        await page.waitForTimeout(160);
        await page.keyboard.press('KeyP');
        await waitForObjectCount(page, 2);
        const cells = await page.evaluate(() => [...window.appRoutes.getGameScene().gridMode.occupiedCells.keys()].map((k) => k.split(',').map(Number)));
        expect(cells).toHaveLength(2);
        expect(cells[0][1]).toBeLessThan(cells[1][1]);   // Q's column is left of P's
        expect(c.pageErrors).toEqual([]);
    });

    test('keys do nothing while another screen is on top', async ({ page }) => {
        await enterSandbox(page);
        await page.evaluate(() => window.appRoutes.exitToy());
        await expect(page.locator('#toy-mode-selector')).toBeVisible();
        await page.keyboard.press('KeyA');
        await page.keyboard.press('Space');
        await page.waitForTimeout(200);
        expect(await objectCount(page)).toBe(0);
    });
});
