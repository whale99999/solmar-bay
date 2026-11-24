// Solmar Bay — final pass, round 4
// Solmar Bay — vehicles: arcade car physics for the player's car, traffic
// that follows the road grid and yields, and solid car-to-car collisions
// with sparks and speed loss instead of ghosting through.
import { CAR, ROAD_SPACING, ROAD_WIDTH, STEP, WORLD_SIZE } from './config.js';
import { circleHitsBuilding, isOnRoad, spawnParticles } from './world.js';

export function stepPlayerCar(state, input, audio) {
  const p = state.player;
  const car = p.car;
  if (p.onFoot || !car) return;
  const throttle = input.throttle();
  const steer = input.direction();
  if (throttle > 0) car.speed += CAR.accel * STEP;
  else if (throttle < 0) car.speed -= (car.speed > 0 ? CAR.brake : CAR.accel * 0.6) * STEP;
  else car.speed -= Math.sign(car.speed) * 120 * STEP;
  if (Math.abs(car.speed) < 4 && throttle === 0) car.speed = 0;
  car.speed = Math.max(-CAR.reverseMax, Math.min(CAR.maxSpeed, car.speed));
  const turn = steer * CAR.turnRate * STEP * Math.min(1, Math.abs(car.speed) / 120) * Math.sign(car.speed || 1);
  car.angle += turn;
  const nx = car.x + Math.cos(car.angle) * car.speed * STEP;
  const ny = car.y + Math.sin(car.angle) * car.speed * STEP;
  if (!circleHitsBuilding(state, nx, ny, 20)) {
    car.x = nx;
    car.y = ny;
  } else {
    if (Math.abs(car.speed) > 200 && audio) audio.crash();
    spawnParticles(state, nx, ny, '#ffcc33', 8);
    car.speed *= -0.25;
  }
  car.x = Math.max(30, Math.min(WORLD_SIZE - 30, car.x));
  car.y = Math.max(30, Math.min(WORLD_SIZE - 30, car.y));
  p.x = car.x;
  p.y = car.y;
  p.angle = car.angle;
  p.speed = Math.abs(car.speed);
}

function nearestIntersection(car) {
  let best = null;
  let bestD = Infinity;
  for (let c = ROAD_SPACING / 2; c < WORLD_SIZE; c += ROAD_SPACING) {
    for (let d = ROAD_SPACING / 2; d < WORLD_SIZE; d += ROAD_SPACING) {
      const dist = Math.hypot(car.x - c, car.y - d);
      if (dist < bestD) { bestD = dist; best = { x: c, y: d, d: dist }; }
    }
  }
  return best;
}

export function stepTraffic(state) {
  for (const car of state.cars) {
    if (car.kind !== 'traffic') continue;
    // Slow down for the car ahead on the same road.
    let ahead = Infinity;
    for (const other of state.cars) {
      if (other === car || other.kind === 'parked') continue;
      const dx = other.x - car.x;
      const dy = other.y - car.y;
      const along = dx * Math.cos(car.angle) + dy * Math.sin(car.angle);
      const side = Math.abs(-dx * Math.sin(car.angle) + dy * Math.cos(car.angle));
      if (along > 0 && along < 90 && side < 26) ahead = Math.min(ahead, along);
    }
    const target = ahead < 90 ? 0 : 120;
    car.speed += (target - car.speed) * STEP * 1.5;
    // At an intersection, sometimes turn onto the cross street.
    const inter = nearestIntersection(car);
    if (inter && inter.d < 30 && Math.random() < 0.02) {
      car.angle += (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2;
    }
    const nx = car.x + Math.cos(car.angle) * car.speed * STEP;
    const ny = car.y + Math.sin(car.angle) * car.speed * STEP;
    if (isOnRoad(nx, ny) || Math.hypot(nx - car.x, ny - car.y) < 1) {
      car.x = nx;
      car.y = ny;
    } else {
      // Drifted off the road: steer back toward the nearest road centre.
      car.angle += 0.03 * Math.sign(Math.sin(car.angle));
    }
    // Keep traffic inside the city.
    if (car.x < 40 || car.x > WORLD_SIZE - 40 || car.y < 40 || car.y > WORLD_SIZE - 40) {
      car.angle += Math.PI;
    }
  }
}

export function resolveCarCollisions(state, audio) {
  const cars = state.cars.filter((c) => c.kind !== 'parked');
  for (let i = 0; i < cars.length; i += 1) {
    for (let j = i + 1; j < cars.length; j += 1) {
      const a = cars[i];
      const b = cars[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d > 0 && d < 44) {
        const push = (44 - d) / 2;
        const ux = dx / d;
        const uy = dy / d;
        a.x -= ux * push;
        a.y -= uy * push;
        b.x += ux * push;
        b.y += uy * push;
        const impact = Math.abs(a.speed - b.speed);
        if (impact > 120) {
          spawnParticles(state, (a.x + b.x) / 2, (a.y + b.y) / 2, '#ffcc33', 10);
          if (audio) audio.crash();
        }
        a.speed *= 0.6;
        b.speed *= 0.6;
      }
    }
  }
}
