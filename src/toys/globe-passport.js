/**
 * Globe "passport": the distinct countries a child has visited (selected),
 * persisted via safeStorage (which never throws; a throwing store is also
 * tolerated here so the toy keeps working regardless).
 */
const KEY = 'toddletoy_globe_passport_v1';
const LEARN_KEY = 'toddletoy_globe_learned_v1';

export class Passport {
  /** @param storage object with getItem/setItem/removeItem (may throw) */
  constructor(storage) {
    this.storage = storage;
    this.visited = new Set();
    this.load();
  }

  _get(key) { try { return this.storage.getItem(key); } catch (_) { return null; } }
  _set(key, v) { try { this.storage.setItem(key, v); } catch (_) { /* in-memory only */ } }

  load() {
    this.visited = new Set();
    const raw = this._get(KEY);
    if (!raw) return;
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) for (const k of arr) if (typeof k === 'string' && k) this.visited.add(k);
    } catch (_) { /* corrupt: start fresh */ }
  }

  has(key) { return this.visited.has(key); }
  get count() { return this.visited.size; }
  list() { return [...this.visited]; }

  /** Record a visit. Returns { isNew, count }. */
  add(key) {
    if (!key || typeof key !== 'string') return { isNew: false, count: this.count };
    if (this.visited.has(key)) return { isNew: false, count: this.count };
    this.visited.add(key);
    this._set(KEY, JSON.stringify(this.list()));
    return { isNew: true, count: this.count };
  }

  clear() {
    this.visited = new Set();
    try { this.storage.removeItem(KEY); } catch (_) { /* ignore */ }
  }

  /** Has the child already learned to drag and tap (so the ghost-hand can stop)? */
  isLearned() { return this._get(LEARN_KEY) === '1'; }
  markLearned() { this._set(LEARN_KEY, '1'); }
}
