// Solmar Bay — the police: cruisers spawn by wanted level, chase the player,
// ram a getaway car, and bust the player on foot when they close in.
import { WORLD_H, WORLD_W, angleDiff, angleTo, clamp, dist2 } from './config.js';
import { WATER_X, addParticles, randomRoadPoint, showMessage } from './world.js';
import { collideCars } from './vehicles.js';

const COP_R = 20;
const MAX_ACTIVE = 5;

export function wantedToCops(wanted) {
  return Math.min(MAX_ACTIVE, wanted + (wanted >= 4 ? 1 : 0));
}

export function spawnPolice(state) {
  const want = wantedToCops(state.player.wanted);
  while (state.police.filter((c) => !c.disabled).length < want) {
    // Spawn on a road near the player but off-screen when possible.
    let x = 0;
    let y = 0;
    for (let tries = 0; tries < 8; tries += 1) {
      const p = randomRoadPoint(state.rng);
      const d = dist2(p.x, p.y, state.player.x, state.player.y);
      if (d > 500 * 500 && d < 1100 * 1100) {
        x = p.x;
        y = p.y;
        break;
      }
      x = p.x;
      y = p.y;
    }
    state.police.push({
      id: 900 + state.police.length,
      x, y, angle: 0, speed: 0, color: '#1c2733',
      traffic: false, parked: false, w: 46, h: 22,
      health: 100, disabled: false, siren: state.rng() * 10,
    });
  }
  // Despawn cruisers that fell far behind.
  for (const cop of state.police) {
    if (dist2(cop.x, cop.y, state.player.x, state.player.y) > 1600 * 1600) cop.disabled = true;
  }
  state.police = state.police.filter((c) => !c.disabled);
}

export function updatePolice(state, dt, audio) {
  const p = state.player;
  if (p.wanted > 0) spawnPolice(state);
  else {
    // Heat off: the cruisers give up and drive away.
    for (const cop of state.police) cop.disabled = true;
    state.police = [];
    return;
  }
  for (const cop of state.police) {
    if (cop.disabled) continue;
    const targetAngle = angleTo(cop.x, cop.y, p.x, p.y);
    const diff = angleDiff(cop.angle, targetAngle);
    const steer = clamp(diff * 2.2, -1, 1);
    const d = Math.sqrt(dist2(cop.x, cop.y, p.x, p.y));
    const topSpeed = 470 + p.wanted * 18;
    // Ease off the gas when right on top of the player, so the ram lands.
    const throttle = d > 90 ? 1 : 0.4;
    cop.angle += steer * 2.6 * clamp(Math.abs(cop.speed) / 200, 0.15, 1) * dt * (cop.speed < 0 ? -1 : 1);
    if (throttle > 0) cop.speed += 700 * dt;
    else cop.speed *= Math.pow(0.4, dt);
    cop.speed = clamp(cop.speed, 0, topSpeed);
    cop.x += Math.cos(cop.angle) * cop.speed * dt;
    cop.y += Math.sin(cop.angle) * cop.speed * dt;
    cop.x = clamp(cop.x, WATER_X + 18, WORLD_W - 18);
    cop.y = clamp(cop.y, 18, WORLD_H - 18);

    // Ram: a cruiser touching the player's car shoves it and sparks.
    if (p.car) collideCars(state, cop, p.car);
    else if (d < 46 && p.onFoot && p.deadTimer <= 0) {
      // On foot and cornered: the bust meter fills.
      p.bustProgress += dt * 1.4;
      if (p.bustProgress >= 2.2) {
        p.bustProgress = 2.2;
        if (audio) audio.busted();
        showMessage(state, 'BUSTED by the Solmar Bay PD…');
      }
    } else if (p.onFoot) {
      p.bustProgress = Math.max(0, p.bustProgress - dt * 2);
    }
    // Siren strobe particles.
    cop.siren += dt;
    if (Math.sin(cop.siren * 9) > 0.86) {
      addParticles(state, cop.x, cop.y - 12, 1, Math.sin(cop.siren * 4.5) > 0 ? '#e74c3c' : '#3498db', 10, 0.25, 4);
    }
  }
}
