import { test, expect } from '@playwright/test';

/**
 * Emoji Visual Verification Tests
 * 
 * Browser tests that verify emoji characters are actually rendered visually
 * and not just empty space. Uses screenshot comparison and DOM analysis
 * to catch missing emoji/icon rendering issues.
 */

test.describe('Emoji Visual Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Set up default configuration to enable emoji spawning
    await page.goto('/');
    
    // Check if we're on config screen or toy screen
    const isConfigScreen = await page.locator('[data-testid="config-screen"], .config-screen').isVisible().catch(() => false);
    
    if (isConfigScreen) {
      // Enable all emoji categories for testing
      await page.check('input[value="animals"]').catch(() => {});
      await page.check('input[value="faces"]').catch(() => {});
      await page.check('input[value="nature"]').catch(() => {});
      await page.check('input[value="objects"]').catch(() => {});
      await page.check('input[value="food"]').catch(() => {});
      
      // Click start/play button to proceed to toy
      await page.click('button:has-text("Start"), button:has-text("Play"), .start-button').catch(() => {});
      await page.waitForTimeout(1000);
    } else {
      // If already on toy screen, navigate there directly
      await page.goto('/toy');
    }
    
    // Wait for game to load
    await page.waitForSelector('canvas', { timeout: 15000 });
    await page.waitForTimeout(2000); // Allow game initialization
  });

  test('should render emoji characters visually on screen', async ({ page }) => {
    // Click on canvas to spawn an emoji
    await page.click('canvas', { position: { x: 200, y: 200 } });
    await page.waitForTimeout(1000);
    
    // Take screenshot of the spawned emoji
    const screenshot = await page.screenshot();
    expect(screenshot).toBeTruthy();
    
    // Check that something visual appeared (screenshot should not be just blank canvas)
    await expect(page).toHaveScreenshot('emoji-spawn-visual.png');
  });

  test('should spawn multiple different emojis with visual verification', async ({ page }) => {
    // Spawn several emojis at different positions
    const positions = [
      { x: 150, y: 150 },
      { x: 300, y: 200 },
      { x: 450, y: 150 },
      { x: 250, y: 300 },
      { x: 350, y: 350 }
    ];
    
    for (const pos of positions) {
      await page.click('canvas', { position: pos });
      await page.waitForTimeout(500); // Brief pause between spawns
    }
    
    // Wait for all emojis to fully render
    await page.waitForTimeout(2000);
    
    // Take screenshot showing multiple emojis
    await expect(page).toHaveScreenshot('multiple-emojis-visual.png');
  });

  test('should verify specific problematic emojis render correctly', async ({ page }) => {
    // This test focuses on emojis that were reported as problematic:
    // "Crying Face" (😢) and "Caterpillar" (🐛)
    
    // Spawn multiple emojis to increase chance of getting problematic ones
    for (let i = 0; i < 10; i++) {
      await page.click('canvas', { position: { x: 100 + (i % 3) * 150, y: 100 + Math.floor(i / 3) * 100 } });
      await page.waitForTimeout(300);
    }
    
    await page.waitForTimeout(2000);
    
    // Take screenshot showing various emojis
    await expect(page).toHaveScreenshot('problematic-emojis-test.png');
  });

  test('should verify emoji characters are not empty space', async ({ page }) => {
    // Spawn an emoji
    await page.click('canvas', { position: { x: 400, y: 300 } });
    await page.waitForTimeout(1000);
    
    // Get canvas context and check if pixels have been drawn
    const hasVisibleContent = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return false;
      
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Check if any non-transparent pixels exist (indicating rendered content)
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 0) { // Alpha channel > 0 means visible pixel
          return true;
        }
      }
      return false;
    });
    
    expect(hasVisibleContent).toBe(true);
  });

  test('should render emoji text labels alongside emoji characters', async ({ page }) => {
    // Spawn an emoji
    await page.click('canvas', { position: { x: 300, y: 250 } });
    await page.waitForTimeout(2000); // Allow time for speech and text labels
    
    // Check that both emoji and text labels are present
    await expect(page).toHaveScreenshot('emoji-with-labels.png');
  });

  test('should handle rapid emoji spawning without visual artifacts', async ({ page }) => {
    // Rapidly spawn multiple emojis
    const rapidPositions = [
      { x: 100, y: 100 }, { x: 200, y: 100 }, { x: 300, y: 100 },
      { x: 100, y: 200 }, { x: 200, y: 200 }, { x: 300, y: 200 },
      { x: 100, y: 300 }, { x: 200, y: 300 }, { x: 300, y: 300 }
    ];
    
    for (const pos of rapidPositions) {
      await page.click('canvas', { position: pos });
      await page.waitForTimeout(100); // Very short delay for rapid spawning
    }
    
    await page.waitForTimeout(3000); // Allow all to fully render
    
    // Verify no visual artifacts or missing emojis
    await expect(page).toHaveScreenshot('rapid-emoji-spawning.png');
  });

  test('should verify emoji font loading and rendering', async ({ page }) => {
    // Check that emoji fonts are properly loaded
    const fontLoadResult = await page.evaluate(async () => {
      // Check if browser supports emoji rendering
      const testText = '🐶😢🐛'; // Test emojis including problematic ones
      
      // Create a temporary canvas to test emoji rendering
      const testCanvas = document.createElement('canvas');
      testCanvas.width = 200;
      testCanvas.height = 100;
      const ctx = testCanvas.getContext('2d');
      
      ctx.font = '32px Arial';
      ctx.fillText(testText, 10, 50);
      
      // Get image data to check if emojis rendered
      const imageData = ctx.getImageData(0, 0, testCanvas.width, testCanvas.height);
      const data = imageData.data;
      
      // Count non-transparent pixels
      let pixelCount = 0;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 0) pixelCount++;
      }
      
      return {
        pixelCount,
        hasContent: pixelCount > 0,
        canvasWidth: testCanvas.width,
        canvasHeight: testCanvas.height
      };
    });
    
    expect(fontLoadResult.hasContent).toBe(true);
    expect(fontLoadResult.pixelCount).toBeGreaterThan(0);
  });

  test('should compare emoji rendering before and after interaction', async ({ page }) => {
    // Take baseline screenshot
    await expect(page).toHaveScreenshot('baseline-before-emoji.png');
    
    // Spawn emoji
    await page.click('canvas', { position: { x: 400, y: 300 } });
    await page.waitForTimeout(1500);
    
    // Take screenshot after emoji spawn
    await expect(page).toHaveScreenshot('after-emoji-spawn.png');
    
    // Move the emoji by dragging
    await page.mouse.move(400, 300);
    await page.mouse.down();
    await page.mouse.move(500, 200);
    await page.mouse.up();
    await page.waitForTimeout(1000);
    
    // Take screenshot after movement
    await expect(page).toHaveScreenshot('after-emoji-move.png');
  });

  test('should verify keyboard spawned emojis render correctly', async ({ page }) => {
    // Test keyboard inputs that should spawn emojis
    const keys = ['q', 'w', 'e', 'a', 's', 'd', 'z', 'x', 'c'];
    
    for (const key of keys) {
      await page.keyboard.press(key);
      await page.waitForTimeout(300);
    }
    
    await page.waitForTimeout(2000);
    
    // Verify keyboard-spawned emojis are visible
    await expect(page).toHaveScreenshot('keyboard-spawned-emojis.png');
  });

  test('should verify emoji rendering across different viewport sizes', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    await page.click('canvas', { position: { x: 180, y: 300 } });
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveScreenshot('mobile-emoji-rendering.png');
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.reload();
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    await page.click('canvas', { position: { x: 960, y: 540 } });
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveScreenshot('desktop-emoji-rendering.png');
  });
});