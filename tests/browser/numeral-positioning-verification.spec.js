import { test, expect } from '@playwright/test';

/**
 * Comprehensive numeral positioning verification
 * Tests the recent positioning improvements: Kaktovik (4px higher) and Cistercian (7px higher)
 * 
 * This test suite provides:
 * 1. Visual screenshots for manual verification
 * 2. Automated regression prevention
 * 3. Cross-browser positioning validation
 */

test.describe('Numeral Positioning Verification', () => {
  test.beforeEach(async ({ page }) => {
    console.log('🧪 Starting numeral positioning verification...');
    
    // Navigate to config screen
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Click start to go to the toy
    await page.click('button:has-text("START PLAYING")');
    await page.waitForTimeout(1000);
    
    // Wait for canvas to be ready
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    console.log('✅ Game loaded and ready for testing');
  });

  test('should verify improved numeral positioning with visual screenshots', async ({ page }) => {
    console.log('📸 Capturing positioning verification screenshots...');
    
    // Take initial screenshot of empty game
    await expect(page).toHaveScreenshot('numeral-positioning-empty-game.png', {
      fullPage: false,
      clip: { x: 0, y: 0, width: 800, height: 600 }
    });
    
    // Spawn a number to test all numeral systems
    console.log('🔢 Spawning number for positioning test...');
    await page.keyboard.press('5');
    await page.waitForTimeout(1500); // Wait for all rendering to complete
    
    // Take screenshot showing all numeral systems with improved positioning
    await expect(page).toHaveScreenshot('numeral-positioning-with-improvements.png', {
      fullPage: false,
      clip: { x: 0, y: 0, width: 800, height: 600 }
    });
    
    console.log('📋 Expected positioning improvements:');
    console.log('   ✓ Cistercian numerals: 7 pixels higher (Y offset: -107px)');
    console.log('   ✓ Kaktovik numerals: 4 pixels higher (Y offset: -84px or -64px)');
    console.log('   ✓ Binary hearts: Below main number (Y offset: +60px)');
    console.log('   ✓ Main number: Center reference (Y offset: 0px)');
    
    // Test movement to verify layout preservation
    console.log('🖱️ Testing layout preservation during movement...');
    await page.click('canvas', { position: { x: 500, y: 300 } });
    await page.waitForTimeout(800);
    
    // Screenshot after movement to verify preservation
    await expect(page).toHaveScreenshot('numeral-positioning-after-movement.png', {
      fullPage: false,
      clip: { x: 400, y: 200, width: 400, height: 300 }
    });
    
    console.log('✅ Visual verification screenshots captured successfully');
  });

  test('should test positioning across multiple numbers', async ({ page }) => {
    console.log('🔢 Testing positioning consistency across different numbers...');
    
    // Spawn multiple numbers to test positioning consistency
    const keys = ['1', '2', '3', '7', '9'];
    for (const key of keys) {
      await page.keyboard.press(key);
      await page.waitForTimeout(800);
      console.log(`  ✓ Spawned number with key: ${key}`);
    }
    
    // Take screenshot showing multiple numbers with consistent positioning
    await expect(page).toHaveScreenshot('multiple-numbers-positioning-consistency.png', {
      fullPage: false,
      clip: { x: 0, y: 0, width: 1000, height: 700 }
    });
    
    // Move one object to test preservation
    await page.click('canvas', { position: { x: 600, y: 400 } });
    await page.waitForTimeout(500);
    
    // Final screenshot showing moved object with preserved positioning
    await expect(page).toHaveScreenshot('multiple-numbers-after-movement.png', {
      fullPage: false,
      clip: { x: 0, y: 0, width: 1000, height: 700 }
    });
    
    console.log('✅ Multiple numbers positioning test completed');
  });

  test('should verify positioning works with different configurations', async ({ page }) => {
    console.log('⚙️ Testing positioning with different numeral configurations...');
    
    // Test with only Kaktovik enabled
    await page.evaluate(() => {
      if (window.game && window.game.configManager) {
        const config = window.game.configManager.getConfig();
        config.numberModes = { kaktovik: true, cistercian: false, binary: false };
        window.game.configManager.updateConfig(config);
      }
    });
    
    await page.keyboard.press('4');
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveScreenshot('kaktovik-only-positioning.png', {
      fullPage: false,
      clip: { x: 0, y: 0, width: 400, height: 300 }
    });
    
    // Test with only Cistercian enabled
    await page.evaluate(() => {
      if (window.game && window.game.configManager) {
        const config = window.game.configManager.getConfig();
        config.numberModes = { kaktovik: false, cistercian: true, binary: false };
        window.game.configManager.updateConfig(config);
      }
    });
    
    await page.keyboard.press('6');
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveScreenshot('cistercian-only-positioning.png', {
      fullPage: false,
      clip: { x: 0, y: 0, width: 400, height: 300 }
    });
    
    console.log('✅ Configuration-specific positioning tests completed');
  });
});

test.describe('Regression Prevention Baselines', () => {
  test('should create baseline screenshots for future regression detection', async ({ page }) => {
    console.log('🛡️ Creating regression prevention baselines...');
    
    // Navigate and setup
    await page.goto('/');
    await page.waitForTimeout(2000);
    await page.click('button:has-text("START PLAYING")');
    await page.waitForTimeout(1000);
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Enable all numeral systems for comprehensive baseline
    await page.evaluate(() => {
      if (window.game && window.game.configManager) {
        const config = window.game.configManager.getConfig();
        config.numberModes = { kaktovik: true, cistercian: true, binary: true };
        window.game.configManager.updateConfig(config);
      }
    });
    
    // Create baseline with specific number for consistent comparison
    await page.keyboard.press('8');
    await page.waitForTimeout(1500);
    
    // Baseline screenshot for future regression detection
    await expect(page).toHaveScreenshot('positioning-regression-baseline-number-8.png', {
      fullPage: false,
      clip: { x: 300, y: 200, width: 400, height: 300 }
    });
    
    // Test movement baseline
    await page.click('canvas', { position: { x: 600, y: 300 } });
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('positioning-movement-baseline-number-8.png', {
      fullPage: false,
      clip: { x: 500, y: 200, width: 400, height: 300 }
    });
    
    console.log('✅ Regression prevention baselines created');
    console.log('🔒 Future changes to numeral positioning will be detected automatically');
    console.log('📋 Baseline positions (Y offsets from center):');
    console.log('   - Cistercian: -107px (7px improvement)');
    console.log('   - Kaktovik: -84px/-64px (4px improvement)');
    console.log('   - Main number: 0px (reference)');
    console.log('   - Binary hearts: +60px (below main)');
  });
});

test.describe('Visual Quality Assurance', () => {
  test('should verify numeral alignment and readability', async ({ page }) => {
    console.log('👁️ Testing visual quality and alignment...');
    
    await page.goto('/');
    await page.waitForTimeout(2000);
    await page.click('button:has-text("START PLAYING")');
    await page.waitForTimeout(1000);
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Test with a variety of numbers for visual quality
    const testNumbers = ['0', '1', '5', '10', '99', '123', '999'];
    
    for (let i = 0; i < testNumbers.length; i++) {
      // Clear previous objects by refreshing the toy
      if (i > 0) {
        await page.goto('/');
        await page.waitForTimeout(1000);
        await page.click('button:has-text("START PLAYING")');
        await page.waitForTimeout(1000);
        await page.waitForSelector('canvas', { timeout: 10000 });
        await page.waitForTimeout(1000);
      }
      
      // Spawn the test number
      const keys = testNumbers[i].split('');
      for (const key of keys) {
        await page.keyboard.press(key);
        await page.waitForTimeout(200);
      }
      await page.waitForTimeout(1000);
      
      // Take quality assurance screenshot
      await expect(page).toHaveScreenshot(`visual-quality-number-${testNumbers[i]}.png`, {
        fullPage: false,
        clip: { x: 200, y: 150, width: 600, height: 400 }
      });
      
      console.log(`  ✓ Visual quality captured for number: ${testNumbers[i]}`);
    }
    
    console.log('✅ Visual quality assurance completed');
    console.log('📋 Review screenshots to verify:');
    console.log('   - Numerals are properly positioned (not overlapping)');
    console.log('   - Text is clearly readable');
    console.log('   - Spacing is consistent and appealing');
    console.log('   - All numeral systems are properly aligned');
  });
});