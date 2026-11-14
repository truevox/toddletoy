import { test, expect } from '@playwright/test';
import { gotoSelector, skipOnboarding, collectErrors, SANDBOX_CARD, ORRERY_CARD, GLOBE_CARD } from './helpers/app.js';

/**
 * Toy selector (the `/` route): three cards, usable on phones, and activatable
 * by pointer and keyboard.
 */
test.describe('Toy selector', () => {
    test.beforeEach(async ({ context }) => {
        await skipOnboarding(context);
    });

    test('shows the heading and three toy cards without errors', async ({ page }) => {
        const c = collectErrors(page);
        await gotoSelector(page);
        await expect(page.locator('#toy-mode-selector h1')).toBeVisible();
        await expect(page.locator(SANDBOX_CARD)).toBeVisible();
        await expect(page.locator(ORRERY_CARD)).toBeVisible();
        await expect(page.locator(GLOBE_CARD)).toBeVisible();
        expect(c.all()).toEqual([]);
    });

    test('cards are exposed as focusable buttons', async ({ page }) => {
        await gotoSelector(page);
        for (const sel of [SANDBOX_CARD, ORRERY_CARD, GLOBE_CARD]) {
            const card = page.locator(sel);
            await expect(card).toHaveAttribute('role', 'button');
            await expect(card).toHaveAttribute('tabindex', '0');
        }
    });

    for (const [name, viewport] of [
        ['phone portrait 393x851', { width: 393, height: 851 }],
        ['phone landscape 851x393', { width: 851, height: 393 }],
    ]) {
        test.describe(name, () => {
            test.use({ viewport });

            test('heading is visible and the whole page is reachable by scrolling', async ({ page }) => {
                await gotoSelector(page);
                const heading = page.locator('#toy-mode-selector h1');
                // Regression: flex centring pushed the heading above the scroll origin.
                const box = await heading.boundingBox();
                expect(box.y).toBeGreaterThanOrEqual(0);
                expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
                await expect(heading).toBeInViewport();

                const scroller = page.locator('#toy-mode-selector');
                const m = await scroller.evaluate((el) => ({ sh: el.scrollHeight, ch: el.clientHeight }));
                if (viewport.height < 600) {
                    // Three cards cannot fit in a landscape phone: it must scroll.
                    expect(m.sh).toBeGreaterThan(m.ch);
                }
                await scroller.evaluate((el) => { el.scrollTop = el.scrollHeight; });
                if (m.sh > m.ch) {
                    expect(await scroller.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
                }
                // After scrolling to the end the last card is fully on screen.
                const last = await page.locator(GLOBE_CARD).boundingBox();
                expect(last.y + last.height).toBeLessThanOrEqual(viewport.height + 1);
                expect(last.y).toBeGreaterThanOrEqual(0);
                // and back at the top the heading is still reachable.
                await scroller.evaluate((el) => { el.scrollTop = 0; });
                await expect(heading).toBeInViewport();
                // No horizontal page scroll.
                const hs = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
                expect(hs).toBeLessThanOrEqual(1);
            });

            test('every card is tappable at this size', async ({ page }) => {
                await gotoSelector(page);
                for (const sel of [SANDBOX_CARD, ORRERY_CARD, GLOBE_CARD]) {
                    const card = page.locator(sel);
                    await card.scrollIntoViewIfNeeded();
                    const box = await card.boundingBox();
                    expect(box.width).toBeGreaterThanOrEqual(44);
                    expect(box.height).toBeGreaterThanOrEqual(44);
                    expect(box.x).toBeGreaterThanOrEqual(0);
                    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
                }
            });
        });
    }

    const targets = [
        ['Toddler Sandbox', SANDBOX_CARD, /\/config$/],
        ['Solar System', ORRERY_CARD, /\/orrery$/],
        ['World Globe', GLOBE_CARD, /\/globe$/],
    ];
    for (const [name, sel, url] of targets) {
        test(`${name} card activates by click`, async ({ page }) => {
            await gotoSelector(page);
            await page.locator(sel).click();
            await expect(page).toHaveURL(url);
        });

        test(`${name} card activates by Enter key`, async ({ page }) => {
            await gotoSelector(page);
            await page.locator(sel).focus();
            await expect(page.locator(sel)).toBeFocused();
            await page.keyboard.press('Enter');
            await expect(page).toHaveURL(url);
        });
    }

    test('Space also activates a focused card', async ({ page }) => {
        await gotoSelector(page);
        await page.locator(ORRERY_CARD).focus();
        await page.keyboard.press('Space');
        await expect(page).toHaveURL(/\/orrery$/);
    });

    test('Tab reaches the cards in reading order', async ({ page }) => {
        await gotoSelector(page);
        await page.keyboard.press('Tab');
        await expect(page.locator(SANDBOX_CARD)).toBeFocused();
        await page.keyboard.press('Tab');
        await expect(page.locator(ORRERY_CARD)).toBeFocused();
        await page.keyboard.press('Tab');
        await expect(page.locator(GLOBE_CARD)).toBeFocused();
    });
});
