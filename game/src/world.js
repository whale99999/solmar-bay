// Solmar Bay — final pass, round 4
// Solmar Bay — the city and the shared game state.
// Solmar Bay is a 3200x3200 island city: a grid of roads, blocks of buildings,
// a marina on the south shore and a lighthouse on the north-east point.
// The state object is the one thing every system reads and writes.
import { BLOCK, COLORS, PED_COUNT, ROAD_SPACING, ROAD_WIDTH, TRAFFIC_COUNT, WORLD_SIZE } from './config.js';
import { createRandom, intRange, pick, range } from './random.js';

export function roadCenters() {
  const centers = [];
  for (let c = ROAD_SPACING / 2; c < WORLD_SIZE; c += ROAD_SPACING) centers.push(c);
  return centers;
}

export function isOnRoad(x, y) {
  for (const c of roadCenters()) {
    if (Math.abs(x - c) < ROAD_WIDTH / 2 + 6) return true;
    if (Math.abs(y - c) < ROAD_WIDTH / 2 + 6) return true;
  }
  return false;
}

export function nearestRoadPoint(x, y) {
  let best = { x, y, d: Infinity };
  for (const c of roadCenters()) {
    const d1 = Math.abs(x - c);
    if (d1 < best.d) best = { x: c, y, d: d1 };
    const d2 = Math.abs(y - c);
    if (d2 < best.d) best = { x, y: c, d: d2 };
  }
  return best;
}

function buildCity(rng) {
  const buildings = [];
  const centers = roadCenters();
  for (let i = 0; i < centers.length - 1; i += 1) {
    for (let j = 0; j < centers.length - 1; j += 1) {
      const x0 = centers[i] + ROAD_WIDTH / 2 + 8;
      const y0 = centers[j] + ROAD_WIDTH / 2 + 8;
      const count = intRange(rng, 1, 3);
      for (let b = 0; b < count; b += 1) {
        const w = range(rng, 50, 110);
        const h = range(rng, 50, 110);
        const x = x0 + range(rng, 0, Math.max(1, BLOCK - w - 16));
        const y = y0 + range(rng, 0, Math.max(1, BLOCK - h - 16));
        // Keep the marina strip on the south shore clear of buildings.
        if (y + h > WORLD_SIZE - 170) continue;
        buildings.push({ x, y, w, h, color: pick(rng, COLORS.building), roof: rng() });
      }
    }
  }
  return buildings;
}

export function createState(seed) {
  const rng = createRandom(seed);
  const state = {
    seed,
    time: 0,
    screen: 'title',
    player: {
      x: WORLD_SIZE / 2, y: WORLD_SIZE / 2 + 40, angle: -Math.PI / 2,
      speed: 0, health: 100, cash: 250, onFoot: true, car: null,
      alive: true, invulnerableUntil: 0,
    },
    buildings: buildCity(rng),
    cars: [],
    peds: [],
    police: [],
    bullets: [],
    enemies: [],
    pickups: [],
    particles: [],
    wanted: 0,
    heat: 0,
    missionIndex: 0,
    mission: null,
    missionDone: 0,
    message: 'Welcome to Solmar Bay.',
    messageUntil: 0,
    story: [],
    stats: { carsStolen: 0, missionsDone: 0, shotsFired: 0 },
    muted: false,
    savedAt: 0,
  };
  // Parked cars the player can steal, scattered along roads.
  const carColors = ['#d94f3d', '#3d7ad9', '#e0b13c', '#7a3dd9', '#3dd9a0', '#e8e8e8', '#222831'];
  for (let i = 0; i < 14; i += 1) {
    const c = pick(rng, roadCenters());
    const along = range(rng, 100, WORLD_SIZE - 100);
    const vertical = rng() < 0.5;
    state.cars.push({
      id: i, x: vertical ? c + 16 : along, y: vertical ? along : c + 16,
      angle: vertical ? Math.PI / 2 : 0, speed: 0, color: pick(rng, carColors),
      kind: 'parked', driver: null, stolen: false,
    });
  }
  // Moving traffic, one car per road direction at spawn.
  for (let i = 0; i < TRAFFIC_COUNT; i += 1) {
    const c = pick(rng, roadCenters());
    const along = range(rng, 100, WORLD_SIZE - 100);
    const vertical = rng() < 0.5;
    const dir = rng() < 0.5 ? 1 : -1;
    state.cars.push({
      id: 100 + i, x: vertical ? c + (dir > 0 ? 14 : -14) : along,
      y: vertical ? along : c + (dir > 0 ? 14 : -14),
      angle: vertical ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI),
      speed: range(rng, 90, 150), color: pick(rng, carColors),
      kind: 'traffic', driver: 'traffic', stolen: false,
    });
  }
  // Pedestrians strolling the sidewalks.
  for (let i = 0; i < PED_COUNT; i += 1) {
    const c = pick(rng, roadCenters());
    const along = range(rng, 60, WORLD_SIZE - 60);
    const vertical = rng() < 0.5;
    state.peds.push({
      x: vertical ? c + 44 : along, y: vertical ? along : c + 44,
      angle: vertical ? (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (rng() < 0.5 ? 0 : Math.PI),
      speed: range(rng, 30, 60), color: pick(rng, ['#e74c3c', '#3498db', '#f1c40f', '#9b59b6', '#1abc9c', '#e67e22']),
      alive: true, panic: 0,
    });
  }
  return state;
}

export function addHeat(state, amount) {
  state.heat = Math.min(12, state.heat + amount);
  updateWanted(state);
}

export function updateWanted(state) {
  const bands = [0, 1, 2.5, 4.5, 7, 10];
  let level = 0;
  for (let i = 0; i < bands.length; i += 1) if (state.heat >= bands[i]) level = i;
  state.wanted = level;
}

export function setMessage(state, text, seconds = 4) {
  state.message = text;
  state.messageUntil = state.time + seconds;
}

export function circleHitsBuilding(state, x, y, r) {
  for (const b of state.buildings) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
  }
  return null;
}

export function spawnParticles(state, x, y, color, count = 10) {
  for (let i = 0; i < count; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const s = 60 + Math.random() * 160;
    state.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5, color });
  }
}
