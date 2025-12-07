/**
 * Tests to verify CSS extraction from ConfigScreen.js
 */

const { test, expect } = require('@playwright/test');

test.describe('CSS Extraction Verification', () => {
    test('config screen styles should be loaded correctly', async ({ page }) => {
        // Navigate to the app
        await page.goto('http://localhost:4001');

        // Wait for config screen to be visible
        await page.waitForSelector('.config-screen', { timeout: 5000 });

        // Get computed styles of config screen
        const configScreen = page.locator('.config-screen');
        const bgColor = await configScreen.evaluate(el => {
            return window.getComputedStyle(el).background;
        });

        // Verify gradient background is applied (from extracted CSS)
        expect(bgColor).toContain('linear-gradient');
        expect(bgColor).toContain('rgb(102, 126, 234)'); // #667eea

        // Verify other critical styles are loaded
        const position = await configScreen.evaluate(el => {
            return window.getComputedStyle(el).position;
        });
        expect(position).toBe('fixed');

        const zIndex = await configScreen.evaluate(el => {
            return window.getComputedStyle(el).zIndex;
        });
        expect(zIndex).toBe('1000');

        console.log('✅ All config screen styles loaded correctly from external CSS file');
    });

    test('config sections should have proper styling', async ({ page }) => {
        // Navigate to the app
        await page.goto('http://localhost:4001');

        // Wait for config sections
        await page.waitForSelector('.config-section', { timeout: 5000 });

        const configSection = page.locator('.config-section').first();

        // Verify section background
        const bgColor = await configSection.evaluate(el => {
            return window.getComputedStyle(el).backgroundColor;
        });
        expect(bgColor).toContain('rgba');

        // Verify border-radius
        const borderRadius = await configSection.evaluate(el => {
            return window.getComputedStyle(el).borderRadius;
        });
        expect(borderRadius).toBe('20px');

        console.log('✅ Config section styles loaded correctly');
    });

    test('buttons should have proper styling', async ({ page }) => {
        // Navigate to the app
        await page.goto('http://localhost:4001');

        // Wait for start button
        await page.waitForSelector('.start-button', { timeout: 5000 });

        const startButton = page.locator('.start-button').last();

        // Verify button gradient background
        const bgColor = await startButton.evaluate(el => {
            return window.getComputedStyle(el).background;
        });
        expect(bgColor).toContain('linear-gradient');

        // Verify button padding
        const padding = await startButton.evaluate(el => {
            return window.getComputedStyle(el).padding;
        });
        expect(padding).toContain('24px');
        expect(padding).toContain('48px');

        console.log('✅ Button styles loaded correctly');
    });
});
