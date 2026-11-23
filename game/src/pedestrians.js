// Solmar Bay — pedestrians stroll the sidewalks, cross at intersections and
// scatter (with a scream of particles) when a car or a gunshot comes too close.
import { WORLD, ROADS_X, ROADS_Y, createRandom, pick, dist, clamp } from './config.js';
import { collideBuildings, onRoad } from './world.js';

const SHIRTS = ['#ff8c42', '#37e6ff', '#e8b34a', '#ff4fd8', '#f5f1e6', '#7aff9e', '#c65f7a'];

export function spawnPedestrians(G, n) {
  const rng = createRandom(G.seed + 31);
  G.peds = [];
  for (let i = 0; i < n; i += 1) {
    const x = 80 + rng() * (WORLD.width - 160), y = 80 + rng() * (WORLD.height - 160);
    G.peds.push({ x, y, angle: rng() * Math.PI * 2, speed: 40 + rng() * 40, shirt: pick(rng, SHIRTS), panic: 0, hp: 50, walkPhase: rng() * 6 });
  }
}

export function stepPedestrians(G, dt) {
  const p = G.player;
  for (const ped of G.peds) {
    ped.walkPhase += dt * 6;
    const dPlayer = dist(ped.x, ped.y, p.x, p.y);
    const carNear = G.cars.some((c) => Math.abs(c.speed) > 60 && dist(ped.x, ped.y, c.x, c.y) < 90);
    if ((dPlayer < 70 && p.speed > 100) || carNear || G.gunshotTimer > 0) ped.panic = 1.2;
    if (ped.panic > 0) {
      ped.panic -= dt;
      // Flee away from the player / nearest fast car.
      const away = Math.atan2(ped.y - p.y, ped.x - p.x);
      ped.angle = away;
      ped.x += Math.cos(away) * 190 * dt; ped.y += Math.sin(away) * 190 * dt;
    } else {
      // Stroll: wander, prefer sidewalks, turn at random.
      if (Math.random() < dt * 0.3) ped.angle += (Math.random() - 0.5) * 1.6;
      ped.x += Math.cos(ped.angle) * ped.speed * dt;
      ped.y += Math.sin(ped.angle) * ped.speed * dt;
      if (onRoad(ped.x, ped.y) && Math.random() < dt * 2) ped.angle += Math.PI / 2;
    }
    ped.x = clamp(ped.x, 30, WORLD.width - 30); ped.y = clamp(ped.y, 30, WORLD.height - 30);
    collideBuildings(G.city, ped, 12);
    // A speeding car hitting a pedestrian: they tumble away, wanted rises.
    for (const c of G.cars) {
      if (Math.abs(c.speed) > 200 && dist(ped.x, ped.y, c.x, c.y) < 34) {
        ped.x += Math.cos(c.angle) * 60; ped.y += Math.sin(c.angle) * 60; ped.panic = 2;
        if (c === p.car) { G.addWanted(1, 'You hit a pedestrian — witnesses called the police.'); }
      }
    }
  }
}
