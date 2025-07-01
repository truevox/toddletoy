import { test, expect } from '@playwright/test';

test.describe('Application Smoke Test', () => {
  test('should load the game, start it, and spawn an object', async ({ page }) => {
    // Navigate to the application's root
    await page.goto('/');

    // Wait for the main canvas to be visible
    await page.waitForSelector('canvas', { timeout: 15000 });
    await page.waitForTimeout(1000); // Allow for initialization

    // Click the "START PLAYING" button if it exists
    const startButton = await page.locator('button:has-text("START PLAYING")').first();
    if (await startButton.isVisible()) {
        await startButton.click();
    }

    // Wait for the game to be in a playable state
    await page.waitForTimeout(1000);

    // Simulate a key press to spawn an object
    await page.keyboard.press('KeyS');
    await page.waitForTimeout(1000);

    // Take a screenshot to verify the object was spawned
    await expect(page).toHaveScreenshot('smoke-test-spawned-object.png', {
      fullPage: false,
      clip: { x: 0, y: 0, width: 800, height: 600 }
    });
  });
});
