/**
 * Pure time model: real orbital period ratios, speed steps and the
 * "spin the mobile" scrub gesture with inertia.
 */
import { EARTH_ORBIT_SECONDS } from './orrery-data.js';

export const TAU = Math.PI * 2;
/** Sim time is in Earth years. At 1x, one year passes in EARTH_ORBIT_SECONDS. */
export const BASE_YEARS_PER_SEC = 1 / EARTH_ORBIT_SECONDS;
/** One full turn of the finger around the Sun = this many Earth years. */
export const YEARS_PER_TURN = 4;
export const SPEED_STEPS = [0.25, 1, 3, 10];
export const DEFAULT_SPEED_INDEX = 1;
export const MAX_VELOCITY = 25; // years per second, inertia cap
export const INERTIA_TAU = 0.7; // seconds

/** Counter-clockwise (on screen) orbital angle in radians at tYears. */
export function orbitAngle(body, tYears) {
  if (!body.periodYears) return 0;
  return (body.startDeg * Math.PI) / 180 + (TAU * tYears) / body.periodYears;
}

/** World position (y down; counter-clockwise on screen). Writes into out. */
export function worldPosition(body, tYears, out) {
  const a = orbitAngle(body, tYears);
  out.x = Math.cos(a) * body.orbitR;
  out.y = -Math.sin(a) * body.orbitR;
  return out;
}

export function stepSpeedIndex(index, dir) {
  return Math.min(SPEED_STEPS.length - 1, Math.max(0, index + dir));
}

/** Screen-angle delta (CCW positive, radians) of a pointer move around (cx, cy). */
export function scrubAngleDelta(px, py, x, y, cx, cy, gainRef = 1e9) {
  const ax = px - cx, ay = -(py - cy);
  const bx = x - cx, by = -(y - cy);
  const cross = ax * by - ay * bx;
  const dot = ax * bx + ay * by;
  let d = Math.atan2(cross, dot);
  const rb = Math.hypot(bx, by);
  const MIN_R = 40;
  if (rb < MIN_R) d *= rb / MIN_R; // too close to the Sun: calm the gain
  else if (rb > gainRef) d *= Math.min(6, rb / gainRef); // far away (zoomed): keep it feeling linear
  return d;
}

export class TimeController {
  constructor(reduced = false) {
    this.t = 0;
    this.speedIndex = reduced ? 0 : DEFAULT_SPEED_INDEX;
    this.paused = false;
    this.vel = 0;
    this.dragging = false;
    this._sampled = false;
  }

  /** Years per second from the speed buttons (0 when paused). */
  get rate() {
    return this.paused ? 0 : BASE_YEARS_PER_SEC * SPEED_STEPS[this.speedIndex];
  }

  togglePause() { this.paused = !this.paused; return this.paused; }
  slower() { this.speedIndex = stepSpeedIndex(this.speedIndex, -1); this.paused = false; return this.speedIndex; }
  faster() { this.speedIndex = stepSpeedIndex(this.speedIndex, +1); this.paused = false; return this.speedIndex; }

  beginScrub() { this.dragging = true; this._sampled = false; }

  /** dAngle: counter-clockwise radians of finger travel around the Sun. */
  scrub(dAngle, dtSec) {
    const dYears = (dAngle / TAU) * YEARS_PER_TURN;
    this.t += dYears;
    const inst = dYears / Math.max(0.001, dtSec);
    this.vel = this.vel * 0.55 + inst * 0.45;
    this._sampled = true;
  }

  endScrub() {
    this.dragging = false;
    this.vel = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, this.vel));
  }

  step(dtSec) {
    if (this.dragging) {
      // Finger is in control; if it paused, the flick energy fades fast.
      if (!this._sampled) this.vel *= Math.exp(-dtSec / 0.06);
      this._sampled = false;
      return this.t;
    }
    this.t += (this.rate + this.vel) * dtSec;
    this.vel *= Math.exp(-dtSec / INERTIA_TAU);
    if (Math.abs(this.vel) < 1e-4) this.vel = 0;
    return this.t;
  }
}
