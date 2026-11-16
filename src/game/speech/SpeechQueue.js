/**
 * SpeechQueue: one request speaking, at most `maxWaiting` waiting (latest wins).
 * Pure bookkeeping, no timers and no speech API, so the rules are easy to test.
 * A request is any object with an `obj` property (the toy object being voiced).
 */
export class SpeechQueue {
    constructor(maxWaiting = 2) {
        this.maxWaiting = maxWaiting;
        this.current = null;
        this.waiting = [];
    }

    /** True when `obj` is speaking or already waiting (no duplicate is added). */
    has(obj) {
        return (this.current && this.current.obj === obj) || this.waiting.some(r => r.obj === obj);
    }

    /**
     * Add a request. Returns { start, dropped }: `start` is true when nothing was
     * speaking so the caller should begin it now; `dropped` lists requests pushed
     * out because more than maxWaiting were waiting (oldest first).
     */
    enqueue(request) {
        if (this.has(request.obj)) return { start: false, dropped: [], duplicate: true };
        if (!this.current) {
            this.current = request;
            return { start: true, dropped: [] };
        }
        this.waiting.push(request);
        const dropped = [];
        while (this.waiting.length > this.maxWaiting) dropped.push(this.waiting.shift());
        return { start: false, dropped };
    }

    /** The current request has finished: promote the next waiting one (or null). */
    advance() {
        this.current = this.waiting.shift() || null;
        return this.current;
    }

    /** Remove a waiting request for `obj`. Returns true if one was dropped. */
    removeWaiting(obj) {
        const before = this.waiting.length;
        this.waiting = this.waiting.filter(r => r.obj !== obj);
        return this.waiting.length !== before;
    }

    clear() {
        this.current = null;
        this.waiting = [];
    }
}
