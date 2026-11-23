// Solmar Bay — traffic and parked cars: cars cruise the road grid, turn at
// intersections, brake for each other, and parked cars wait to be stolen (E).
import { WORLD, ROADS_X, ROADS_Y, ROAD_W, CAR_CFG, COLORS_CAR, createRandom, pick, clamp, dist } from './config.js';
import { collideBuildings } from './world.js';

export function spawnTraffic(G, n) {
  const rng = createRandom(G.seed + 77);
  G.cars = [];
  for (let i = 0; i < n; i += 1) {
    const vertical = rng() > 0.5;
    const road = vertical ? pick(rng, ROADS_X) : pick(rng, ROADS_Y);
    const along = 100 + rng() * (vertical ? WORLD.height - 200 : WORLD.width - 200);
    const lane = (rng() > 0.5 ? 1 : -1) * 32;
    const dir = rng() > 0.5 ? 1 : -1;
    G.cars.push({
      x: vertical ? road + lane : along, y: vertical ? along : road + lane,
      angle: vertical ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI),
      speed: 120 + rng() * 120, color: pick(rng, COLORS_CAR), kind: 'traffic',
      vertical, dir, occupied: false, stolen: false, hp: 100,
    });
  }
  // Parked cars along the Palmera Strip and Neon Mile for stealing.
  const spots = [[1000, 340], [1600, 340], [2200, 460], [2800, 840], [1000, 1460], [2200, 1960], [400, 960], [1600, 960]];
  for (const [x, y] of spots) G.cars.push({ x, y, angle: 0, speed: 0, color: pick(rng, COLORS_CAR), kind: 'parked', vertical: false, dir: 1, occupied: false, stolen: false, hp: 100 });
}

export function stepTraffic(G, dt) {
  for (const c of G.cars) {
    if (c.kind === 'player' || c.occupied) continue;
    if (c.kind === 'parked') continue;
    // Cruise; slow for the car ahead on the same road.
    let target = 150 + ((c.speed % 60));
    for (const o of G.cars) {
      if (o === c || o.kind === 'parked') continue;
      const d = dist(c.x, c.y, o.x, o.y);
      if (d < 90) {
        const ahead = Math.cos(c.angle) * (o.x - c.x) + Math.sin(c.angle) * (o.y - c.y);
        if (ahead > 0) target = 0;
      }
    }
    c.speed += clamp(target - c.speed, -260 * dt, 160 * dt);
    // At an intersection, sometimes turn onto the crossing road.
    const nearX = ROADS_X.find((rx) => Math.abs(c.x - rx) < 46);
    const nearY = ROADS_Y.find((ry) => Math.abs(c.y - ry) < 46);
    if (c.vertical && nearY !== undefined && Math.random() < dt * 0.25) {
      c.vertical = false; c.angle = Math.random() > 0.5 ? 0 : Math.PI; c.dir = Math.cos(c.angle) > 0 ? 1 : -1; c.y = nearY + (c.dir > 0 ? -32 : 32) * 0 + (Math.random() > 0.5 ? 32 : -32);
    } else if (!c.vertical && nearX !== undefined && Math.random() < dt * 0.25) {
      c.vertical = true; c.angle = Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2; c.dir = Math.sin(c.angle) > 0 ? 1 : -1; c.x = nearX + (Math.random() > 0.5 ? 32 : -32);
    }
    c.x += Math.cos(c.angle) * c.speed * dt;
    c.y += Math.sin(c.angle) * c.speed * dt;
    // Wrap around the city edges so traffic never runs dry.
    if (c.x < 40) c.x = WORLD.width - 60; if (c.x > WORLD.width - 40) c.x = 60;
    if (c.y < 40) c.y = WORLD.height - 60; if (c.y > WORLD.height - 40) c.y = 60;
    collideBuildings(G.city, c, 20);
  }
}
