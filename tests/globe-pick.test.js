import { getGlobeData } from '../src/toys/globe-data.js';
import { pickCountry } from '../src/toys/globe-pick.js';
import { makeView } from '../src/toys/globe-math.js';

const { countries } = getGlobeData();
const R = 300;
const at = (lon, lat, nx = 0, ny = 0, tol = 28) =>
  pickCountry(countries, makeView(lon, lat), nx, ny, R, tol);

describe('globe data + picking (Natural Earth 110m)', () => {
  test('decodes the whole world with flags and friendly names', () => {
    expect(countries.length).toBeGreaterThan(170);
    const brazil = countries.find(c => c.rawName === 'Brazil');
    expect(brazil.flag).toBe('\u{1F1E7}\u{1F1F7}');
    const usa = countries.find(c => c.rawName === 'United States of America');
    expect(usa.name).toBe('United States');
    const kosovo = countries.find(c => c.rawName === 'Kosovo');
    expect(kosovo.flag).toBe('🏳️');
    for (const c of countries) expect(c.rings.length).toBeGreaterThan(0);
  });

  test('neighbouring countries get different colours (mostly)', () => {
    const byName = n => countries.find(c => c.rawName === n);
    expect(byName('France').colour).not.toBe(byName('Germany').colour);
    expect(byName('Brazil').colour).not.toBe(byName('Argentina').colour);
    expect(byName('Canada').colour).not.toBe(byName('United States of America').colour);
  });

  const cases = [
    [-52, -10, 'Brazil'],
    [2.5, 46.5, 'France'],
    [134, -25, 'Australia'],
    [100, 62, 'Russia'],
    [-98, 39, 'United States'],
    [138, 36, 'Japan'],
    [30, 27, 'Egypt'],
    [175, 65, 'Russia'],      // Chukotka, east of the antimeridian cut? (still Russia)
    [-170, 66, 'Russia'],     // across the antimeridian
    [178.0, -17.8, 'Fiji'],   // Fiji straddles 180
    [0, -80, 'Antarctica'],
    [-100, -80, 'Antarctica'],
    [-150, 64, 'United States'], // Alaska
  ];
  test.each(cases)('tap at (%f, %f) -> %s', (lon, lat, name) => {
    const hit = at(lon, lat);
    expect(hit && hit.country.name).toBe(name);
  });

  test('mid-ocean tap is a miss', () => {
    expect(at(-30, 0)).toBeNull();
    expect(at(-140, -30)).toBeNull();
  });

  test('tapping outside the disc returns null', () => {
    expect(at(0, 0, 0.9, 0.9)).toBeNull();
  });

  test('small islands are snapped to within finger tolerance', () => {
    // Just off the coast of Hispaniola/Haiti-ish region: Jamaica is tiny
    const exact = at(-77.3, 18.1);
    expect(exact && exact.country.name).toBe('Jamaica');
    const near = at(-77.3, 17.2, 0, 0, 40); // ~1 degree south of Jamaica, ocean
    expect(near && near.country.name).toBe('Jamaica');
    expect(near.exact).toBe(false);
    // without tolerance it is ocean
    expect(at(-77.3, 17.2, 0, 0, 0)).toBeNull();
  });

  test('picks are consistent when the target is off-centre', () => {
    // View centred near India, tap just off-centre
    const v = makeView(78, 22);
    const hit = pickCountry(countries, v, 0.02, 0.02, R, 20);
    expect(hit.country.name).toBe('India');
  });
});
