/**
 * Globe geometry: decodes Natural Earth 1:110m country outlines (public domain,
 * via the `world-atlas` npm package, TopoJSON) once into typed arrays.
 * Decoding happens lazily on first use and is memoised.
 */
import topology from 'world-atlas/countries-110m.json';
import { feature, neighbors } from 'topojson-client';
import { friendlyName, flagForId, alpha2ForId } from './globe-names.js';
import { makeRing, wrapDelta, wrapLon, lonLatToVec } from './globe-math.js';

/** Max edge length (deg) before an edge is subdivided in lon/lat space. */
const DENSIFY_STEP = 2.5;
/** Countries whose bounding cap is smaller than this (deg) get forgiving taps. */
export const SMALL_COUNTRY_DEG = 8;

/** Pastel palette; neighbours are greedily coloured so they differ. */
export const PALETTE = [
  '#f6c28b', '#b5e0a0', '#f5a3b9', '#ffe08a', '#c4b3ea', '#98d8d0', '#f3b6e3', '#d7e58f',
];

function densify(coords) {
  let pts = coords;
  const first = pts[0], last = pts[pts.length - 1];
  if (pts.length > 1 && first[0] === last[0] && first[1] === last[1]) pts = pts.slice(0, -1);
  const lons = [], lats = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    lons.push(wrapLon(a[0]));
    lats.push(a[1]);
    const dl = wrapDelta(b[0] - a[0]), dla = b[1] - a[1];
    const atPole = Math.abs(a[1]) >= 89.99 && Math.abs(b[1]) >= 89.99;
    const steps = atPole ? 1 : Math.ceil(Math.max(Math.abs(dl), Math.abs(dla)) / DENSIFY_STEP);
    for (let s = 1; s < steps; s++) {
      lons.push(wrapLon(a[0] + (dl * s) / steps));
      lats.push(a[1] + (dla * s) / steps);
    }
  }
  return { lons, lats };
}

function buildRing(coords, hole) {
  const { lons, lats } = densify(coords);
  const ring = makeRing(lons, Float32Array.from(lats));
  const n = ring.n;
  const vec = new Float32Array(n * 3);
  let sx = 0, sy = 0, sz = 0;
  for (let i = 0; i < n; i++) {
    const v = lonLatToVec(lons[i], lats[i]);
    vec[3 * i] = v[0]; vec[3 * i + 1] = v[1]; vec[3 * i + 2] = v[2];
    sx += v[0]; sy += v[1]; sz += v[2];
  }
  const len = Math.hypot(sx, sy, sz) || 1;
  const cx = sx / len, cy = sy / len, cz = sz / len;
  let maxAng = 0;
  for (let i = 0; i < n; i++) {
    const d = vec[3 * i] * cx + vec[3 * i + 1] * cy + vec[3 * i + 2] * cz;
    const a = Math.acos(Math.max(-1, Math.min(1, d)));
    if (a > maxAng) maxAng = a;
  }
  ring.vec = vec;
  ring.hole = hole;
  ring.cap = { x: cx, y: cy, z: cz, radius: maxAng, sinR: Math.sin(Math.min(maxAng, Math.PI / 2)) };
  return ring;
}

function colourNeighbours(geoms) {
  const nb = neighbors(geoms);
  const order = geoms.map((_, i) => i).sort((a, b) => nb[b].length - nb[a].length);
  const colour = new Array(geoms.length).fill(-1);
  for (const i of order) {
    const used = new Set(nb[i].map(j => colour[j]));
    let c = 0;
    while (used.has(c) && c < PALETTE.length - 1) c++;
    colour[i] = c;
  }
  return colour;
}

let cache = null;

/** Decode (once) and return { countries }. */
export function getGlobeData() {
  if (cache) return cache;
  const geoms = topology.objects.countries.geometries;
  const features = feature(topology, topology.objects.countries).features;
  const colours = colourNeighbours(geoms);
  const countries = features.map((f, idx) => {
    const g = f.geometry;
    const polygons = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    const polys = polygons.map(rings => ({ rings: rings.map((r, k) => buildRing(r, k > 0)) }));
    const rings = polys.flatMap(p => p.rings);
    // Largest exterior cap radius (for "small country" tap tolerance)
    let capR = 0;
    for (const p of polys) capR = Math.max(capR, p.rings[0].cap.radius);
    return {
      idx,
      id: f.id === undefined ? null : f.id,
      rawName: f.properties.name,
      name: friendlyName(f.properties.name),
      alpha2: alpha2ForId(f.id),
      flag: flagForId(f.id),
      colour: PALETTE[colours[idx] % PALETTE.length],
      polys,
      rings,
      capRadiusDeg: (capR * 180) / Math.PI,
      small: (capR * 180) / Math.PI <= SMALL_COUNTRY_DEG,
    };
  });
  cache = { countries };
  return cache;
}
