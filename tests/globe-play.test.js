import { getGlobeData } from '../src/toys/globe-data.js';
import { META_KEYS, metaFor, metaKey, CONTINENTS } from '../src/toys/globe-meta.js';
import {
  easeInOutCubic, shortestLonDelta, createFly, sampleFly, clampZoom, zoomFromWheel, pinchZoom, stepZoom,
  dragToDegrees, ZOOM_MIN, ZOOM_MAX,
} from '../src/toys/globe-anim.js';
import { makeView } from '../src/toys/globe-math.js';
import { layoutLabels, computeAnchors } from '../src/toys/globe-labels.js';
import { FindGame, pickSurprise, levelFor, MIN_TAPPABLE_PX } from '../src/toys/globe-game.js';
import { Passport } from '../src/toys/globe-passport.js';
import { countryNameIn, localisedNames, findPrompt, speakableLanguages, enabledLanguages } from '../src/toys/globe-intl.js';
import { GestureTracker } from '../src/toys/globe-input.js';
import { computeLayout } from '../src/toys/globe-layout.js';

const { countries } = getGlobeData();
computeAnchors(countries);
const byName = n => countries.find(c => c.rawName === n);

describe('continent + capital table', () => {
  test('every country feature has a continent', () => {
    for (const c of countries) {
      const m = metaFor(c);
      expect(m && m.continent).toBeTruthy();
      expect(Object.values(CONTINENTS)).toContain(m.continent);
    }
  });
  test('capitals are non-empty strings where present, and every table key maps to a feature', () => {
    const keys = new Set(countries.map(metaKey));
    for (const k of META_KEYS) expect(keys.has(k)).toBe(true);
    for (const c of countries) {
      const m = metaFor(c);
      if (m.capital !== null) { expect(typeof m.capital).toBe('string'); expect(m.capital.trim().length).toBeGreaterThan(0); }
    }
  });
  test('spot checks of tricky capitals', () => {
    const cap = n => metaFor(byName(n)).capital;
    expect(cap('South Africa')).toBe('Pretoria');
    expect(cap('Bolivia')).toBe('Sucre');
    expect(cap('Netherlands')).toBe('Amsterdam');
    expect(cap('Australia')).toBe('Canberra');
    expect(cap('Brazil')).toBe('Brasília');
    expect(cap('Turkey')).toBe('Ankara');
    expect(cap('Canada')).toBe('Ottawa');
    expect(cap('Israel')).toBeNull();
    expect(cap('W. Sahara')).toBeNull();
    expect(metaFor(byName('Brazil')).continent).toBe('South America');
  });
});

describe('animation + zoom math', () => {
  test('easing endpoints and monotone', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5);
    expect(easeInOutCubic(0.3)).toBeLessThan(easeInOutCubic(0.7));
  });
  test('shortest path across the antimeridian', () => {
    expect(shortestLonDelta(170, -170)).toBe(20);
    expect(shortestLonDelta(-170, 170)).toBe(-20);
    expect(shortestLonDelta(0, 180)).toBe(180);
    const f = createFly({ lon: 170, lat: 0, zoom: 1 }, { lon: -170, lat: 80, zoom: 9 }, 0, 600);
    const out = {};
    expect(sampleFly(f, 300, out)).toBe(false);
    expect(Math.abs(out.lon)).toBeCloseTo(180, 5);
    expect(sampleFly(f, 600, out)).toBe(true);
    expect(out.lon).toBeCloseTo(-170);
    expect(out.lat).toBe(60);
    expect(out.zoom).toBe(ZOOM_MAX);
  });
  test('extra spin goes the same way round', () => {
    const f = createFly({ lon: 0, lat: 0, zoom: 1 }, { lon: -30, lat: 0, zoom: 1 }, 0, 1000, 360);
    expect(f.dLon).toBe(-390);
  });
  test('zoom clamps; wheel, pinch and steps', () => {
    expect(clampZoom(0.2)).toBe(ZOOM_MIN);
    expect(clampZoom(99)).toBe(ZOOM_MAX);
    expect(clampZoom(NaN)).toBe(1);
    expect(zoomFromWheel(1, -100)).toBeGreaterThan(1);
    expect(zoomFromWheel(2, 100)).toBeLessThan(2);
    expect(zoomFromWheel(5, -10000)).toBe(5);
    expect(pinchZoom(2, 100, 200)).toBeCloseTo(4);
    expect(pinchZoom(2, 100, 400)).toBe(5);
    expect(pinchZoom(2, 0, 50)).toBe(2);
    expect(stepZoom(1, -1)).toBe(1);
    expect(stepZoom(1, 1)).toBeGreaterThan(1);
  });
  test('drag sensitivity scales so the surface tracks the finger', () => {
    const a = dragToDegrees(50, 0, 200, 1, 0), b = dragToDegrees(50, 0, 200, 4, 0);
    expect(Math.abs(b.dLon)).toBeCloseTo(Math.abs(a.dLon) / 4, 5);
    expect(a.dLon).toBeLessThan(0);
  });
});

describe('labels', () => {
  const base = { view: makeView(0, 20), S: 300, cx: 400, cy: 300, w: 800, h: 600, scale: 1, countries };
  const run = zoom => { const r = layoutLabels({ ...base, zoom, S: 300 * zoom }); return r.items.slice(0, r.n).map(o => ({ ...o })); };
  test('low zoom: continents and oceans only; no overlaps', () => {
    const l = run(1);
    expect(l.length).toBeGreaterThan(2);
    expect(l.every(o => o.kind !== 'country')).toBe(true);
    for (let i = 0; i < l.length; i++) for (let j = i + 1; j < l.length; j++) {
      const a = l[i], b = l[j];
      expect(Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < a.size).toBe(false);
    }
  });
  test('high zoom: continents fade out, countries appear but are capped and never overlap', () => {
    const l = run(4);
    expect(l.some(o => o.kind === 'continent')).toBe(false);
    const c = l.filter(o => o.kind === 'country');
    expect(c.length).toBeGreaterThan(0);
    expect(c.length).toBeLessThanOrEqual(14);
    for (let i = 0; i < c.length; i++) for (let j = i + 1; j < c.length; j++) {
      expect(Math.abs(c[i].x - c[j].x) < (c[i].w + c[j].w) / 2 && Math.abs(c[i].y - c[j].y) < c[i].size).toBe(false);
    }
    for (const o of l) { expect(o.x).toBeGreaterThan(0); expect(o.x).toBeLessThan(800); }
  });
  test('anchors lie inside their countries', () => {
    const b = byName('Brazil').anchor;
    expect(b.lat).toBeLessThan(5); expect(b.lon).toBeLessThan(-30);
  });
});

describe('find game', () => {
  let rng; const seq = () => { let s = 7; rng = () => ((s = (s * 16807) % 2147483647) / 2147483647); };
  beforeEach(seq);
  test('starts easy, and difficulty rises with successes', () => {
    const g = new FindGame(countries, { rng });
    const first = g.start(0, 300);
    expect(first.capRadiusDeg).toBeGreaterThanOrEqual(14);
    expect(levelFor(0)).toBe(0); expect(levelFor(5)).toBe(2); expect(levelFor(99)).toBe(4);
    let t = 0;
    for (let i = 0; i < 8; i++) { g.tap(g.target, t); g.nextRound(t += 1000, 300); }
    expect(g.level).toBe(4);
  });
  test('correct tap, then no tap is accepted until the next round', () => {
    const g = new FindGame(countries, { rng });
    g.start(0, 300);
    expect(g.tap(g.target, 10).type).toBe('correct');
    expect(g.tap(g.target, 20).type).toBe('idle');
  });
  test('wrong taps never punish: no failure state, same target, hints escalate', () => {
    const g = new FindGame(countries, { rng });
    const target = g.start(0, 300);
    const other = countries.find(c => c.idx !== target.idx);
    expect(g.tap(other, 100)).toMatchObject({ type: 'wrong', hint: null });
    expect(g.tap(null, 200)).toMatchObject({ type: 'ocean', hint: 'rotate' });
    expect(g.target).toBe(target);
    expect(g.active).toBe(true);
    expect(g.tap(other, 300).hint).toBeNull();
    expect(g.tap(other, 400).hint).toBe('pulse');
    expect(g.pulse).toBe(true);
    expect(g.tap(target, 500).type).toBe('correct');
  });
  test('time-based hints: rotate at ~10s, pulse at ~20s, each once', () => {
    const g = new FindGame(countries, { rng });
    g.start(0, 300);
    expect(g.tick(5000)).toBeNull();
    expect(g.tick(10100)).toBe('rotate');
    expect(g.tick(10200)).toBeNull();
    expect(g.tick(20500)).toBe('pulse');
    expect(g.tick(30000)).toBeNull();
  });
  test('tiny targets get the pulse hint from the start; no repeats in a row', () => {
    const g = new FindGame(countries, { rng });
    g.start(0, 3);
    expect(g.pulse).toBe(true);
    const seen = [];
    g.start(0, 300);
    for (let i = 0; i < 6; i++) { seen.push(g.target.idx); g.tap(g.target, 1); g.nextRound(2, 300); }
    expect(new Set(seen).size).toBe(6);
    expect(MIN_TAPPABLE_PX).toBeGreaterThan(0);
  });
  test('surprise never repeats and favours known countries', () => {
    let last = -1, known = 0;
    for (let i = 0; i < 300; i++) {
      const c = pickSurprise(countries, last, rng);
      expect(c.idx).not.toBe(last);
      expect(c.alpha2).toBeTruthy();
      last = c.idx;
      if (['US', 'BR', 'CN', 'IN', 'AU', 'RU', 'FR', 'GB', 'JP', 'EG', 'CA', 'MX', 'AR', 'ZA', 'DE', 'IT', 'ES'].includes(c.alpha2)) known++;
    }
    expect(known).toBeGreaterThan(60);
  });
});

describe('passport', () => {
  const mem = () => { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = v; }, removeItem: k => { delete m[k]; } }; };
  test('adds distinct countries, persists, clears', () => {
    const s = mem();
    const p = new Passport(s);
    expect(p.add('BR')).toEqual({ isNew: true, count: 1 });
    expect(p.add('BR')).toEqual({ isNew: false, count: 1 });
    p.add('FR');
    expect(new Passport(s).count).toBe(2);
    p.clear();
    expect(new Passport(s).count).toBe(0);
    expect(p.isLearned()).toBe(false); p.markLearned(); expect(p.isLearned()).toBe(true);
  });
  test('never throws with a throwing store, and ignores corrupt data', () => {
    const bad = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); }, removeItem() { throw new Error('x'); } };
    const p = new Passport(bad);
    expect(() => p.add('BR')).not.toThrow();
    expect(p.count).toBe(1);
    expect(() => p.clear()).not.toThrow();
    expect(new Passport({ getItem: () => '{not json', setItem() {}, removeItem() {} }).count).toBe(0);
    expect(new Passport({ getItem: () => '[1,"BR",""]', setItem() {}, removeItem() {} }).list()).toEqual(['BR']);
  });
});

describe('intl names', () => {
  const brazil = byName('Brazil'), kosovo = byName('Kosovo');
  test('uses Intl.DisplayNames when available', () => {
    expect(countryNameIn(brazil, 'es')).toBe('Brasil');
    expect(countryNameIn(brazil, 'en')).toBe('Brazil');
  });
  test('falls back to English without Intl.DisplayNames, on errors, and for features without ISO code', () => {
    expect(countryNameIn(brazil, 'es', null)).toBe('Brazil');
    class Boom { constructor() { throw new Error('no'); } }
    Boom.supportedLocalesOf = () => ['es-ES'];
    expect(countryNameIn(brazil, 'es', Boom)).toBe('Brazil');
    expect(countryNameIn(byName('Somaliland'), 'es')).toBe('Somaliland');
    expect(typeof countryNameIn(kosovo, 'es')).toBe('string');
  });
  test('unsupported locales are skipped, never mislabelled', () => {
    class Fake { static supportedLocalesOf(l) { return l.filter(x => x.startsWith('es')); } constructor() {} of() { return 'Brasil'; } }
    const n = localisedNames(brazil, ['en', 'es', 'fr'], Fake);
    expect(n.map(x => x.code)).toEqual(['en', 'es']);
    expect(localisedNames(brazil, ['fr'], Fake)).toEqual([{ code: 'en', lang: 'en-US', name: 'Brazil' }]);
  });
  test('languages: tlh/jbo are not spoken; prompt phrases', () => {
    const cm = { getConfig: () => ({ languages: { enabled: [{ code: 'tlh' }, { code: 'es' }, { code: 'jbo' }, { code: 'en' }] } }) };
    expect(enabledLanguages(cm)).toEqual(['tlh', 'es', 'jbo', 'en']);
    expect(speakableLanguages(cm)).toEqual(['es', 'en']);
    expect(speakableLanguages(null)).toEqual(['en']);
    expect(speakableLanguages({ getConfig: () => ({ languages: { enabled: [{ code: 'tlh' }] } }) })).toEqual(['en']);
    expect(findPrompt(brazil, 'en')).toEqual({ text: 'Can you find Brazil?', lang: 'en-US' });
    expect(findPrompt(brazil, 'tlh').text).toBe('Can you find Brazil?');
    expect(findPrompt(brazil, 'es').text).toContain('Brasil');
  });
});

describe('gesture tracker', () => {
  const mk = () => {
    const log = []; let t = 0;
    const g = new GestureTracker({
      onStart: () => log.push('start'), onDrag: (dx, dy) => log.push(['drag', dx, dy]), onPinch: p => log.push(['pinch', +p.ratio.toFixed(2)]),
      onTap: (x, y) => log.push(['tap', x, y]), onDoubleTap: () => log.push('dbl'), onEnd: e => log.push(['end', e.fling]),
    }, () => t);
    return { g, log, adv: ms => { t += ms; } };
  };
  const ev = (id, x, y) => ({ pointerId: id, clientX: x, clientY: y, pointerType: 'touch' });
  test('tap and double tap', () => {
    const { g, log, adv } = mk();
    g.down(ev(1, 10, 10)); g.up(ev(1, 10, 10));
    adv(150); g.down(ev(1, 12, 11)); g.up(ev(1, 12, 11));
    expect(log.filter(l => l[0] === 'tap').length).toBe(2);
    expect(log).toContain('dbl');
  });
  test('slow second tap is not a double tap', () => {
    const { g, log, adv } = mk();
    g.down(ev(1, 10, 10)); g.up(ev(1, 10, 10)); adv(900);
    g.down(ev(1, 10, 10)); g.up(ev(1, 10, 10));
    expect(log).not.toContain('dbl');
  });
  test('drag beyond slop, fling only if finger did not rest', () => {
    const { g, log, adv } = mk();
    g.down(ev(1, 0, 0)); adv(16); g.move(ev(1, 5, 0)); expect(log.some(l => l[0] === 'drag')).toBe(false);
    adv(16); g.move(ev(1, 40, 0)); adv(16); g.up(ev(1, 40, 0));
    expect(log.some(l => l[0] === 'tap')).toBe(false);
    expect(log[log.length - 1]).toEqual(['end', true]);
    const m = mk();
    m.g.down(ev(1, 0, 0)); m.adv(16); m.g.move(ev(1, 40, 0)); m.adv(300); m.g.up(ev(1, 40, 0));
    expect(m.log[m.log.length - 1]).toEqual(['end', false]);
  });
  test('two-finger pinch reports ratio and never taps', () => {
    const { g, log, adv } = mk();
    g.down(ev(1, 100, 100)); g.down(ev(2, 200, 100)); adv(16);
    g.move(ev(2, 300, 100));
    expect(log).toContainEqual(['pinch', 2]);
    g.up(ev(2, 300, 100)); g.up(ev(1, 100, 100));
    expect(log.some(l => l[0] === 'tap')).toBe(false);
  });
});

describe('layout at target viewports', () => {
  const sizes = [[320, 568], [393, 851], [851, 393], [768, 1024], [1280, 800], [393, 727]];
  const overlap = (a, b) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
  test.each(sizes)('%ix%i: controls fit on screen and card/buttons never overlap each other or the disc centre', (w, h) => {
    const l = computeLayout(w, h);
    expect(l.R * 2).toBeLessThanOrEqual(Math.max(w, h));
    const card = l.landscape
      ? { l: l.card.left, r: l.card.left + l.card.width, t: h - l.card.bottom - l.card.maxH, b: h - l.card.bottom }
      : { l: (w - l.card.width) / 2, r: (w + l.card.width) / 2, t: h - l.card.bottom - 104, b: h - l.card.bottom };
    const play = l.play.vertical
      ? { l: l.play.left, r: l.play.left + 60, t: l.play.top, b: l.play.top + 192 }
      : { l: 0, r: w, t: l.play.top, b: l.play.top + 60 };
    expect(overlap(card, play)).toBe(false);
    const centre = { l: l.cx - 4, r: l.cx + 4, t: l.cy - 4, b: l.cy + 4 };
    expect(overlap(card, centre)).toBe(false);
    expect(overlap(play, centre)).toBe(false);
    expect(card.l).toBeGreaterThanOrEqual(0); expect(card.r).toBeLessThanOrEqual(w); expect(play.b).toBeLessThanOrEqual(h);
    if (!l.landscape) {
      expect(l.cy + l.R).toBeLessThanOrEqual(card.t + 1);
      expect(l.R).toBeGreaterThan(0.4 * w * (w === 320 ? 1 : 0.9));
    }
  });
});
