// Solmar Bay — cars: player driving physics, traffic AI, and solid
// car-to-car collisions (cars bounce and lose speed with sparks instead of
// ghosting through each other).
import {
  WORLD_H, WORLD_W, angleDiff, clamp, dist2,
} from './config.js';
import {
  WATER_X, addParticles, collideBuildings, isRoad, nearestRoadX, nearestRoadY,
  randomRoadPoint, roadCentersX, roadCentersY,
} from './world.js';

const CAR_R = 20; // collision radius, roughly the car's half-length
const MAX_SPEED = 540;
const REVERSE_MAX = 180;

function collideCarBuildings(state, car) {
  const probe = { x: car.x, y: car.y };
  if (collideBuildings(state, probe, CAR_R)) {
    // Hit a wall: stop the slide into it and shed speed.
    const hitX = probe.x !== car.x;
    const hitY = probe.y !== car.y;
    car.x = probe.x;
    car.y = probe.y;
    if (hitX || hitY) {
      if (Math.abs(car.speed) > 120) {
        addParticles(state, car.x, car.y, 8, '#f39c12', 140, 0.4, 3);
      }
      car.speed *= 0.35;
    }
  }
  car.x = clamp(car.x, WATER_X + 18, WORLD_W - 18);
  car.y = clamp(car.y, 18, WORLD_H - 18);
}

// Solid collision between two cars: push apart along the impact line and trade
// momentum only while the cars are actually closing in. Resting contact (two
// cruisers side by side on the same chase) must NOT drain speed every frame,
// or a pursuit stalls into a parking lot. Returns true on a hit.
export function collideCars(state, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d2 = dx * dx + dy * dy;
  const min = CAR_R * 2 - 4;
  if (d2 >= min * min || d2 === 0) return false;
  const d = Math.sqrt(d2);
  const nx = dx / d;
  const ny = dy / d;
  const overlap = (min - d) / 2;
  a.x -= nx * overlap;
  a.y -= ny * overlap;
  b.x += nx * overlap;
  b.y += ny * overlap;
  // Velocity vectors from each car's scalar speed and heading.
  const avx = Math.cos(a.angle) * a.speed;
  const avy = Math.sin(a.angle) * a.speed;
  const bvx = Math.cos(b.angle) * b.speed;
  const bvy = Math.sin(b.angle) * b.speed;
  const closing = (bvx - avx) * nx + (bvy - avy) * ny;
  if (closing < 0) {
    // Impulse along the impact normal, restitution 0.25: the cars bounce
    // off each other instead of grinding to a halt in a pile-up.
    const impulse = -(1 + 0.25) * closing / 2;
    const nax = avx + impulse * nx;
    const nay = avy + impulse * ny;
    const nbx = bvx - impulse * nx;
    const nby = bvy - impulse * ny;
    // Keep each car's heading; its new speed is the forward component.
    a.speed = nax * Math.cos(a.angle) + nay * Math.sin(a.angle);
    b.speed = nbx * Math.cos(b.angle) + nby * Math.sin(b.angle);
    if (Math.abs(closing) > 90) {
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      addParticles(state, mx, my, 10, '#f39c12', 180, 0.5, 3);
      if (state.audio) state.audio.crash();
    }
  }
  return true;
}

export function allCars(state) {
  return [...state.cars, ...state.police];
}

function resolveCarCollisions(state) {
  const list = allCars(state);
  for (let i = 0; i < list.length; i += 1) {
    for (let j = i + 1; j < list.length; j += 1) {
      collideCars(state, list[i], list[j]);
    }
  }
}

export function updatePlayerCar(state, dt, input) {
  const car = state.player.car;
  if (!car) return;
  const steer = input.steer();
  const throttle = input.throttle();
  const speedFactor = clamp(Math.abs(car.speed) / 220, 0, 1);
  car.angle += steer * 2.1 * speedFactor * Math.sign(car.speed || 1) * dt * (car.speed < 0 ? -1 : 1);
  if (throttle > 0) car.speed += 620 * dt;
  else if (throttle < 0) {
    car.speed += car.speed > 30 ? -900 * dt : -320 * dt;
  } else {
    car.speed *= Math.pow(0.35, dt); // rolling drag
    if (Math.abs(car.speed) < 4) car.speed = 0;
  }
  // Handbrake-ish: hard steering at speed scrubs speed a little.
  if (steer !== 0 && Math.abs(car.speed) > 300) car.speed *= Math.pow(0.92, dt * 60);
  car.speed = clamp(car.speed, -REVERSE_MAX, MAX_SPEED);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  collideCarBuildings(state, car);
}

function trafficTurn(state, car) {
  // At an intersection, sometimes turn onto the crossing road (right-hand lanes).
  const xs = roadCentersX();
  const ys = roadCentersY();
  if (car.axis === 'x') {
    const cy = nearestRoadY(car.y);
    if (Math.abs(car.y - cy) > 30) return;
    if (state.rng() > 0.4) return;
    car.axis = 'y';
    car.road = nearestRoadX(car.x);
    car.x = car.road + (state.rng() < 0.5 ? -22 : 22);
    car.dir = car.x < car.road ? 1 : -1;
    car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  } else {
    const cx = nearestRoadX(car.x);
    if (Math.abs(car.x - cx) > 30) return;
    if (state.rng() > 0.4) return;
    car.axis = 'x';
    car.road = nearestRoadY(car.y);
    car.y = car.road + (state.rng() < 0.5 ? -22 : 22);
    car.dir = car.y < car.road ? 1 : -1;
    car.angle = car.dir > 0 ? 0 : Math.PI;
  }
}

function updateTrafficCar(state, car, dt) {
  // Yield: slow down when another car is right ahead on the same road.
  let target = car.cruise;
  for (const other of allCars(state)) {
    if (other === car) continue;
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const ahead = car.axis === 'x'
      ? Math.sign(dx) === car.dir && Math.abs(dy) < 40 && Math.abs(dx) < 90
      : Math.sign(dy) === car.dir && Math.abs(dx) < 40 && Math.abs(dy) < 90;
    if (ahead) {
      target = Math.min(target, Math.max(0, other.speed - 20));
    }
  }
  car.speed += clamp(target - car.speed, -400 * dt, 260 * dt);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  trafficTurn(state, car);
  // Keep traffic on the roads: nudge back onto the lane centre.
  if (car.axis === 'x') car.y += (car.road + (car.dir > 0 ? -22 : 22) - car.y) * Math.min(1, 2 * dt);
  else car.x += (car.road + (car.dir > 0 ? -22 : 22) - car.x) * Math.min(1, 2 * dt);
  collideCarBuildings(state, car);
  // Wrap around the far edge so traffic never runs out.
  if (car.x < WATER_X + 30 || car.x > WORLD_W - 30 || car.y < 30 || car.y > WORLD_H - 30) {
    const p = randomRoadPoint(state.rng);
    car.x = p.x;
    car.y = p.y;
    // Re-lane the car on its new road.
    car.axis = state.rng() < 0.5 ? 'x' : 'y';
    if (car.axis === 'x') {
      car.road = nearestRoadY(car.y);
      car.y = car.road + (state.rng() < 0.5 ? -22 : 22);
      car.dir = car.y < car.road ? 1 : -1;
      car.angle = car.dir > 0 ? 0 : Math.PI;
    } else {
      car.road = nearestRoadX(car.x);
      car.x = car.road + (state.rng() < 0.5 ? -22 : 22);
      car.dir = car.x < car.road ? 1 : -1;
      car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
  }
  // Smoke when badly damaged.
  if (car.health < 40 && state.rng() < dt * 6) {
    addParticles(state, car.x, car.y - 10, 1, '#7f8c8d', 30, 1.1, 5);
  }
}

export function updateVehicles(state, dt, input) {
  updatePlayerCar(state, dt, input);
  for (const car of state.cars) {
    if (car.traffic) updateTrafficCar(state, car, dt);
  }
  resolveCarCollisions(state);
}
