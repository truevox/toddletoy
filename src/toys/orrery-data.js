/**
 * Pure data for the Solar System toy: the nine "bodies" (Sun + 8 planets),
 * their visual sizes (NOT to scale), real orbital periods and the facts shown
 * on the info card. No DOM or canvas in here.
 */

/** Earth takes this many real seconds per orbit at 1x speed. */
export const EARTH_ORBIT_SECONDS = 24;
/** Biggest orbit radius in world units (Neptune). */
export const MAX_ORBIT_WORLD = 372;
/** Asteroid belt (between Mars and Jupiter) in world units. */
export const BELT_INNER = 190;
export const BELT_OUTER = 216;

export const SCALE_NOTE = 'Sizes and distances here are not to scale. Speeds are in the right proportion.';
export const COMPARE_NOTE = 'Real sizes! The Sun is about 109 Earths wide, so we only see its edge.';

/*
 * periodYears: real orbital periods in Earth years (days / 365.25).
 * r: drawn radius in world units (exaggerated but ordered truthfully).
 * minPx: smallest on-screen radius (keeps tiny planets tappable, same order).
 * trueDiameter: diameter in Earth diameters (used by the size comparison).
 * spinSec: visual seconds per texture turn at 1x (negative = backwards).
 */
export const BODIES = [
  { id: 'sun', name: 'Sun', kind: 'star', color: '#ffd54f', orbitR: 0, r: 30, minPx: 16, trueDiameter: 109.2, startDeg: 0, periodYears: 0, spinSec: 0 },
  { id: 'mercury', name: 'Mercury', kind: 'rocky', color: '#b9b4ae', orbitR: 70, r: 6.5, minPx: 4.5, trueDiameter: 0.383, startDeg: 30, periodYears: 87.97 / 365.25, spinSec: 0 },
  { id: 'venus', name: 'Venus', kind: 'rocky', color: '#f3dca0', orbitR: 100, r: 10.5, minPx: 6.5, trueDiameter: 0.949, startDeg: 120, periodYears: 224.7 / 365.25, spinSec: -300 },
  { id: 'earth', name: 'Earth', kind: 'rocky', color: '#5fa8ff', orbitR: 130, r: 11, minPx: 7, trueDiameter: 1, startDeg: 205, periodYears: 1, spinSec: 60 },
  { id: 'mars', name: 'Mars', kind: 'rocky', color: '#e0674b', orbitR: 160, r: 8.5, minPx: 5.5, trueDiameter: 0.532, startDeg: 300, periodYears: 686.98 / 365.25, spinSec: 0 },
  { id: 'jupiter', name: 'Jupiter', kind: 'gas', color: '#e3a65c', orbitR: 252, r: 25, minPx: 14, trueDiameter: 11.21, startDeg: 70, periodYears: 11.862, spinSec: 22 },
  { id: 'saturn', name: 'Saturn', kind: 'gas', color: '#f0d98a', orbitR: 298, r: 21, minPx: 12, trueDiameter: 9.45, startDeg: 160, periodYears: 29.457, spinSec: 24 },
  { id: 'uranus', name: 'Uranus', kind: 'ice', color: '#8eeaf0', orbitR: 338, r: 15, minPx: 9.5, trueDiameter: 4.01, startDeg: 250, periodYears: 84.01, spinSec: 0 },
  { id: 'neptune', name: 'Neptune', kind: 'ice', color: '#4f7fe0', orbitR: MAX_ORBIT_WORLD, r: 14.5, minPx: 9, trueDiameter: 3.88, startDeg: 340, periodYears: 164.8, spinSec: 40 },
];

export const PLANET_COUNT = 8;
export const EARTH_INDEX = 3;

/** One short, child-friendly sentence per body (also spoken after the name). */
export const FRIENDLY = [
  'The Sun is a big, bright, glowing star!',
  'Mercury is tiny and zooms around the Sun!',
  'Venus is wrapped in thick, swirly clouds!',
  'Earth is our home!',
  'Mars is the red planet!',
  'Jupiter is the biggest planet of all!',
  'Saturn has beautiful rings!',
  'Uranus spins on its side!',
  'Neptune is deep blue and very windy!',
];

const ORD = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];
const TYPE = { rocky: 'Rocky planet', gas: 'Gas giant', ice: 'Ice giant' };

/* Rounded, well-established values only. */
const YEAR = [null, '88 Earth days', '225 Earth days', '365 days', '687 Earth days',
  'about 12 Earth years', 'about 29 Earth years', '84 Earth years', 'about 165 Earth years'];
const DAY = [null, 'about 59 Earth days', '243 Earth days, longer than its year!', '24 hours',
  'a little over 24 hours', 'about 10 hours', 'a little over 10 hours', 'about 17 hours', 'about 16 hours'];
const MOONS = [null, 'No moons', 'No moons', '1 moon', '2 tiny moons',
  'Lots of moons, more than 90', 'Lots of moons, more than 140', 'More than 25 moons', 'More than 15 moons'];

/** Facts for the expanded card: [{ label, value }]. */
export function factsFor(i) {
  const b = BODIES[i];
  if (!b) return [];
  if (i === 0) {
    return [
      { label: 'Place', value: 'The centre of our Solar System' },
      { label: 'Type', value: 'A star' },
      { label: 'Size', value: 'About 109 Earths wide' },
      { label: 'Light', value: 'Sunlight takes about 8 minutes to reach Earth' },
    ];
  }
  return [
    { label: 'Place', value: `${ORD[i]} planet from the Sun` },
    { label: 'Type', value: TYPE[b.kind] },
    { label: 'A year', value: YEAR[i] },
    { label: 'A day (one spin)', value: DAY[i] },
    { label: 'Moons', value: MOONS[i] },
  ];
}

/** Names we are certain of in other languages (speech only). */
export const NAMES = {
  en: ['the Sun', 'Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'],
  es: ['el Sol', 'Mercurio', 'Venus', 'la Tierra', 'Marte', 'Júpiter', 'Saturno', 'Urano', 'Neptuno'],
  fr: ['le Soleil', 'Mercure', 'Vénus', 'la Terre', 'Mars', 'Jupiter', 'Saturne', 'Uranus', 'Neptune'],
  pt: ['o Sol', 'Mercúrio', 'Vênus', 'a Terra', 'Marte', 'Júpiter', 'Saturno', 'Urano', 'Netuno'],
};
export const FIND_PROMPT = {
  en: n => `Can you find ${n}?`,
  es: n => `¿Puedes encontrar ${n}?`,
  fr: n => `Peux-tu trouver ${n} ?`,
  pt: n => `Consegues encontrar ${n}?`,
};
export const FOUND_PROMPT = {
  en: n => `You found ${n}!`,
  es: n => `¡Encontraste ${n}!`,
  fr: n => `Tu as trouvé ${n} !`,
  pt: n => `Encontraste ${n}!`,
};
export const THATS_PROMPT = {
  en: n => `That's ${n}!`,
  es: n => `¡Ese es ${n}!`,
  fr: n => `C'est ${n} !`,
  pt: n => `Esse é ${n}!`,
};

/** Spoken name of a body in a supported language (falls back to English). */
export function spokenName(i, lang = 'en') {
  return (NAMES[lang] || NAMES.en)[i];
}
