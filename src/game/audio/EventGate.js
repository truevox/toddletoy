/**
 * EventGate - de-duplication and rate limits for sound events.
 *  - gap: minimum ms between two sounds of the same event (any object)
 *  - perKey: minimum ms between the same event for the same object
 *  - an identical sound (same event, kind and note) within SAME_MS is dropped
 */
const RULES = {
    spawn: { gap: 0, perKey: 0 },
    tap: { gap: 0, perKey: 60 },
    pickup: { gap: 40, perKey: 0 },
    dragStep: { gap: 85, perKey: 0 },   // the rate limit of the xylophone glissando
    drop: { gap: 40, perKey: 0 },
    throw: { gap: 60, perKey: 0 },
    bounce: { gap: 70, perKey: 250 },
    pop: { gap: 55, perKey: 0 },
};
const SAME_MS = 30;

export class EventGate {
    constructor(now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())) {
        this.now = now;
        this.lastEvent = new Map();
        this.lastKey = new Map();
        this.lastSig = new Map();
    }

    allow(event, key, sig) {
        const rule = RULES[event] || { gap: 0, perKey: 0 };
        const t = this.now();
        const le = this.lastEvent.get(event);
        if (le !== undefined && t - le < rule.gap) return false;
        const kk = event + '|' + key;
        const lk = this.lastKey.get(kk);
        if (rule.perKey && lk !== undefined && t - lk < rule.perKey) return false;
        const ss = event + '|' + sig;
        const ls = this.lastSig.get(ss);
        if (sig !== undefined && ls !== undefined && t - ls < SAME_MS) return false;
        this.lastEvent.set(event, t);
        this.lastKey.set(kk, t);
        if (sig !== undefined) this.lastSig.set(ss, t);
        if (this.lastKey.size > 200) { this.lastKey.clear(); this.lastSig.clear(); }
        return true;
    }

    reset() { this.lastEvent.clear(); this.lastKey.clear(); this.lastSig.clear(); }
}
