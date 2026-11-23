// Solmar Bay — Milo Vega, driver-for-hire: walking, driving, stealing cars.
// The player object lives on G.player; this module moves it and handles E (enter/exit).
import { CFG, clamp, dist2 } from './config.js';
import { ACT_ENTER } from './input.js';

export function createPlayer(world) {
  return {
    x: world.spawn.x,
    y: world.spawn.y,
    angle: 0, // facing, radians (on foot)
    speed: 0, // car speed when driving
    health: 100,
    cash: 0,
    ammo: 24,
    inCar: false,
    car: null, // the car object being driven
    walkPhase: 0,
    moving: false,
    punchTimer: 0,
    punchDidHit: false,
    invuln: 0,
    skid: 0,
  };
}

// Nearest stealable car within reach (parked or traffic, not police).
export function nearestCar(G, maxDist) {
  let best = null;
  let bestD = maxDist * maxDist;
  for (const car of G.cars) {
    if (car.police) continue;
    const d = dist2(G.player.x, G.player.y, car.x, car.y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

export function enterCar(G, car) {
  const p = G.player;
  p.inCar = true;
  p.car = car;
  car.driven = true;
  car.speed = 0;
  p.x = car.x;
  p.y = car.y;
  p.angle = car.angle;
  G.audio.click();
}

export function exitCar(G) {
  const p = G.player;
  if (!p.car) return;
  const car = p.car;
  car.driven = false;
  car.speed = 0;
  // Step out to the side of the car.
  const side = car.angle + Math.PI / 2;
  p.x = car.x + Math.cos(side) * 34;
  p.y = car.y + Math.sin(side) * 34;
  p.inCar = false;
  p.car = null;
  p.speed = 0;
  p.angle = car.angle;
}

function driveCar(G, dt, input) {
  const p = G.player;
  const car = p.car;
  const axis = input.axis();
  // W/S (or up/down) = throttle / brake-reverse; A/D steer, stronger at speed.
  const throttle = -axis.y; // up key gives axis.y = -1, so throttle = +1
  const steer = axis.x;
  if (throttle > 0) car.speed += CFG.CAR_ACCEL * dt;
  else if (throttle < 0) car.speed -= (car.speed > 0 ? CFG.CAR_ACCEL * 1.4 : CFG.CAR_ACCEL * 0.7) * dt;
  else car.speed -= car.speed * 1.6 * dt; // coast drag
  car.speed = clamp(car.speed, -CFG.CAR_REVERSE, CFG.CAR_MAX);
  const turn = steer * CFG.CAR_TURN * dt * clamp(Math.abs(car.speed) / 120, 0, 1) * (car.speed < 0 ? -1 : 1);
  car.angle += turn;
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  // Cars are solid: never ghost through traffic or a cruiser. Bump, spark,
  // shove the other car a little and lose speed instead.
  let bumped = false;
  for (const other of G.cars) {
    if (other === car || other.driven) continue;
    if (Math.hypot(nx - other.x, ny - other.y) < 46) {
      bumped = true;
      other.x += Math.cos(other.angle) * 8;
      other.y += Math.sin(other.angle) * 8;
    }
  }
  for (const cop of G.police) {
    if (Math.hypot(nx - cop.x, ny - cop.y) < 48) bumped = true;
  }
  if (bumped) {
    car.speed *= 0.3;
    G.particles.push({ kind: 'spark', x: nx, y: ny, t: 0, life: 0.3 });
    if (Math.abs(car.speed) > 60) G.audio.punch();
  }
  // Buildings stop the car with a thud; water is off-limits.
  const probe = { x: nx, y: ny };
  const hit = G.world.resolveBuilding(probe, 20);
  if (bumped) {
    // Stay put this step; the bump above already bled the speed off.
  } else if (hit || G.world.inWater(nx, ny)) {
    if (Math.abs(car.speed) > 180) {
      G.particles.push({ kind: 'spark', x: car.x, y: car.y, t: 0, life: 0.4 });
      G.audio.punch();
    }
    car.speed *= -0.25; // bounce off
  } else {
    car.x = nx;
    car.y = ny;
  }
  // Skid marks on hard turns at speed.
  if (Math.abs(steer) > 0 && Math.abs(car.speed) > 220) {
    p.skid += dt;
    if (p.skid > 0.06) {
      p.skid = 0;
      G.particles.push({ kind: 'skid', x: car.x, y: car.y, angle: car.angle, t: 0, life: 0.7 });
    }
  }
  car.x = clamp(car.x, 40, CFG.WORLD - 40);
  car.y = clamp(car.y, 40, CFG.WORLD - 40);
  p.x = car.x;
  p.y = car.y;
  p.angle = car.angle;
  p.speed = car.speed;
}

function walkPlayer(G, dt, input) {
  const p = G.player;
  const axis = input.axis();
  const len = Math.hypot(axis.x, axis.y) || 1;
  p.moving = axis.x !== 0 || axis.y !== 0;
  if (p.moving) {
    const nx = p.x + (axis.x / len) * CFG.WALK_SPEED * dt;
    const ny = p.y + (axis.y / len) * CFG.WALK_SPEED * dt;
    p.angle = Math.atan2(axis.y, axis.x);
    p.walkPhase += dt * 10;
    // Move axis by axis so the player slides along building walls.
    const px = { x: nx, y: p.y };
    if (!G.world.resolveBuilding(px, CFG.PLAYER_R) && !G.world.inWater(nx, p.y)) p.x = nx;
    const py = { x: p.x, y: ny };
    if (!G.world.resolveBuilding(py, CFG.PLAYER_R) && !G.world.inWater(p.x, ny)) p.y = ny;
  }
  p.x = clamp(p.x, 30, CFG.WORLD - 30);
  p.y = clamp(p.y, 30, CFG.WORLD - 30);
  p.speed = 0;
}

// Aim on foot follows the mouse (world position); in a car the car aims itself.
export function updateAim(G, input, cam) {
  const p = G.player;
  if (p.inCar) return;
  const wx = input.mouse.x / cam.scale + cam.x;
  const wy = input.mouse.y / cam.scale + cam.y;
  p.angle = Math.atan2(wy - p.y, wx - p.x);
}

export function updatePlayer(G, dt, input, actions) {
  const p = G.player;
  if (p.invuln > 0) p.invuln -= dt;
  if (p.punchTimer > 0) p.punchTimer -= dt;

  if (actions && (actions & ACT_ENTER)) {
    if (p.inCar) {
      exitCar(G);
    } else {
      const car = nearestCar(G, 64);
      if (car) {
        enterCar(G, car);
        if (!car.owned) {
          car.owned = true;
          G.addWanted(1, 'stole a car');
          G.banner = { text: 'Car stolen! The cops noticed.', t: 0, life: 2.5 };
        }
      } else {
        G.audio.denied();
      }
    }
  }

  if (p.inCar) driveCar(G, dt, input);
  else walkPlayer(G, dt, input);

  // Slow health regen when the heat is off.
  if (G.wanted === 0 && p.health > 0 && p.health < 100) p.health = Math.min(100, p.health + 2.5 * dt);
}
