/**
 * Browser test for documentation viewer functionality
 */

import { test, expect } from '@playwright/test';

test.describe('Documentation Viewer', () => {
    // Helper to dismiss onboarding modal if it appears
    async function dismissOnboarding(page) {
        try {
            const onboardingModal = page.locator('.onboarding-modal');
            const isVisible = await onboardingModal.isVisible({ timeout: 1000 });
            if (isVisible) {
                const closeBtn = onboardingModal.locator('.help-modal-close, .onboarding-got-it-btn');
                await closeBtn.first().click();
                await page.waitForTimeout(300);
            }
        } catch (e) {
            // No onboarding modal, continue
        }
    }

    test('should open documentation viewer from config screen', async ({ page }) => {
        // Navigate to config screen
        await page.goto('http://localhost:4001/');

        // Wait for config screen to load
        await page.waitForSelector('.config-container', { timeout: 5000 });

        // Dismiss onboarding modal if it appears
        await dismissOnboarding(page);

        // Find and click the documentation button
        const docButton = page.locator('#documentation-btn');
        await expect(docButton).toBeVisible();
        await expect(docButton).toHaveText(/Docs/);

        // Click the documentation button
        await docButton.click();

        // Wait for documentation modal to appear
        await page.waitForSelector('.documentation-modal', { timeout: 3000 });

        // Verify modal is visible
        const modal = page.locator('.documentation-modal');
        await expect(modal).toBeVisible();

        // Verify header
        const header = page.locator('.help-modal-header h2');
        await expect(header).toHaveText(/ToddleToy Documentation/);

        // Verify search input exists
        const searchInput = page.locator('.doc-search-input');
        await expect(searchInput).toBeVisible();
        await expect(searchInput).toHaveAttribute('placeholder', /Search documentation/);

        // Verify navigation sidebar exists
        const nav = page.locator('.documentation-nav');
        await expect(nav).toBeVisible();

        // Verify navigation has multiple sections
        const navItems = page.locator('.doc-nav-item');
        const count = await navItems.count();
        expect(count).toBeGreaterThan(10);

        // Verify content area exists
        const contentArea = page.locator('#doc-content-area');
        await expect(contentArea).toBeVisible();

        console.log('✅ Documentation modal opened successfully with', count, 'sections');
    });

    test('should navigate between documentation sections', async ({ page }) => {
        // Navigate to config and open docs
        await page.goto('http://localhost:4001/');
        await page.waitForSelector('.config-container');
        await dismissOnboarding(page);
        await page.locator('#documentation-btn').click();
        await page.waitForSelector('.documentation-modal');

        // Get all nav items
        const navItems = page.locator('.doc-nav-item');
        const firstNav = navItems.first();
        const secondNav = navItems.nth(1);

        // Verify first item is active initially
        await expect(firstNav).toHaveClass(/active/);

        // Click second nav item
        await secondNav.click();

        // Wait a bit for transition
        await page.waitForTimeout(100);

        // Verify second item is now active
        await expect(secondNav).toHaveClass(/active/);
        await expect(firstNav).not.toHaveClass(/active/);

        // Verify content area changed (should scroll to top)
        const contentArea = page.locator('#doc-content-area');
        const scrollTop = await contentArea.evaluate(el => el.scrollTop);
        expect(scrollTop).toBe(0);

        console.log('✅ Navigation between sections works correctly');
    });

    test('should search documentation and show results', async ({ page }) => {
        // Navigate to config and open docs
        await page.goto('http://localhost:4001/');
        await page.waitForSelector('.config-container');
        await dismissOnboarding(page);
        await page.locator('#documentation-btn').click();
        await page.waitForSelector('.documentation-modal');

        // Find search input
        const searchInput = page.locator('.doc-search-input');

        // Type search query
        await searchInput.fill('language');

        // Wait for search results
        await page.waitForTimeout(200);

        // Verify search results header appears
        const contentArea = page.locator('#doc-content-area');
        const content = await contentArea.textContent();
        expect(content).toContain('Search Results');

        // Verify at least one result
        const results = page.locator('.search-result');
        const resultCount = await results.count();
        expect(resultCount).toBeGreaterThan(0);

        console.log('✅ Search found', resultCount, 'results for "language"');

        // Click on a search result
        const firstResult = results.first();
        await firstResult.click();

        // Wait for navigation
        await page.waitForTimeout(100);

        // Verify we navigated to a section
        const newContent = await contentArea.textContent();
        expect(newContent).not.toContain('Search Results');

        console.log('✅ Clicking search result navigates to section');
    });

    test('should handle empty search gracefully', async ({ page }) => {
        // Navigate to config and open docs
        await page.goto('http://localhost:4001/');
        await page.waitForSelector('.config-container');
        await dismissOnboarding(page);
        await page.locator('#documentation-btn').click();
        await page.waitForSelector('.documentation-modal');

        // Search for something that won't match
        const searchInput = page.locator('.doc-search-input');
        await searchInput.fill('xyzabc123impossiblequery');

        // Wait for results
        await page.waitForTimeout(200);

        // Verify no results message
        const contentArea = page.locator('#doc-content-area');
        const content = await contentArea.textContent();
        expect(content).toContain('No results found');

        // Clear search
        await searchInput.clear();

        // Wait for reset
        await page.waitForTimeout(200);

        // Verify first section is shown again
        const newContent = await contentArea.textContent();
        expect(newContent).not.toContain('No results found');

        console.log('✅ Empty search handled correctly');
    });

    test('should close documentation modal', async ({ page }) => {
        // Navigate to config and open docs
        await page.goto('http://localhost:4001/');
        await page.waitForSelector('.config-container');
        await dismissOnboarding(page);
        await page.locator('#documentation-btn').click();
        await page.waitForSelector('.documentation-modal');

        // Verify modal is visible
        const modal = page.locator('.documentation-modal');
        await expect(modal).toBeVisible();

        // Click close button
        const closeButton = page.locator('.help-modal-close');
        await closeButton.click();

        // Wait for modal to disappear
        await page.waitForTimeout(100);

        // Verify modal is gone
        await expect(modal).not.toBeVisible();

        console.log('✅ Documentation modal closes correctly');
    });

    test('should have proper responsive design', async ({ page }) => {
        // Test mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });

        // Navigate to config and open docs
        await page.goto('http://localhost:4001/');
        await page.waitForSelector('.config-container');
        await dismissOnboarding(page);
        await page.locator('#documentation-btn').click();
        await page.waitForSelector('.documentation-modal');

        // Verify modal is fullscreen on mobile
        const modal = page.locator('.documentation-modal .help-modal-content');
        const box = await modal.boundingBox();

        expect(box.width).toBeGreaterThan(350); // Nearly full width
        expect(box.height).toBeGreaterThan(600); // Nearly full height

        // Verify navigation is visible (should be at top on mobile)
        const nav = page.locator('.documentation-nav');
        await expect(nav).toBeVisible();

        console.log('✅ Mobile responsive design works correctly');
    });
});
