import {
  makeView, project, unproject, isVisible, wrapLon, wrapDelta, clampTilt,
  makeRing, pointInRing, pointInPolygon, angularDistance,
} from '../src/toys/globe-math.js';

describe('globe-math projection', () => {
  test('project -> unproject round-trips for visible points at many views', () => {
    const views = [[0, 0], [-98, 39], [140, -45], [179, 60], [-170, -60], [33, 12]];
    let checked = 0;
    for (const [lon0, lat0] of views) {
      const v = makeView(lon0, lat0);
      for (let dLon = -80; dLon <= 80; dLon += 20) {
        for (let dLat = -70; dLat <= 70; dLat += 20) {
          const lon = wrapLon(lon0 + dLon);
          const lat = Math.max(-89, Math.min(89, lat0 + dLat));
          const p = project(lon, lat, v);
          if (!isVisible(p.z) || p.x * p.x + p.y * p.y > 0.9999) continue;
          const back = unproject(p.x, p.y, v);
          expect(back).not.toBeNull();
          expect(Math.abs(wrapDelta(back.lon - lon))).toBeLessThan(1e-6);
          expect(Math.abs(back.lat - lat)).toBeLessThan(1e-6);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(100);
  });

  test('view centre projects to the disc centre, facing the viewer', () => {
    const v = makeView(-52, -10);
    const p = project(-52, -10, v);
    expect(p.x).toBeCloseTo(0, 9);
    expect(p.y).toBeCloseTo(0, 9);
    expect(p.z).toBeCloseTo(1, 9);
    const u = unproject(0, 0, v);
    expect(u.lon).toBeCloseTo(-52, 6);
    expect(u.lat).toBeCloseTo(-10, 6);
  });

  test('north is up and east is right', () => {
    const v = makeView(0, 0);
    expect(project(0, 30, v).y).toBeGreaterThan(0);
    expect(project(30, 0, v).x).toBeGreaterThan(0);
  });

  test('horizon visibility: antipode hidden, 89 degrees away visible, 91 hidden', () => {
    const v = makeView(10, 20);
    expect(isVisible(project(190, -20, v).z)).toBe(false);
    expect(isVisible(project(10 + 89, 0, makeView(10, 0)).z)).toBe(true);
    expect(isVisible(project(10 + 91, 0, makeView(10, 0)).z)).toBe(false);
  });

  test('unproject returns null outside the disc', () => {
    expect(unproject(0.8, 0.8, makeView(0, 0))).toBeNull();
  });

  test('wrapLon / wrapDelta / clampTilt / angularDistance', () => {
    expect(wrapLon(190)).toBeCloseTo(-170);
    expect(wrapLon(-190)).toBeCloseTo(170);
    expect(wrapLon(180)).toBeCloseTo(-180);
    expect(wrapDelta(358)).toBeCloseTo(-2);
    expect(wrapDelta(-358)).toBeCloseTo(2);
    expect(wrapDelta(360)).toBe(0);
    expect(clampTilt(80)).toBe(60);
    expect(clampTilt(-80)).toBe(-60);
    expect(angularDistance(0, 0, 90, 0)).toBeCloseTo(Math.PI / 2);
    expect(angularDistance(179, 0, -179, 0)).toBeCloseTo((2 * Math.PI) / 180, 6);
  });
});

describe('globe-math point in polygon', () => {
  const box = (l0, l1, a0, a1) => makeRing([l0, l1, l1, l0], [a0, a0, a1, a1]);

  test('simple box', () => {
    const r = box(10, 20, 10, 20);
    expect(pointInRing(15, 15, r)).toBe(true);
    expect(pointInRing(25, 15, r)).toBe(false);
    expect(pointInRing(15, 25, r)).toBe(false);
  });

  test('ring crossing the antimeridian (170 -> -170)', () => {
    const r = box(170, -170, -20, -10);
    expect(pointInRing(175, -15, r)).toBe(true);
    expect(pointInRing(-175, -15, r)).toBe(true);
    expect(pointInRing(180, -15, r)).toBe(true);
    expect(pointInRing(0, -15, r)).toBe(false);
    expect(pointInRing(160, -15, r)).toBe(false);
    expect(pointInRing(-160, -15, r)).toBe(false);
  });

  test('ring spanning 179 to -179 contains the seam', () => {
    const r = makeRing([179, -179, -179, 179], [0, 0, 5, 5]);
    expect(pointInRing(180, 2, r)).toBe(true);
    expect(pointInRing(0, 2, r)).toBe(false);
  });

  test('holes are excluded', () => {
    const outer = box(0, 30, 0, 30);
    const hole = box(10, 20, 10, 20);
    expect(pointInPolygon(5, 5, [outer, hole])).toBe(true);
    expect(pointInPolygon(15, 15, [outer, hole])).toBe(false);
    expect(pointInPolygon(50, 15, [outer, hole])).toBe(false);
  });

  test('ring encircling the south pole (Antarctica-like)', () => {
    const lons = [], lats = [];
    for (let l = -180; l < 180; l += 10) { lons.push(l); lats.push(-70 - 5 * Math.cos((l * Math.PI) / 90)); }
    const r = makeRing(lons, Float32Array.from(lats));
    expect(r.polar).not.toBe(0);
    expect(pointInRing(0, -89, r)).toBe(true);
    expect(pointInRing(123, -80, r)).toBe(true);
    expect(pointInRing(-170, -85, r)).toBe(true);
    expect(pointInRing(0, -50, r)).toBe(false);
    expect(pointInRing(90, -20, r)).toBe(false);
  });
});
