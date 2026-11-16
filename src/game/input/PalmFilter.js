/**
 * PalmFilter - a flat palm lands as 4+ contacts within a few milliseconds inside a
 * hand-sized area. Such a cluster is ONE soft touch at its centre, not a burst of spawns.
 * Fingers that are spread out or arrive one after another each count on their own.
 * Pure: the caller supplies the clock and the timer.
 */
export const PALM_WINDOW_MS = 50;       // contacts landing this close together are judged together
export const PALM_MIN_CONTACTS = 4;     // fewer than this is just fingers
export const PALM_RADIUS = 120;         // logical px: every contact within this of the cluster centre
export const PALM_GRACE_MS = 300;       // stragglers of the same hand land within this long

export class PalmFilter {
    constructor({ windowMs = PALM_WINDOW_MS, minContacts = PALM_MIN_CONTACTS, radius = PALM_RADIUS, graceMs = PALM_GRACE_MS } = {}) {
        this.windowMs = windowMs; this.minContacts = minContacts; this.radius = radius; this.graceMs = graceMs;
        this.reset();
    }

    reset() {
        this.pending = [];
        this.windowStart = 0;
        this.members = new Set();
        this.zone = null;   // { x, y, until } where late contacts still belong to the palm
    }

    isPending(id) { return this.pending.some(p => p.id === id); }
    isMember(id) { return this.members.has(id); }
    hasPending() { return this.pending.length > 0; }

    /** A contact lands: it joins the palm just made, or waits for the window to close. */
    offer(contact, now) {
        const z = this.zone;
        if (z && now < z.until && Math.hypot(contact.x - z.x, contact.y - z.y) <= this.radius) {
            this.members.add(contact.id);
            return { absorbed: true };
        }
        if (!this.pending.length) this.windowStart = now;
        this.pending.push({ id: contact.id, x: contact.x, y: contact.y, lx: contact.x, ly: contact.y });
        return { absorbed: false };
    }

    updatePending(id, x, y) {
        const p = this.pending.find(q => q.id === id);
        if (p) { p.lx = x; p.ly = y; } // where it went down stays; this is where it is now
    }

    removePending(id) { this.pending = this.pending.filter(p => p.id !== id); }
    release(id) { this.members.delete(id); }
    due(now) { return this.pending.length > 0 && now - this.windowStart >= this.windowMs; }

    /** Close the window: returns { palms: [{ids, x, y}], singles: [{id, x, y}] }. */
    flush(now) {
        let rest = this.pending;
        this.pending = [];
        const palms = [];
        while (rest.length >= this.minContacts) {
            let best = null;
            for (const seed of rest) {
                const group = rest.filter(p => Math.hypot(p.x - seed.x, p.y - seed.y) <= this.radius);
                if (!best || group.length > best.length) best = group;
            }
            if (!best || best.length < this.minContacts) break;
            const x = best.reduce((s, p) => s + p.x, 0) / best.length;
            const y = best.reduce((s, p) => s + p.y, 0) / best.length;
            const ids = best.map(p => p.id);
            ids.forEach(id => this.members.add(id));
            this.zone = { x, y, until: now + this.graceMs };
            palms.push({ ids, x, y });
            rest = rest.filter(p => !ids.includes(p.id));
        }
        return { palms, singles: rest };
    }
}
