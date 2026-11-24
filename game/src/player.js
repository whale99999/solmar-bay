// Solmar Bay — the player on foot and in a car: movement, entering and
// stealing cars, health, wanted level and being busted or wasted.
import { STEP, WORLD_H, WORLD_W, clamp, dist2 } from './config.js';
import { WATER_X, addFloat, addParticles, collideBuildings, showMessage } from './world.js';

const WALK_SPEED = 175;
const RUN_SPEED = 250;
const PLAYER_R = 13;

export function nearestCar(state, maxDist = 70) {
  let best = null;
  let bestD = maxDist * maxDist;
  for (const car of state.cars) {
    if (car.traffic) continue; // moving traffic cannot be boarded
    const d = dist2(state.player.x, state.player.y, car.x, car.y);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}

export function enterCar(state, car, audio) {
  const p = state.player;
  p.car = car;
  p.onFoot = false;
  p.x = car.x;
  p.y = car.y;
  p.angle = car.angle;
  car.parked = false;
  car.traffic = false;
  if (car.stolen !== true) {
    car.stolen = true;
    state.stats.carsStolen += 1;
    addWanted(state, 2, 'Car stolen — the cops are coming');
    addFloat(state, car.x, car.y - 30, 'STOLEN!', '#f1c40f');
  }
  if (audio) audio.pickup();
}

export function exitCar(state) {
  const p = state.player;
  const car = p.car;
  if (!car) return;
  // Step out to the driver's side, clear of buildings.
  const side = p.angle + Math.PI / 2;
  p.x = car.x + Math.cos(side) * 34;
  p.y = car.y + Math.sin(side) * 34;
  p.x = clamp(p.x, WATER_X + 20, WORLD_W - 10);
  p.y = clamp(p.y, 10, WORLD_H - 10);
  collideBuildings(state, p, PLAYER_R);
  p.onFoot = true;
  p.speed = 0;
  p.car = null;
  car.parked = true;
  car.speed = 0;
}

export function addWanted(state, stars, reason) {
  const p = state.player;
  if (p.crimeCooldown > 0) return;
  p.wanted = clamp(p.wanted + stars, 0, 5);
  p.crimeCooldown = 1.2;
  p.wantedTimer = 0;
  if (reason) showMessage(state, reason);
}

export function damagePlayer(state, amount, audio) {
  const p = state.player;
  if (p.deadTimer > 0 || p.bustProgress > 0) return;
  p.health -= amount;
  if (p.health <= 0) {
    p.health = 0;
    p.deadTimer = 2.2;
    addParticles(state, p.x, p.y, 26, '#c0392b', 160, 0.9, 4);
    if (audio) audio.busted();
    showMessage(state, 'WASTED — waking up at the hospital…');
  }
}

function respawn(state, place) {
  const p = state.player;
  const spot = state.spots[place];
  if (p.car) {
    p.car.parked = true;
    p.car.speed = 0;
    p.car = null;
  }
  p.onFoot = true;
  p.x = spot.x;
  p.y = spot.y;
  p.angle = -Math.PI / 2;
  p.health = 100;
  p.wanted = 0;
  p.bustProgress = 0;
  p.deadTimer = 0;
  p.speed = 0;
  for (const cop of state.police) cop.disabled = true;
  state.police = state.police.filter((c) => !c.disabled);
  state.bullets.length = 0;
}

export function updatePlayer(state, dt, input, audio) {
  const p = state.player;
  p.crimeCooldown = Math.max(0, p.crimeCooldown - dt);
  if (p.deadTimer > 0) {
    p.deadTimer -= dt;
    if (p.deadTimer <= 0) {
      const lost = Math.floor(p.cash * 0.1);
      p.cash -= lost;
      state.stats.arrests += 1;
      respawn(state, 'hospital');
      showMessage(state, `Hospital bill: -$${lost}. Stay out of trouble.`);
    }
    return;
  }
  if (p.bustProgress > 0) {
    // Being busted: frozen while the cuffs go on, then respawn at the plaza.
    p.bustProgress -= dt;
    if (p.bustProgress <= 0) {
      const lost = Math.floor(p.cash * 0.1);
      p.cash -= lost;
      state.stats.arrests += 1;
      respawn(state, 'carmen');
      showMessage(state, `BUSTED — fined $${lost}. Carmen is not impressed.`);
    }
    return;
  }

  // Wanted decay: lay low and the heat cools off, one star at a time.
  if (p.wanted > 0) {
    const copNear = state.police.some((c) => dist2(p.x, p.y, c.x, c.y) < 500 * 500);
    if (!copNear) {
      p.wantedTimer += dt;
      if (p.wantedTimer > 12) {
        p.wanted -= 1;
        p.wantedTimer = 0;
        if (p.wanted === 0) showMessage(state, 'You lost the cops. Heat is off.');
      }
    } else {
      p.wantedTimer = 0;
    }
  }

  // Slow health regen while the heat is off.
  if (p.wanted === 0 && p.health < 100) {
    p.regenTimer += dt;
    if (p.regenTimer > 1) {
      p.health = Math.min(100, p.health + 2);
      p.regenTimer = 0;
    }
  }

  if (p.onFoot) {
    const mx = input.moveX();
    const my = input.moveY();
    const speed = input.running() ? RUN_SPEED : WALK_SPEED;
    if (mx !== 0 || my !== 0) {
      const len = Math.hypot(mx, my);
      p.x += (mx / len) * speed * dt;
      p.y += (my / len) * speed * dt;
      p.angle = Math.atan2(my, mx);
      p.speed = speed;
    } else {
      p.speed = 0;
    }
    p.x = clamp(p.x, WATER_X + 16, WORLD_W - 10);
    p.y = clamp(p.y, 10, WORLD_H - 10);
    collideBuildings(state, p, PLAYER_R);
  }
  // Driving is handled by vehicles.updatePlayerCar; the player rides the car.
  if (p.car) {
    p.x = p.car.x;
    p.y = p.car.y;
    p.angle = p.car.angle;
    p.speed = p.car.speed;
  }
}
