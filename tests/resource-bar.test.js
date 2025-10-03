/**
 * @jest-environment jsdom
 */

// Mock Phaser Container class
class MockContainer {
    constructor(scene, x = 0, y = 0) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.list = [];
    }

    add(child) {
        this.list.push(child);
        return this;
    }

    destroy() {
        // Base destroy functionality
    }
}

// Set up global Phaser BEFORE any imports
global.Phaser = {
    GameObjects: {
        Container: MockContainer
    }
};

let ResourceBar;

describe('ResourceBar - Horizontal Resource Display', () => {
    let mockScene;
    let resourceBar;

    beforeAll(async () => {
        // Dynamic import after Phaser is set up
        const module = await import('../src/ui/ResourceBar.js');
        ResourceBar = module.ResourceBar;
    });

    beforeEach(() => {
        // Mock Phaser scene with necessary methods
        mockScene = {
            add: {
                text: jest.fn((x, y, text, style) => ({
                    x,
                    y,
                    text,
                    style,
                    setOrigin: jest.fn().mockReturnThis(),
                    setScale: jest.fn().mockReturnThis(),
                    setPosition: jest.fn(function(newX, newY) {
                        this.x = newX;
                        this.y = newY;
                        return this;
                    }),
                    setVisible: jest.fn(function(visible) {
                        this.visible = visible;
                        return this;
                    }),
                    setText: jest.fn(function(newText) {
                        this.text = newText;
                        return this;
                    }),
                    destroy: jest.fn(),
                    visible: false
                })),
                existing: jest.fn()
            }
        };
    });

    afterEach(() => {
        if (resourceBar) {
            resourceBar.destroy();
        }
    });

    describe('Initialization', () => {
        test('creates ResourceBar with default config', () => {
            resourceBar = new ResourceBar(mockScene);

            expect(resourceBar.cfg.iconSize).toEqual({ w: 32, h: 32 });
            expect(resourceBar.cfg.iconGapX).toBe(4);
            expect(resourceBar.cfg.groupGapX).toBe(12);
            expect(resourceBar.cfg.maxIconsPerType).toBe(Infinity);
        });

        test('creates ResourceBar with custom config', () => {
            resourceBar = new ResourceBar(mockScene, {
                x: 100,
                y: 200,
                iconSize: { w: 48, h: 48 },
                iconGapX: 8,
                groupGapX: 16,
                maxIconsPerType: 5,
                fontSize: 20
            });

            expect(resourceBar.x).toBe(100);
            expect(resourceBar.y).toBe(200);
            expect(resourceBar.cfg.iconSize).toEqual({ w: 48, h: 48 });
            expect(resourceBar.cfg.iconGapX).toBe(8);
            expect(resourceBar.cfg.groupGapX).toBe(16);
            expect(resourceBar.cfg.maxIconsPerType).toBe(5);
            expect(resourceBar.cfg.fontSize).toBe(20);
        });

        test('initializes with zero counts', () => {
            resourceBar = new ResourceBar(mockScene);

            expect(resourceBar.counts).toEqual({
                apples: 0,
                bags: 0,
                crates: 0,
                trucks: 0
            });
        });
    });

    describe('Horizontal Layout', () => {
        test('renders all resource types in horizontal sequence', () => {
            resourceBar = new ResourceBar(mockScene, {
                iconSize: { w: 32, h: 32 },
                iconGapX: 4,
                groupGapX: 12
            });

            resourceBar.setCounts({
                apples: 2,
                bags: 2,
                crates: 2,
                trucks: 2
            });

            const bounds = resourceBar.getLayoutBounds();

            // Should have 8 total icons (2 of each type)
            expect(bounds.length).toBe(8);

            // Verify horizontal sequence: apples → bags → crates → trucks
            const apples = bounds.filter(b => b.type === 'apples');
            const bags = bounds.filter(b => b.type === 'bags');
            const crates = bounds.filter(b => b.type === 'crates');
            const trucks = bounds.filter(b => b.type === 'trucks');

            expect(apples.length).toBe(2);
            expect(bags.length).toBe(2);
            expect(crates.length).toBe(2);
            expect(trucks.length).toBe(2);

            // Verify apples come first (leftmost X positions)
            const maxAppleX = Math.max(...apples.map(a => a.x));
            const minBagX = Math.min(...bags.map(b => b.x));
            expect(minBagX).toBeGreaterThan(maxAppleX);
        });

        test('all icons share the same Y coordinate', () => {
            resourceBar = new ResourceBar(mockScene);

            resourceBar.setCounts({
                apples: 3,
                bags: 2,
                crates: 1,
                trucks: 2
            });

            const bounds = resourceBar.getLayoutBounds();
            const yCoords = [...new Set(bounds.map(b => b.y))];

            // All icons should be on the same horizontal baseline
            expect(yCoords.length).toBe(1);
            expect(yCoords[0]).toBe(0); // Default Y is 0
        });

        test('X coordinates increase monotonically left-to-right', () => {
            resourceBar = new ResourceBar(mockScene);

            resourceBar.setCounts({
                apples: 3,
                bags: 2,
                crates: 2,
                trucks: 1
            });

            const bounds = resourceBar.getLayoutBounds();
            const xCoords = bounds.map(b => b.x);

            // Verify each X is greater than or equal to the previous
            for (let i = 1; i < xCoords.length; i++) {
                expect(xCoords[i]).toBeGreaterThanOrEqual(xCoords[i - 1]);
            }
        });

        test('group gaps separate resource types', () => {
            resourceBar = new ResourceBar(mockScene, {
                iconSize: { w: 32, h: 32 },
                iconGapX: 4,
                groupGapX: 12
            });

            resourceBar.setCounts({
                apples: 2,
                bags: 1,
                crates: 0,
                trucks: 0
            });

            const bounds = resourceBar.getLayoutBounds();

            // 2 apples: X=0, X=36
            // 1 bag: X=0+36+4+12=52 (last apple X + iconSize + iconGap + groupGap)
            const apples = bounds.filter(b => b.type === 'apples');
            const bags = bounds.filter(b => b.type === 'bags');

            expect(apples[0].x).toBe(0);
            expect(apples[1].x).toBe(36); // 32 + 4
            expect(bags[0].x).toBe(84); // 36 + 32 + 4 + 12
        });
    });

    describe('Place Value Rendering', () => {
        test('renders correct number of apples for ones place', () => {
            resourceBar = new ResourceBar(mockScene);

            resourceBar.setCounts({
                apples: 7,
                bags: 0,
                crates: 0,
                trucks: 0
            });

            const bounds = resourceBar.getLayoutBounds();
            const apples = bounds.filter(b => b.type === 'apples');

            expect(apples.length).toBe(7);
        });

        test('renders correct number of bags for tens place', () => {
            resourceBar = new ResourceBar(mockScene);

            resourceBar.setCounts({
                apples: 0,
                bags: 4,
                crates: 0,
                trucks: 0
            });

            const bounds = resourceBar.getLayoutBounds();
            const bags = bounds.filter(b => b.type === 'bags');

            expect(bags.length).toBe(4);
        });

        test('renders mixed place values correctly', () => {
            resourceBar = new ResourceBar(mockScene);

            // Represents number 2437: 2 thousands, 4 hundreds, 3 tens, 7 ones
            resourceBar.setCounts({
                apples: 7,
                bags: 3,
                crates: 4,
                trucks: 2
            });

            const bounds = resourceBar.getLayoutBounds();

            expect(bounds.filter(b => b.type === 'apples').length).toBe(7);
            expect(bounds.filter(b => b.type === 'bags').length).toBe(3);
            expect(bounds.filter(b => b.type === 'crates').length).toBe(4);
            expect(bounds.filter(b => b.type === 'trucks').length).toBe(2);
        });
    });

    describe('Overflow Handling', () => {
        test('limits visible icons to maxIconsPerType', () => {
            resourceBar = new ResourceBar(mockScene, {
                maxIconsPerType: 5
            });

            resourceBar.setCounts({
                apples: 9,
                bags: 0,
                crates: 0,
                trucks: 0
            });

            const bounds = resourceBar.getLayoutBounds();
            const apples = bounds.filter(b => b.type === 'apples');

            // Should only show 5 apples (maxIconsPerType), not 9
            expect(apples.length).toBe(5);
        });

        test('renders overflow label when count exceeds max', () => {
            resourceBar = new ResourceBar(mockScene, {
                maxIconsPerType: 3,
                fontSize: 16
            });

            resourceBar.setCounts({
                apples: 8,
                bags: 0,
                crates: 0,
                trucks: 0
            });

            // Check that countLabel was created and set correctly
            const appleLabel = resourceBar.countLabels.apples;
            expect(appleLabel).toBeTruthy();
            expect(appleLabel.visible).toBe(true);
            expect(appleLabel.text).toBe('×8');
        });

        test('does not render overflow label when count is within max', () => {
            resourceBar = new ResourceBar(mockScene, {
                maxIconsPerType: 5
            });

            resourceBar.setCounts({
                apples: 3,
                bags: 0,
                crates: 0,
                trucks: 0
            });

            const appleLabel = resourceBar.countLabels.apples;
            // Label may exist but should not be visible
            if (appleLabel) {
                expect(appleLabel.visible).toBe(false);
            }
        });
    });

    describe('Diff-Checking & Updates', () => {
        test('only updates layout when counts change', () => {
            resourceBar = new ResourceBar(mockScene);
            const layoutSpy = jest.spyOn(resourceBar, 'layout');

            resourceBar.setCounts({
                apples: 5,
                bags: 3,
                crates: 2,
                trucks: 1
            });

            expect(layoutSpy).toHaveBeenCalledTimes(1);

            // Set same counts again - should not trigger layout
            resourceBar.setCounts({
                apples: 5,
                bags: 3,
                crates: 2,
                trucks: 1
            });

            expect(layoutSpy).toHaveBeenCalledTimes(1); // Still only 1 call
        });

        test('updates layout when counts change', () => {
            resourceBar = new ResourceBar(mockScene);
            const layoutSpy = jest.spyOn(resourceBar, 'layout');

            resourceBar.setCounts({
                apples: 5,
                bags: 3,
                crates: 2,
                trucks: 1
            });

            expect(layoutSpy).toHaveBeenCalledTimes(1);

            // Change counts - should trigger layout
            resourceBar.setCounts({
                apples: 7,
                bags: 3,
                crates: 2,
                trucks: 1
            });

            expect(layoutSpy).toHaveBeenCalledTimes(2);
        });
    });

    describe('Sprite Pooling', () => {
        test('reuses sprites from pool instead of creating new ones', () => {
            resourceBar = new ResourceBar(mockScene);

            resourceBar.setCounts({
                apples: 3,
                bags: 0,
                crates: 0,
                trucks: 0
            });

            const initialCallCount = mockScene.add.text.mock.calls.length;

            // Change to same count - should reuse existing sprites
            resourceBar.setCounts({
                apples: 3,
                bags: 0,
                crates: 0,
                trucks: 0
            });

            // Should not create new sprites (diff-check prevents layout)
            expect(mockScene.add.text.mock.calls.length).toBe(initialCallCount);
        });

        test('hides sprites when counts decrease', () => {
            resourceBar = new ResourceBar(mockScene);

            resourceBar.setCounts({
                apples: 5,
                bags: 0,
                crates: 0,
                trucks: 0
            });

            let bounds = resourceBar.getLayoutBounds();
            expect(bounds.length).toBe(5);

            // Decrease count
            resourceBar.setCounts({
                apples: 2,
                bags: 0,
                crates: 0,
                trucks: 0
            });

            bounds = resourceBar.getLayoutBounds();
            expect(bounds.length).toBe(2); // Only 2 visible now
        });
    });

    describe('Accessibility', () => {
        test('provides tooltip with all resource counts', () => {
            resourceBar = new ResourceBar(mockScene);

            resourceBar.setCounts({
                apples: 5,
                bags: 3,
                crates: 2,
                trucks: 1
            });

            const tooltip = resourceBar.getTooltip();

            expect(tooltip).toContain('Apples: 5');
            expect(tooltip).toContain('Bags: 3');
            expect(tooltip).toContain('Crates: 2');
            expect(tooltip).toContain('Trucks: 1');
        });

        test('excludes zero counts from tooltip', () => {
            resourceBar = new ResourceBar(mockScene);

            resourceBar.setCounts({
                apples: 5,
                bags: 0,
                crates: 0,
                trucks: 0
            });

            const tooltip = resourceBar.getTooltip();

            expect(tooltip).toBe('Apples: 5');
            expect(tooltip).not.toContain('Bags');
            expect(tooltip).not.toContain('Crates');
            expect(tooltip).not.toContain('Trucks');
        });
    });

    describe('Edge Cases', () => {
        test('handles zero counts correctly', () => {
            resourceBar = new ResourceBar(mockScene);

            resourceBar.setCounts({
                apples: 0,
                bags: 0,
                crates: 0,
                trucks: 0
            });

            const bounds = resourceBar.getLayoutBounds();
            expect(bounds.length).toBe(0); // No icons should be rendered
        });

        test('handles single resource type', () => {
            resourceBar = new ResourceBar(mockScene);

            resourceBar.setCounts({
                apples: 0,
                bags: 0,
                crates: 0,
                trucks: 3
            });

            const bounds = resourceBar.getLayoutBounds();
            expect(bounds.length).toBe(3);
            expect(bounds.every(b => b.type === 'trucks')).toBe(true);
        });

        test('handles maximum counts (9 of each)', () => {
            resourceBar = new ResourceBar(mockScene, {
                maxIconsPerType: Infinity
            });

            resourceBar.setCounts({
                apples: 9,
                bags: 9,
                crates: 9,
                trucks: 9
            });

            const bounds = resourceBar.getLayoutBounds();
            expect(bounds.length).toBe(36); // 9 * 4 types
        });
    });

    describe('Cleanup', () => {
        test('destroys all pooled sprites on destroy', () => {
            resourceBar = new ResourceBar(mockScene);

            resourceBar.setCounts({
                apples: 3,
                bags: 2,
                crates: 1,
                trucks: 1
            });

            const destroySpy = jest.fn();
            resourceBar.pool.apples.forEach(sprite => sprite.destroy = destroySpy);
            resourceBar.pool.bags.forEach(sprite => sprite.destroy = destroySpy);
            resourceBar.pool.crates.forEach(sprite => sprite.destroy = destroySpy);
            resourceBar.pool.trucks.forEach(sprite => sprite.destroy = destroySpy);

            resourceBar.destroy();

            expect(destroySpy).toHaveBeenCalled();
        });

        test('destroys all count labels on destroy', () => {
            resourceBar = new ResourceBar(mockScene, {
                maxIconsPerType: 2
            });

            resourceBar.setCounts({
                apples: 5,
                bags: 0,
                crates: 0,
                trucks: 0
            });

            const appleLabel = resourceBar.countLabels.apples;
            const destroySpy = jest.fn();
            appleLabel.destroy = destroySpy;

            resourceBar.destroy();

            expect(destroySpy).toHaveBeenCalled();
        });
    });
});
