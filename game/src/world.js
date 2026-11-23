// Solmar Bay — the city: road grid, blocks, buildings, parks and the waterfront.
// Everything is placed from a seeded RNG, so the same seed builds the same city.
import { CFG, clamp, mulberry32, pick } from './config.js';

export function roadCentres() {
  const lines = [];
  for (let v = 200; v <= CFG.WORLD - 200; v += CFG.ROAD_GAP) lines.push(v);
  return lines;
}

// Is this point on a road (within the asphalt, not the sidewalk)?
export function onRoad(x, y) {
  const half = CFG.ROAD_W / 2;
  for (const c of roadCentres()) {
    if (Math.abs(x - c) <= half || Math.abs(y - c) <= half) return true;
  }
  return false;
}

export function nearestRoadCentre(v) {
  const lines = roadCentres();
  let best = lines[0];
  for (const c of lines) if (Math.abs(c - v) < Math.abs(best - v)) best = c;
  return best;
}

export function districtAt(x, y) {
  for (const d of CFG.DISTRICTS) {
    if (x >= d.x0 && x < d.x1 && y >= d.y0 && y < d.y1) return d;
  }
  return CFG.DISTRICTS[0];
}

export function buildWorld(seed) {
  const rng = mulberry32(seed);
  const lines = roadCentres();
  const buildings = [];
  const parks = [];
  const palms = [];

  // The Coral Docks waterfront: water along the south-east corner.
  const water = { x: 2350, y: 2450, w: CFG.WORLD - 2350, h: CFG.WORLD - 2450 };

  // One building (or park) per city block, inset from the roads.
  for (let bi = 0; bi < lines.length - 1; bi += 1) {
    for (let bj = 0; bj < lines.length - 1; bj += 1) {
      const x0 = lines[bi] + CFG.ROAD_W / 2 + 34;
      const y0 = lines[bj] + CFG.ROAD_W / 2 + 34;
      const x1 = lines[bi + 1] - CFG.ROAD_W / 2 - 34;
      const y1 = lines[bj + 1] - CFG.ROAD_W / 2 - 34;
      // Skip blocks swallowed by the waterfront.
      if (x0 > water.x - 40 && y0 > water.y - 40) continue;
      if (rng() < 0.16) {
        parks.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
        for (let p = 0; p < 5; p += 1) {
          palms.push({ x: x0 + 30 + rng() * (x1 - x0 - 60), y: y0 + 30 + rng() * (y1 - y0 - 60) });
        }
        continue;
      }
      const w = x1 - x0;
      const h = y1 - y0;
      buildings.push({
        x: x0, y: y0, w, h,
        color: pick(rng, CFG.COLORS.roof),
        neon: rng() < 0.45 ? pick(rng, CFG.COLORS.neon) : null,
        hgt: 0.5 + rng() * 0.8,
      });
    }
  }
  // Palms lining the Palmera Strip boulevard.
  for (let y = 240; y < CFG.WORLD - 200; y += 130) {
    palms.push({ x: 168, y });
    palms.push({ x: 232, y: y + 60 });
  }

  function hitsBuilding(x, y, r) {
    for (const b of buildings) {
      if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
    }
    return null;
  }

  // Push a circle out of any building it overlaps; returns the building hit, if any.
  function resolveBuilding(p, r) {
    const b = hitsBuilding(p.x, p.y, r);
    if (!b) return null;
    const cx = clamp(p.x, b.x, b.x + b.w);
    const cy = clamp(p.y, b.y, b.y + b.h);
    let dx = p.x - cx;
    let dy = p.y - cy;
    if (dx === 0 && dy === 0) { dx = 0; dy = -1; }
    const d = Math.hypot(dx, dy) || 1;
    p.x = cx + (dx / d) * r;
    p.y = cy + (dy / d) * r;
    return b;
  }

  function inWater(x, y) {
    return x > water.x && y > water.y;
  }

  return {
    seed, rng, lines, buildings, parks, palms, water,
    hitsBuilding, resolveBuilding, inWater,
    // Landmarks the missions use.
    garage: { x: 620, y: 620, label: 'Palmera Garage' },
    packageSpot: { x: 1820, y: 1020, label: 'Neon Mile drop' },
    docks: { x: 2720, y: 2320, label: 'Coral Docks pier' },
    safehouse: { x: 2620, y: 420, label: 'Vista Hills safehouse' },
    spawn: { x: 420, y: 420 },
  };
}
