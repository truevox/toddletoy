import { test, expect } from '@playwright/test';
import { collectErrors, skipOnboarding, enterSandbox } from './helpers/app.js';

/**
 * Speech queue, word order and caption highlighting, against a fake speechSynthesis
 * (headless Chromium has no voices): it records every utterance, fires start/boundary/end
 * on timers and counts cancel() calls.
 */
const FAKE_SPEECH = () => {
    const log = { utterances: [], cancels: 0 };
    let inflight = null;
    const synth = {
        paused: false, pending: false, speaking: false,
        getVoices: () => [],
        addEventListener() {}, removeEventListener() {},
        resume() { this.paused = false; },
        pause() { this.paused = true; },
        cancel() {
            log.cancels++;
            if (inflight) { inflight.cancelled = true; const u = inflight.u; inflight = null; setTimeout(() => u.onerror && u.onerror({ error: 'canceled' }), 0); }
        },
        speak(u) {
            const entry = { text: u.text, lang: u.lang, boundaries: [], u };
            log.utterances.push(entry);
            inflight = entry;
            setTimeout(() => { if (!entry.cancelled && u.onstart) u.onstart({}); }, 20);
            let at = 0;
            u.text.split(' ').forEach((w, i) => {
                const charIndex = at; at += w.length + 1;
                setTimeout(() => { if (!entry.cancelled && u.onboundary) { entry.boundaries.push(charIndex); u.onboundary({ name: 'word', charIndex }); } }, 40 + i * 120);
            });
            setTimeout(() => { if (!entry.cancelled) { if (inflight === entry) inflight = null; u.onend && u.onend({}); } }, 60 + u.text.split(' ').length * 120);
        },
    };
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
    window.SpeechSynthesisUtterance = function (text) { this.text = text; };
    window.__speech = log;
};

const captions = (page) => page.evaluate(() => window.appRoutes.getGameScene().objects.map((o) =>
    o.allLanguageWords.map((g) => g.words.map((w) => w.text).join(' '))));

const spawnAnnounce = (page, fx, fy) => page.evaluate(async ([fx, fy]) => {
    const s = window.appRoutes.getGameScene();
    const { width, height } = s.debugSnapshot();
    return !!(await s.spawnAndAnnounce(width * fx, height * fy, 'shapes'));
}, [fx, fy]);

const spoken = (page) => page.evaluate(() => window.__speech.utterances.map((u) => u.text));

test.describe('Speech', () => {
    test.beforeEach(async ({ context, page }) => {
        await skipOnboarding(context);
        await page.addInitScript(FAKE_SPEECH);
    });

    test('three quick spawns speak in order and nothing is cut off', async ({ page }) => {
        const c = collectErrors(page);
        await enterSandbox(page);
        await spawnAnnounce(page, 0.2, 0.3);
        await spawnAnnounce(page, 0.5, 0.3);
        await spawnAnnounce(page, 0.8, 0.3);
        const caps = await captions(page);
        expect(caps).toHaveLength(3);
        const expected = caps.flatMap((c) => c); // en then es for each object, in order
        await expect.poll(async () => (await spoken(page)).length, { timeout: 15000 }).toBe(6);
        expect(await spoken(page)).toEqual(expected);
        expect(await page.evaluate(() => window.__speech.cancels)).toBe(0);
        expect(c.pageErrors).toEqual([]);
    });

    test('four quick spawns drop the oldest waiting request', async ({ page }) => {
        await enterSandbox(page);
        await spawnAnnounce(page, 0.2, 0.25);
        await spawnAnnounce(page, 0.5, 0.25);
        await spawnAnnounce(page, 0.8, 0.25);
        await spawnAnnounce(page, 0.5, 0.65);
        const caps = await captions(page);
        const expected = [...caps[0], ...caps[2], ...caps[3]]; // object 2 was dropped
        await expect.poll(async () => (await spoken(page)).length, { timeout: 15000 }).toBe(6);
        expect(await spoken(page)).toEqual(expected);
        expect(await page.evaluate(() => window.__speech.cancels)).toBe(0);
    });

    test('a red star is "Estrella roja" in speech and caption, and captions highlight on boundaries', async ({ page }) => {
        await enterSandbox(page);
        await page.evaluate(async () => {
            const s = window.appRoutes.getGameScene();
            const things = await (await fetch('/things.json')).json();
            const star = things.shapes.find((x) => x.value === 'Star');
            const red = things.colors.find((x) => x.value === 'Red');
            const { width, height } = s.debugSnapshot();
            await s.restoreObject({ type: 'shape', id: 'star1', itemData: { ...star, color: red }, x: width / 2, y: height * 0.4 });
            s.announceObject(s.objects[s.objects.length - 1], width / 2, height * 0.4);
        });
        expect(await captions(page)).toEqual([['Red Star', 'Estrella roja']]);
        await expect.poll(() => spoken(page), { timeout: 10000 }).toEqual(['Red Star', 'Estrella roja']);
        // while the Spanish utterance runs, the second word gets the gold tint from the boundary event
        await expect.poll(() => page.evaluate(() => {
            const o = window.appRoutes.getGameScene().objects[0];
            return o.allLanguageWords[1].words.map((w) => w.isTinted);
        }), { timeout: 10000 }).toContain(true);
    });

    test('tapping the object that is speaking does not queue a duplicate', async ({ page }) => {
        await enterSandbox(page);
        await spawnAnnounce(page, 0.5, 0.4);
        const result = await page.evaluate(() => {
            const s = window.appRoutes.getGameScene();
            const obj = s.objects[0];
            s.speechManager.speakText(obj, 'both');
            s.speechManager.speakText(obj, 'both');
            return { waiting: s.speechManager.getWaitingObjects().length, speaking: s.speechManager.isObjectSpeaking(obj) };
        });
        expect(result).toEqual({ waiting: 0, speaking: true });
        await expect.poll(async () => (await spoken(page)).length, { timeout: 10000 }).toBe(2);
        await page.waitForTimeout(800);
        expect((await spoken(page)).length).toBe(2);
    });

    test('exiting the toy cancels speech and clears the queue', async ({ page }) => {
        const c = collectErrors(page);
        await enterSandbox(page);
        await spawnAnnounce(page, 0.2, 0.3);
        await spawnAnnounce(page, 0.5, 0.3);
        await expect.poll(async () => (await spoken(page)).length).toBeGreaterThan(0);
        await page.evaluate(() => window.appRoutes.exitToy());
        await expect(page.locator('#toy-mode-selector')).toBeVisible();
        expect(await page.evaluate(() => window.__speech.cancels)).toBeGreaterThan(0);
        const before = (await spoken(page)).length;
        await page.waitForTimeout(1200);
        expect((await spoken(page)).length).toBe(before); // nothing queued survives
        expect(c.pageErrors).toEqual([]);
    });
});
