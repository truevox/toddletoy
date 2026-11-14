/**
 * @jest-environment jsdom
 */
import { ConfigManager } from '../src/config/ConfigManager.js';
import { safeStorage } from '../src/utils/safeStorage.js';
import { GameStateStore } from '../src/game/systems/GameStateStore.js';

const CONFIG_KEY = 'toddleToyConfig';
const STATE_KEY = 'toddleToyGameState';

describe('ConfigManager tolerates wrong-shaped saved config', () => {
    beforeEach(() => localStorage.clear());

    const load = (value) => {
        localStorage.setItem(CONFIG_KEY, typeof value === 'string' ? value : JSON.stringify(value));
        return new ConfigManager().getConfig();
    };

    test('wrong-typed sections fall back to defaults', () => {
        const defaults = new ConfigManager().getDefaults();
        const cfg = load({ content: null, languages: 7, advanced: 'x' });
        expect(cfg.content).toEqual(defaults.content);
        expect(cfg.languages).toEqual(defaults.languages);
        expect(cfg.advanced).toEqual(defaults.advanced);
        expect(Array.isArray(cfg.languages.enabled)).toBe(true);
    });

    test.each(['null', '[]', '42', '"str"', 'true'])('top-level %s yields defaults', (raw) => {
        const defaults = new ConfigManager().getDefaults();
        expect(load(raw)).toEqual(defaults);
    });

    test('language lists with garbage entries are cleaned', () => {
        const cfg = load({ languages: { enabled: [null, 5, { code: 'fr', name: 'French' }], available: 'x' } });
        expect(cfg.languages.enabled.map(l => l.code)).toEqual(['fr']);
        expect(Array.isArray(cfg.languages.available)).toBe(true);
        const cfg2 = load({ languages: { enabled: 'nope' } });
        expect(cfg2.languages.enabled.map(l => l.code)).toEqual(['en', 'es']);
    });

    test('per-field type validation keeps valid fields and drops invalid ones', () => {
        const cfg = load({
            content: { shapes: { enabled: 'yes', weight: 'heavy' }, smallNumbers: { max: 15, min: null } },
            audio: { volume: 55, mute: 'maybe' },
            gridMode: { rows: null, cols: 5 }
        });
        expect(cfg.content.shapes).toEqual({ enabled: true, weight: 25 });
        expect(cfg.content.smallNumbers.max).toBe(15);
        expect(cfg.content.smallNumbers.min).toBe(0);
        expect(cfg.audio.volume).toBe(55);
        expect(cfg.audio.mute).toBe(false);
        expect(cfg.gridMode.cols).toBe(5);
        expect(cfg.gridMode.rows).toBe(4);
    });

    test('valid saved values still win over defaults', () => {
        const cfg = load({ speech: { volume: 12, rate: 1.5 }, advanced: { skipConfig: true } });
        expect(cfg.speech.volume).toBe(12);
        expect(cfg.speech.rate).toBe(1.5);
        expect(cfg.advanced.skipConfig).toBe(true);
        expect(cfg.advanced.autoCleanup.enabled).toBe(true);
    });
});

describe('safeStorage', () => {
    const realDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');
    afterEach(() => {
        if (realDescriptor) Object.defineProperty(window, 'localStorage', realDescriptor);
    });

    test('passes through to localStorage when available', () => {
        safeStorage.setItem('k', 'v');
        expect(localStorage.getItem('k')).toBe('v');
        expect(safeStorage.getItem('k')).toBe('v');
        safeStorage.removeItem('k');
        expect(localStorage.getItem('k')).toBeNull();
    });

    test('never throws and falls back to memory when the localStorage getter throws', () => {
        Object.defineProperty(window, 'localStorage', {
            configurable: true,
            get() { throw new DOMException('denied', 'SecurityError'); }
        });
        expect(() => safeStorage.setItem('mem', '1')).not.toThrow();
        expect(safeStorage.getItem('mem')).toBe('1');
        expect(() => safeStorage.removeItem('mem')).not.toThrow();
        expect(safeStorage.getItem('mem')).toBeNull();
    });

    test('falls back to memory when methods throw (quota)', () => {
        Object.defineProperty(window, 'localStorage', {
            configurable: true,
            value: {
                getItem() { throw new Error('x'); },
                setItem() { throw new Error('quota'); },
                removeItem() { throw new Error('x'); }
            }
        });
        expect(safeStorage.setItem('q', 'z')).toBe(false);
        expect(safeStorage.getItem('q')).toBe('z');
        expect(() => safeStorage.removeItem('q')).not.toThrow();
    });

    test('ConfigManager works with a throwing localStorage getter', () => {
        Object.defineProperty(window, 'localStorage', {
            configurable: true,
            get() { throw new DOMException('denied', 'SecurityError'); }
        });
        const cm = new ConfigManager();
        expect(cm.getConfig().content).toBeDefined();
        expect(cm.saveConfig()).toBe(true);
    });
});

describe('GameStateStore tolerates garbage saved state', () => {
    let scene, store;
    beforeEach(() => {
        localStorage.clear();
        scene = {
            isFullyInitialized: true,
            objects: [],
            restoreObject: jest.fn().mockResolvedValue(undefined)
        };
        store = new GameStateStore(scene);
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });
    afterEach(() => jest.restoreAllMocks());

    test.each([
        ['not json', '{{{'],
        ['null', 'null'],
        ['array', '[1,2]'],
        ['number', '7'],
        ['objects not array', JSON.stringify({ objects: 'x', timestamp: Date.now() })],
        ['no timestamp', JSON.stringify({ objects: [] })],
        ['garbage timestamp', JSON.stringify({ objects: [], timestamp: 'now' })]
    ])('restoreGameState with %s does not throw and clears it', async (_n, raw) => {
        localStorage.setItem(STATE_KEY, raw);
        await expect(store.restoreGameState()).resolves.toBeUndefined();
        expect(scene.restoreObject).not.toHaveBeenCalled();
        expect(localStorage.getItem(STATE_KEY)).toBeNull();
    });

    test('null / junk entries are skipped by restoreObject', async () => {
        for (const bad of [null, undefined, 5, 'x', {}, { type: 'shape' }, { itemData: {}, type: 5 },
            { itemData: 'x', type: 'shape', x: 1, y: 1 }, { itemData: {}, type: 'shape', x: 'a', y: 2 }]) {
            await expect(store.restoreObject(bad)).resolves.toBeUndefined();
        }
    });

    test('restoreGameState survives null entries inside objects', async () => {
        localStorage.setItem(STATE_KEY, JSON.stringify({ objects: [null, 3, { id: 1 }], timestamp: Date.now() }));
        await expect(store.restoreGameState()).resolves.toBeUndefined();
        expect(scene.restoreObject).toHaveBeenCalledTimes(3);
    });
});
