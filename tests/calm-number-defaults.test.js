/**
 * @jest-environment jsdom
 */
import { ConfigManager } from '../src/config/ConfigManager.js';

const KEY = 'toddleToyConfig';
const ALL = ['cistercian', 'kaktovik', 'binary', 'objectCounting', 'onlyApples'];
const modes = (v) => Object.fromEntries(ALL.map((k) => [k, v]));

describe('calm number default (v2.3)', () => {
    beforeEach(() => localStorage.clear());

    test('a new user sees just the numeral: every extra number display is off', () => {
        const cfg = new ConfigManager().getConfig();
        expect(cfg.advanced.numberModes).toEqual(modes(false));
    });

    test('a saved config that still has the old all-on default is calmed once', () => {
        localStorage.setItem(KEY, JSON.stringify({ advanced: { numberModes: modes(true) } }));
        const cfg = new ConfigManager().getConfig();
        expect(cfg.advanced.numberModes).toEqual(modes(false));
    });

    test('what the old settings form saved with untouched defaults (onlyApples false via its radio) is calmed too', () => {
        localStorage.setItem(KEY, JSON.stringify({ advanced: { numberModes: { ...modes(true), onlyApples: false } } }));
        expect(new ConfigManager().getConfig().advanced.numberModes).toEqual(modes(false));
    });

    test('a parent who had changed any number display keeps exactly what they chose', () => {
        const chosen = { ...modes(true), binary: false };
        localStorage.setItem(KEY, JSON.stringify({ advanced: { numberModes: chosen } }));
        expect(new ConfigManager().getConfig().advanced.numberModes).toEqual(chosen);
    });

    test('turning everything back on after the change sticks (no second migration)', () => {
        localStorage.setItem(KEY, JSON.stringify({ advanced: { numberModes: modes(true) } }));
        const first = new ConfigManager();
        const cfg = first.getConfig();
        cfg.advanced.numberModes = modes(true);
        first.updateConfig(cfg);
        expect(new ConfigManager().getConfig().advanced.numberModes).toEqual(modes(true));
    });

    test('other saved settings survive the migration', () => {
        localStorage.setItem(KEY, JSON.stringify({ audio: { volume: 33 }, advanced: { numberModes: modes(true), autoCleanup: { enabled: false, timeoutSeconds: 42 } } }));
        const cfg = new ConfigManager().getConfig();
        expect(cfg.audio.volume).toBe(33);
        expect(cfg.advanced.autoCleanup).toEqual({ enabled: false, timeoutSeconds: 42 });
    });
});
