import {
  orreryLayout, planetPosition, pickNearest, hitSun, planetDrawRadius,
} from '../src/toys/orrery-math.js';

describe('orrery-math', () => {
  const neptune = { orbitR: 340, radius: 12, periodS: 60, startDeg: 0 };

  test('outermost orbit plus planet fits in phone portrait and landscape', () => {
    for (const [w, h] of [[393, 727], [360, 640], [844, 390], [1280, 800], [320, 480]]) {
      const l = orreryLayout(w, h);
      const outer = neptune.orbitR * l.scale + planetDrawRadius(neptune.radius, l.scale);
      expect(l.cx - outer).toBeGreaterThanOrEqual(0);
      expect(l.cx + outer).toBeLessThanOrEqual(w);
      expect(l.cy - outer).toBeGreaterThanOrEqual(0);
      expect(l.cy + outer).toBeLessThanOrEqual(h);
    }
  });

  test('planetPosition is on its orbit', () => {
    const l = orreryLayout(800, 800);
    const pos = planetPosition(neptune, 12.3, l);
    expect(Math.hypot(pos.x - l.cx, pos.y - l.cy)).toBeCloseTo(340 * l.scale, 6);
  });

  test('pickNearest selects a tiny planet from a finger-sized distance', () => {
    const items = [{ x: 100, y: 100, r: 4 }, { x: 300, y: 100, r: 12 }];
    expect(pickNearest(items, 100 + 25, 100)).toBe(0);
    expect(pickNearest(items, 100, 100 - 27)).toBe(0);
    expect(pickNearest(items, 300 + 20, 100 + 15)).toBe(1);
    expect(pickNearest(items, 200, 300)).toBe(-1);
    expect(pickNearest([], 1, 1)).toBe(-1);
  });

  test('nearest planet wins when tolerances overlap', () => {
    const items = [{ x: 100, y: 100, r: 4 }, { x: 140, y: 100, r: 4 }];
    expect(pickNearest(items, 110, 100)).toBe(0);
    expect(pickNearest(items, 130, 100)).toBe(1);
  });

  test('large planets get a tolerance beyond their radius', () => {
    expect(pickNearest([{ x: 0, y: 0, r: 22 }], 30, 0)).toBe(0);
    expect(pickNearest([{ x: 0, y: 0, r: 22 }], 33, 0)).toBe(-1);
  });

  test('hitSun', () => {
    const l = orreryLayout(400, 700);
    expect(hitSun(l, l.cx + 10, l.cy)).toBe(true);
    expect(hitSun(l, l.cx + 120, l.cy)).toBe(false);
  });
});
