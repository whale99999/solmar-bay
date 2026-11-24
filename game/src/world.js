// Solmar Bay — the city and the whole game state.
// A grid city on a bay: vertical and horizontal roads every 400 px, buildings
// inside the blocks, two parks, a beach on the west shore and a dock district
// in the south-west. Everything the other modules need lives on `state`.
import {
  COLORS, ROAD_GAP, ROAD_W, WORLD_H, WORLD_W, clamp, createRandom, pick, range,
} from './config.js';

export const WATER_X = 150; // everything west of this is the bay

export function roadCentersX() {
  const out = [];
  for (let x = 200; x <= WORLD_W - 200; x += ROAD_GAP) out.push(x);
  return out;
}

export function roadCentersY() {
  const out = [];
  for (let y = 200; y <= WORLD_H - 200; y += ROAD_GAP) out.push(y);
  return out;
}

export function nearestRoadX(x) {
  let best = roadCentersX()[0];
  for (const rx of roadCentersX()) if (Math.abs(rx - x) < Math.abs(best - x)) best = rx;
  return best;
}

export function nearestRoadY(y) {
  let best = roadCentersY()[0];
  for (const ry of roadCentersY()) if (Math.abs(ry - y) < Math.abs(best - y)) best = ry;
  return best;
}

export function isRoad(x, y) {
  if (x < WATER_X || x > WORLD_W || y < 0 || y > WORLD_H) return false;
  for (const rx of roadCentersX()) if (Math.abs(x - rx) <= ROAD_W / 2) return true;
  for (const ry of roadCentersY()) if (Math.abs(y - ry) <= ROAD_W / 2) return true;
  return false;
}

function buildCity(rng) {
  const xs = roadCentersX();
  const ys = roadCentersY();
  const buildings = [];
  const parks = [];
  // Two park blocks, fixed by grid position so missions can point at them.
  const parkBlocks = new Set(['3,1', '5,3']);
  for (let i = 0; i < xs.length - 1; i += 1) {
    for (let j = 0; j < ys.length - 1; j += 1) {
      const x0 = xs[i] + ROAD_W / 2 + 14;
      const x1 = xs[i + 1] - ROAD_W / 2 - 14;
      const y0 = ys[j] + ROAD_W / 2 + 14;
      const y1 = ys[j + 1] - ROAD_W / 2 - 14;
      if (parkBlocks.has(`${i},${j}`)) {
        parks.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
        continue;
      }
      // 2x2 buildings per block with a small yard gap between them.
      const mx = (x0 + x1) / 2;
      const my = (y0 + y1) / 2;
      const quads = [
        [x0, y0, mx - 8, my - 8], [mx + 8, y0, x1, my - 8],
        [x0, my + 8, mx - 8, y1], [mx + 8, my + 8, x1, y1],
      ];
      for (const [bx, by, bx1, by1] of quads) {
        if (rng() < 0.12) continue; // occasional empty lot with a tree
        buildings.push({
          x: bx + 4, y: by + 4, w: bx1 - bx - 8, h: by1 - by - 8,
          color: pick(rng, COLORS.buildingRoof),
        });
      }
    }
  }
  return { buildings, parks };
}

// Circle vs building rects: push the circle out, return true when a hit happened.
export function collideBuildings(state, p, r) {
  let hit = false;
  for (const b of state.city.buildings) {
    const cx = clamp(p.x, b.x, b.x + b.w);
    const cy = clamp(p.y, b.y, b.y + b.h);
    const dx = p.x - cx;
    const dy = p.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 >= r * r) continue;
    hit = true;
    if (d2 > 0.0001) {
      const d = Math.sqrt(d2);
      p.x = cx + (dx / d) * r;
      p.y = cy + (dy / d) * r;
    } else {
      // Centre inside the rect: push out along the smallest penetration.
      const pl = p.x - b.x;
      const pr = b.x + b.w - p.x;
      const pt = p.y - b.y;
      const pb = b.y + b.h - p.y;
      const m = Math.min(pl, pr, pt, pb);
      if (m === pl) p.x = b.x - r;
      else if (m === pr) p.x = b.x + b.w + r;
      else if (m === pt) p.y = b.y - r;
      else p.y = b.y + b.h + r;
    }
  }
  return hit;
}

export function pointInBuilding(state, x, y) {
  for (const b of state.city.buildings) {
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return true;
  }
  return false;
}

export function randomRoadPoint(rng) {
  const xs = roadCentersX();
  const ys = roadCentersY();
  if (rng() < 0.5) return { x: pick(rng, xs), y: range(rng, 220, WORLD_H - 220) };
  return { x: range(rng, 220, WORLD_W - 220), y: pick(rng, ys) };
}

export function createState(seed) {
  const rng = createRandom(seed);
  const city = buildCity(rng);
  const spots = {
    carmen: { x: 1500, y: 1000 }, // fixer Carmen Sol waits at the central plaza
    marina: { x: 620, y: 1980 },
    chopShop: { x: 2620, y: 620 },
    docks: { x: 420, y: 2060 },
    hospital: { x: 1020, y: 620 },
    dropA: { x: 2200, y: 1800 },
    dropB: { x: 2600, y: 1400 },
    dropC: { x: 1800, y: 2200 },
  };
  const state = {
    seed,
    rng,
    time: 0,
    city,
    spots,
    player: {
      x: 1500, y: 1120, angle: -Math.PI / 2, speed: 0,
      onFoot: true, health: 100, cash: 120, wanted: 0,
      wantedTimer: 0, crimeCooldown: 0, car: null,
      bustProgress: 0, deadTimer: 0, regenTimer: 0,
    },
    cars: [],
    police: [],
    peds: [],
    rivals: [],
    bullets: [],
    particles: [],
    floats: [],
    missions: {
      index: 0, // 0..3 active, 4 = story complete
      stage: 0,
      objective: 'Meet Carmen Sol at the plaza — follow the gold marker.',
      marker: { ...spots.carmen },
      toast: '',
      toastTimer: 0,
      complete: false,
    },
    stats: { carsStolen: 0, shotsFired: 0, missionsDone: 0, arrests: 0 },
    saveTimer: 0,
    message: '',
    messageTimer: 0,
  };

  // Parked cars along roads (stealable) and moving traffic.
  for (let i = 0; i < 10; i += 1) {
    const p = randomRoadPoint(rng);
    state.cars.push(makeCar(state, p.x, p.y, rng() * Math.PI * 2, pick(rng, COLORS.car), true));
  }
  for (let i = 0; i < 14; i += 1) {
    const p = randomRoadPoint(rng);
    const c = makeCar(state, p.x, p.y, 0, pick(rng, COLORS.car), false);
    setupTraffic(state, c);
    state.cars.push(c);
  }
  for (let i = 0; i < 26; i += 1) {
    state.peds.push(makePed(state, rng));
  }
  return state;
}

export function makeCar(state, x, y, angle, color, parked) {
  return {
    id: state.cars.length + state.police.length + 1,
    x, y, angle, speed: 0, color, parked: !!parked,
    traffic: false, axis: 'x', dir: 1, road: 0, lane: 22,
    cruise: 130, w: 46, h: 22, health: 100, smoke: 0,
  };
}

export function setupTraffic(state, car) {
  const xs = roadCentersX();
  const ys = roadCentersY();
  if (state.rng() < 0.5) {
    car.axis = 'x';
    car.road = pick(state.rng, ys);
    car.y = car.road + (state.rng() < 0.5 ? -22 : 22);
    car.dir = car.y < car.road ? 1 : -1; // right-hand traffic
    car.angle = car.dir > 0 ? 0 : Math.PI;
  } else {
    car.axis = 'y';
    car.road = pick(state.rng, xs);
    car.x = car.road + (state.rng() < 0.5 ? -22 : 22);
    car.dir = car.x < car.road ? 1 : -1;
    car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  }
  car.traffic = true;
  car.parked = false;
  car.cruise = range(state.rng, 110, 175);
}

export function makePed(state, rng) {
  const p = randomRoadPoint(rng);
  const onX = rng() < 0.5;
  return {
    x: p.x + (onX ? 0 : (rng() < 0.5 ? -62 : 62)),
    y: p.y + (onX ? (rng() < 0.5 ? -62 : 62) : 0),
    angle: rng() * Math.PI * 2,
    speed: range(rng, 28, 52),
    color: pick(rng, ['#e8b04b', '#7fb3d5', '#c39bd3', '#f1948a', '#82e0aa', '#f5cba7']),
    mode: 'walk', // walk | flee | down
    tx: p.x, ty: p.y, wait: 0, health: 1,
  };
}

export function addParticles(state, x, y, n, color, speed = 120, life = 0.6, size = 3) {
  for (let i = 0; i < n; i += 1) {
    const a = state.rng() * Math.PI * 2;
    const s = speed * (0.4 + state.rng() * 0.8);
    state.particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: life * (0.6 + state.rng() * 0.7), maxLife: life,
      color, size: size * (0.6 + state.rng() * 0.8),
    });
  }
}

export function addFloat(state, x, y, text, color = '#ffffff') {
  state.floats.push({ x, y, text, color, life: 1.6 });
}

export function showMessage(state, text, seconds = 3) {
  state.message = text;
  state.messageTimer = seconds;
}

// Particles and floating texts age out every step, in play and in shots.
export function updateEffects(state, dt) {
  for (const pt of state.particles) {
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.life -= dt;
  }
  state.particles = state.particles.filter((pt) => pt.life > 0);
  for (const f of state.floats) {
    f.y -= 26 * dt;
    f.life -= dt;
  }
  state.floats = state.floats.filter((f) => f.life > 0);
  state.messageTimer = Math.max(0, state.messageTimer - dt);
  if (state.missions.toastTimer > 0) state.missions.toastTimer -= dt;
}
