import { test, expect } from '@playwright/test';
import { execSync, spawn } from 'child_process';
import path from 'path';
import net from 'net';

/**
 * Offline PWA regression tests.
 *
 * Root cause: every data fetch in src/game.js appended a cache-busting query
 * string (`/emojis.json?v=${Date.now()}`). That defeats both the Workbox
 * precache (exact-URL match) and the runtime NetworkFirst cache (unique key
 * per request), so offline taps fell straight through to the hardcoded
 * catch-block fallbacks (🎯 Target, Circle, "A", White, 1) - one fetch per
 * tap, each burning the 3s network timeout.
 *
 * These tests build the production bundle (the service worker only
 * registers when `import.meta.env.PROD` is true) and serve it with
 * `vite preview`, since the dev server used by the rest of the Playwright
 * suite never installs a service worker.
 */

const ROOT = path.join(__dirname, '..', '..');
const PORT = 4322;
const BASE_URL = `http://localhost:${PORT}`;

async function waitForPort(port, timeoutMs = 30000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        const ok = await new Promise((resolve) => {
            const socket = net.createConnection(port, 'localhost');
            socket.once('connect', () => { socket.destroy(); resolve(true); });
            socket.once('error', () => resolve(false));
        });
        if (ok) return;
        await new Promise((r) => setTimeout(r, 300));
    }
    throw new Error(`Port ${port} did not open within ${timeoutMs}ms`);
}

// Root is the mode-selector screen, not the game itself. Reaching the
// playable canvas means: pick the Sandbox card, dismiss the onboarding
// help modal if it's covering the config screen, then start playing.
async function enterSandbox(page) {
    await page.waitForSelector('[aria-label*="Toddler Sandbox"]', { timeout: 15000 });
    await page.click('[aria-label*="Toddler Sandbox"]');
    await page.waitForTimeout(500);

    const modalClose = page.locator('.help-modal-close').first();
    if (await modalClose.isVisible().catch(() => false)) {
        await modalClose.click();
        await page.waitForTimeout(200);
    }

    const startButton = page.locator('button:has-text("START PLAYING")').first();
    if (await startButton.isVisible().catch(() => false)) {
        const skipBox = page.locator('#skip-config-checkbox');
        if (await skipBox.isVisible().catch(() => false)) {
            await skipBox.check();
        }
        await startButton.click();
    }

    await page.waitForSelector('canvas', { timeout: 15000 });
    await page.waitForTimeout(1000);
}

test.describe('Offline PWA data loading', () => {
    let previewProcess;

    test.beforeAll(async () => {
        execSync('npm run build', { cwd: ROOT, stdio: 'pipe' });
        previewProcess = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
            cwd: ROOT,
            stdio: 'pipe'
        });
        await waitForPort(PORT);
    }, 120000);

    test.afterAll(() => {
        previewProcess?.kill();
    });

    test('tapping offline produces varied objects with at most one JSON network request', async ({ page, context }) => {
        const spawnedLabels = [];
        page.on('console', (msg) => {
            const text = msg.text();
            if (text.startsWith('✨ Spawned')) {
                spawnedLabels.push(text);
            }
        });

        // Prime the service worker + precache while online.
        await page.goto(BASE_URL);
        await page.waitForTimeout(1500); // allow SW-install-triggered auto-reload to settle
        await page.evaluate(async () => {
            if ('serviceWorker' in navigator) {
                await navigator.serviceWorker.ready;
            }
        });
        await enterSandbox(page);

        // Only count requests made after we go offline - any JSON requests
        // during the online priming phase are expected (or absent, since the
        // fix bundles the data into the JS bundle at build time).
        const jsonRequests = [];
        page.on('request', (req) => {
            const url = req.url();
            if (url.endsWith('.json') || url.includes('.json?')) {
                jsonRequests.push(url);
            }
        });
        spawnedLabels.length = 0;

        await context.setOffline(true);
        await page.reload();
        await page.waitForTimeout(1000);
        await enterSandbox(page);

        const canvas = page.locator('canvas').first();
        const box = await canvas.boundingBox();
        expect(box).toBeTruthy();

        for (let i = 0; i < 15; i++) {
            const x = box.x + Math.random() * box.width;
            const y = box.y + Math.random() * box.height;
            await page.mouse.click(x, y);
            await page.waitForTimeout(150);
        }

        await context.setOffline(false);

        // Regression check for the "only 🎯 Target" symptom: real offline
        // play must produce more than one distinct spawned item.
        const distinctLabels = new Set(spawnedLabels);
        expect(spawnedLabels.length).toBeGreaterThan(0);
        expect(distinctLabels.size).toBeGreaterThan(1);

        const allFallbackOnly = spawnedLabels.every((label) =>
            /Target|Circle|White/.test(label) && /🎯/.test(label)
        );
        expect(allFallbackOnly).toBe(false);

        // Regression check for the "one fetch per tap" latency symptom.
        expect(jsonRequests.length).toBeLessThanOrEqual(1);
    });
});
