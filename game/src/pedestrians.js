// Solmar Bay — final pass, round 4
// Solmar Bay — pedestrians: ordinary folk strolling the sidewalks. They
// panic and run when shots are fired or a car mounts the kerb near them,
// and getting hit by a car raises heat.
import { STEP, WANTED, WORLD_SIZE } from './config.js';
import { addHeat, circleHitsBuilding } from './world.js';

export function stepPedestrians(state) {
  for (const ped of state.peds) {
    if (!ped.alive) continue;
    if (ped.panic > 0) ped.panic -= STEP;
    const speed = ped.panic > 0 ? ped.speed * 2.6 : ped.speed;
    const nx = ped.x + Math.cos(ped.angle) * speed * STEP;
    const ny = ped.y + Math.sin(ped.angle) * speed * STEP;
    if (!circleHitsBuilding(state, nx, ny, 10) && nx > 30 && nx < WORLD_SIZE - 30 && ny > 30 && ny < WORLD_SIZE - 30) {
      ped.x = nx;
      ped.y = ny;
    } else {
      ped.angle += Math.PI / 2;
    }
    // Wander: occasionally pick a new heading at a corner.
    if (Math.random() < 0.002) ped.angle += (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2;
  }
}

export function panicNearby(state, x, y, radius) {
  for (const ped of state.peds) {
    if (ped.alive && Math.hypot(ped.x - x, ped.y - y) < radius) {
      ped.panic = 3;
      ped.angle = Math.atan2(ped.y - y, ped.x - x);
    }
  }
}

export function checkPedCarHits(state, audio) {
  const p = state.player;
  if (p.onFoot || !p.car) return;
  const car = p.car;
  if (Math.abs(car.speed) < 60) return;
  for (const ped of state.peds) {
    if (!ped.alive) continue;
    if (Math.hypot(ped.x - car.x, ped.y - car.y) < 26) {
      ped.alive = false;
      addHeat(state, WANTED.hitPed);
      panicNearby(state, car.x, car.y, 220);
      if (audio) audio.hit();
    }
  }
}
