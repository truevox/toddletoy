/**
 * @jest-environment jsdom
 */

import { ObjectCountingRenderer } from '../src/game/systems/ObjectCountingRenderer.js';

describe('ObjectCountingRenderer - Height Calculation', () => {
    let renderer;
    let mockScene;

    beforeEach(() => {
        mockScene = {
            add: {
                text: jest.fn((x, y, text, style) => ({
                    x,
                    y,
                    text,
                    style,
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

    describe('calculateTotalHeight()', () => {
        test('calculates height for single digit (1-5 apples)', () => {
            // Square grid layout
            const height1 = renderer.calculateTotalHeight(1);
            const height5 = renderer.calculateTotalHeight(5);

            // 1 apple: 1x1 grid = 1 row (single item, no spacing calc) = 32px
            expect(height1).toBe(32);
            // 5 apples: 3x2 grid = 2 rows * 36px = 72px
            expect(height5).toBe(72);
        });

        test('calculates height for square grid layout (6-9 apples)', () => {
            // Square grid: 6 apples = 3x2 grid, 9 apples = 3x3 grid
            const height6 = renderer.calculateTotalHeight(6);
            const height9 = renderer.calculateTotalHeight(9);

            // 6 apples: 3x2 grid = 2 rows * 36px = 72px
            expect(height6).toBe(72);
            // 9 apples: 3x3 grid = 3 rows * 36px = 108px
            expect(height9).toBe(108);
        });

        test('calculates height for two-digit numbers with tens place', () => {
            // Example: 23 = 2 shopping bags + 3 apples STACKED VERTICALLY
            // 2 bags: 2 * 36px = 72px
            // Spacing between place values: 36px
            // 3 apples: 2x2 grid = 2 rows * 36px = 72px
            const height23 = renderer.calculateTotalHeight(23);

            // Total stacked: 72px (bags) + 36px (spacing) + 72px (apples) = 180px
            expect(height23).toBe(180);
        });

        test('calculates height for three-digit numbers with hundreds place', () => {
            // Example: 234 = 2 boxes + 3 bags + 4 apples STACKED VERTICALLY
            // 2 boxes: 2 * 36px = 72px
            // Spacing: 36px
            // 3 bags: 3 * 36px = 108px
            // Spacing: 36px
            // 4 apples: 2x2 grid = 2 rows * 36px = 72px
            const height234 = renderer.calculateTotalHeight(234);

            // Total: 72 + 36 + 108 + 36 + 72 = 324px
            expect(height234).toBe(324);
        });

        test('calculates height for four-digit numbers with thousands place', () => {
            // Example: 4425 STACKED VERTICALLY
            // 4 trucks: 4 * 36px = 144px
            // Spacing: 36px
            // 4 boxes: 4 * 36px = 144px
            // Spacing: 36px
            // 2 bags: 2 * 36px = 72px
            // Spacing: 36px
            // 5 apples: 3x2 grid = 2 rows * 36px = 72px
            const height4425 = renderer.calculateTotalHeight(4425);

            // Total: 144 + 36 + 144 + 36 + 72 + 36 + 72 = 540px
            expect(height4425).toBe(540);
        });

        test('calculates height for large stack (9 of a kind)', () => {
            // 9999 = 9 trucks + 9 boxes + 9 bags + 9 apples STACKED VERTICALLY
            // 9 trucks: 9 * 36px = 324px
            // Spacing: 36px
            // 9 boxes: 9 * 36px = 324px
            // Spacing: 36px
            // 9 bags: 9 * 36px = 324px
            // Spacing: 36px
            // 9 apples: 3x3 grid = 3 rows * 36px = 108px
            const height9999 = renderer.calculateTotalHeight(9999);

            // Total: 324 + 36 + 324 + 36 + 324 + 36 + 108 = 1188px
            expect(height9999).toBe(1188);
        });

        test('handles edge case: zero', () => {
            const height0 = renderer.calculateTotalHeight(0);
            // Zero should have minimal or no height
            expect(height0).toBe(0);
        });

        test('handles edge case: boundary numbers', () => {
            const height10 = renderer.calculateTotalHeight(10);
            const height100 = renderer.calculateTotalHeight(100);
            const height1000 = renderer.calculateTotalHeight(1000);

            // 10 = 1 shopping bag (tens place), 0 apples = 32px (single item)
            expect(height10).toBe(32);

            // 100 = 1 box only = 32px
            expect(height100).toBe(32);

            // 1000 = 1 truck only = 32px
            expect(height1000).toBe(32);
        });

        test('calculates height accounting for vertical spacing', () => {
            // Verify spacing constant is used correctly
            const spacing = renderer.spacing.vertical; // 36px

            // 3 items stacked: 3 * spacing = 108px
            const height30 = renderer.calculateTotalHeight(30); // 3 tens
            expect(height30).toBe(3 * spacing);
        });

        test('returns height for complex multi-column layouts', () => {
            // Real example from screenshot: 4239 STACKED VERTICALLY
            // 4 trucks: 4 * 36 = 144px
            // Spacing: 36px
            // 2 boxes: 2 * 36 = 72px
            // Spacing: 36px
            // 3 bags: 3 * 36 = 108px
            // Spacing: 36px
            // 9 apples: 3x3 grid = 3 rows * 36 = 108px
            const height4239 = renderer.calculateTotalHeight(4239);

            // Total: 144 + 36 + 72 + 36 + 108 + 36 + 108 = 540px
            expect(height4239).toBe(540);
        });
    });

    describe('calculateTotalHeightWithPadding()', () => {
        test('adds padding buffer above and below object counting display', () => {
            const baseHeight = renderer.calculateTotalHeight(50);
            const paddedHeight = renderer.calculateTotalHeightWithPadding(50);

            // Should add padding to base height
            expect(paddedHeight).toBeGreaterThan(baseHeight);

            // Typical padding: 20px above + 20px below = 40px total
            expect(paddedHeight).toBe(baseHeight + 40);
        });

        test('padding scales with screen size', () => {
            // This ensures responsive design
            const height = renderer.calculateTotalHeightWithPadding(100);
            expect(height).toBeGreaterThan(32); // At minimum, emojiSize + padding
        });
    });

    describe('getMaxColumnHeight()', () => {
        test('finds total stacked height in multi-place value layout', () => {
            // Test with 4425: 4 thousands, 4 hundreds, 2 tens, 5 ones (ALL STACKED VERTICALLY)
            const placeValues = renderer.decomposePlaceValues(4425);
            const totalHeight = renderer.getMaxColumnHeight(placeValues);

            // Total stacked height: 144 + 36 + 144 + 36 + 72 + 36 + 72 = 540px
            expect(totalHeight).toBe(540);
        });

        test('handles single column correctly', () => {
            const placeValues = renderer.decomposePlaceValues(5);
            const totalHeight = renderer.getMaxColumnHeight(placeValues);

            // 5 apples: 3x2 square grid = 2 rows * 36px = 72px
            expect(totalHeight).toBe(72);
        });

        test('accounts for square grid layout in ones place', () => {
            const placeValues = renderer.decomposePlaceValues(9);
            const totalHeight = renderer.getMaxColumnHeight(placeValues);

            // 9 apples: 3x3 square grid = 3 rows * 36px = 108px
            expect(totalHeight).toBe(108);
        });
    });

    describe('Integration with existing layout methods', () => {
        test('height calculation provides correct dimensions for layout planning', () => {
            // Test multiple numbers to verify height calculation (VERTICAL STACKING)
            const testCases = [
                { number: 5, expectedHeight: 72 },    // 5 apples: 3x2 grid = 2 rows * 36 = 72px
                { number: 9, expectedHeight: 108 },   // 9 apples: 3x3 grid = 3 rows * 36 = 108px
                { number: 23, expectedHeight: 180 },  // 2 bags (72) + spacing (36) + 3 apples (72) = 180
                { number: 456, expectedHeight: 468 } // 4 boxes (144) + sp (36) + 5 bags (180) + sp (36) + 6 apples (72) = 468
            ];

            testCases.forEach(({ number, expectedHeight }) => {
                const calculatedHeight = renderer.calculateTotalHeight(number);
                expect(calculatedHeight).toBe(expectedHeight);
            });
        });

        test('calculateTotalHeightWithPadding provides safe buffer for layout', () => {
            const number = 456; // STACKED: 4 boxes + 5 bags + 6 apples
            const baseHeight = renderer.calculateTotalHeight(number);
            const paddedHeight = renderer.calculateTotalHeightWithPadding(number);

            // Padded height should be 40px more than base (20px top + 20px bottom)
            expect(paddedHeight).toBe(baseHeight + 40);
            expect(paddedHeight).toBe(508); // 468 + 40
        });
    });
});
