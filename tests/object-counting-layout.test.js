import { ObjectCountingRenderer } from '../src/game/systems/ObjectCountingRenderer.js';

describe('ObjectCountingRenderer vertical stacking layout', () => {
    let mockScene;
    let renderer;

    beforeEach(() => {
        mockScene = {
            add: {
                text: jest.fn((x, y, text, style) => ({
                    x, y, text, style,
                    setOrigin: jest.fn().mockReturnThis(),
                    destroy: jest.fn(),
                    setInteractive: jest.fn().mockReturnThis(),
                    on: jest.fn().mockReturnThis(),
                    setTint: jest.fn(),
                    clearTint: jest.fn()
                }))
            },
            scale: { width: 800, height: 600 },
            time: {
                delayedCall: jest.fn()
            }
        };
        renderer = new ObjectCountingRenderer(mockScene);
    });

    test('stacks place values vertically for multi-digit numbers', () => {
        // 3307 = 3 thousands, 3 hundreds, 0 tens, 7 ones
        const components = renderer.renderObjectCountingNumeral(3307, 400, 200);

        // Should have: 3 trucks + 3 boxes + 7 apples = 13 components
        expect(components.length).toBe(13);

        // Verify all non-grid components (trucks, boxes) are centered at X=400
        const trucksAndBoxes = components.slice(0, 6); // First 6 are trucks and boxes
        trucksAndBoxes.forEach(comp => {
            expect(comp.x).toBe(400);
        });

        // Verify apples are centered around X=400
        const apples = components.slice(6); // Last 7 are apples
        const avgX = apples.reduce((sum, c) => sum + c.x, 0) / apples.length;
        expect(avgX).toBeCloseTo(400, -1); // Within 10px of center
    });

    test('centers single place value at requested position', () => {
        // 5 apples only
        const components = renderer.renderObjectCountingNumeral(5, 512, 300);

        // 5 apples in 3x2 grid = 6 positions, but only 5 filled
        expect(components.length).toBe(5);

        // Should be centered around X=512 (within 20px tolerance for grid layout)
        const xValues = components.map(c => c.x);
        const avgX = xValues.reduce((a, b) => a + b, 0) / xValues.length;
        expect(Math.abs(avgX - 512)).toBeLessThan(20);
    });

    test('returns no components for zero value', () => {
        const components = renderer.renderObjectCountingNumeral(0, 300, 200);
        expect(components).toHaveLength(0);
    });

    test('renders apples in square grid pattern', () => {
        // 9 apples should form 3x3 grid
        const components = renderer.renderObjectCountingNumeral(9, 400, 200);

        expect(components.length).toBe(9);

        // Check that we have 3 unique X positions (3 columns)
        const uniqueX = [...new Set(components.map(c => c.x))];
        expect(uniqueX.length).toBe(3);

        // Check that we have 3 unique Y positions (3 rows)
        const uniqueY = [...new Set(components.map(c => c.y))];
        expect(uniqueY.length).toBe(3);
    });
});
