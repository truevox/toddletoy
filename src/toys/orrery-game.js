/**
 * "Find it!" game state machine. Pure and forgiving: a wrong tap never ends
 * or penalises anything, it only makes hints arrive sooner.
 */
// Sun, Saturn, Earth, Jupiter first (most recognisable), then the rest.
export const FIND_ORDER = [0, 6, 3, 5, 4, 2, 1, 7, 8];
export const HINT_ORBIT_MS = 10000;
export const HINT_PULSE_MS = 16000;
export const MISSES_FOR_ORBIT = 2;
export const MISSES_FOR_PULSE = 3;

export function createGame() {
  return { active: false, phase: 'idle', round: 0, target: -1, misses: 0, since: 0, found: 0 };
}

export function startGame(g, now) {
  g.active = true; g.round = 0; g.found = 0;
  g.target = FIND_ORDER[0]; g.misses = 0; g.since = now; g.phase = 'asking';
  return g;
}

export function stopGame(g) {
  g.active = false; g.phase = 'idle'; g.target = -1; g.misses = 0;
  return g;
}

/** body: tapped body index (0 = Sun) or -1 for empty space. */
export function tapBody(g, body) {
  if (!g.active || g.phase !== 'asking' || body < 0) return { type: 'ignore', body };
  if (body === g.target) { g.phase = 'celebrating'; g.found += 1; return { type: 'correct', body }; }
  g.misses += 1;
  return { type: 'wrong', body };
}

/** After the celebration: next target (loops forever). */
export function nextRound(g, now) {
  g.round = (g.round + 1) % FIND_ORDER.length;
  g.target = FIND_ORDER[g.round]; g.misses = 0; g.since = now; g.phase = 'asking';
  return g.target;
}

/** 0 = no hint, 1 = target's orbit glows, 2 = the body also pulses. */
export function hintLevel(g, now) {
  if (!g.active || g.phase !== 'asking') return 0;
  const el = now - g.since;
  if (g.misses >= MISSES_FOR_PULSE || el >= HINT_PULSE_MS) return 2;
  if (g.misses >= MISSES_FOR_ORBIT || el >= HINT_ORBIT_MS) return 1;
  return 0;
}
