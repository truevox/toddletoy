import { test, expect } from '@playwright/test';
import { gotoSelector, skipOnboarding, collectErrors, ORRERY_CARD, GLOBE_CARD } from './helpers/app.js';

/**
 * Orrery (/orrery) and Globe (/globe) are separate canvas toys that are being
 * redesigned, so these checks are structural: container exists, no errors,
 * a tap eventually reveals an info panel, Back returns to the selector, and
 * navigating repeatedly never leaks containers. No copy or layout is pinned.
 */
const TOYS = [
    { name: 'Orrery', card: ORRERY_CARD, route: /\/orrery$/, container: '#orrery-toy' },
    { name: 'Globe', card: GLOBE_CARD, route: /\/globe$/, container: '#globe-toy' },
];

/**
 * Tap points across the canvas until an element inside `container` that began
 * hidden (inline opacity 0) is switched on with text: that is the info panel.
 * Uses the inline style because the panel fades in via a CSS transition.
 */
async function tapUntilInfoPanel(page, container) {
    await page.evaluate((sel) => {
        const root = document.querySelector(sel);
        window.__hiddenPanels = [...root.querySelectorAll('div')]
            .filter((el) => el.style.opacity === '0');
    }, container);
    expect(await page.evaluate(() => window.__hiddenPanels.length),
        'toy should start with a hidden info panel').toBeGreaterThan(0);

    const read = () => page.evaluate(() => {
        const el = window.__hiddenPanels.find((e) => e.style.opacity === '1' && e.textContent.trim());
        return el ? el.textContent.trim() : null;
    });
    const vp = page.viewportSize();
    for (const fy of [0.5, 0.4, 0.6, 0.3, 0.7, 0.45, 0.55]) {
        for (const fx of [0.5, 0.35, 0.65, 0.2, 0.8, 0.45, 0.55]) {
            await page.mouse.click(vp.width * fx, vp.height * fy);
            const text = await read();
            if (text) return text;
        }
    }
    return null;
}

for (const toy of TOYS) {
    test.describe(`${toy.name} toy`, () => {
        test.beforeEach(async ({ context }) => {
            await skipOnboarding(context);
        });

        test('loads from the selector without errors and shows one container + canvas', async ({ page }) => {
            const c = collectErrors(page);
            await gotoSelector(page);
            await page.locator(toy.card).click();
            await expect(page).toHaveURL(toy.route);
            await expect(page.locator(toy.container)).toBeVisible();
            await expect(page.locator(`${toy.container} canvas`)).toBeVisible();
            await expect(page.locator('#toy-mode-selector')).toBeHidden();
            expect(await page.locator(toy.container).count()).toBe(1);
            // Nothing from the sandbox leaks onto this screen.
            await expect(page.locator('.parent-exit-btn')).toBeHidden();
            expect(c.all()).toEqual([]);
        });

        test('can be opened directly by URL', async ({ page }) => {
            const c = collectErrors(page);
            await page.goto(toy.route.source.replace('\\/', '/').replace('$', ''));
            await expect(page.locator(toy.container)).toBeVisible();
            expect(c.all()).toEqual([]);
        });

        test('a tap reveals an info panel with text', async ({ page }) => {
            const c = collectErrors(page);
            await gotoSelector(page);
            await page.locator(toy.card).click();
            await expect(page.locator(`${toy.container} canvas`)).toBeVisible();
            await page.waitForTimeout(500); // first frame so hit-testing buffers are drawn
            const text = await tapUntilInfoPanel(page, toy.container);
            expect(text, 'no tap produced an info panel').toBeTruthy();
            expect(c.all()).toEqual([]);
        });

        test('Back returns to the selector and hides the toy', async ({ page }) => {
            await gotoSelector(page);
            await page.locator(toy.card).click();
            await expect(page.locator(toy.container)).toBeVisible();
            await page.locator(`${toy.container} button:has-text("Back")`).click();
            await expect(page).toHaveURL(/\/$/);
            await expect(page.locator('#toy-mode-selector')).toBeVisible();
            await expect(page.locator(toy.container)).toBeHidden();
        });

        test('navigating away and back 5 times leaves exactly one container', async ({ page }) => {
            const c = collectErrors(page);
            await gotoSelector(page);
            for (let i = 0; i < 5; i++) {
                await page.locator(toy.card).click();
                await expect(page.locator(toy.container)).toBeVisible();
                await page.locator(`${toy.container} button:has-text("Back")`).click();
                await expect(page.locator('#toy-mode-selector')).toBeVisible();
                await expect(page.locator(toy.container)).toBeHidden();
            }
            expect(await page.locator(toy.container).count()).toBe(1);
            expect(await page.locator('#toy-mode-selector').count()).toBe(1);
            expect(c.all()).toEqual([]);
        });
    });
}

test('switching between the two toys never shows both at once', async ({ page, context }) => {
    await skipOnboarding(context);
    await gotoSelector(page);
    await page.locator(ORRERY_CARD).click();
    await expect(page.locator('#orrery-toy')).toBeVisible();
    await page.locator('#orrery-toy button:has-text("Back")').click();
    await page.locator(GLOBE_CARD).click();
    await expect(page.locator('#globe-toy')).toBeVisible();
    await expect(page.locator('#orrery-toy')).toBeHidden();
});
