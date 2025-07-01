// @ts-check
const { test, expect } = require('@playwright/test');

test('Debug click input events in live application', async ({ page }) => {
  // Navigate to the application
  await page.goto('http://localhost:4001');
  
  // Wait for the config screen to appear
  await page.waitForSelector('.config-screen', { timeout: 10000 });
  
  // Click the green "Start Playing" button
  await page.click('button:has-text("Start Playing")');
  
  // Wait for the game canvas to appear
  await page.waitForSelector('canvas', { timeout: 10000 });
  
  // Set up console log capture
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push(`${msg.type()}: ${msg.text()}`);
  });
  
  // Wait a moment for game to fully initialize
  await page.waitForTimeout(2000);
  
  console.log('\n🎯 INITIALIZATION LOGS:');
  consoleLogs.forEach(log => {
    if (log.includes('InputManager') || log.includes('TODDLER TOY') || log.includes('Game managers')) {
      console.log(log);
    }
  });
  
  // Clear previous logs and focus on interaction
  consoleLogs.length = 0;
  
  // Get canvas bounds for clicking in center
  const canvas = await page.locator('canvas');
  const box = await canvas.boundingBox();
  
  console.log('\n🎯 CANVAS INFO:');
  console.log(`Canvas bounds: ${JSON.stringify(box)}`);
  
  // Test 1: Hover over canvas center
  console.log('\n🎯 TESTING HOVER...');
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  
  await page.mouse.move(centerX, centerY);
  await page.waitForTimeout(500);
  
  console.log('\n🎯 HOVER LOGS:');
  consoleLogs.forEach(log => {
    if (log.includes('🎮') || log.includes('PHASER') || log.includes('DOM')) {
      console.log(log);
    }
  });
  
  // Clear logs for click test
  consoleLogs.length = 0;
  
  // Test 2: Click canvas center
  console.log('\n🎯 TESTING CLICK...');
  await page.mouse.click(centerX, centerY);
  await page.waitForTimeout(1000);
  
  console.log('\n🎯 CLICK LOGS:');
  consoleLogs.forEach(log => {
    if (log.includes('🎮') || log.includes('🎯') || log.includes('PHASER') || log.includes('DOM') || log.includes('Spawned')) {
      console.log(log);
    }
  });
  
  // Test 3: Try multiple clicks in different areas
  console.log('\n🎯 TESTING MULTIPLE CLICKS...');
  consoleLogs.length = 0;
  
  await page.mouse.click(centerX - 100, centerY - 100);
  await page.waitForTimeout(200);
  await page.mouse.click(centerX + 100, centerY + 100);
  await page.waitForTimeout(200);
  await page.mouse.click(centerX, centerY - 100);
  await page.waitForTimeout(1000);
  
  console.log('\n🎯 MULTIPLE CLICK LOGS:');
  consoleLogs.forEach(log => {
    if (log.includes('🎮') || log.includes('🎯') || log.includes('PHASER') || log.includes('DOM') || log.includes('Spawned')) {
      console.log(log);
    }
  });
  
  // Final assessment
  const hasInputManagerLogs = consoleLogs.some(log => log.includes('InputManager.onPointerDown'));
  const hasPhaserLogs = consoleLogs.some(log => log.includes('PHASER RECEIVED'));
  const hasDomLogs = consoleLogs.some(log => log.includes('DOM CANVAS'));
  const hasSpawnLogs = consoleLogs.some(log => log.includes('Spawned'));
  
  console.log('\n🎯 FINAL ASSESSMENT:');
  console.log(`DOM Canvas Events: ${hasDomLogs ? '✅' : '❌'}`);
  console.log(`Phaser Events: ${hasPhaserLogs ? '✅' : '❌'}`);
  console.log(`InputManager Events: ${hasInputManagerLogs ? '✅' : '❌'}`);
  console.log(`Object Spawning: ${hasSpawnLogs ? '✅' : '❌'}`);
  
  if (!hasDomLogs) {
    console.log('\n🚨 DIAGNOSIS: Canvas not receiving DOM events - CSS/DOM blocking issue');
  } else if (!hasPhaserLogs) {
    console.log('\n🚨 DIAGNOSIS: DOM events work but Phaser not receiving - Phaser input system issue');
  } else if (!hasInputManagerLogs) {
    console.log('\n🚨 DIAGNOSIS: Phaser events work but InputManager not receiving - Handler binding issue');
  } else if (!hasSpawnLogs) {
    console.log('\n🚨 DIAGNOSIS: Input events work but spawning fails - Game logic issue');
  } else {
    console.log('\n✅ DIAGNOSIS: Everything working correctly');
  }
});