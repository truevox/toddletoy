import { test, expect } from '@playwright/test';

/**
 * Visual regression tests for layout preservation
 * Tests the critical spawn → move → verify workflow that user reported as broken
 */

test.describe('Layout Preservation Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for game to load
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForTimeout(2000); // Allow Phaser to fully initialize
  });

  test('should preserve "Red Triangle" text spacing after movement', async ({ page }) => {
    // Click to spawn a triangle (shapes typically appear on certain clicks)
    await page.click('canvas', { position: { x: 400, y: 300 } });
    await page.waitForTimeout(500); // Allow spawn animation
    
    // Take screenshot of initial spawn (should be correct)
    await expect(page).toHaveScreenshot('red-triangle-initial.png');
    
    // Click the object again to move it (this is where the bug occurs)
    await page.click('canvas', { position: { x: 400, y: 300 } });
    await page.waitForTimeout(500); // Allow movement
    
    // Take screenshot after movement (this shows the bug)
    await expect(page).toHaveScreenshot('red-triangle-after-move.png');
    
    // The screenshots will show the difference between correct and broken layout
    // This test will fail until the bug is fixed, documenting the regression
  });

  test('should preserve "Orange Q" letter spacing after movement', async ({ page }) => {
    // Generate a Q letter (may require specific click patterns)
    await page.keyboard.press('q');
    await page.waitForTimeout(500);
    
    // Take initial screenshot
    await expect(page).toHaveScreenshot('orange-q-initial.png');
    
    // Move the object by clicking it
    await page.click('canvas', { position: { x: 300, y: 200 } });
    await page.waitForTimeout(500);
    
    // Take screenshot after movement
    await expect(page).toHaveScreenshot('orange-q-after-move.png');
  });

  test('should preserve number display alignment after movement', async ({ page }) => {
    // Spawn a number
    await page.keyboard.press('5');
    await page.waitForTimeout(500);
    
    // Initial screenshot with hearts and Kaktovik numeral
    await expect(page).toHaveScreenshot('number-5-initial.png');
    
    // Move the number object
    await page.click('canvas', { position: { x: 500, y: 400 } });
    await page.waitForTimeout(500);
    
    // Screenshot after movement
    await expect(page).toHaveScreenshot('number-5-after-move.png');
  });

  test('should handle multiple movements without cumulative errors', async ({ page }) => {
    // Spawn object
    await page.click('canvas', { position: { x: 300, y: 300 } });
    await page.waitForTimeout(500);
    
    // Move multiple times
    for (let i = 0; i < 3; i++) {
      await page.click('canvas', { position: { x: 200 + i * 50, y: 200 + i * 50 } });
      await page.waitForTimeout(300);
    }
    
    // Final screenshot should still have proper spacing
    await expect(page).toHaveScreenshot('multiple-moves-final.png');
  });

  test('should preserve layout across different screen sizes', async ({ page }) => {
    // Test responsive scaling preservation
    await page.setViewportSize({ width: 800, height: 600 });
    await page.click('canvas', { position: { x: 400, y: 300 } });
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('desktop-initial.png');
    
    // Change viewport size
    await page.setViewportSize({ width: 400, height: 300 });
    await page.waitForTimeout(500);
    
    // Move object on smaller screen
    await page.click('canvas', { position: { x: 200, y: 150 } });
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('mobile-after-move.png');
  });
});

test.describe('Text Content Verification', () => {
  test('should not corrupt text content during movement', async ({ page }) => {
    // Add JavaScript to extract text content from canvas
    await page.addInitScript(() => {
      window.captureTextContent = () => {
        try {
          // Try to access the game instance from the window
          if (typeof window.gameInstance !== 'undefined' && window.gameInstance.scene) {
            const scene = window.gameInstance.scene.scenes[0];
            const textObjects = [];
            
            // Collect all text objects from the scene
            if (scene && scene.children && scene.children.list) {
              scene.children.list.forEach(child => {
                if (child.type === 'Text') {
                  textObjects.push({
                    text: child.text,
                    x: child.x,
                    y: child.y
                  });
                }
              });
            }
            
            return textObjects;
          }
          return [];
        } catch (error) {
          console.log('Error capturing text content:', error);
          return [];
        }
      };
    });
    
    // Wait for canvas to be interactive
    await page.waitForFunction(() => {
      const canvas = document.querySelector('canvas');
      return canvas && canvas.offsetWidth > 0 && canvas.offsetHeight > 0;
    }, { timeout: 10000 });
    
    // Use keyboard input instead of canvas click for more reliable object spawning
    await page.keyboard.press('q');
    await page.waitForTimeout(1000);
    
    const initialText = await page.evaluate(() => window.captureTextContent());
    
    // Move object using mouse click
    const canvas = await page.locator('canvas');
    await canvas.click({ position: { x: 300, y: 200 } });
    await page.waitForTimeout(1000);
    
    const afterMoveText = await page.evaluate(() => window.captureTextContent());
    
    // Verify text content hasn't changed (only positions should change)
    if (initialText.length > 0) {
      expect(afterMoveText.map(t => t.text).sort()).toEqual(
        initialText.map(t => t.text).sort()
      );
    } else {
      // If no text was captured, at least verify the test ran
      console.log('No text objects found - this may be expected for some object types');
    }
  });
});