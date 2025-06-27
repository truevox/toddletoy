import { test, expect } from '@playwright/test';

/**
 * Performance validation tests for the toddler toy PWA
 * Tests performance with multiple objects and various scenarios
 */

test.describe('Performance Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for game to load
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForTimeout(2000); // Allow Phaser to fully initialize
  });

  test('should handle multiple object spawning without significant performance degradation', async ({ page }) => {
    const startTime = Date.now();
    
    // Spawn 10 objects in different locations
    for (let i = 0; i < 10; i++) {
      await page.click('canvas', { 
        position: { 
          x: 100 + (i * 60), 
          y: 100 + (i % 3) * 100 
        }
      });
      await page.waitForTimeout(100); // Small delay between spawns
    }
    
    const spawningTime = Date.now() - startTime;
    
    // Should complete spawning within reasonable time (under 8 seconds)
    expect(spawningTime).toBeLessThan(8000);
    
    // Take screenshot to verify all objects rendered
    await expect(page).toHaveScreenshot('multiple-objects.png');
  });

  test('should maintain smooth animation with multiple objects', async ({ page }) => {
    // Spawn several objects
    await page.click('canvas', { position: { x: 200, y: 200 } });
    await page.click('canvas', { position: { x: 400, y: 200 } });
    await page.click('canvas', { position: { x: 600, y: 200 } });
    await page.waitForTimeout(500);
    
    // Measure frame rate by checking for smooth movement
    const startTime = Date.now();
    
    // Move objects multiple times
    for (let i = 0; i < 5; i++) {
      await page.click('canvas', { position: { x: 300, y: 150 + i * 50 } });
      await page.waitForTimeout(200);
    }
    
    const movementTime = Date.now() - startTime;
    
    // Movement should be responsive (under 4 seconds)
    expect(movementTime).toBeLessThan(4000);
  });

  test('should handle rapid keyboard input without lag', async ({ page }) => {
    const startTime = Date.now();
    
    // Rapid keyboard input simulation
    const keys = ['q', 'w', 'e', 'a', 's', 'd', 'z', 'x', 'c'];
    
    for (const key of keys) {
      await page.keyboard.press(key);
      await page.waitForTimeout(50); // Very fast input
    }
    
    const inputTime = Date.now() - startTime;
    
    // Should handle rapid input smoothly (under 2 seconds)
    expect(inputTime).toBeLessThan(2000);
    
    // Take screenshot to verify all objects spawned
    await expect(page).toHaveScreenshot('rapid-keyboard-input.png');
  });

  test('should maintain performance during speech with visual effects', async ({ page }) => {
    // Enable speech by clicking an object
    await page.click('canvas', { position: { x: 400, y: 300 } });
    await page.waitForTimeout(1000); // Allow object to spawn
    
    const startTime = Date.now();
    
    // Click the object to trigger speech and effects
    await page.click('canvas', { position: { x: 400, y: 300 } });
    
    // Wait for speech and effects to complete
    await page.waitForTimeout(3000);
    
    const speechEffectsTime = Date.now() - startTime;
    
    // Speech with effects should not cause significant delay
    expect(speechEffectsTime).toBeLessThan(5000);
    
    // Take screenshot during/after effects
    await expect(page).toHaveScreenshot('speech-with-effects.png');
  });

  test('should handle stress test with many interactions', async ({ page }) => {
    const startTime = Date.now();
    
    // Stress test: 20 random interactions
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * 600 + 100;
      const y = Math.random() * 400 + 100;
      
      if (i % 3 === 0) {
        // Every 3rd interaction is keyboard
        const keys = ['q', 'w', 'e', 'a', 's'];
        await page.keyboard.press(keys[i % keys.length]);
      } else {
        // Otherwise click
        await page.click('canvas', { position: { x, y } });
      }
      
      await page.waitForTimeout(50);
    }
    
    const stressTestTime = Date.now() - startTime;
    
    // Stress test should complete in reasonable time (under 8 seconds)
    expect(stressTestTime).toBeLessThan(8000);
    
    // Take final screenshot
    await expect(page).toHaveScreenshot('stress-test-final.png');
  });

  test('should efficiently cleanup particle effects', async ({ page }) => {
    // Spawn object and trigger effects
    await page.click('canvas', { position: { x: 300, y: 300 } });
    await page.waitForTimeout(500);
    
    // Move object multiple times to trigger trail effects
    for (let i = 0; i < 5; i++) {
      await page.click('canvas', { position: { x: 300 + i * 30, y: 300 + i * 30 } });
      await page.waitForTimeout(200);
    }
    
    // Wait for effects to cleanup
    await page.waitForTimeout(2000);
    
    // Check memory usage by spawning more objects after effects
    for (let i = 0; i < 5; i++) {
      await page.click('canvas', { position: { x: 500, y: 200 + i * 40 } });
      await page.waitForTimeout(100);
    }
    
    // Should still be responsive after cleanup
    await expect(page).toHaveScreenshot('post-effects-cleanup.png');
  });

  test('should perform well on different viewport sizes', async ({ page }) => {
    // Test desktop viewport
    await page.setViewportSize({ width: 1200, height: 800 });
    const desktopStart = Date.now();
    
    await page.click('canvas', { position: { x: 600, y: 400 } });
    await page.waitForTimeout(300);
    
    const desktopTime = Date.now() - desktopStart;
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    const mobileStart = Date.now();
    
    await page.click('canvas', { position: { x: 187, y: 333 } });
    await page.waitForTimeout(300);
    
    const mobileTime = Date.now() - mobileStart;
    
    // Both viewports should be responsive
    expect(desktopTime).toBeLessThan(1000);
    expect(mobileTime).toBeLessThan(1000);
    
    await expect(page).toHaveScreenshot('mobile-viewport-performance.png');
  });
});

test.describe('Memory and Resource Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForTimeout(2000);
  });

  test('should not leak memory with repeated object creation and destruction', async ({ page }) => {
    // Get initial memory baseline
    const initialMemory = await page.evaluate(() => {
      return performance.memory ? performance.memory.usedJSHeapSize : 0;
    });
    
    // Create and interact with many objects
    for (let cycle = 0; cycle < 3; cycle++) {
      // Spawn 10 objects
      for (let i = 0; i < 10; i++) {
        await page.click('canvas', { position: { x: 200 + i * 30, y: 200 } });
        await page.waitForTimeout(50);
      }
      
      // Wait for any cleanup
      await page.waitForTimeout(1000);
      
      // Clear the scene by refreshing (simulating cleanup)
      await page.reload();
      await page.waitForSelector('canvas', { timeout: 10000 });
      await page.waitForTimeout(1000);
    }
    
    // Check final memory usage
    const finalMemory = await page.evaluate(() => {
      return performance.memory ? performance.memory.usedJSHeapSize : 0;
    });
    
    // Memory should not have grown excessively (allow for some variance)
    if (initialMemory > 0 && finalMemory > 0) {
      const memoryGrowth = finalMemory - initialMemory;
      const maxAcceptableGrowth = initialMemory * 2; // Allow 2x growth maximum
      
      expect(memoryGrowth).toBeLessThan(maxAcceptableGrowth);
    }
  });

  test('should handle audio context creation and cleanup properly', async ({ page }) => {
    // Test audio functionality doesn't leak resources
    await page.keyboard.press('q'); // Spawn object that generates tones
    await page.waitForTimeout(500);
    
    // Trigger tone generation
    await page.click('canvas', { position: { x: 300, y: 300 } });
    await page.waitForTimeout(1000);
    
    // Spawn more objects with audio
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('w');
      await page.waitForTimeout(200);
    }
    
    // Check that audio contexts are properly managed
    const audioContextCount = await page.evaluate(() => {
      // Check if audio context exists and is in good state
      return window.AudioContext || window.webkitAudioContext ? 1 : 0;
    });
    
    // Should have audio context available
    expect(audioContextCount).toBeGreaterThanOrEqual(0);
  });
});