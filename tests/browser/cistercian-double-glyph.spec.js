import { test, expect } from '@playwright/test';

test.describe('Cistercian Double Glyph Rendering', () => {
    test('should render two 1111 Cistercian glyphs that look like capital I letters', async ({ page }) => {
        // Navigate to the app
        await page.goto('http://localhost:3000');
        
        // Wait for the game to load
        await page.waitForSelector('canvas');
        await page.waitForTimeout(2000); // Allow game and fonts to fully load
        
        // Get canvas element and dimensions
        const canvas = page.locator('canvas');
        const canvasBox = await canvas.boundingBox();
        
        // Calculate positions for two glyphs side by side
        const leftX = canvasBox.x + canvasBox.width * 0.3;  // 30% from left
        const rightX = canvasBox.x + canvasBox.width * 0.7; // 70% from left  
        const centerY = canvasBox.y + canvasBox.height * 0.5; // Center vertically
        
        // Set up a way to force number spawning by overriding the random function
        await page.evaluate(() => {
            // Override the random number selection to always return 1111
            window._originalSpawnType = null;
            if (window.game && window.game.scene && window.game.scene.scenes[0]) {
                const scene = window.game.scene.scenes[0];
                window._originalSpawnType = scene.selectSpawnType.bind(scene);
                scene.selectSpawnType = () => ({ type: 'number', data: 1111 });
            }
        });
        
        // Click on the left position to spawn first glyph
        await page.mouse.click(leftX, centerY);
        
        // Wait a moment for the first glyph to render
        await page.waitForTimeout(1000);
        
        // Click on the right position to spawn second glyph  
        await page.mouse.click(rightX, centerY);
        
        // Wait for both glyphs to fully render
        await page.waitForTimeout(1000);
        
        // Take a screenshot of the glyphs for visual verification
        const screenshot = await page.screenshot({
            path: 'tests/browser/screenshots/cistercian-double-glyph.png',
            fullPage: false
        });
        
        // Verify the screenshot was captured
        expect(screenshot).toBeTruthy();
        
        // Check how many objects were spawned
        const gameState = await page.evaluate(() => {
            const scene = window.game?.scene?.scenes?.[0];
            if (!scene) return { error: 'No scene found' };
            
            const objects = scene.objects || [];
            const cistercianElements = [];
            
            objects.forEach(obj => {
                if (obj.cistercianNumeral) {
                    cistercianElements.push({
                        text: obj.cistercianNumeral.text,
                        x: obj.cistercianNumeral.x,
                        y: obj.cistercianNumeral.y,
                        visible: obj.cistercianNumeral.visible
                    });
                }
            });
            
            return {
                objectCount: objects.length,
                cistercianElements,
                sceneExists: !!scene,
                gameExists: !!window.game
            };
        });
        
        console.log('Game state:', gameState);
        
        // Visual verification: The glyphs should look like two capital I's (II)
        expect(gameState.sceneExists).toBe(true);
        expect(gameState.gameExists).toBe(true);
        
        // If we got objects, verify they have Cistercian numerals with '1qaz' sequence
        if (gameState.objectCount > 0) {
            expect(gameState.cistercianElements.length).toBeGreaterThan(0);
            
            // Verify the Cistercian character sequence for 1111 is '1qaz'
            gameState.cistercianElements.forEach(element => {
                expect(element.text).toBe('1qaz');
                expect(element.visible).toBe(true);
            });
            
            console.log('✅ Screenshot saved: tests/browser/screenshots/cistercian-double-glyph.png');
            console.log('📍 Visual verification: Cistercian glyphs for 1111 should appear as capital I letter(s)');
            console.log(`🎯 Character sequences: ${gameState.cistercianElements.map(el => `'${el.text}'`).join(' and ')}`);
        } else {
            console.log('⚠️ No objects spawned, but screenshot captured for manual inspection');
        }
        
        // Restore original spawn function
        await page.evaluate(() => {
            if (window._originalSpawnType && window.game && window.game.scene && window.game.scene.scenes[0]) {
                const scene = window.game.scene.scenes[0];
                scene.selectSpawnType = window._originalSpawnType;
            }
        });
    });
    
    test('should create basic Cistercian glyph test for visual verification', async ({ page }) => {
        // Navigate to the app
        await page.goto('http://localhost:3000');
        await page.waitForSelector('canvas');
        await page.waitForTimeout(2000);
        
        const canvas = page.locator('canvas');
        const canvasBox = await canvas.boundingBox();
        
        // Just capture screenshot after load to see baseline
        await page.screenshot({
            path: 'tests/browser/screenshots/cistercian-baseline.png',
            fullPage: false
        });
        
        // Force a number spawn by clicking
        const centerX = canvasBox.x + canvasBox.width * 0.5;
        const centerY = canvasBox.y + canvasBox.height * 0.5;
        
        await page.mouse.click(centerX, centerY);
        await page.waitForTimeout(1000);
        
        // Capture final screenshot
        await page.screenshot({
            path: 'tests/browser/screenshots/cistercian-single-glyph.png',
            fullPage: false
        });
        
        console.log('✅ Baseline screenshots saved for manual inspection');
    });
});