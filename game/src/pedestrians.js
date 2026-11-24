// Solmar Bay — pedestrians: sidewalk walkers who stroll the city, flee from
// gunfire and police chases, and scatter when a car barrels at them.
import { WORLD_H, WORLD_W, angleTo, clamp, dist2 } from './config.js';
import { WATER_X, collideBuildings, nearestRoadX, nearestRoadY, randomRoadPoint } from './world.js';

const PED_R = 11;

function pickSidewalkTarget(state, ped) {
  // Walk along a road on its sidewalk: pick a point further down the same road.
  const xs = [200, 600, 1000, 1400, 1800, 2200, 2600, 3000];
  const ys = [200, 600, 1000, 1400, 1800, 2200];
  if (state.rng() < 0.5) {
    const road = xs[Math.floor(state.rng() * xs.length)];
    ped.tx = road + (state.rng() < 0.5 ? -64 : 64);
    ped.ty = clamp(ped.y + (state.rng() < 0.5 ? -1 : 1) * (120 + state.rng() * 260), 60, WORLD_H - 60);
  } else {
    const road = ys[Math.floor(state.rng() * ys.length)];
    ped.ty = road + (state.rng() < 0.5 ? -64 : 64);
    ped.tx = clamp(ped.x + (state.rng() < 0.5 ? -1 : 1) * (120 + state.rng() * 260), WATER_X + 60, WORLD_W - 60);
  }
}

export function scarePeds(state, x, y, radius = 320) {
  for (const ped of state.peds) {
    if (ped.mode === 'down') continue;
    if (dist2(ped.x, ped.y, x, y) < radius * radius) {
      ped.mode = 'flee';
      ped.fleeX = x;
      ped.fleeY = y;
      ped.wait = 0;
    }
  }
}

export function updatePedestrians(state, dt) {
  const p = state.player;
  for (const ped of state.peds) {
    if (ped.mode === 'down') continue;
    let speed = ped.speed;
    let tx = ped.tx;
    let ty = ped.ty;
    if (ped.mode === 'flee') {
      // Run directly away from the scare point, fast.
      speed = ped.speed * 3.2;
      const a = angleTo(ped.fleeX, ped.fleeY, ped.x, ped.y);
      tx = ped.x + Math.cos(a) * 200;
      ty = ped.y + Math.sin(a) * 200;
      ped.wait += dt;
      if (ped.wait > 2.5) {
        ped.mode = 'walk';
        pickSidewalkTarget(state, ped);
      }
    } else {
      // A car closing in fast makes walkers jump aside.
      for (const car of state.cars) {
        if (!car.traffic && car !== p.car) continue;
        if (Math.abs(car.speed) < 150) continue;
        if (dist2(ped.x, ped.y, car.x, car.y) < 90 * 90) {
          ped.mode = 'flee';
          ped.fleeX = car.x;
          ped.fleeY = car.y;
          ped.wait = 0;
          break;
        }
      }
      const dx = tx - ped.x;
      const dy = ty - ped.y;
      if (dx * dx + dy * dy < 24 * 24) {
        if (ped.wait > 0) {
          ped.wait -= dt;
        } else if (state.rng() < dt * 0.5) {
          pickSidewalkTarget(state, ped);
        } else {
          ped.wait = 1 + state.rng() * 3;
        }
      }
    }
    const dx = tx - ped.x;
    const dy = ty - ped.y;
    const d = Math.hypot(dx, dy);
    if (d > 4) {
      ped.angle = Math.atan2(dy, dx);
      ped.x += (dx / d) * speed * dt;
      ped.y += (dy / d) * speed * dt;
    }
    ped.x = clamp(ped.x, WATER_X + 14, WORLD_W - 14);
    ped.y = clamp(ped.y, 14, WORLD_H - 14);
    collideBuildings(state, ped, PED_R);
  }
  // Keep the streets populated: replace peds who wandered too far away.
  if (state.peds.length < 24 && state.rng() < dt * 0.5) {
    const p2 = randomRoadPoint(state.rng);
    state.peds.push({
      x: p2.x, y: p2.y, angle: 0, speed: 30 + state.rng() * 22,
      color: '#82e0aa', mode: 'walk', tx: p2.x, ty: p2.y, wait: 0, health: 1,
    });
  }
}
