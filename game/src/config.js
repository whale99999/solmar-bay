// Solmar Bay — tuning, palette, districts and shared helpers.
// A fictional sun-soaked neon palm-city. Nothing here is from any real game.
export const WORLD = { width: 3200, height: 2400 };
export const STEP = 1 / 60;
export const SAVE_KEY = 'solmar-bay.save.v1';
export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export const PALETTE = {
  sky: '#1d2b4a', grass: '#2e6b4f', sand: '#c9a86a', road: '#33363f', roadLine: '#e8c84a',
  sidewalk: '#8a7f6a', building: ['#e07856', '#4fa8a0', '#e8b34a', '#7a6fb0', '#5b8fd6', '#c65f7a'],
  water: '#2a7fa8', palm: '#3f9e5f', neonPink: '#ff4fd8', neonCyan: '#37e6ff', neonGold: '#ffd23f',
  text: '#f5f1e6', muted: '#b8b0a0', panel: 'rgba(12,16,28,0.82)', danger: '#ff4d4d',
  police: '#1c2436', player: '#ffd23f',
};

export const DISTRICTS = [
  { name: 'Palmera Strip', x: 0, y: 0, w: 1600, h: 1200, tint: '#e8b34a' },
  { name: 'Vista Hills', x: 1600, y: 0, w: 1600, h: 1200, tint: '#7a6fb0' },
  { name: 'Coral Docks', x: 0, y: 1200, w: 1600, h: 1200, tint: '#4fa8a0' },
  { name: 'Neon Mile', x: 1600, y: 1200, w: 1600, h: 1200, tint: '#ff4fd8' },
];

// Grid roads: verticals and horizontals, width 140, so blocks sit between them.
export const ROADS_X = [400, 1000, 1600, 2200, 2800];
export const ROADS_Y = [400, 900, 1400, 1900];
export const ROAD_W = 140;

export const PLAYER_CFG = { radius: 14, walkSpeed: 230, hp: 100, punchDamage: 25, pistolDamage: 34 };
export const CAR_CFG = { length: 54, width: 26, maxSpeed: 520, accel: 420, reverse: 180, turn: 2.9 };
export const COLORS_CAR = ['#e5534b', '#4fa8a0', '#e8b34a', '#7a6fb0', '#5b8fd6', '#f5f1e6', '#ff8c42', '#37e6ff'];

export function createRandom(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
export function dist(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }
export function angleTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }
export function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
export function districtAt(x, y) {
  for (const d of DISTRICTS) if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d;
  return DISTRICTS[0];
}
