// Solmar Bay — Milo Vega on foot and behind the wheel: walking, arcade driving,
// entering and exiting cars (E), and health / busted handling.
import { PLAYER_CFG, CAR_CFG, WORLD, clamp, dist } from './config.js';
import { collideBuildings, onRoad } from './world.js';

export function createPlayer(x, y) {
  return { x, y, angle: -Math.PI / 2, hp: PLAYER_CFG.hp, cash: 0, ammo: 24, speed: 0, onFoot: true, car: null, punchCd: 0, hurtCd: 0, dead: false, busted: false };
}

export function nearestCar(G, x, y, maxD) {
  let best = null, bd = maxD;
  for (const c of G.cars) { const d = dist(x, y, c.x, c.y); if (d < bd) { bd = d; best = c; } }
  return best;
}

export function stepPlayer(G, dt, input) {
  const p = G.player;
  if (p.dead || p.busted) return;
  p.punchCd = Math.max(0, p.punchCd - dt);
  p.hurtCd = Math.max(0, p.hurtCd - dt);
  const ax = input.axis();
  if (p.onFoot) {
    // Walk with WASD; face the mouse when aiming, else face movement.
    const mx = G.cam.x + input.state.mouseX / G.view.scale, my = G.cam.y + input.state.mouseY / G.view.scale;
    if (input.state.mouseDown || true) p.angle = Math.atan2(my - p.y, mx - p.x);
    const len = Math.hypot(ax.x, ax.y) || 1;
    p.x += (ax.x / len) * PLAYER_CFG.walkSpeed * dt * (ax.x || ax.y ? 1 : 0);
    p.y += (ax.y / len) * PLAYER_CFG.walkSpeed * dt * (ax.x || ax.y ? 1 : 0);
    p.speed = (ax.x || ax.y) ? PLAYER_CFG.walkSpeed : 0;
    collideBuildings(G.city, p, PLAYER_CFG.radius);
  } else if (p.car) {
    // Arcade driving: W/S throttle, A/D steer (steering flips in reverse).
    const car = p.car;
    const throttle = ax.y < 0 ? 1 : ax.y > 0 ? -0.6 : 0;
    car.speed += throttle * CAR_CFG.accel * dt;
    car.speed -= car.speed * 0.9 * dt; // drag
    car.speed = clamp(car.speed, -CAR_CFG.reverse, CAR_CFG.maxSpeed);
    const steer = ax.x * CAR_CFG.turn * dt * (car.speed >= 0 ? 1 : -1) * Math.min(1, Math.abs(car.speed) / 120 + 0.25);
    car.angle += steer;
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    const before = { x: car.x, y: car.y };
    car.x = nx; car.y = ny;
    if (collideBuildings(G.city, car, 24)) {
      if (Math.abs(car.speed) > 240) { G.audio.crash(); G.hurtCar(car); }
      car.speed *= -0.25; car.x = before.x; car.y = before.y;
    }
    p.x = car.x; p.y = car.y; p.angle = car.angle; p.speed = Math.abs(car.speed);
    // Skid particles on hard turns at speed.
    if (Math.abs(ax.x) > 0 && Math.abs(car.speed) > 300 && Math.random() < 0.4) {
      G.particles.push({ x: car.x - Math.cos(car.angle) * 24, y: car.y - Math.sin(car.angle) * 24, vx: 0, vy: 0, life: 0.4, max: 0.4, color: '#cfc8b8', size: 5 });
    }
    // Off-road slows the car a touch.
    if (!onRoad(car.x, car.y)) car.speed *= 0.995;
  }
}

export function tryEnterExitCar(G) {
  const p = G.player;
  if (p.onFoot) {
    const car = nearestCar(G, p.x, p.y, 70);
    if (car) {
      p.onFoot = false; p.car = car; car.stolen = true; car.occupied = true;
      if (car.kind === 'parked') { car.kind = 'player'; G.addWanted(1, 'You stole a parked car on the Strip.'); }
      else { G.addWanted(1, 'Carjacking! Someone called it in.'); G.audio.crash(); }
      G.audio.pickup();
      return 'in car';
    }
  } else if (p.car) {
    const car = p.car;
    car.occupied = false; car.speed *= 0.3;
    p.onFoot = true; p.car = null;
    p.x = car.x - Math.cos(car.angle) * 40; p.y = car.y - Math.sin(car.angle) * 40;
    collideBuildings(G.city, p, PLAYER_CFG.radius);
    return 'on foot';
  }
  return null;
}

export function hurtPlayer(G, dmg) {
  const p = G.player;
  if (p.hurtCd > 0 || p.dead) return;
  p.hp -= dmg; p.hurtCd = 0.5;
  if (p.hp <= 0) { p.hp = 0; p.dead = true; G.audio.busted(); }
}
