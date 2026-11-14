import { test, expect } from '@playwright/test';
import { skipOnboarding, enterConfig } from './helpers/app.js';

/**
 * ConfigScreen styles live in an external CSS file (not injected from JS) and
 * must actually apply to the config screen.
 */
test.describe('CSS extraction', () => {
    test.beforeEach(async ({ context, page }) => {
        await skipOnboarding(context);
        await enterConfig(page);
    });

    test('config styles ship in a real stylesheet that contains the config rules', async ({ page }) => {
        const found = await page.evaluate(async () => {
            const links = [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.href);
            const texts = await Promise.all(links.map((h) => fetch(h).then((r) => r.text())));
            return { links: links.length, hasConfigRules: texts.some((t) => t.includes('.config-screen') && t.includes('.start-button')) };
        });
        expect(found.links).toBeGreaterThan(0);
        expect(found.hasConfigRules).toBe(true);
    });

    test('config screen has its gradient background, fixed positioning and z-index', async ({ page }) => {
        const s = await page.locator('.config-screen').evaluate((el) => {
            const cs = getComputedStyle(el);
            return { bg: cs.background, position: cs.position, z: cs.zIndex };
        });
        expect(s.bg).toContain('linear-gradient');
        expect(s.bg).toContain('rgb(102, 126, 234)'); // #667eea
        expect(s.position).toBe('fixed');
        expect(s.z).toBe('1000');
    });

    test('config sections are styled as rounded translucent cards', async ({ page }) => {
        const s = await page.locator('.config-section').first().evaluate((el) => {
            const cs = getComputedStyle(el);
            return { bg: cs.backgroundColor, radius: cs.borderRadius };
        });
        expect(s.bg).toContain('rgba');
        expect(s.radius).toBe('20px');
    });

    test('the bottom start button has its gradient and padding', async ({ page }) => {
        const s = await page.locator('.start-button').last().evaluate((el) => {
            const cs = getComputedStyle(el);
            return { bg: cs.background, padding: cs.padding };
        });
        expect(s.bg).toContain('linear-gradient');
        expect(s.padding).toContain('24px');
        expect(s.padding).toContain('48px');
    });
});
