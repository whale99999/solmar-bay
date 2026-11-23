// Solmar Bay — shared tuning, palette and tiny helpers.
// Original top-down 2D open-world crime game for make.fun gta6-01.
export const CFG = {
  WORLD: 3200, // world is WORLD x WORLD px
  ROAD_GAP: 400, // distance between road centre lines
  ROAD_W: 64,
  PLAYER_R: 14,
  CAR_W: 26,
  CAR_L: 46,
  WALK_SPEED: 175,
  CAR_ACCEL: 430,
  CAR_MAX: 390,
  CAR_REVERSE: 165,
  CAR_TURN: 2.7,
  BULLET_SPEED: 780,
  SAVE_KEY: 'solmarbay-save-v1',
  COLORS: {
    ground: '#2e6b4f',
    groundAlt: '#2a6248',
    park: '#3f8f57',
    road: '#3a3a44',
    roadLine: '#e8c95a',
    sidewalk: '#8a8f96',
    water: '#1d6f8e',
    sand: '#d9b380',
    roof: ['#c96f4a', '#d9a05a', '#7a6fb0', '#4fa08a', '#b05a7a', '#5a8ac9'],
    neon: ['#ff5ad1', '#37e6ff', '#ffe14d', '#7dff5a'],
  },
  DISTRICTS: [
    { name: 'Palmera Strip', x0: 0, y0: 0, x1: 1100, y1: 1700, tint: '#e8a34d' },
    { name: 'Neon Mile', x0: 1100, y0: 200, x1: 2300, y1: 1700, tint: '#ff5ad1' },
    { name: 'Vista Hills', x0: 2300, y0: 0, x1: 3200, y1: 1100, tint: '#7dff5a' },
    { name: 'Coral Docks', x0: 0, y0: 1700, x1: 3200, y1: 3200, tint: '#37e6ff' },
  ],
};

// Deterministic RNG (mulberry32) so ?seed= scenes render identically.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function dist2(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
export function angTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }
export function angDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
export function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
