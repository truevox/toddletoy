/**
 * @jest-environment jsdom
 */
import { adoptAppConfigManager } from '../src/game/systems/SceneReadiness.js';

describe('adoptAppConfigManager', () => {
    test('uses the ConfigManager the app put in the game registry', () => {
        const appCm = { id: 'app' };
        const scene = { registry: { get: (k) => (k === 'configManager' ? appCm : undefined) } };
        expect(adoptAppConfigManager(scene, () => ({ id: 'own' }))).toBe(appCm);
        expect(scene.configManager).toBe(appCm);
    });

    test('keeps one already set on the scene', () => {
        const existing = { id: 'x' };
        const scene = { configManager: existing, registry: { get: () => ({ id: 'app' }) } };
        expect(adoptAppConfigManager(scene, () => ({ id: 'own' }))).toBe(existing);
    });

    test('falls back to a fresh one when the app supplied none', () => {
        const scene = { registry: { get: () => undefined } };
        expect(adoptAppConfigManager(scene, () => ({ id: 'own' }))).toEqual({ id: 'own' });
        expect(adoptAppConfigManager({}, () => ({ id: 'own' }))).toEqual({ id: 'own' });
    });
});
