/**
 * @jest-environment jsdom
 */
import { ToyModeSelector } from '../src/modes/ToyModeSelector.js';

describe('ToyModeSelector', () => {
    let router, selector, root, cards;

    beforeEach(() => {
        document.body.innerHTML = '';
        router = { navigate: jest.fn(), allowToyAccess: jest.fn() };
        selector = new ToyModeSelector(router, { shouldSkipConfig: () => false });
        selector.show();
        root = document.getElementById('toy-mode-selector');
        cards = root.querySelectorAll('[role="button"]');
    });

    test('is not centred with justify-content (which clips the heading when content overflows)', () => {
        expect(root.style.justifyContent).toBe('');
        expect(root.style.overflowY).toBe('auto');
        const inner = root.querySelector('.toy-selector-inner');
        expect(inner).not.toBeNull();
        expect(inner.style.margin).toContain('auto');
        expect(inner.contains(root.querySelector('h1'))).toBe(true);
    });

    test('a click activates exactly once', () => {
        cards[0].click();
        expect(router.navigate).toHaveBeenCalledTimes(1);
        expect(router.navigate).toHaveBeenCalledWith('/config');
    });

    test('touchend (end of a scroll gesture) does not launch a toy', () => {
        cards.forEach(c => c.dispatchEvent(new Event('touchend', { bubbles: true, cancelable: true })));
        expect(router.navigate).not.toHaveBeenCalled();
    });

    test('keyboard Enter/Space still activate; all three toys are reachable', () => {
        cards[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        cards[2].dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
        expect(router.navigate.mock.calls.map(c => c[0])).toEqual(['/orrery', '/globe']);
    });
});
