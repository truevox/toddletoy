/** EventLog - small ring buffer of recent sound events, so tests can assert what was played. */
export class EventLog {
    constructor(capacity = 64) { this.capacity = capacity; this.items = []; }
    add(entry) {
        this.items.push(entry);
        if (this.items.length > this.capacity) this.items.shift();
    }
    list() { return this.items.slice(); }
    clear() { this.items.length = 0; }
}
