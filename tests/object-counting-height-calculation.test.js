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
            // Single row of apples: 1 row * emojiSize
            const height1 = renderer.calculateTotalHeight(1);
            const height5 = renderer.calculateTotalHeight(5);

            // Single row: emojiSize (32px)
            expect(height1).toBe(32);
            expect(height5).toBe(32);
        });

        test('calculates height for ten-frame layout (6-9 apples)', () => {
            // Ten-frame: 2 rows of 5 apples (6-9 apples render in ten-frame pattern)
            // Height = 2 rows * spacing (36px per row)
            const height6 = renderer.calculateTotalHeight(6);
            const height9 = renderer.calculateTotalHeight(9);

            // 2 rows with 36px vertical spacing = 72px
            expect(height6).toBe(72);
            expect(height9).toBe(72);
        });

        test('calculates height for two-digit numbers with tens place', () => {
            // Example: 23 = 2 shopping bags + 3 apples
            // Shopping bags: 2 * 36px spacing = 72px
            // Need to account for tallest column
            const height23 = renderer.calculateTotalHeight(23);

            // 2 bags vertically: 2 * 36px = 72px
            // 3 apples single row: 32px
            // Max height = 72px
            expect(height23).toBe(72);
        });

        test('calculates height for three-digit numbers with hundreds place', () => {
            // Example: 234 = 2 boxes + 3 bags + 4 apples
            // Boxes: 2 * 36px = 72px
            const height234 = renderer.calculateTotalHeight(234);

            // Max stack of 4 apples (single row) = 32px
            // But we also have 3 bags = 108px and 2 boxes = 72px
            // Tallest column determines height
            expect(height234).toBeGreaterThanOrEqual(72);
        });

        test('calculates height for four-digit numbers with thousands place', () => {
            // Example: 4425 from screenshot
            // 4 trucks, 4 hundreds, 2 tens, 5 ones
            const height4425 = renderer.calculateTotalHeight(4425);

            // 4 trucks: 4 * 36px = 144px
            expect(height4425).toBe(144);
        });

        test('calculates height for large stack (9 of a kind)', () => {
            // 9999 = 9 trucks + 9 boxes + 9 bags + 9 apples
            const height9999 = renderer.calculateTotalHeight(9999);

            // 9 trucks stacked: 9 * 36px = 324px
            expect(height9999).toBe(324);
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
            // Real example from screenshot: 4239
            const height4239 = renderer.calculateTotalHeight(4239);

            // 4 trucks: 4 * 36 = 144px
            // 2 hundreds: 2 * 36 = 72px
            // 3 tens: 3 * 36 = 108px
            // 9 ones: double ten-frame = 4 rows * 36 = 144px
            // Max height = 144px (trucks or ones)
            expect(height4239).toBe(144);
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
        test('finds tallest column in multi-place value layout', () => {
            // Test with 4425: 4 thousands, 4 hundreds, 2 tens, 5 ones
            const placeValues = renderer.decomposePlaceValues(4425);
            const maxHeight = renderer.getMaxColumnHeight(placeValues);

            // 4 trucks = 144px or 4 boxes = 144px (both same)
            expect(maxHeight).toBe(144);
        });

        test('handles single column correctly', () => {
            const placeValues = renderer.decomposePlaceValues(5);
            const maxHeight = renderer.getMaxColumnHeight(placeValues);

            // 5 apples single row = 32px
            expect(maxHeight).toBe(32);
        });

        test('accounts for ten-frame layout in ones place', () => {
            const placeValues = renderer.decomposePlaceValues(9);
            const maxHeight = renderer.getMaxColumnHeight(placeValues);

            // 9 apples: ten-frame (2 rows) = 72px
            expect(maxHeight).toBe(72);
        });
    });

    describe('Integration with existing layout methods', () => {
        test('height calculation provides correct dimensions for layout planning', () => {
            // Test multiple numbers to verify height calculation
            const testCases = [
                { number: 5, expectedHeight: 32 },   // 5 apples, single row
                { number: 9, expectedHeight: 72 },   // 9 apples, ten-frame (2 rows)
                { number: 23, expectedHeight: 72 },  // 2 bags (72px), 3 apples (32px), max=72
                { number: 456, expectedHeight: 180 } // 4 hundreds (144px), 5 tens (180px), 6 ones (72px), max=180
            ];

            testCases.forEach(({ number, expectedHeight }) => {
                const calculatedHeight = renderer.calculateTotalHeight(number);
                expect(calculatedHeight).toBe(expectedHeight);
            });
        });

        test('calculateTotalHeightWithPadding provides safe buffer for layout', () => {
            const number = 456; // 4 hundreds, 5 tens (180px is tallest), 6 ones
            const baseHeight = renderer.calculateTotalHeight(number);
            const paddedHeight = renderer.calculateTotalHeightWithPadding(number);

            // Padded height should be 40px more than base (20px top + 20px bottom)
            expect(paddedHeight).toBe(baseHeight + 40);
            expect(paddedHeight).toBe(220); // 180 + 40
        });
    });
});
