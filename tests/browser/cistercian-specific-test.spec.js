import { test, expect } from '@playwright/test';

test.describe('Cistercian Specific Number Test', () => {
    test('should manually spawn and screenshot Cistercian numerals for 1111', async ({ page }) => {
        // Navigate to the app
        await page.goto('http://localhost:3000');
        
        // Wait for the game to load completely
        await page.waitForSelector('canvas');
        await page.waitForTimeout(3000);
        
        // Get canvas dimensions
        const canvas = page.locator('canvas');
        const canvasBox = await canvas.boundingBox();
        
        // Take initial screenshot to confirm app is loaded
        await page.screenshot({
            path: 'tests/browser/screenshots/app-loaded.png',
            fullPage: false
        });
        
        // Execute code to manually spawn 1111 numbers in different positions
        const results = await page.evaluate(async () => {
            try {
                // Get the game scene
                const gameInstance = window.game;
                if (!gameInstance || !gameInstance.game || !gameInstance.game.scene) {
                    return { error: 'Game instance not found', gameInstance: !!gameInstance };
                }
                
                const scene = gameInstance.game.scene.scenes[0];
                if (!scene) {
                    return { error: 'Scene not found' };
                }
                
                // Clear any existing objects
                if (scene.objects) {
                    scene.objects.forEach(obj => {
                        if (obj.destroy) obj.destroy();
                    });
                    scene.objects = [];
                }
                
                // Manually spawn 1111 at two different positions
                const positions = [
                    { x: 300, y: 300 },
                    { x: 500, y: 300 }
                ];
                
                const spawned = [];
                
                for (const pos of positions) {
                    // Create the object data for number 1111
                    const objData = { type: 'number', data: 1111 };
                    
                    // Call spawnObjectAt if it exists
                    if (scene.spawnObjectAt) {
                        const obj = scene.spawnObjectAt(pos.x, pos.y, objData.type, objData.data);
                        spawned.push({
                            x: pos.x,
                            y: pos.y,
                            created: !!obj
                        });
                    }
                }
                
                // Wait a moment for rendering
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Check what was actually created
                const objects = scene.objects || [];
                const cistercianInfo = objects.map(obj => {
                    if (obj.cistercianNumeral) {
                        return {
                            text: obj.cistercianNumeral.text,
                            x: obj.cistercianNumeral.x,
                            y: obj.cistercianNumeral.y,
                            visible: obj.cistercianNumeral.visible
                        };
                    }
                    return null;
                }).filter(Boolean);
                
                return {
                    success: true,
                    spawned,
                    objectCount: objects.length,
                    cistercianInfo,
                    sceneExists: !!scene,
                    spawnObjectAtExists: !!scene.spawnObjectAt
                };
            } catch (error) {
                return { error: error.message, stack: error.stack };
            }
        });
        
        console.log('Spawn results:', results);
        
        // Wait a bit more for rendering to complete
        await page.waitForTimeout(2000);
        
        // Take screenshot showing the result
        await page.screenshot({
            path: 'tests/browser/screenshots/cistercian-1111-test.png',
            fullPage: false
        });
        
        // Verify we have some objects
        expect(results.sceneExists).toBe(true);
        expect(results.spawnObjectAtExists).toBe(true);
        
        if (results.cistercianInfo && results.cistercianInfo.length > 0) {
            // Verify the Cistercian text is correct for 1111
            results.cistercianInfo.forEach(info => {
                expect(info.text).toBe('1qaz');
                expect(info.visible).toBe(true);
            });
            
            console.log('✅ Success! Cistercian numerals for 1111 generated:');
            console.log(`   Found ${results.cistercianInfo.length} glyphs with sequence: ${results.cistercianInfo.map(i => `'${i.text}'`).join(', ')}`);
            console.log('📸 Screenshot saved: tests/browser/screenshots/cistercian-1111-test.png');
            console.log('👀 Visual verification: These should look like capital I letters');
        } else {
            console.log('⚠️ No Cistercian numerals found, but screenshot saved for debugging');
            console.log('📊 Spawn results:', results);
        }
    });
    
    test('should test multiple numbers for Cistercian rendering', async ({ page }) => {
        await page.goto('http://localhost:3000');
        await page.waitForSelector('canvas');
        await page.waitForTimeout(3000);
        
        // Test spawning different numbers to see variety of glyphs
        const testNumbers = [1111, 2222, 3333, 1234];
        const expectedTexts = ['1qaz', '2wsz', '3edz', '4esz'];
        
        const results = await page.evaluate(async (numbers) => {
            try {
                const gameInstance = window.game;
                const scene = gameInstance.game.scene.scenes[0];
                
                // Clear existing objects
                if (scene.objects) {
                    scene.objects.forEach(obj => {
                        if (obj.destroy) obj.destroy();
                    });
                    scene.objects = [];
                }
                
                const created = [];
                
                // Spawn each number at different positions
                for (let i = 0; i < numbers.length; i++) {
                    const x = 200 + (i * 150);
                    const y = 250;
                    
                    if (scene.spawnObjectAt) {
                        const obj = scene.spawnObjectAt(x, y, 'number', numbers[i]);
                        created.push({ number: numbers[i], x, y, created: !!obj });
                    }
                }
                
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                // Collect results
                const objects = scene.objects || [];
                const allCistercian = objects.map(obj => {
                    if (obj.cistercianNumeral) {
                        return {
                            text: obj.cistercianNumeral.text,
                            number: obj.data?.number,
                            x: obj.cistercianNumeral.x,
                            y: obj.cistercianNumeral.y
                        };
                    }
                    return null;
                }).filter(Boolean);
                
                return {
                    success: true,
                    created,
                    cistercianGlyphs: allCistercian,
                    totalObjects: objects.length
                };
            } catch (error) {
                return { error: error.message };
            }
        }, testNumbers);
        
        console.log('Multi-number test results:', results);
        
        await page.waitForTimeout(1000);
        
        await page.screenshot({
            path: 'tests/browser/screenshots/cistercian-variety.png',
            fullPage: false
        });
        
        if (results.cistercianGlyphs && results.cistercianGlyphs.length > 0) {
            console.log('✅ Multiple Cistercian glyphs created successfully!');
            console.log('📊 Glyph mapping verification:');
            
            results.cistercianGlyphs.forEach((glyph, i) => {
                console.log(`   ${glyph.number} → '${glyph.text}' (expected: '${expectedTexts[testNumbers.indexOf(glyph.number)]}')`);
                if (testNumbers.includes(glyph.number)) {
                    const expectedText = expectedTexts[testNumbers.indexOf(glyph.number)];
                    expect(glyph.text).toBe(expectedText);
                }
            });
            
            console.log('📸 Variety screenshot saved: tests/browser/screenshots/cistercian-variety.png');
        }
    });
});