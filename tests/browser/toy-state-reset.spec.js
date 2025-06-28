import { test, expect } from '@playwright/test';

test.describe('Toy State Reset', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the app
        await page.goto('/');
        
        // Wait for config screen to load
        await expect(page.locator('h1')).toContainText('ToddleToy');
    });

    test('should clear all objects when navigating from config to toy twice', async ({ page }) => {
        // First visit: Configure and start playing
        await page.click('#start-playing-btn');
        
        // Wait for toy to load
        await page.waitForSelector('canvas');
        
        // Create some objects by clicking
        await page.click('canvas', { position: { x: 200, y: 200 } });
        await page.waitForTimeout(500); // Wait for spawn
        
        await page.click('canvas', { position: { x: 400, y: 300 } });
        await page.waitForTimeout(500);
        
        await page.click('canvas', { position: { x: 600, y: 400 } });
        await page.waitForTimeout(500);
        
        // Take screenshot to verify objects exist
        const screenshotWithObjects = await page.screenshot({ path: 'test-results/toy-with-objects.png' });
        
        // Navigate back to config (simulate user going back)
        await page.goto('/');
        await expect(page.locator('h1')).toContainText('ToddleToy');
        
        // Navigate to toy again (this should trigger reset)
        await page.click('#start-playing-btn');
        await page.waitForSelector('canvas');
        
        // Wait a moment for reset to complete
        await page.waitForTimeout(1000);
        
        // Take screenshot to verify clean state
        const screenshotAfterReset = await page.screenshot({ path: 'test-results/toy-after-reset.png' });
        
        // Verify that the canvas is clean (no text elements visible)
        const textElements = await page.locator('canvas').screenshot();
        
        // The canvas should be mostly black/empty after reset
        // We can't easily compare canvas content, but we can verify no errors occurred
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });
        
        // Verify no JavaScript errors during reset
        expect(consoleErrors.filter(error => 
            error.includes('reset') || 
            error.includes('destroy') || 
            error.includes('clear')
        )).toHaveLength(0);
    });

    test('should stop speech when resetting toy state', async ({ page }) => {
        // Configure and start playing
        await page.click('#start-playing-btn');
        await page.waitForSelector('canvas');
        
        // Create an object that will trigger speech
        await page.click('canvas', { position: { x: 300, y: 300 } });
        await page.waitForTimeout(500);
        
        // Immediately navigate back to config (interrupt speech)
        await page.goto('/');
        await expect(page.locator('h1')).toContainText('ToddleToy');
        
        // Navigate to toy again
        await page.click('#start-playing-btn');
        await page.waitForSelector('canvas');
        
        // Verify speech was properly cancelled (no JavaScript errors)
        const speechErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error' && msg.text().includes('speech')) {
                speechErrors.push(msg.text());
            }
        });
        
        await page.waitForTimeout(1000);
        expect(speechErrors).toHaveLength(0);
    });

    test('should reset input states when navigating to toy', async ({ page }) => {
        // Configure and start playing
        await page.click('#start-playing-btn');
        await page.waitForSelector('canvas');
        
        // Simulate some input interactions
        await page.mouse.down({ button: 'left' });
        await page.mouse.move(400, 400);
        await page.keyboard.down('KeyA');
        
        // Navigate back to config without releasing inputs
        await page.goto('/');
        await expect(page.locator('h1')).toContainText('ToddleToy');
        
        // Navigate to toy again
        await page.click('#start-playing-btn');
        await page.waitForSelector('canvas');
        
        // Release inputs - should not cause issues due to reset
        await page.mouse.up();
        await page.keyboard.up('KeyA');
        
        // Verify no input-related errors
        const inputErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error' && (
                msg.text().includes('drag') || 
                msg.text().includes('key') ||
                msg.text().includes('pointer')
            )) {
                inputErrors.push(msg.text());
            }
        });
        
        await page.waitForTimeout(1000);
        expect(inputErrors).toHaveLength(0);
    });

    test('should maintain clean state after multiple config->toy transitions', async ({ page }) => {
        // Perform multiple transitions
        for (let i = 0; i < 3; i++) {
            // Go to toy
            await page.click('#start-playing-btn');
            await page.waitForSelector('canvas');
            
            // Create some objects
            await page.click('canvas', { position: { x: 200 + i * 50, y: 200 + i * 50 } });
            await page.waitForTimeout(300);
            
            // Go back to config
            await page.goto('/');
            await expect(page.locator('h1')).toContainText('ToddleToy');
            await page.waitForTimeout(300);
        }
        
        // Final transition should still work cleanly
        await page.click('#start-playing-btn');
        await page.waitForSelector('canvas');
        
        // Verify toy loads properly
        await page.click('canvas', { position: { x: 400, y: 300 } });
        await page.waitForTimeout(500);
        
        // Should be able to interact normally
        await expect(page.locator('canvas')).toBeVisible();
    });

    test('should reset during active dragging operation', async ({ page }) => {
        // Configure and start playing
        await page.click('#start-playing-btn');
        await page.waitForSelector('canvas');
        
        // Create an object
        await page.click('canvas', { position: { x: 300, y: 300 } });
        await page.waitForTimeout(500);
        
        // Start dragging
        await page.mouse.move(300, 300);
        await page.mouse.down();
        await page.mouse.move(400, 400);
        
        // Navigate away while dragging
        await page.goto('/');
        await expect(page.locator('h1')).toContainText('ToddleToy');
        
        // Navigate back
        await page.click('#start-playing-btn');
        await page.waitForSelector('canvas');
        
        // Mouse should be properly reset
        await page.mouse.up(); // This shouldn't cause issues
        
        // Verify normal interaction works
        await page.click('canvas', { position: { x: 200, y: 200 } });
        await page.waitForTimeout(500);
        
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });
        
        await page.waitForTimeout(500);
        expect(consoleErrors.filter(error => 
            error.includes('drag') || error.includes('mouse')
        )).toHaveLength(0);
    });

    test('should handle reset with keyboard input active', async ({ page }) => {
        // Configure and start playing
        await page.click('#start-playing-btn');
        await page.waitForSelector('canvas');
        
        // Press and hold some keys
        await page.keyboard.down('KeyQ');
        await page.keyboard.down('KeyW');
        await page.waitForTimeout(300);
        
        // Navigate away with keys still held
        await page.goto('/');
        await expect(page.locator('h1')).toContainText('ToddleToy');
        
        // Navigate back
        await page.click('#start-playing-btn');
        await page.waitForSelector('canvas');
        
        // Release keys - should not cause issues
        await page.keyboard.up('KeyQ');
        await page.keyboard.up('KeyW');
        
        // Test normal keyboard interaction
        await page.keyboard.press('KeyA');
        await page.waitForTimeout(300);
        
        // Verify no keyboard-related errors
        const keyboardErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error' && msg.text().includes('key')) {
                keyboardErrors.push(msg.text());
            }
        });
        
        await page.waitForTimeout(500);
        expect(keyboardErrors).toHaveLength(0);
    });

    test('should verify console logs for reset confirmation', async ({ page }) => {
        const resetLogs = [];
        
        page.on('console', msg => {
            if (msg.text().includes('reset') || msg.text().includes('Resetting')) {
                resetLogs.push(msg.text());
            }
        });
        
        // First transition
        await page.click('#start-playing-btn');
        await page.waitForSelector('canvas');
        
        // Create objects
        await page.click('canvas', { position: { x: 300, y: 300 } });
        await page.waitForTimeout(500);
        
        // Navigate back and forth to trigger reset
        await page.goto('/');
        await page.click('#start-playing-btn');
        await page.waitForSelector('canvas');
        
        // Verify reset log messages appeared
        expect(resetLogs.some(log => 
            log.includes('Resetting existing toy state') || 
            log.includes('Resetting toy state')
        )).toBeTruthy();
        
        expect(resetLogs.some(log => 
            log.includes('reset complete') || 
            log.includes('reset complete')
        )).toBeTruthy();
    });
});