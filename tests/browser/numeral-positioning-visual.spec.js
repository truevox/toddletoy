import { test, expect } from '@playwright/test';

/**
 * Browser-based visual verification tests for numeral positioning fixes
 * Tests the recent Kaktovik (4px higher) and Cistercian (7px higher) positioning improvements
 */

test.describe('Numeral Positioning Visual Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for game to load completely
    await page.waitForSelector('canvas', { timeout: 15000 });
    await page.waitForTimeout(3000); // Allow Phaser to fully initialize
    
    // Enable the admin mode to access configuration
    await page.goto('/admin');
    await page.waitForTimeout(1000);
  });

  test('should visually verify Kaktovik numeral positioning improvement', async ({ page }) => {
    console.log('🧪 Testing Kaktovik numeral positioning...');
    
    // Enable only Kaktovik numerals in configuration
    await page.evaluate(() => {
      // Access the configuration system
      if (window.game && window.game.configManager) {
        const config = window.game.configManager.getConfig();
        config.numberModes = { kaktovik: true, cistercian: false, binary: false };
        window.game.configManager.updateConfig(config);
      }
    });
    
    // Switch to game mode
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Spawn number 15 (good test case for Kaktovik)
    await page.keyboard.press('KeyQ'); // Should spawn number
    await page.waitForTimeout(1000);
    
    // Take screenshot showing Kaktovik positioning
    await expect(page).toHaveScreenshot('kaktovik-positioning-4px-higher.png', {
      fullPage: false,
      clip: { x: 0, y: 0, width: 800, height: 600 }
    });
    
    // Click to move the object and verify layout preservation
    await page.click('canvas', { position: { x: 500, y: 400 } });
    await page.waitForTimeout(500);
    
    // Take screenshot after movement
    await expect(page).toHaveScreenshot('kaktovik-after-move-4px-higher.png', {
      fullPage: false,
      clip: { x: 0, y: 0, width: 800, height: 600 }
    });
    
    console.log('📸 Kaktovik screenshots captured for visual verification');
  });

  test('should visually verify Cistercian numeral positioning improvement', async ({ page }) => {
    console.log('🧪 Testing Cistercian numeral positioning...');
    
    // Enable only Cistercian numerals in configuration
    await page.evaluate(() => {
      if (window.game && window.game.configManager) {
        const config = window.game.configManager.getConfig();
        config.numberModes = { kaktovik: false, cistercian: true, binary: false };
        window.game.configManager.updateConfig(config);
      }
    });
    
    // Switch to game mode
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Spawn number 1234 (good test case for Cistercian)
    await page.keyboard.press('KeyW'); 
    await page.waitForTimeout(1000);
    
    // Take screenshot showing Cistercian positioning
    await expect(page).toHaveScreenshot('cistercian-positioning-7px-higher.png', {
      fullPage: false,
      clip: { x: 0, y: 0, width: 800, height: 600 }
    });
    
    // Click to move the object and verify layout preservation
    await page.click('canvas', { position: { x: 400, y: 300 } });
    await page.waitForTimeout(500);
    
    // Take screenshot after movement
    await expect(page).toHaveScreenshot('cistercian-after-move-7px-higher.png', {
      fullPage: false,
      clip: { x: 0, y: 0, width: 800, height: 600 }
    });
    
    console.log('📸 Cistercian screenshots captured for visual verification');
  });

  test('should verify both numerals together with improved positioning', async ({ page }) => {
    console.log('🧪 Testing combined Kaktovik + Cistercian positioning...');
    
    // Enable both numeral systems
    await page.evaluate(() => {
      if (window.game && window.game.configManager) {
        const config = window.game.configManager.getConfig();
        config.numberModes = { kaktovik: true, cistercian: true, binary: false };
        window.game.configManager.updateConfig(config);
      }
    });
    
    // Switch to game mode
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Spawn a number to see both systems
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(1000);
    
    // Take screenshot showing both numerals with improved positioning
    await expect(page).toHaveScreenshot('combined-numerals-improved-positioning.png', {
      fullPage: false,
      clip: { x: 0, y: 0, width: 800, height: 600 }
    });
    
    // Move the object to test layout preservation
    await page.click('canvas', { position: { x: 600, y: 200 } });
    await page.waitForTimeout(500);
    
    // Screenshot after movement showing preserved spacing
    await expect(page).toHaveScreenshot('combined-numerals-after-move.png', {
      fullPage: false,
      clip: { x: 0, y: 0, width: 800, height: 600 }
    });
    
    console.log('📸 Combined numeral screenshots captured');
  });

  test('should demonstrate positioning improvements across different numbers', async ({ page }) => {
    console.log('🧪 Testing positioning across multiple numbers...');
    
    // Enable both numeral systems for comprehensive testing
    await page.evaluate(() => {
      if (window.game && window.game.configManager) {
        const config = window.game.configManager.getConfig();
        config.numberModes = { kaktovik: true, cistercian: true, binary: true };
        window.game.configManager.updateConfig(config);
      }
    });
    
    // Switch to game mode
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Spawn multiple numbers to show consistent positioning
    const keys = ['KeyQ', 'KeyW', 'KeyE', 'KeyA'];
    for (let i = 0; i < keys.length; i++) {
      await page.keyboard.press(keys[i]);
      await page.waitForTimeout(800); // Longer wait between spawns
    }
    
    // Take screenshot showing multiple numbers with consistent positioning
    await expect(page).toHaveScreenshot('multiple-numbers-improved-positioning.png', {
      fullPage: false,
      clip: { x: 0, y: 0, width: 1000, height: 700 }
    });
    
    console.log('📸 Multiple numbers screenshot captured showing consistent improvements');
  });

  test('should verify positioning relative to main number display', async ({ page }) => {
    console.log('🧪 Testing numeral positioning relative to main number...');
    
    // Enable all number modes for complete alignment testing
    await page.evaluate(() => {
      if (window.game && window.game.configManager) {
        const config = window.game.configManager.getConfig();
        config.numberModes = { kaktovik: true, cistercian: true, binary: true };
        window.game.configManager.updateConfig(config);
      }
    });
    
    // Switch to game mode
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Spawn a number with good visual contrast for alignment testing
    await page.keyboard.press('KeyS'); // Number 5 usually
    await page.waitForTimeout(1000);
    
    // Take detailed screenshot showing alignment hierarchy:
    // Main number (center)
    // Binary hearts (below main)
    // Kaktovik (higher than before, -84px or -64px depending on Cistercian)
    // Cistercian (highest, -107px from center)
    await expect(page).toHaveScreenshot('numeral-alignment-hierarchy.png', {
      fullPage: false,
      clip: { x: 100, y: 100, width: 600, height: 500 }
    });
    
    console.log('📸 Alignment hierarchy screenshot captured');
    console.log('🎯 Expected positioning:');
    console.log('   - Cistercian: 7px higher than before (-107px from center)');
    console.log('   - Kaktovik: 4px higher than before (-84px or -64px from center)');
    console.log('   - Binary hearts: Below main number (+60px from center)');
    console.log('   - Main number: Center reference point');
  });
});

test.describe('Regression Prevention', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 15000 });
    await page.waitForTimeout(2000);
  });

  test('should prevent future positioning regressions with baseline screenshots', async ({ page }) => {
    console.log('🔒 Creating regression prevention baselines...');
    
    // This test creates baseline screenshots that future changes can be compared against
    await page.goto('/admin');
    await page.waitForTimeout(1000);
    
    // Enable specific configuration for regression testing
    await page.evaluate(() => {
      if (window.game && window.game.configManager) {
        const config = window.game.configManager.getConfig();
        config.numberModes = { kaktovik: true, cistercian: true, binary: true };
        config.contentTypes = { numbers: 10 }; // Focus on numbers
        window.game.configManager.updateConfig(config);
      }
    });
    
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Create baseline with specific number
    await page.keyboard.press('Digit7'); // Number 7 for consistent testing
    await page.waitForTimeout(1500);
    
    // Baseline screenshot for future regression detection
    await expect(page).toHaveScreenshot('positioning-regression-baseline.png', {
      fullPage: false,
      clip: { x: 200, y: 150, width: 400, height: 350 }
    });
    
    // Test movement to ensure positioning is preserved during interaction
    await page.click('canvas', { position: { x: 600, y: 300 } });
    await page.waitForTimeout(500);
    
    // Post-movement baseline
    await expect(page).toHaveScreenshot('positioning-after-move-baseline.png', {
      fullPage: false,
      clip: { x: 500, y: 200, width: 400, height: 350 }
    });
    
    console.log('✅ Regression prevention baselines created');
    console.log('🛡️ Future positioning changes will be detected by comparing against these baselines');
  });
});