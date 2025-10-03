import { ObjectCountingRenderer } from '../src/game/systems/ObjectCountingRenderer.js';

describe('ObjectCountingRenderer column layout', () => {
    const createRenderer = () => new ObjectCountingRenderer({ scale: { width: 800 } });

    test('creates centered columns with consistent spacing for multiple place values', () => {
        const renderer = createRenderer();
        const placeValues = renderer.decomposePlaceValues(3307);

        const layout = renderer.calculateColumnLayout(placeValues, 400);
        const columns = layout.columns;

        expect(columns.map(col => col.place)).toEqual(['thousands', 'hundreds', 'ones']);

        const thousands = columns[0];
        const hundreds = columns[1];
        const ones = columns[2];

        const gapThousandHundred = (hundreds.centerX - hundreds.width / 2) - (thousands.centerX + thousands.width / 2);
        const gapHundredOnes = (ones.centerX - ones.width / 2) - (hundreds.centerX + hundreds.width / 2);

        expect(gapThousandHundred).toBeCloseTo(renderer.spacing.horizontal);
        expect(gapHundredOnes).toBeCloseTo(renderer.spacing.horizontal);
        expect(ones.centerX).toBeGreaterThan(hundreds.centerX);
    });

    test('keeps single column aligned with requested center', () => {
        const renderer = createRenderer();
        const placeValues = renderer.decomposePlaceValues(5);

        const layout = renderer.calculateColumnLayout(placeValues, 512);
        const [ones] = layout.columns;

        expect(layout.columns.length).toBe(1);
        expect(ones.place).toBe('ones');
        expect(ones.centerX).toBeCloseTo(512);

        const expectedWidth = renderer.calculateOptimalStackingLayout(5).columns * renderer.emojiSize;
        expect(ones.width).toBe(expectedWidth);
    });

    test('returns no columns for zero value', () => {
        const renderer = createRenderer();
        const placeValues = renderer.decomposePlaceValues(0);

        const layout = renderer.calculateColumnLayout(placeValues, 300);

        expect(layout.columns).toHaveLength(0);
        expect(layout.totalWidth).toBe(0);
        expect(layout.startX).toBe(300);
    });
});
