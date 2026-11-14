/**
 * "Find it!" game logic (pure state machine, injected clock + rng) and
 * weighted random country picking for "Surprise me".
 *
 * Design rules: no punishment path (a wrong tap only reports what was tapped),
 * gentle hint escalation, and difficulty that grows with successes.
 */
import { WELL_KNOWN } from './globe-meta.js';

export const HINT_ROTATE_MISSES = 2;
export const HINT_ROTATE_MS = 10000;
export const HINT_PULSE_MISSES = 4;
export const HINT_PULSE_MS = 20000;
/** Below this on-screen radius a target needs the pulse hint from the start. */
export const MIN_TAPPABLE_PX = 14;

/** Minimum cap radius (deg) a target must have at each difficulty level. */
const LEVEL_MIN_CAP = [14, 9, 6, 3.5, 1.5];
export const MAX_LEVEL = LEVEL_MIN_CAP.length - 1;

export function levelFor(successes) { return Math.min(MAX_LEVEL, Math.floor(successes / 2)); }

/** Approximate on-screen radius (px) of a country at globe radius S (px). */
export function screenRadiusPx(country, S) { return (country.capRadiusDeg * Math.PI / 180) * S; }

function candidates(countries, level, recent) {
  const min = LEVEL_MIN_CAP[level];
  const ok = countries.filter(c => c.alpha2 && c.alpha2 !== 'AQ' && c.alpha2 !== 'TF'
    && c.capRadiusDeg >= min && !recent.includes(c.idx));
  if (level <= 1) {
    const known = ok.filter(c => WELL_KNOWN.has(c.alpha2));
    if (known.length >= 3) return known;
  }
  // never ask for something far too small to tap unless it will be pulsed
  return ok.length ? ok : countries.filter(c => c.alpha2 && c.capRadiusDeg >= 3 && c.alpha2 !== 'AQ');
}

function weighted(list, rng) {
  let total = 0;
  const w = list.map(c => { const x = WELL_KNOWN.has(c.alpha2) ? 4 : 1; total += x; return x; });
  let r = rng() * total;
  for (let i = 0; i < list.length; i++) { r -= w[i]; if (r <= 0) return list[i]; }
  return list[list.length - 1];
}

/** Pick a "Surprise me" country: weighted to well known, never the same twice in a row. */
export function pickSurprise(countries, lastIdx, rng = Math.random) {
  const pool = countries.filter(c => c.idx !== lastIdx && c.alpha2 && c.alpha2 !== 'AQ' && c.alpha2 !== 'TF'
    && c.capRadiusDeg >= 1.2);
  return weighted(pool, rng);
}

export class FindGame {
  constructor(countries, { rng = Math.random } = {}) {
    this.countries = countries;
    this.rng = rng;
    this.active = false;
    this.successes = 0;
    this.recent = [];
    this.target = null;
    this.misses = 0;
    this.askedAt = 0;
    this.hintLevel = 0;      // 0 none, 1 rotated into view, 2 pulsing
    this.pulse = false;
    this.pendingNext = false;
  }

  get level() { return levelFor(this.successes); }

  start(now, S) {
    this.active = true;
    this.successes = 0;
    this.recent = [];
    return this.nextRound(now, S);
  }

  stop() { this.active = false; this.target = null; this.pendingNext = false; this.pulse = false; }

  nextRound(now, S) {
    const pool = candidates(this.countries, this.level, this.recent);
    this.target = weighted(pool, this.rng);
    this.recent.push(this.target.idx);
    if (this.recent.length > 6) this.recent.shift();
    this.misses = 0;
    this.hintLevel = 0;
    this.askedAt = now;
    this.pendingNext = false;
    this.pulse = screenRadiusPx(this.target, S) < MIN_TAPPABLE_PX;
    if (this.pulse) this.hintLevel = 2;
    return this.target;
  }

  /**
   * A tap on `country` (null = ocean). Never punishes.
   * @returns {{type:'correct'|'wrong'|'ocean'|'idle', country?, hint?:string|null}}
   */
  tap(country, now) {
    if (!this.active || !this.target || this.pendingNext) return { type: 'idle' };
    if (country && country.idx === this.target.idx) {
      this.successes++;
      this.pendingNext = true;
      this.pulse = false;
      return { type: 'correct', country };
    }
    this.misses++;
    return { type: country ? 'wrong' : 'ocean', country, hint: this._escalate(now) };
  }

  /** Time-based hint check; returns 'rotate' | 'pulse' | null (each fires once). */
  tick(now) { return this.active && this.target && !this.pendingNext ? this._escalate(now) : null; }

  _escalate(now) {
    const waited = now - this.askedAt;
    if (this.hintLevel < 1 && (this.misses >= HINT_ROTATE_MISSES || waited >= HINT_ROTATE_MS)) {
      this.hintLevel = 1; return 'rotate';
    }
    if (this.hintLevel === 1 && (this.misses >= HINT_PULSE_MISSES || waited >= HINT_PULSE_MS)) {
      this.hintLevel = 2; this.pulse = true; return 'pulse';
    }
    return null;
  }
}
