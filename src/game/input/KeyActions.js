/**
 * KeyActions - the scene's response to a baby-keyboard key press.
 *
 * Always spawns (speech queues, so a key while something is speaking still gets its
 * own thing), at the key's place on screen or in the matching grid cell. A letter or
 * digit key asks for that letter/number; when the parent switched that content off
 * the scene falls back to a random enabled thing.
 */
export const MAX_KEY_SPAWNS_IN_FLIGHT = 16; // a forearm on the keyboard: extra presses beyond this are dropped

export class KeyActions {
    constructor(scene) {
        this.scene = scene;
        this.inFlight = 0;
    }

    async play(data) {
        const scene = this.scene;
        if (!data || !data.position) return null;
        if (this.inFlight >= MAX_KEY_SPAWNS_IN_FLIGHT) return null;
        this.inFlight++;
        try {
            let type = 'random';
            let item = null;
            if (data.kind === 'letter' || data.kind === 'digit') {
                const content = await scene.resolveKeyContent(data.kind, data.value);
                if (content) { type = content.type; item = content.item; }
            }
            const { x, y } = data.position;
            const gm = scene.gridMode;
            if (gm && gm.enabled && gm.gridManager) {
                const gridManager = gm.gridManager;
                // a key's place may fall in the gap around the grid: use the nearest cell
                const cx = Number.isFinite(gridManager.actualGridWidth) ? Math.min(Math.max(x, gridManager.offsetX + 1), gridManager.offsetX + gridManager.actualGridWidth - 1) : x;
                const cy = Number.isFinite(gridManager.actualGridHeight) ? Math.min(Math.max(y, gridManager.offsetY + 1), gridManager.offsetY + gridManager.actualGridHeight - 1) : y;
                const cell = gridManager.getGridCell(cx, cy);
                if (!cell) return null;
                const obj = await scene.spawnObjectInGridCell(cell.row, cell.col, type, item);
                if (obj) scene.announceObject(obj, obj.x, obj.y);
                return obj;
            }
            return await scene.spawnAndAnnounce(x, y, type, item);
        } catch (err) {
            console.warn('Key press could not be played:', err);
            return null;
        } finally {
            this.inFlight--;
            // a key spawn has nothing to "release": do not leave the drag lock on
            const h = scene.sceneInputHandler;
            if (h && h.releaseSpawnLock) h.releaseSpawnLock(); else scene.awaitingSpawnInputRelease = false;
        }
    }
}
