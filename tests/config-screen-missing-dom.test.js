/**
 * @jest-environment jsdom
 */
jest.mock('../src/config/ConfigScreen.css', () => ({}), { virtual: false });
jest.mock('../src/config/HelpSystem.css', () => ({}), { virtual: false });
jest.mock('../src/config/DocumentationStyles.css', () => ({}), { virtual: false });

import { ConfigScreen } from '../src/config/ConfigScreen.js';
import { ConfigManager } from '../src/config/ConfigManager.js';
import { addEventListeners } from '../src/config/ui/ConfigEvents.js';

function makeScreen() {
    localStorage.clear();
    localStorage.setItem('toddletoy-seen-onboarding', 'true');
    document.body.innerHTML = '';
    const router = { allowToyAccess: jest.fn(), navigate: jest.fn() };
    const screen = new ConfigScreen(new ConfigManager(), router);
    return { screen, router };
}

/** Rebuild the screen's listeners against a container with some elements removed */
function rewire(screen, selectors) {
    const clone = screen.container.cloneNode(true);
    selectors.forEach(sel => clone.querySelectorAll(sel).forEach(el => el.remove()));
    const fresh = Object.create(screen);
    fresh.container = clone;
    document.body.appendChild(clone);
    return fresh;
}

describe('ConfigScreen with missing DOM elements', () => {
    beforeEach(() => {
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => jest.restoreAllMocks());

    test('baseline: a full screen builds, saves and reads back', () => {
        const { screen } = makeScreen();
        expect(() => screen.saveCurrentConfig()).not.toThrow();
        expect(screen.configManager.getConfig().content.shapes.enabled).toBe(true);
    });

    test('wiring does not throw when the audio, cleanup-timer and grid sections are removed', () => {
        const { screen } = makeScreen();
        const broken = rewire(screen, [
            '#audio-volume', '#audio-mute', '#audio-tone-duration', '#speech-volume',
            '#speech-mute', '#cleanup-timer-seconds', '#grid-mode-enabled', '#grid-size-select'
        ]);
        expect(() => addEventListeners(broken)).not.toThrow();
        expect(() => broken.loadCurrentConfig()).not.toThrow();
    });

    test('remaining handlers still work after a section is removed', () => {
        const { screen, router } = makeScreen();
        const broken = rewire(screen, ['#audio-volume', '#audio-mute', '#cleanup-timer-seconds', '#speech-mute']);
        broken.startPlaying = jest.fn(() => { broken.saveCurrentConfig(); router.navigate('/toy'); });
        addEventListeners(broken);

        // Handler on a surviving element (speech volume slider wired without its mute box)
        const speech = broken.container.querySelector('#speech-volume');
        const label = broken.container.querySelector('#speech-volume-value');
        speech.value = '33';
        speech.dispatchEvent(new Event('input', { bubbles: true }));
        expect(label.textContent).toBe('33%');

        // Start button still triggers the (saving) start flow
        broken.container.querySelector('#start-playing-btn-top').click();
        expect(broken.startPlaying).toHaveBeenCalled();
        expect(router.navigate).toHaveBeenCalledWith('/toy');
    });

    test('buildConfigFromUI keeps stored values for removed controls instead of throwing', () => {
        const { screen } = makeScreen();
        screen.configManager.updateConfig({
            ...screen.configManager.getConfig(),
            audio: { volume: 42, mute: false, toneDuration: -1 }
        });
        const broken = rewire(screen, [
            '#audio-volume', '#audio-mute', '#shapes-enabled', '#shapes-weight', '#grid-mode-enabled',
            '#grid-size-select', '#cleanup-timer-seconds', '#only-apples-enabled', '#animals-weight'
        ]);
        let built;
        expect(() => { built = broken.buildConfigFromUI(); }).not.toThrow();
        expect(built.audio.volume).toBe(42);
        expect(built.content.shapes.enabled).toBe(true);
        expect(built.gridMode.rows).toBe(4);
        expect(built.advanced.autoCleanup.timeoutSeconds).toBe(10);
        // untouched controls are still read from the UI
        broken.container.querySelector('#speech-volume').value = '15';
        expect(broken.buildConfigFromUI().speech.volume).toBe(15);
    });

    test('number-range validation and save tolerate missing inputs', () => {
        const { screen } = makeScreen();
        const broken = rewire(screen, ['#small-max', '#large-min']);
        expect(() => broken.validateNumberRanges()).not.toThrow();
        expect(() => broken.saveCurrentConfig()).not.toThrow();
    });

    test('screen constructs from a wrong-shaped saved config', () => {
        localStorage.clear();
        localStorage.setItem('toddleToyConfig', JSON.stringify({ content: null, languages: 7, advanced: 'x' }));
        localStorage.setItem('toddletoy-seen-onboarding', 'true');
        document.body.innerHTML = '';
        expect(() => new ConfigScreen(new ConfigManager(), { allowToyAccess() {}, navigate() {} })).not.toThrow();
        expect(document.querySelectorAll('#language-enabled .language-item, .language-item').length).toBeGreaterThan(0);
    });
});
