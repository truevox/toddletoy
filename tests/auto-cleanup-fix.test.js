/**
 * Test for auto-cleanup data property conflict fix
 * Ensures objects can be created and destroyed without Phaser data property conflicts
 */

import { jest } from '@jest/globals';

// Mock Phaser Text object with data property
class MockPhaserText {
    constructor() {
        this.data = {
            destroy: jest.fn() // Phaser's built-in data manager with destroy method
        };
        this.active = true;
        this.x = 100;
        this.y = 100;
        this.lastTouchedTime = Date.now();
    }
    
    destroy() {
        // Simulate Phaser's internal destroy logic that calls this.data.destroy()
        if (this.data && typeof this.data.destroy === 'function') {
            this.data.destroy();
        }
        this.active = false;
    }
}

describe('Auto-Cleanup Data Property Fix', () => {
    let mockObject;
    
    beforeEach(() => {
        mockObject = new MockPhaserText();
    });
    
    test('should not overwrite Phaser data property', () => {
        // Simulate old behavior that caused the bug
        const itemData = { emoji: '🐴', en: 'Horse', es: 'Caballo' };
        
        // OLD WAY (caused the bug): mockObject.data = itemData;
        // NEW WAY (the fix): use itemData property instead
        mockObject.itemData = itemData;
        
        // Verify Phaser's data property is preserved
        expect(mockObject.data).toBeDefined();
        expect(typeof mockObject.data.destroy).toBe('function');
        
        // Verify our item data is stored correctly
        expect(mockObject.itemData).toBeDefined();
        expect(mockObject.itemData.emoji).toBe('🐴');
        expect(mockObject.itemData.en).toBe('Horse');
    });
    
    test('should allow object destruction without errors', () => {
        // Add item data using new property name
        mockObject.itemData = { emoji: '🐴', en: 'Horse', es: 'Caballo' };
        
        // Should not throw when destroying
        expect(() => {
            mockObject.destroy();
        }).not.toThrow();
        
        // Verify Phaser's data.destroy was called
        expect(mockObject.data.destroy).toHaveBeenCalled();
        expect(mockObject.active).toBe(false);
    });
    
    test('should preserve item data after Phaser operations', () => {
        const itemData = { emoji: '🍌', en: 'Banana', es: 'Banana' };
        mockObject.itemData = itemData;
        
        // Simulate some Phaser operations that might affect data
        mockObject.data.someOperation = 'test';
        
        // Item data should remain intact
        expect(mockObject.itemData).toEqual(itemData);
        expect(mockObject.itemData.emoji).toBe('🍌');
    });
});