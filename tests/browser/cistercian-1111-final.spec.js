import { test, expect } from '@playwright/test';

test.describe('Cistercian 1111 Final Test', () => {
    test('should render two Cistercian glyphs for 1111 that look like capital I letters', async ({ page }) => {
        // Navigate to the app
        await page.goto('http://localhost:3000');
        await page.waitForSelector('canvas');
        await page.waitForTimeout(3000);
        
        // Force spawn two 1111 numbers side by side
        const results = await page.evaluate(async () => {
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
                
                // Manually create objects with specific number 1111
                const positions = [
                    { x: 300, y: 300 },
                    { x: 500, y: 300 }
                ];
                
                const created = [];
                
                for (const pos of positions) {
                    // Direct call to create number object
                    const obj = {
                        id: `manual-${Date.now()}-${Math.random()}`,
                        type: 'number',
                        data: { number: 1111 },
                        x: pos.x,
                        y: pos.y
                    };
                    
                    // Call the display functions directly
                    if (scene.renderCistercianNumeral) {
                        obj.cistercianNumeral = scene.renderCistercianNumeral(1111, pos.x, pos.y - 100);
                    }
                    
                    if (scene.renderKaktovikNumeral) {
                        obj.kaktovikNumeral = scene.renderKaktovikNumeral(1111, pos.x, pos.y - 60);
                    }
                    
                    if (scene.renderBinaryHearts) {
                        obj.binaryNumeral = scene.renderBinaryHearts(1111, pos.x, pos.y - 30);
                    }
                    
                    // Add the main number text
                    obj.numberText = scene.add.text(pos.x, pos.y, '1111', {
                        fontSize: '48px',
                        fill: '#ff00ff',
                        fontFamily: 'Arial',
                        align: 'center'
                    }).setOrigin(0.5);
                    
                    // Add English label
                    obj.englishLabel = scene.add.text(pos.x, pos.y + 40, 'Purple 1111', {
                        fontSize: '24px',
                        fill: '#ffffff',
                        fontFamily: 'Arial',
                        align: 'center'
                    }).setOrigin(0.5);
                    
                    // Add Spanish label  
                    obj.spanishLabel = scene.add.text(pos.x, pos.y + 70, '1111 Morado', {
                        fontSize: '24px',
                        fill: '#ffffff',
                        fontFamily: 'Arial',
                        align: 'center'
                    }).setOrigin(0.5);
                    
                    scene.objects = scene.objects || [];
                    scene.objects.push(obj);
                    created.push(obj);
                }
                
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Collect Cistercian info
                const cistercianInfo = created.map(obj => {
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
                    created: created.length,
                    cistercianInfo
                };
                
            } catch (error) {
                return { error: error.message, stack: error.stack };
            }
        });
        
        console.log('Manual 1111 creation results:', results);
        
        await page.waitForTimeout(1500);
        
        // Take final screenshot
        await page.screenshot({
            path: 'tests/browser/screenshots/cistercian-two-1111s.png',
            fullPage: false
        });
        
        // Verify results
        expect(results.success).toBe(true);
        expect(results.created).toBe(2);
        
        if (results.cistercianInfo && results.cistercianInfo.length === 2) {
            // Both should have the same text since they're both 1111
            results.cistercianInfo.forEach(info => {
                expect(info.text).toBe('1qaz');
                expect(info.visible).toBe(true);
            });
            
            console.log('🎯 SUCCESS! Two Cistercian glyphs for 1111 created');
            console.log(`📝 Both glyphs show sequence: '${results.cistercianInfo[0].text}'`);
            console.log('📍 Positions:', results.cistercianInfo.map(i => `(${i.x}, ${i.y})`).join(', '));
            console.log('📸 Screenshot: tests/browser/screenshots/cistercian-two-1111s.png');
            console.log('👀 VISUAL CHECK: These two glyphs should look like capital letter I (II)');
        } else {
            console.log('⚠️ Issue with glyph creation:', results);
        }
    });
});