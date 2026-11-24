// Solmar Bay — shared constants, seeded random and small math helpers.
// Original game, no third-party code. All world units are pixels.
export const WORLD_W = 3200;
export const WORLD_H = 2400;
export const ROAD_W = 96;
export const ROAD_GAP = 400;
export const STEP = 1 / 60;
export const SAVE_KEY = 'solmar-bay-save-v1';
export const BEST_KEY = 'solmar-bay-best-v1';

// Fixed palette for the whole game so every screen reads as one city.
export const COLORS = {
  grass: '#3d7a44',
  grassDark: '#356b3b',
  sand: '#d9c27a',
  water: '#1d6f8e',
  waterDeep: '#155a75',
  road: '#2b2e33',
  roadLine: '#e8c33a',
  sidewalk: '#8d8578',
  buildingRoof: ['#7a4a3a', '#4a6a7a', '#6a5a7a', '#8a6a3a', '#5a7a4a', '#7a3a4a'],
  buildingWall: '#5c5648',
  park: '#2f6b34',
  car: ['#c0392b', '#2980b9', '#f1c40f', '#ecf0f1', '#8e44ad', '#16a085', '#e67e22', '#2c3e50'],
  police: '#1c2733',
  player: '#e74c3c',
};

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

// Shortest signed turn from angle `from` toward angle `to`.
export function angleDiff(from, to) {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Deterministic PRNG (mulberry32) so ?seed=N replays the same city.
export function createRandom(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

export function range(rng, lo, hi) {
  return lo + rng() * (hi - lo);
}
