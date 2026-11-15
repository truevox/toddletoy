/** Scene-level helpers: dragging, attachment geometry, pixel presence. */
import { canvasPoint, waitForSpawnReady, objectCount, waitForObjectCount, lastObject } from './app.js';

/** Wait until the scene accepts drags (post-spawn lock released). */
export async function waitForMoveReady(page) {
    await page.waitForFunction(() => window.appRoutes.getGameScene().canMoveAfterSpawn(), null, { timeout: 10000 });
}

/** Real pointer drag between two scene coordinates. */
export async function dragScene(page, from, to) {
    await waitForMoveReady(page);
    const o = await canvasPoint(page, 0, 0);
    await page.mouse.move(o.x + from.x, o.y + from.y);
    await page.mouse.down();
    await page.mouse.move(o.x + to.x, o.y + to.y, { steps: 6 });
    await page.mouse.up();
}

/**
 * Does the page region (CSS px rect) show anything other than the backdrop colour?
 * Decodes a real screenshot inside the page, so it works for WebGL canvases
 * and needs no stored baseline.
 */
export async function regionHasContent(page, clip, minPixels = 30) {
    const b64 = (await page.screenshot({ clip })).toString('base64');
    return page.evaluate(async ([b64, minPixels]) => {
        const img = new Image();
        img.src = 'data:image/png;base64,' + b64;
        await img.decode();
        const c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const d = ctx.getImageData(0, 0, c.width, c.height).data;
        // The backdrop is a smooth gradient, not flat black: compare against the
        // region's median colour per channel (objects never fill most of a probe).
        const med = (ch) => {
            const v = [];
            for (let i = ch; i < d.length; i += 4) v.push(d[i]);
            return v.sort((a, b) => a - b)[v.length >> 1];
        };
        const ref = [med(0), med(1), med(2)];
        let diff = 0;
        for (let i = 0; i < d.length; i += 4) {
            if (Math.abs(d[i] - ref[0]) + Math.abs(d[i + 1] - ref[1]) + Math.abs(d[i + 2] - ref[2]) > 40) diff++;
        }
        return diff >= minPixels;
    }, [b64, minPixels]);
}

/** Offsets of attached labels / number components relative to the main object. */
export async function attachmentOffsets(page, index = -1) {
    return page.evaluate((index) => {
        const s = window.appRoutes.getGameScene();
        const o = s.objects.at(index);
        const words = [];
        (o.allLanguageWords || []).forEach((g) => g.words.forEach((w) =>
            words.push({ dx: w.x + w.width / 2 - o.x, dy: w.y - o.y })));
        const comps = (o.componentLayout?.numberModes || []).map((c) =>
            ({ type: c.type, dx: c.object.x - o.x, dy: c.object.y - o.y }));
        return { x: o.x, y: o.y, text: o.text, words, comps };
    }, index);
}

/** Make the next number spawn carry a specific value. */
export async function forceNumberValue(page, value) {
    await page.evaluate((value) => {
        const s = window.appRoutes.getGameScene();
        if (!s.__origGetRandomNumber) s.__origGetRandomNumber = s.getRandomNumber.bind(s);
        s.getRandomNumber = async (t) => ({ ...(await s.__origGetRandomNumber(t)), value });
    }, value);
}

/**
 * Tap on empty canvas space that no existing object covers (objects are large
 * on phones, so fixed fractions can land on a previous object and start a
 * drag instead of spawning). Returns the new object's summary.
 */
export async function tapFreeSpot(page) {
    await waitForSpawnReady(page);
    const spot = await page.evaluate(() => {
        const s = window.appRoutes.getGameScene();
        const { width: W, height: H } = s.debugSnapshot(), m = 60;
        let best = null;
        for (let gy = 0; gy < 14; gy++) {
            for (let gx = 0; gx < 8; gx++) {
                const x = m + (gx + 0.5) * ((W - 2 * m) / 8), y = m + (gy + 0.5) * ((H - 2 * m) / 14);
                if (s.getObjectUnderPointer(x, y)) continue;
                const d = Math.min(1e9, ...s.objects.map((o) => Math.hypot(o.x - x, o.y - y)));
                if (!best || d > best.d) best = { x, y, d };
            }
        }
        return best;
    });
    if (!spot) throw new Error('no free spot left on the canvas');
    const before = await objectCount(page);
    const o = await canvasPoint(page, 0, 0);
    await page.mouse.click(o.x + spot.x, o.y + spot.y);
    try {
        await waitForObjectCount(page, before + 1, 6000);
    } catch (e) {
        const st = await page.evaluate(() => {
            const s = window.appRoutes.getGameScene();
            return { n: s.objects.length, speaking: s.speechManager.getIsSpeaking(), dragging: s.isDragging,
                paused: s.scene.isPaused(), size: s.debugSnapshot().width + 'x' + s.debugSnapshot().height };
        });
        throw new Error(`free-spot tap at ${JSON.stringify(spot)} did not spawn (had ${before}): ${JSON.stringify(st)}`);
    }
    return lastObject(page);
}
