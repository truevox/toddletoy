import { buildColorizedLabel, getLocalizedString } from '../src/game/utils/localization.js';

describe('Localization utilities', () => {
    test('buildColorizedLabel combines color word with localized value', () => {
        const itemData = {
            value: 'Triangle',
            es: 'Triángulo',
            color: {
                es: 'Azul',
                'en-US': 'Blue',
                hex: '#0000ff'
            }
        };

        const label = buildColorizedLabel(itemData, 'es');
        expect(label).toBe('Azul Triángulo');
    });

    test('getLocalizedString falls back to value when language missing', () => {
        const data = {
            value: 'Circle',
            'en-US': 'Circle'
        };

        expect(getLocalizedString(data, 'fr')).toBe('Circle');
    });

    test('buildColorizedLabel falls back to English color when translation missing', () => {
        const itemData = {
            value: 'Square',
            color: {
                'en-US': 'Green',
                hex: '#00ff00'
            }
        };

        const label = buildColorizedLabel(itemData, 'ru');
        expect(label).toBe('Green Square');
    });
});
