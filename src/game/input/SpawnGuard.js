/**
 * SpawnGuard - the anti-bounce rules, kept per finger so one finger cannot stop another.
 * - a finger that is (or just was) dragging cannot also spawn for MOVE_DELAY ms
 * - a finger cannot grab, within SPAWN_DELAY ms, what it has just made
 * Pure: the caller supplies the clock.
 */
export const MOVE_DELAY = 200;
export const SPAWN_DELAY = 200;

export class SpawnGuard {
    constructor({ moveDelay = MOVE_DELAY, spawnDelay = SPAWN_DELAY } = {}) {
        this.moveDelay = moveDelay; this.spawnDelay = spawnDelay;
        this.lastMove = new Map(); this.lastSpawn = new Map();
    }
    noteMove(id, now) { this.lastMove.set(id, now); }
    noteSpawn(id, now) { this.lastSpawn.set(id, now); }
    canSpawn(id, now) { const t = this.lastMove.get(id); return t === undefined || now - t >= this.moveDelay; }
    canDrag(id, now) { const t = this.lastSpawn.get(id); return t === undefined || now - t >= this.spawnDelay; }
    /** A finger lifted. Keep the clocks: a re-touch within the delay on the same slot is the bounce. */
    release() {}
    reset() { this.lastMove.clear(); this.lastSpawn.clear(); }
}

/**
 * Phones can follow a touch with an emulated mouse press at the same spot.
 * A mouse press that close to a recent touch is that echo, not a second finger.
 */
export class EmulatedMouseFilter {
    constructor({ windowMs = 800, radius = 40 } = {}) { this.windowMs = windowMs; this.radius = radius; this.last = null; }
    noteTouch(x, y, now) { this.last = { x, y, t: now }; }
    isDuplicate(isTouch, x, y, now) {
        if (isTouch || !this.last) return false;
        return now - this.last.t <= this.windowMs && Math.hypot(x - this.last.x, y - this.last.y) <= this.radius;
    }
}
