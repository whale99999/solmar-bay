// Solmar Bay — the city itself: roads, blocks, buildings, palms, beach and docks.
// Generated once from the seeded RNG so every visit (and every screenshot seed)
// builds the same city. Also owns collision tests and particles.
import { WORLD, ROADS_X, ROADS_Y, ROAD_W, PALETTE, createRandom, pick, clamp } from './config.js';

export function createCity(seed) {
  const rng = createRandom(seed);
  const buildings = [];
  const palms = [];
  const piers = [];
  // Buildings fill each block between roads, leaving sidewalk margins.
  const xs = [0, ...ROADS_X, WORLD.width];
  const ys = [0, ...ROADS_Y, WORLD.height];
  for (let bi = 0; bi < xs.length - 1; bi += 1) {
    for (let bj = 0; bj < ys.length - 1; bj += 1) {
      const x0 = xs[bi] + (bi === 0 ? 40 : ROAD_W / 2 + 24);
      const x1 = xs[bi + 1] - (bi === xs.length - 2 ? 40 : ROAD_W / 2 + 24);
      const y0 = ys[bj] + (bj === 0 ? 40 : ROAD_W / 2 + 24);
      const y1 = ys[bj + 1] - (bj === ys.length - 2 ? 40 : ROAD_W / 2 + 24);
      // 1-3 buildings per block, with a plaza gap sometimes.
      const n = 1 + Math.floor(rng() * 3);
      for (let k = 0; k < n; k += 1) {
        const w = 90 + rng() * 150, h = 80 + rng() * 130;
        const x = x0 + rng() * Math.max(1, (x1 - x0) - w);
        const y = y0 + rng() * Math.max(1, (y1 - y0) - h);
        buildings.push({ x, y, w, h, color: pick(rng, PALETTE.building), roof: rng() > 0.5, neon: rng() > 0.6 });
      }
      // Palms along the block edges.
      const pn = 2 + Math.floor(rng() * 4);
      for (let k = 0; k < pn; k += 1) palms.push({ x: x0 + rng() * (x1 - x0), y: y0 + rng() * (y1 - y0), s: 0.8 + rng() * 0.6 });
    }
  }
  // Coral Docks piers jut into the bay on the south-west shore.
  for (let k = 0; k < 4; k += 1) piers.push({ x: 180 + k * 300, y: WORLD.height - 60, w: 120, h: 60 });
  return { seed, buildings, palms, piers, rng };
}

export function onRoad(x, y) {
  for (const rx of ROADS_X) if (Math.abs(x - rx) < ROAD_W / 2) return true;
  for (const ry of ROADS_Y) if (Math.abs(y - ry) < ROAD_W / 2) return true;
  return false;
}
export function nearestRoadX(x) { let best = ROADS_X[0]; for (const rx of ROADS_X) if (Math.abs(rx - x) < Math.abs(best - x)) best = rx; return best; }
export function nearestRoadY(y) { let best = ROADS_Y[0]; for (const ry of ROADS_Y) if (Math.abs(ry - y) < Math.abs(best - y)) best = ry; return best; }

// Circle vs building rectangles: push the circle out, return true on hit.
export function collideBuildings(city, ent, radius) {
  let hit = false;
  for (const b of city.buildings) {
    const cx = clamp(ent.x, b.x, b.x + b.w), cy = clamp(ent.y, b.y, b.y + b.h);
    const dx = ent.x - cx, dy = ent.y - cy, d2 = dx * dx + dy * dy;
    if (d2 < radius * radius) {
      hit = true;
      if (d2 > 0.01) { const d = Math.sqrt(d2); ent.x = cx + (dx / d) * radius; ent.y = cy + (dy / d) * radius; }
      else ent.x = b.x - radius;
    }
  }
  ent.x = clamp(ent.x, 24, WORLD.width - 24);
  ent.y = clamp(ent.y, 24, WORLD.height - 24);
  return hit;
}

export function makeParticles() { return []; }
export function burst(particles, x, y, color, n, speed) {
  for (let i = 0; i < n; i += 1) {
    const a = Math.random() * Math.PI * 2, s = speed * (0.4 + Math.random() * 0.8);
    particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5 + Math.random() * 0.5, max: 1, color, size: 2 + Math.random() * 4 });
  }
  if (particles.length > 400) particles.splice(0, particles.length - 400);
}
export function stepParticles(particles, dt) {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i]; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96;
    if (p.life <= 0) particles.splice(i, 1);
  }
}
