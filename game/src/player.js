// Solmar Bay — final pass, round 4
// Solmar Bay — the player on foot: WASD walking and running, mouse-aimed
// shooting direction, and getting in and out of cars (E). Stealing a parked
// car, or one with a driver, raises heat; the driver's door is always open.
import { CAR, PLAYER, STEP, WANTED } from './config.js';
import { addHeat, circleHitsBuilding, setMessage } from './world.js';

export function stepPlayer(state, input, audio) {
  const p = state.player;
  if (!p.alive || !p.onFoot) return;
  const dirX = input.direction();
  const dirY = input.throttle();
  const speed = input.running() ? PLAYER.runSpeed : PLAYER.walkSpeed;
  let dx = dirX;
  let dy = -dirY;
  const len = Math.hypot(dx, dy);
  if (len > 0) {
    dx /= len;
    dy /= len;
    p.angle = Math.atan2(dy, dx);
    const nx = p.x + dx * speed * STEP;
    const ny = p.y + dy * speed * STEP;
    if (!circleHitsBuilding(state, nx, p.y, PLAYER.radius)) p.x = nx;
    if (!circleHitsBuilding(state, p.x, ny, PLAYER.radius)) p.y = ny;
    p.x = Math.max(20, Math.min(3180, p.x));
    p.y = Math.max(20, Math.min(3180, p.y));
  }
  p.speed = len > 0 ? speed : 0;
}

export function tryEnterCar(state, audio) {
  const p = state.player;
  if (!p.onFoot || !p.alive) return;
  let best = null;
  let bestD = 70;
  for (const car of state.cars) {
    if (car.kind === 'police') continue;
    const d = Math.hypot(car.x - p.x, car.y - p.y);
    if (d < bestD) { best = car; bestD = d; }
  }
  if (!best) {
    setMessage(state, 'No car close by. Find one parked at the kerb.', 2.5);
    return;
  }
  p.onFoot = false;
  p.car = best;
  best.driver = 'player';
  if (best.kind === 'traffic') {
    best.kind = 'player';
    addHeat(state, WANTED.stealCar);
    setMessage(state, 'Car stolen! The owner is calling it in…', 3);
    state.stats.carsStolen += 1;
  } else if (!best.stolen) {
    best.stolen = true;
    best.kind = 'player';
    addHeat(state, WANTED.stealCar);
    setMessage(state, 'You took the car. Keep it moving.', 3);
    state.stats.carsStolen += 1;
  } else {
    best.kind = 'player';
  }
  p.x = best.x;
  p.y = best.y;
  p.angle = best.angle;
  if (audio) audio.pickup();
}

export function exitCar(state) {
  const p = state.player;
  if (p.onFoot || !p.car) return;
  const car = p.car;
  car.speed = 0;
  car.driver = null;
  car.kind = car.stolen ? 'player' : 'parked';
  p.onFoot = true;
  p.car = null;
  p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 34;
  p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 34;
  p.angle = car.angle;
}

export function hurtPlayer(state, amount, audio) {
  const p = state.player;
  if (state.time < p.invulnerableUntil) return;
  p.health -= amount;
  p.invulnerableUntil = state.time + 0.5;
  if (audio) audio.hit();
  if (p.health <= 0) {
    p.health = 0;
    p.alive = false;
    setMessage(state, 'You are down. Carmen Sol is not happy.', 5);
  }
}
