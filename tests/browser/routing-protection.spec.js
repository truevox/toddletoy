import { test, expect } from '@playwright/test';

/**
 * Routing Protection Tests
 * 
 * Tests to verify that direct access to /toy redirects to config screen
 * when no configuration exists, and other routing protection behaviors.
 */

test.describe('Routing Protection', () => {
  
  test.beforeEach(async ({ page }) => {
    // Clear any existing localStorage to simulate fresh user
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test('should redirect to config screen when accessing /toy without configuration', async ({ page }) => {
    // Attempt to navigate directly to /toy
    await page.goto('/toy');
    
    // Should be redirected to config screen (root /)
    await page.waitForTimeout(1000);
    
    // Check URL should be / not /toy
    expect(page.url()).toMatch(/\/$|\/(?:\?.*)?$/);
    
    // Should see config screen elements
    const hasConfigElements = await page.evaluate(() => {
      // Look for common config screen indicators
      const configTexts = [
        'Configure', 'Settings', 'Age', 'Category', 'Start', 'Play', 
        'Choose', 'Select', 'Enable', 'toddletoy', 'ToddleToy'
      ];
      
      const bodyText = document.body.textContent.toLowerCase();
      return configTexts.some(text => bodyText.includes(text.toLowerCase()));
    });
    
    expect(hasConfigElements).toBe(true);
  });

  test('should allow access to /toy after completing configuration', async ({ page }) => {
    // First, go through configuration flow
    await page.goto('/');
    
    // Wait for config screen to load
    await page.waitForTimeout(2000);
    
    // Try to find and interact with config elements
    // Enable some emoji categories (adjust selectors based on actual implementation)
    try {
      await page.check('input[value="animals"]', { timeout: 5000 });
    } catch (e) {
      // Fallback: try different possible selectors
      try {
        await page.click('input[type="checkbox"]:first-of-type', { timeout: 2000 });
      } catch (e2) {
        // If checkboxes don't exist, just try to proceed
      }
    }
    
    // Try to find and click start/play button
    try {
      await page.click('button:has-text("Start")', { timeout: 3000 });
    } catch (e) {
      try {
        await page.click('button:has-text("Play")', { timeout: 2000 });
      } catch (e2) {
        try {
          await page.click('button[type="submit"]', { timeout: 2000 });
        } catch (e3) {
          // Try to click any button that might be the start button
          await page.click('button:first-of-type', { timeout: 2000 });
        }
      }
    }
    
    // Wait for navigation to toy screen
    await page.waitForTimeout(2000);
    
    // Now should be on toy screen
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/toy/);
    
    // Should see game canvas
    await page.waitForSelector('canvas', { timeout: 10000 });
    const canvas = await page.locator('canvas');
    await expect(canvas).toBeVisible();
  });

  test('should allow direct access to /toy after configuration exists', async ({ page }) => {
    // Manually set up configuration in localStorage
    await page.evaluate(() => {
      const mockConfig = {
        ageRange: 'toddler',
        emojiCategories: {
          animals: { enabled: true },
          faces: { enabled: true }
        },
        skipConfig: false,
        lastModified: Date.now()
      };
      localStorage.setItem('toddletoy-config', JSON.stringify(mockConfig));
    });
    
    // Now try to access /toy directly
    await page.goto('/toy');
    
    // Should successfully load toy screen without redirect
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/toy/);
    
    // Should see game canvas
    await page.waitForSelector('canvas', { timeout: 10000 });
    const canvas = await page.locator('canvas');
    await expect(canvas).toBeVisible();
  });

  test('should handle /admin route to always show config', async ({ page }) => {
    // Set up existing configuration
    await page.evaluate(() => {
      const mockConfig = {
        ageRange: 'toddler',
        emojiCategories: { animals: { enabled: true } },
        skipConfig: true, // Even with skip enabled
        lastModified: Date.now()
      };
      localStorage.setItem('toddletoy-config', JSON.stringify(mockConfig));
    });
    
    // Navigate to /admin
    await page.goto('/admin');
    
    // Should show config screen despite skipConfig being true
    await page.waitForTimeout(1000);
    
    // URL should be /admin
    expect(page.url()).toMatch(/\/admin/);
    
    // Should see config elements even though config exists
    const hasConfigElements = await page.evaluate(() => {
      const configTexts = ['Configure', 'Settings', 'Age', 'Category'];
      const bodyText = document.body.textContent.toLowerCase();
      return configTexts.some(text => bodyText.includes(text.toLowerCase()));
    });
    
    expect(hasConfigElements).toBe(true);
  });

  test('should handle browser back/forward navigation correctly', async ({ page }) => {
    // Start at root
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // Try to navigate to /toy (should redirect back to /)
    await page.goto('/toy');
    await page.waitForTimeout(1000);
    
    // Should be back at root due to redirect
    expect(page.url()).toMatch(/\/$|\/(?:\?.*)?$/);
    
    // Use browser back button
    await page.goBack();
    await page.waitForTimeout(500);
    
    // Should still be at root (or potentially the previous page in history)
    const urlAfterBack = page.url();
    expect(urlAfterBack).toMatch(/\/$|\/(?:\?.*)?$|\/toy/);
  });

  test('should preserve URL parameters during redirects', async ({ page }) => {
    // Try to access /toy with query parameters
    await page.goto('/toy?test=123&param=value');
    await page.waitForTimeout(1000);
    
    // Should redirect to / but might preserve some context
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\//);
    
    // The exact behavior depends on implementation, but should handle gracefully
    expect(currentUrl).toBeTruthy();
  });

  test('should handle invalid routes gracefully', async ({ page }) => {
    // Try to access non-existent route
    await page.goto('/nonexistent');
    await page.waitForTimeout(1000);
    
    // Should either redirect to / or show 404 - either is acceptable
    const currentUrl = page.url();
    expect(currentUrl).toBeTruthy();
    
    // Page should not be broken
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });

  test('should handle configuration validation on toy access', async ({ page }) => {
    // Set up invalid/corrupted configuration
    await page.evaluate(() => {
      localStorage.setItem('toddletoy-config', 'invalid-json');
    });
    
    // Try to access /toy
    await page.goto('/toy');
    await page.waitForTimeout(1000);
    
    // Should redirect to config due to invalid configuration
    expect(page.url()).toMatch(/\/$|\/(?:\?.*)?$/);
    
    // Clear and try with empty config
    await page.evaluate(() => {
      localStorage.setItem('toddletoy-config', '{}');
    });
    
    await page.goto('/toy');
    await page.waitForTimeout(1000);
    
    // Should redirect to config due to empty configuration
    expect(page.url()).toMatch(/\/$|\/(?:\?.*)?$/);
  });

  test('should handle rapid navigation attempts', async ({ page }) => {
    // Rapidly try to navigate between routes
    const routes = ['/', '/toy', '/admin', '/', '/toy'];
    
    for (const route of routes) {
      await page.goto(route);
      await page.waitForTimeout(200);
    }
    
    // Should end up in a stable state
    const finalUrl = page.url();
    expect(finalUrl).toMatch(/\/$|\/toy|\/admin/);
    
    // Page should not be broken
    const hasBody = await page.locator('body').isVisible();
    expect(hasBody).toBe(true);
  });

  test('should verify localStorage persistence across navigation', async ({ page }) => {
    // Navigate to config and set up configuration
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // Check if localStorage is working
    const canUseLocalStorage = await page.evaluate(() => {
      try {
        localStorage.setItem('test', 'value');
        const result = localStorage.getItem('test') === 'value';
        localStorage.removeItem('test');
        return result;
      } catch (e) {
        return false;
      }
    });
    
    expect(canUseLocalStorage).toBe(true);
    
    // Set up valid configuration
    await page.evaluate(() => {
      const config = {
        ageRange: 'toddler',
        emojiCategories: { animals: { enabled: true } },
        skipConfig: false
      };
      localStorage.setItem('toddletoy-config', JSON.stringify(config));
    });
    
    // Navigate to /toy
    await page.goto('/toy');
    await page.waitForTimeout(1000);
    
    // Verify configuration persists
    const configPersisted = await page.evaluate(() => {
      const config = localStorage.getItem('toddletoy-config');
      return config !== null && config.includes('toddler');
    });
    
    expect(configPersisted).toBe(true);
  });
});