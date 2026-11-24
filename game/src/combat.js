// Solmar Bay — combat: the player's pistol, rival gang shooters, bullet
// flight and hits. Shooting in public raises the wanted level.
import { WORLD_H, WORLD_W, angleTo, clamp, dist2 } from './config.js';
import { addParticles, pointInBuilding, showMessage } from './world.js';
import { addWanted, damagePlayer } from './player.js';
import { scarePeds } from './pedestrians.js';

const BULLET_SPEED = 760;
const BULLET_LIFE = 1.1;
const FIRE_INTERVAL = 0.22;

export function fireBullet(state, fromX, fromY, angle, fromPlayer, audio) {
  state.bullets.push({
    x: fromX + Math.cos(angle) * 20,
    y: fromY + Math.sin(angle) * 20,
    vx: Math.cos(angle) * BULLET_SPEED,
    vy: Math.sin(angle) * BULLET_SPEED,
    life: BULLET_LIFE, fromPlayer,
  });
  addParticles(state, fromX + Math.cos(angle) * 22, fromY + Math.sin(angle) * 22, 3, '#f1c40f', 90, 0.15, 3);
  if (fromPlayer && audio) audio.shoot();
}

export function playerShoot(state, targetX, targetY, audio) {
  const p = state.player;
  if (!p.onFoot || p.deadTimer > 0 || p.bustProgress > 0) return false;
  if (state.fireCooldown > 0) return false;
  state.fireCooldown = FIRE_INTERVAL;
  const angle = angleTo(p.x, p.y, targetX, targetY);
  p.angle = angle;
  fireBullet(state, p.x, p.y, angle, true, audio);
  state.stats.shotsFired += 1;
  scarePeds(state, p.x, p.y, 380);
  addWanted(state, 1, 'Shots fired — someone called the cops');
  return true;
}

function hitPed(state, b) {
  for (const ped of state.peds) {
    if (ped.mode === 'down') continue;
    if (dist2(b.x, b.y, ped.x, ped.y) < 15 * 15) {
      ped.mode = 'down';
      ped.health = 0;
      addParticles(state, ped.x, ped.y, 12, '#c0392b', 120, 0.7, 4);
      addWanted(state, 1, 'A pedestrian is down — wanted level up');
      return true;
    }
  }
  return false;
}

function hitRival(state, b, audio) {
  for (const rival of state.rivals) {
    if (rival.health <= 0) continue;
    if (dist2(b.x, b.y, rival.x, rival.y) < 16 * 16) {
      rival.health -= 1;
      addParticles(state, rival.x, rival.y, 8, '#e74c3c', 130, 0.5, 4);
      if (rival.health <= 0) {
        addParticles(state, rival.x, rival.y, 22, '#7f8c8d', 170, 0.9, 4);
        state.player.cash += 50;
        showMessage(state, 'Rival down. +$50');
      }
      return true;
    }
  }
  return false;
}

function hitPoliceCar(state, b) {
  for (const cop of state.police) {
    if (cop.disabled) continue;
    if (dist2(b.x, b.y, cop.x, cop.y) < 22 * 22) {
      cop.health -= 25;
      addParticles(state, b.x, b.y, 8, '#f39c12', 150, 0.4, 3);
      if (cop.health <= 0) {
        cop.disabled = true;
        addParticles(state, cop.x, cop.y, 26, '#95a5a6', 140, 1.1, 5);
        showMessage(state, 'Cruiser disabled!');
      }
      return true;
    }
  }
  return false;
}

export function updateCombat(state, dt, audio) {
  state.fireCooldown = Math.max(0, (state.fireCooldown || 0) - dt);
  // Rivals shoot back when the player is close.
  for (const rival of state.rivals) {
    if (rival.health <= 0) continue;
    rival.shootTimer = (rival.shootTimer || 1) - dt;
    const d = dist2(rival.x, rival.y, state.player.x, state.player.y);
    if (rival.shootTimer <= 0 && d < 420 * 420 && state.player.deadTimer <= 0) {
      rival.shootTimer = 1.4 + state.rng() * 0.8;
      const a = angleTo(rival.x, rival.y, state.player.x, state.player.y) + (state.rng() - 0.5) * 0.25;
      fireBullet(state, rival.x, rival.y, a, false, null);
    }
  }
  for (const b of state.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0 || b.x < 0 || b.x > WORLD_W || b.y < 0 || b.y > WORLD_H) {
      b.dead = true;
      continue;
    }
    if (pointInBuilding(state, b.x, b.y)) {
      addParticles(state, b.x, b.y, 4, '#bdc3c7', 80, 0.3, 2);
      b.dead = true;
      continue;
    }
    if (b.fromPlayer) {
      if (hitRival(state, b, audio) || hitPed(state, b) || hitPoliceCar(state, b)) b.dead = true;
    } else if (state.player.onFoot && dist2(b.x, b.y, state.player.x, state.player.y) < 14 * 14) {
      damagePlayer(state, 12, audio);
      addParticles(state, b.x, b.y, 6, '#c0392b', 110, 0.4, 3);
      b.dead = true;
    }
  }
  state.bullets = state.bullets.filter((b) => !b.dead);
}
