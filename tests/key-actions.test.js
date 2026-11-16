// KeyActions: a key press always spawns - the key's letter/number when allowed, random otherwise, in the grid cell in grid mode.
import { KeyActions, MAX_KEY_SPAWNS_IN_FLIGHT } from '../src/game/input/KeyActions.js';

function makeScene(extra = {}) {
    return {
        gridMode: { enabled: false, gridManager: null },
        awaitingSpawnInputRelease: true,
        speechManager: { getIsSpeaking: () => true, getCurrentSpeakingObject: () => ({}) },
        resolveKeyContent: jest.fn(async () => null),
        spawnAndAnnounce: jest.fn(async () => ({ x: 1, y: 2 })),
        spawnObjectInGridCell: jest.fn(async () => ({ x: 5, y: 6 })),
        announceObject: jest.fn(),
        moveObjectTo: jest.fn(),
        ...extra
    };
}
const press = (extra = {}) => ({ code: 'KeyB', key: 'b', kind: 'letter', value: 'B', position: { x: 300, y: 200 }, ...extra });

describe('KeyActions.play', () => {
    test('a letter key spawns that letter at the key position, even while something is speaking', async () => {
        const scene = makeScene({ resolveKeyContent: jest.fn(async () => ({ type: 'uppercaseLetters', item: { value: 'B' } })) });
        await new KeyActions(scene).play(press());
        expect(scene.resolveKeyContent).toHaveBeenCalledWith('letter', 'B');
        expect(scene.spawnAndAnnounce).toHaveBeenCalledWith(300, 200, 'uppercaseLetters', { value: 'B' });
        expect(scene.moveObjectTo).not.toHaveBeenCalled();
    });
    test('letters switched off: a random thing, same place', async () => {
        const scene = makeScene();
        await new KeyActions(scene).play(press());
        expect(scene.spawnAndAnnounce).toHaveBeenCalledWith(300, 200, 'random', null);
    });
    test('other keys do not look up content', async () => {
        const scene = makeScene();
        await new KeyActions(scene).play(press({ kind: 'other', value: null, code: 'Space' }));
        expect(scene.resolveKeyContent).not.toHaveBeenCalled();
        expect(scene.spawnAndAnnounce).toHaveBeenCalledWith(300, 200, 'random', null);
    });
    test('grid mode fills the cell under the key position and announces it', async () => {
        const scene = makeScene({ gridMode: { enabled: true, gridManager: { getGridCell: jest.fn(() => ({ row: 1, col: 2 })) } } });
        await new KeyActions(scene).play(press());
        expect(scene.spawnObjectInGridCell).toHaveBeenCalledWith(1, 2, 'random', null);
        expect(scene.announceObject).toHaveBeenCalled();
        expect(scene.spawnAndAnnounce).not.toHaveBeenCalled();
    });
    test('clears the spawn lock so dragging is not blocked by a key release that never comes', async () => {
        const scene = makeScene();
        await new KeyActions(scene).play(press());
        expect(scene.awaitingSpawnInputRelease).toBe(false);
    });
    test('a failing spawn never throws', async () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        const scene = makeScene({ spawnAndAnnounce: jest.fn(async () => { throw new Error('boom'); }) });
        await expect(new KeyActions(scene).play(press())).resolves.toBeNull();
        warn.mockRestore();
    });
    test('a forearm: presses beyond the in-flight limit are dropped, then it recovers', async () => {
        let release;
        const gate = new Promise(r => { release = r; });
        const scene = makeScene({ spawnAndAnnounce: jest.fn(async () => { await gate; return {}; }) });
        const ka = new KeyActions(scene);
        const all = Array.from({ length: MAX_KEY_SPAWNS_IN_FLIGHT + 5 }, () => ka.play(press({ kind: 'other', value: null })));
        await Promise.resolve();
        expect(scene.spawnAndAnnounce.mock.calls.length).toBe(MAX_KEY_SPAWNS_IN_FLIGHT);
        release();
        await Promise.all(all);
        await ka.play(press({ kind: 'other', value: null }));
        expect(scene.spawnAndAnnounce.mock.calls.length).toBe(MAX_KEY_SPAWNS_IN_FLIGHT + 1);
    });
});
