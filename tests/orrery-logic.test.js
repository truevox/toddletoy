import {
  BODIES, factsFor, FRIENDLY, SCALE_NOTE, spokenName, PLANET_COUNT,
} from '../src/toys/orrery-data.js';
import {
  orbitAngle, worldPosition, TimeController, scrubAngleDelta, SPEED_STEPS, DEFAULT_SPEED_INDEX,
  BASE_YEARS_PER_SEC, TAU,
} from '../src/toys/orrery-time.js';
import {
  createCamera, fitScale, followZoom, zoomAbout, stepCamera, clampFocus, goHome, worldToScreen, screenToWorld,
  bodyRadiusPx, MIN_ZOOM, MAX_ZOOM, MAX_FOLLOW_ZOOM,
} from '../src/toys/orrery-camera.js';
import { layoutMode, stripRows, freeRect } from '../src/toys/orrery-layout.js';
import {
  createGame, startGame, tapBody, nextRound, hintLevel, stopGame, FIND_ORDER,
} from '../src/toys/orrery-game.js';
import { compareLayout, pickCompare, clampScroll, MIN_HIT } from '../src/toys/orrery-compare.js';
import { GestureTracker } from '../src/toys/orrery-gesture.js';
import { chimeFrequency, audioLevel, pickLanguage, speakLocal } from '../src/toys/orrery-audio.js';

describe('orbital time', () => {
  const earth = BODIES[3], jupiter = BODIES[5], mercury = BODIES[1];

  test('real period ratios: after one Earth year Earth is back, Jupiter moved 1/11.862', () => {
    const a0 = orbitAngle(earth, 0), a1 = orbitAngle(earth, 1);
    expect(a1 - a0).toBeCloseTo(TAU, 9);
    expect(orbitAngle(jupiter, 1) - orbitAngle(jupiter, 0)).toBeCloseTo(TAU / 11.862, 9);
  });

  test('inner planets lap the outer ones (Mercury ~4.15 orbits per Earth year)', () => {
    const turns = (orbitAngle(mercury, 1) - orbitAngle(mercury, 0)) / TAU;
    expect(turns).toBeCloseTo(365.25 / 87.97, 2);
  });

  test('Neptune period is ~165 Earth years', () => {
    expect(BODIES[8].periodYears).toBeCloseTo(164.8, 1);
  });

  test('default speed gives an Earth orbit of 20-30 seconds', () => {
    const tc = new TimeController();
    expect(1 / tc.rate).toBeGreaterThanOrEqual(20);
    expect(1 / tc.rate).toBeLessThanOrEqual(30);
    expect(SPEED_STEPS[DEFAULT_SPEED_INDEX]).toBe(1);
  });

  test('positions are on their orbits and move counter-clockwise on screen (y down)', () => {
    const p = { x: 0, y: 0 };
    worldPosition(earth, 0, p);
    expect(Math.hypot(p.x, p.y)).toBeCloseTo(earth.orbitR, 6);
    const a = Math.atan2(-p.y, p.x);
    worldPosition(earth, 0.01, p);
    const b = Math.atan2(-p.y, p.x);
    expect(b).toBeGreaterThan(a);
  });

  test('sizes are exaggerated but ordered truthfully', () => {
    const by = n => BODIES.find(b => b.name === n);
    const r = n => by(n).r;
    expect(r('Jupiter')).toBeGreaterThan(r('Saturn'));
    expect(r('Saturn')).toBeGreaterThan(r('Uranus'));
    expect(r('Uranus')).toBeGreaterThanOrEqual(r('Neptune'));
    expect(r('Neptune')).toBeGreaterThan(r('Earth'));
    expect(r('Earth')).toBeGreaterThanOrEqual(r('Venus'));
    expect(r('Venus')).toBeGreaterThan(r('Mars'));
    expect(r('Mars')).toBeGreaterThan(r('Mercury'));
    const m = n => by(n).minPx;
    ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Earth', 'Venus', 'Mars', 'Mercury'].reduce((prev, n) => {
      if (prev) expect(m(prev)).toBeGreaterThanOrEqual(m(n));
      return n;
    }, null);
  });
});

describe('scrub gesture and inertia', () => {
  test('counter-clockwise finger travel gives a positive angle, clockwise negative', () => {
    // centre (0,0); finger moves from east to north (screen y is down)
    expect(scrubAngleDelta(100, 0, 0, -100, 0, 0)).toBeCloseTo(Math.PI / 2, 6);
    expect(scrubAngleDelta(0, -100, 100, 0, 0, 0)).toBeCloseTo(-Math.PI / 2, 6);
  });

  test('gain is calmed very near the Sun', () => {
    const near = Math.abs(scrubAngleDelta(10, 0, 0, -10, 0, 0));
    expect(near).toBeLessThan(Math.PI / 2);
  });

  test('scrub moves time in the right direction at each planet’s own rate', () => {
    const tc = new TimeController();
    tc.beginScrub();
    tc.scrub(Math.PI / 2, 0.05);
    expect(tc.t).toBeGreaterThan(0);
    const t1 = tc.t;
    tc.scrub(-Math.PI, 0.05);
    expect(tc.t).toBeLessThan(t1);
    // Mercury moves further than Jupiter for the same time change
    const dM = Math.abs(orbitAngle(BODIES[1], tc.t) - orbitAngle(BODIES[1], 0));
    const dJ = Math.abs(orbitAngle(BODIES[5], tc.t) - orbitAngle(BODIES[5], 0));
    expect(dM / dJ).toBeCloseTo(11.862 / (87.97 / 365.25), 4);
  });

  test('releasing keeps momentum, which decays back to normal play', () => {
    const tc = new TimeController();
    tc.beginScrub();
    for (let i = 0; i < 10; i++) tc.scrub(0.15, 0.016);
    tc.endScrub();
    const v0 = tc.vel;
    expect(v0).toBeGreaterThan(0);
    const t0 = tc.t;
    tc.step(0.5);
    expect(tc.t).toBeGreaterThan(t0 + tc.rate * 0.5);
    for (let i = 0; i < 600; i++) tc.step(0.016);
    expect(tc.vel).toBe(0);
    const t1 = tc.t;
    tc.step(1);
    expect(tc.t - t1).toBeCloseTo(BASE_YEARS_PER_SEC, 9);
  });

  test('a held-still finger loses its flick energy', () => {
    const tc = new TimeController();
    tc.beginScrub();
    tc.scrub(0.3, 0.016);
    for (let i = 0; i < 20; i++) tc.step(0.016);
    tc.endScrub();
    expect(Math.abs(tc.vel)).toBeLessThan(0.05);
  });

  test('paused stays paused after inertia, speed steps clamp', () => {
    const tc = new TimeController();
    tc.togglePause();
    tc.vel = 3;
    for (let i = 0; i < 800; i++) tc.step(0.016);
    const t = tc.t;
    tc.step(1);
    expect(tc.t).toBe(t);
    for (let i = 0; i < 10; i++) tc.faster();
    expect(tc.speedIndex).toBe(SPEED_STEPS.length - 1);
    expect(tc.paused).toBe(false);
    for (let i = 0; i < 10; i++) tc.slower();
    expect(tc.speedIndex).toBe(0);
  });

  test('reduced motion starts at the slowest step', () => {
    expect(new TimeController(true).speedIndex).toBe(0);
  });
});

describe('camera', () => {
  const view = { cx: 400, cy: 300, base: 0.8 };

  test('world <-> screen round trip', () => {
    const cam = createCamera(); cam.fx = 30; cam.fy = -20; cam.z = 2.5;
    const s = worldToScreen(view, cam, 50, 60, { x: 0, y: 0 });
    const w = screenToWorld(view, cam, s.x, s.y, { x: 0, y: 0 });
    expect(w.x).toBeCloseTo(50, 9); expect(w.y).toBeCloseTo(60, 9);
  });

  test('follow zoom is larger for small planets and bounded', () => {
    const base = 0.4;
    expect(followZoom(BODIES[1].r, base, 320, 280)).toBeGreaterThan(followZoom(BODIES[5].r, base, 320, 280));
    expect(followZoom(0.01, base, 320, 280)).toBeLessThanOrEqual(MAX_FOLLOW_ZOOM);
    expect(followZoom(1000, base, 320, 280)).toBeGreaterThanOrEqual(1.8);
  });

  test('easing settles in about 700ms and moves monotonically', () => {
    const cam = createCamera(); cam.tx = 100; cam.ty = -50; cam.tz = 4;
    let last = 0;
    for (let ms = 0; ms < 700; ms += 16) { stepCamera(cam, 16); expect(cam.z).toBeGreaterThanOrEqual(last); last = cam.z; }
    expect(Math.abs(cam.z - 4) / 3).toBeLessThan(0.02);
    expect(Math.abs(cam.fx - 100) / 100).toBeLessThan(0.02);
  });

  test('reduced motion snaps instantly', () => {
    const cam = createCamera(); cam.tx = 10; cam.tz = 3;
    stepCamera(cam, 16, true);
    expect(cam.z).toBe(3); expect(cam.fx).toBe(10);
  });

  test('zoomAbout keeps the point under the finger and clamps 1x-4x', () => {
    const cam = createCamera();
    zoomAbout(view, cam, 600, 300, 2);
    const before = screenToWorld(view, { ...cam, fx: 0, fy: 0, z: 1 }, 600, 300, { x: 0, y: 0 });
    const after = screenToWorld(view, { ...cam, fx: cam.tx, fy: cam.ty, z: cam.tz }, 600, 300, { x: 0, y: 0 });
    expect(after.x).toBeCloseTo(before.x, 6);
    zoomAbout(view, cam, 600, 300, 100);
    expect(cam.tz).toBe(MAX_ZOOM);
    zoomAbout(view, cam, 600, 300, 0.0001);
    expect(cam.tz).toBe(MIN_ZOOM);
    expect(Math.hypot(cam.tx, cam.ty)).toBeCloseTo(0, 6); // locked to the Sun at 1x
  });

  test('clampFocus and home', () => {
    expect(clampFocus(1000, 0, 1)).toEqual({ x: 0, y: 0 });
    expect(clampFocus(10, 10, 4).x).toBe(10);
    const cam = createCamera(); cam.follow = 3; cam.tz = 5; goHome(cam);
    expect(cam).toMatchObject({ follow: -1, tx: 0, ty: 0, tz: 1 });
  });

  test('fitScale fits Neptune and tiny planets keep a floor radius', () => {
    const s = fitScale(300, 300);
    expect(372 * s).toBeLessThan(150);
    expect(bodyRadiusPx(BODIES[1], 0.1)).toBe(BODIES[1].minPx);
    expect(bodyRadiusPx(BODIES[5], 5)).toBe(BODIES[5].r * 5);
  });
});

describe('layout and strip', () => {
  test('modes at the target viewports', () => {
    expect(layoutMode(320, 568)).toBe('portrait');
    expect(layoutMode(393, 851)).toBe('portrait');
    expect(layoutMode(768, 1024)).toBe('portrait');
    expect(layoutMode(851, 393)).toBe('landscape');
    expect(layoutMode(1280, 800)).toBe('landscape');
  });

  test('strip: nine 48px buttons need two rows on phones, one on wide screens', () => {
    expect(stripRows(296)).toEqual([5, 4]);
    expect(stripRows(377)).toEqual([5, 4]);
    expect(stripRows(560)).toEqual([9]);
  });

  test('strip order is Sun then Mercury..Neptune', () => {
    expect(BODIES.map(b => b.name)).toEqual(['Sun', 'Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune']);
    for (let i = 2; i < BODIES.length; i++) expect(BODIES[i].orbitR).toBeGreaterThan(BODIES[i - 1].orbitR);
  });

  test('free area leaves room for the dock / side panel', () => {
    const p = freeRect('portrait', 393, 851, { topH: 60, bottomH: 300 });
    expect(p.y + p.h).toBe(851 - 300);
    const l = freeRect('landscape', 851, 393, { sideW: 289, stripH: 70 });
    expect(l.w).toBe(851 - 289);
    expect(l.h).toBe(393 - 70);
  });
});

describe('Find it! game', () => {
  test('starts with Sun, Saturn, Earth, Jupiter and covers every body', () => {
    expect(FIND_ORDER.slice(0, 4)).toEqual([0, 6, 3, 5]);
    expect([...FIND_ORDER].sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  test('progression: correct -> celebrating -> next, looping forever', () => {
    const g = createGame();
    startGame(g, 0);
    expect(g.target).toBe(0);
    expect(tapBody(g, 0).type).toBe('correct');
    expect(g.phase).toBe('celebrating');
    expect(tapBody(g, 6).type).toBe('ignore');
    expect(nextRound(g, 100)).toBe(6);
    expect(g.phase).toBe('asking');
    for (let i = 0; i < FIND_ORDER.length; i++) nextRound(g, 0);
    expect(g.target).toBe(6);
  });

  test('wrong taps are never punished: they only count and the game keeps waiting', () => {
    const g = createGame();
    startGame(g, 0);
    const r = tapBody(g, 3);
    expect(r).toEqual({ type: 'wrong', body: 3 });
    expect(g.phase).toBe('asking');
    expect(g.active).toBe(true);
    expect(g.found).toBe(0);
    expect(tapBody(g, -1).type).toBe('ignore'); // empty space is not a miss
    expect(g.misses).toBe(1);
    expect(tapBody(g, 0).type).toBe('correct');
  });

  test('hint escalation: after two misses or ~10s the orbit glows, then the planet pulses', () => {
    const g = createGame();
    startGame(g, 1000);
    expect(hintLevel(g, 1000)).toBe(0);
    expect(hintLevel(g, 10999)).toBe(0);
    expect(hintLevel(g, 11000)).toBe(1);
    expect(hintLevel(g, 17000)).toBe(2);
    nextRound(g, 20000);
    expect(hintLevel(g, 20000)).toBe(0);
    tapBody(g, 1); expect(hintLevel(g, 20001)).toBe(0);
    tapBody(g, 2); expect(hintLevel(g, 20002)).toBe(1);
    tapBody(g, 4); expect(hintLevel(g, 20003)).toBe(2);
    stopGame(g);
    expect(hintLevel(g, 99999)).toBe(0);
  });
});

describe('compare sizes', () => {
  const L = compareLayout(20);
  const r = i => L.items[i - 1].r;

  test('true relative diameters (Earth = 1)', () => {
    expect(r(3)).toBeCloseTo(10, 6);
    expect(r(5) / r(3)).toBeCloseTo(11.21, 2);
    expect(r(6) / r(3)).toBeCloseTo(9.45, 2);
    expect(r(7) / r(3)).toBeCloseTo(4.01, 2);
    expect(r(8) / r(3)).toBeCloseTo(3.88, 2);
    expect(r(1) / r(3)).toBeCloseTo(0.383, 3);
    expect(r(4) / r(3)).toBeCloseTo(0.532, 3);
    expect(L.sun.r / r(3)).toBeCloseTo(109.2, 1);
  });

  test('planets are in order from the Sun, spaced, with only an arc of the Sun showing', () => {
    for (let i = 1; i < 8; i++) expect(L.items[i].cx).toBeGreaterThan(L.items[i - 1].cx + 40);
    expect(L.sun.cx + L.sun.r).toBeLessThan(L.items[0].cx - L.items[0].r);
    expect(L.sun.cx + L.sun.r).toBeGreaterThan(0); // limb on screen
    expect(L.sun.cx).toBeLessThan(0); // the Sun's centre is off screen
  });

  test('Mercury has an enlarged invisible hit area and a ring marker', () => {
    const m = L.items[0];
    expect(m.r).toBeLessThan(5);
    expect(m.hitR).toBeGreaterThanOrEqual(MIN_HIT);
    expect(m.ring).toBe(true);
    expect(L.items[4].ring).toBe(false);
    expect(pickCompare(L, m.cx + 20, m.cy + 10)).toBe(1);
    expect(pickCompare(L, L.items[4].cx, 0)).toBe(5);
    expect(pickCompare(L, L.sun.cx + L.sun.r - 5, 0)).toBe(0);
    expect(pickCompare(L, 400, 300)).toBe(-1);
  });

  test('scroll clamps to the world', () => {
    expect(clampScroll(50, 1000, 400)).toBe(0);
    expect(clampScroll(-900, 1000, 400)).toBe(-600);
    expect(clampScroll(-10, 300, 400)).toBe(0);
  });
});

describe('gesture tracker', () => {
  const make = () => {
    const ev = [];
    const g = new GestureTracker({
      onTap: (x, y) => ev.push(['tap', x, y]), onDoubleTap: () => ev.push(['dbl']),
      onDragStart: () => ev.push(['ds']), onDrag: () => ev.push(['d']), onDragEnd: () => ev.push(['de']),
      onPinch: p => ev.push(['pinch', p.scale]), onPinchEnd: () => ev.push(['pe']),
    });
    return { g, ev };
  };

  test('tap, double tap, drag, pinch', () => {
    const { g, ev } = make();
    g.down(1, 10, 10, 0); g.up(1, 10, 10, 50);
    expect(ev).toEqual([['tap', 10, 10]]);
    g.down(1, 12, 10, 150); g.up(1, 12, 10, 190);
    expect(ev.map(e => e[0])).toEqual(['tap', 'tap', 'dbl']);
    ev.length = 0;
    g.down(1, 0, 0, 1000); g.move(1, 30, 0, 1016); g.move(1, 60, 0, 1032); g.up(1, 60, 0, 1048);
    expect(ev.map(e => e[0])).toEqual(['ds', 'd', 'd', 'de']);
    ev.length = 0;
    g.down(1, 100, 100, 2000); g.down(2, 200, 100, 2001); g.move(2, 300, 100, 2020);
    expect(ev[0][0]).toBe('pinch');
    expect(ev[0][1]).toBeCloseTo(2, 6);
    g.up(2, 300, 100, 2040); g.up(1, 100, 100, 2041);
    expect(ev.map(e => e[0])).toEqual(['pinch', 'pe']);
  });

  test('a slow press is not a tap and a second finger cancels a drag', () => {
    const { g, ev } = make();
    g.down(1, 0, 0, 0); g.up(1, 0, 0, 900);
    expect(ev).toEqual([]);
    g.down(1, 0, 0, 1000); g.move(1, 40, 0, 1010); g.down(2, 100, 0, 1020);
    expect(ev.map(e => e[0])).toEqual(['ds', 'd', 'de']);
  });
});

describe('facts, language and audio helpers', () => {
  test('every body has a friendly line and facts; scale note wording', () => {
    expect(FRIENDLY).toHaveLength(9);
    expect(PLANET_COUNT).toBe(8);
    for (let i = 0; i <= 8; i++) expect(factsFor(i).length).toBeGreaterThanOrEqual(4);
    expect(factsFor(6).find(f => f.label === 'Place').value).toBe('6th planet from the Sun');
    expect(factsFor(5).find(f => f.label === 'Moons').value).toMatch(/more than 90/);
    expect(factsFor(2).find(f => f.label === 'A day (one spin)').value).toMatch(/longer than its year/);
    expect(SCALE_NOTE).toBe('Sizes and distances here are not to scale. Speeds are in the right proportion.');
  });

  test('chime pitch steps up with distance', () => {
    for (let i = 1; i < 9; i++) expect(chimeFrequency(i)).toBeGreaterThan(chimeFrequency(i - 1));
  });

  test('audio level honours mute and volume; language picks safe translations only', () => {
    expect(audioLevel({ getAudioConfig: () => ({ mute: true, volume: 80 }) })).toBe(0);
    expect(audioLevel({ getAudioConfig: () => ({ volume: 40 }) })).toBeCloseTo(0.4);
    expect(audioLevel(null)).toBeCloseTo(0.7);
    const cm = code => ({ getConfig: () => ({ languages: { enabled: [{ code }] } }) });
    expect(pickLanguage(cm('es'))).toBe('es');
    expect(pickLanguage(cm('fr-CA'))).toBe('fr');
    expect(pickLanguage(cm('pt'))).toBe('pt');
    expect(pickLanguage(cm('ja'))).toBe('en');
    expect(pickLanguage(null)).toBe('en');
    expect(spokenName(6, 'es')).toBe('Saturno');
    expect(spokenName(6, 'xx')).toBe('Saturn');
  });

  test('speakLocal tags the language, honours mute, never throws', () => {
    const speak = jest.fn(), cancel = jest.fn();
    const saved = [global.speechSynthesis, global.SpeechSynthesisUtterance];
    global.speechSynthesis = { speak, cancel };
    global.SpeechSynthesisUtterance = function (t) { this.text = t; };
    try {
      expect(speakLocal({ getSpeechConfig: () => ({ volume: 50, rate: 1.2 }) }, 'Saturno', { lang: 'es' })).toBe(true);
      const u = speak.mock.calls[0][0];
      expect(u.lang).toBe('es'); expect(u.volume).toBeCloseTo(0.5); expect(u.rate).toBeCloseTo(1.2);
      expect(speakLocal({ getSpeechConfig: () => ({ mute: true }) }, 'x')).toBe(false);
      global.speechSynthesis = { speak() { throw new Error('boom'); }, cancel };
      expect(() => speakLocal(null, 'x')).not.toThrow();
      delete global.speechSynthesis;
      expect(speakLocal(null, 'x')).toBe(false);
    } finally { [global.speechSynthesis, global.SpeechSynthesisUtterance] = saved; }
  });
});
