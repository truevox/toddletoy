import { test, expect } from '@playwright/test';

/**
 * Cross-browser compatibility tests
 * Ensures the toddler toy works consistently across different browsers
 */

test.describe('Cross-Browser Compatibility', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for game to load
    await page.waitForSelector('canvas', { timeout: 15000 });
    await page.waitForTimeout(3000); // Allow extra time for different browsers
  });

  test('should load and initialize properly in all browsers', async ({ page, browserName }) => {
    // Take screenshot of initial load for each browser
    await expect(page).toHaveScreenshot(`initial-load-${browserName}.png`);
    
    // Verify canvas is present and has proper dimensions
    const canvas = await page.locator('canvas');
    await expect(canvas).toBeVisible();
    
    const canvasSize = await canvas.boundingBox();
    expect(canvasSize.width).toBeGreaterThan(200);
    expect(canvasSize.height).toBeGreaterThan(200);
  });

  test('should handle touch/click interactions consistently', async ({ page, browserName }) => {
    // Test basic interaction
    await page.click('canvas', { position: { x: 400, y: 300 } });
    await page.waitForTimeout(1000);
    
    // Take screenshot to compare across browsers
    await expect(page).toHaveScreenshot(`interaction-${browserName}.png`);
  });

  test('should support keyboard input across browsers', async ({ page, browserName }) => {
    // Test keyboard interaction
    await page.keyboard.press('q');
    await page.waitForTimeout(500);
    await page.keyboard.press('w');
    await page.waitForTimeout(500);
    await page.keyboard.press('e');
    await page.waitForTimeout(500);
    
    // Screenshot of keyboard input results
    await expect(page).toHaveScreenshot(`keyboard-input-${browserName}.png`);
  });

  test('should render fonts consistently across browsers', async ({ page, browserName }) => {
    // Spawn a number to test Kaktovik font rendering
    await page.keyboard.press('5');
    await page.waitForTimeout(1000);
    
    // Take screenshot to verify font rendering
    await expect(page).toHaveScreenshot(`font-rendering-${browserName}.png`);
  });

  test('should handle responsive design in all browsers', async ({ page, browserName }) => {
    // Test desktop size
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.click('canvas', { position: { x: 600, y: 400 } });
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot(`desktop-responsive-${browserName}.png`);
    
    // Test mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500); // Allow responsive adjustments
    
    await expect(page).toHaveScreenshot(`mobile-responsive-${browserName}.png`);
  });

  test('should support audio context in all browsers', async ({ page, browserName }) => {
    // Test audio context creation
    const audioContextSupported = await page.evaluate(() => {
      return !!(window.AudioContext || window.webkitAudioContext);
    });
    
    // Audio should be supported in modern browsers
    expect(audioContextSupported).toBe(true);
    
    // Test audio tone generation by spawning object
    await page.click('canvas', { position: { x: 300, y: 200 } });
    await page.waitForTimeout(500);
    
    // Audio functionality should not cause errors
    const errors = await page.evaluate(() => {
      return window.audioErrors || [];
    });
    
    expect(errors).toHaveLength(0);
  });

  test('should support speech synthesis across browsers', async ({ page, browserName }) => {
    // Check speech synthesis availability
    const speechSupported = await page.evaluate(() => {
      return 'speechSynthesis' in window;
    });
    
    expect(speechSupported).toBe(true);
    
    // Test speech without actually listening (to avoid audio in tests)
    await page.click('canvas', { position: { x: 400, y: 300 } });
    await page.waitForTimeout(1000);
    
    // Click again to trigger speech
    await page.click('canvas', { position: { x: 400, y: 300 } });
    await page.waitForTimeout(2000);
    
    // No JavaScript errors should occur
    const jsErrors = await page.evaluate(() => {
      return window.speechErrors || [];
    });
    
    expect(jsErrors).toHaveLength(0);
  });

  test('should handle PWA features consistently', async ({ page, browserName }) => {
    // Check service worker support
    const swSupported = await page.evaluate(() => {
      return 'serviceWorker' in navigator;
    });
    
    // Service worker should be supported in modern browsers
    expect(swSupported).toBe(true);
    
    // Check manifest support
    const manifestSupported = await page.evaluate(() => {
      const link = document.querySelector('link[rel="manifest"]');
      return !!link;
    });
    
    expect(manifestSupported).toBe(true);
  });

  test('should maintain consistent layout across browsers', async ({ page, browserName }) => {
    // Spawn multiple objects to test layout
    await page.keyboard.press('q');
    await page.waitForTimeout(200);
    await page.keyboard.press('w');
    await page.waitForTimeout(200);
    await page.keyboard.press('e');
    await page.waitForTimeout(200);
    
    // Move one object
    await page.click('canvas', { position: { x: 300, y: 300 } });
    await page.waitForTimeout(500);
    
    // Take screenshot for layout comparison
    await expect(page).toHaveScreenshot(`layout-consistency-${browserName}.png`);
  });
});

test.describe('Browser-Specific Feature Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 15000 });
    await page.waitForTimeout(2000);
  });

  test('should handle gamepad API if available', async ({ page, browserName }) => {
    // Check gamepad support
    const gamepadSupported = await page.evaluate(() => {
      return 'getGamepads' in navigator;
    });
    
    // Log gamepad support for reference
    console.log(`Gamepad support in ${browserName}: ${gamepadSupported}`);
    
    // Test should not fail if gamepad is not supported
    if (gamepadSupported) {
      // Try to access gamepad API without errors
      const gamepadError = await page.evaluate(() => {
        try {
          navigator.getGamepads();
          return null;
        } catch (error) {
          return error.message;
        }
      });
      
      expect(gamepadError).toBeNull();
    }
  });

  test('should handle pointer events properly', async ({ page, browserName }) => {
    // Test pointer events vs mouse events
    const pointerSupported = await page.evaluate(() => {
      return 'PointerEvent' in window;
    });
    
    console.log(`Pointer events support in ${browserName}: ${pointerSupported}`);
    
    // Test interaction regardless of pointer support
    await page.click('canvas', { position: { x: 350, y: 250 } });
    await page.waitForTimeout(500);
    
    // Should work with both pointer and mouse events
    await expect(page).toHaveScreenshot(`pointer-interaction-${browserName}.png`);
  });

  test('should handle font loading consistently', async ({ page, browserName }) => {
    // Check FontFace API support
    const fontFaceSupported = await page.evaluate(() => {
      return 'FontFace' in window;
    });
    
    console.log(`FontFace API support in ${browserName}: ${fontFaceSupported}`);
    
    // Test Kaktovik font rendering regardless
    await page.keyboard.press('7');
    await page.waitForTimeout(1500); // Extra time for font loading
    
    await expect(page).toHaveScreenshot(`kaktovik-font-${browserName}.png`);
  });
});