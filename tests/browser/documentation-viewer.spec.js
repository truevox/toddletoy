import { test, expect } from '@playwright/test';
import { skipOnboarding, enterConfig } from './helpers/app.js';

/** In-app documentation viewer, opened from the config screen's "Docs" button. */
test.describe('Documentation viewer', () => {
    test.beforeEach(async ({ context, page }) => {
        await skipOnboarding(context);
        await enterConfig(page);
    });

    // The modal's own layout is asserted separately (see the overlay test);
    // function tests dispatch DOM clicks so they do not depend on where it renders.
    const domClick = (loc) => loc.evaluate((el) => el.click());

    const open = async (page) => {
        await page.locator('#documentation-btn').click();
        await expect(page.locator('.documentation-modal')).toBeVisible();
    };

    test('opens from the config screen with header, search, nav and content', async ({ page }) => {
        const docButton = page.locator('#documentation-btn');
        await expect(docButton).toBeVisible();
        await expect(docButton).toHaveText(/Docs/);
        await open(page);
        await expect(page.locator('.help-modal-header h2')).toHaveText(/ToddleToy Documentation/);
        await expect(page.locator('.doc-search-input')).toBeVisible();
        await expect(page.locator('.doc-search-input')).toHaveAttribute('placeholder', /Search documentation/);
        await expect(page.locator('.documentation-nav')).toBeVisible();
        expect(await page.locator('.doc-nav-item').count()).toBeGreaterThan(10);
        await expect(page.locator('#doc-content-area')).toBeVisible();
    });

    test('navigates between sections and resets scroll', async ({ page }) => {
        await open(page);
        const items = page.locator('.doc-nav-item');
        await expect(items.first()).toHaveClass(/active/);
        await domClick(items.nth(1));
        await expect(items.nth(1)).toHaveClass(/active/);
        await expect(items.first()).not.toHaveClass(/active/);
        expect(await page.locator('#doc-content-area').evaluate((el) => el.scrollTop)).toBe(0);
    });

    test('search shows results and clicking one opens its section', async ({ page }) => {
        await open(page);
        await page.locator('.doc-search-input').fill('language');
        const area = page.locator('#doc-content-area');
        await expect(area).toContainText('Search Results');
        const results = page.locator('.search-result');
        expect(await results.count()).toBeGreaterThan(0);
        await domClick(results.first());
        await expect(area).not.toContainText('Search Results');
    });

    test('a query with no matches says so, and clearing it restores content', async ({ page }) => {
        await open(page);
        const input = page.locator('.doc-search-input');
        const area = page.locator('#doc-content-area');
        await input.fill('xyzabc123impossiblequery');
        await expect(area).toContainText('No results found');
        await input.clear();
        await expect(area).not.toContainText('No results found');
    });

    test('closes with the close button', async ({ page }) => {
        await open(page);
        await domClick(page.locator('.documentation-modal .help-modal-close'));
        await expect(page.locator('.documentation-modal')).toBeHidden();
    });

    test('is an on-screen overlay: close button is inside the viewport', async ({ page }) => {
        await open(page);
        const vp = page.viewportSize();
        const close = await page.locator('.documentation-modal .help-modal-close').boundingBox();
        expect(close.y + close.height).toBeLessThanOrEqual(vp.height);
        expect(await page.locator('.documentation-modal').evaluate((el) => getComputedStyle(el).position)).toBe('fixed');
    });

    test('fills a phone screen and keeps the nav visible', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await open(page);
        const box = await page.locator('.documentation-modal .help-modal-content').boundingBox();
        expect(box.width).toBeGreaterThan(350);
        expect(box.height).toBeGreaterThan(600);
        await expect(page.locator('.documentation-nav')).toBeVisible();
    });
});
