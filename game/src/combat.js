// Solmar Bay — final pass, round 4
// Solmar Bay — combat: the player shoots toward the mouse (F or click),
// bullets fly, hit rival crew or police, and enemies shoot back. A kill
// raises heat; taking fire hurts. Muzzle sparks mark every shot.
import { STEP, WANTED } from './config.js';
import { addHeat, spawnParticles } from './world.js';
import { hurtPlayer } from './player.js';
import { panicNearby } from './pedestrians.js';

export function stepCombat(state, input, audio, camera) {
  const p = state.player;
  if (!p.alive) return;
  // Player fires toward the mouse cursor.
  if (input.shooting() && p.onFoot) {
    if (!state._shootCooldown || state.time >= state._shootCooldown) {
      state._shootCooldown = state.time + 0.18;
      const wx = camera.x + input.mouse().x;
      const wy = camera.y + input.mouse().y;
      const angle = Math.atan2(wy - p.y, wx - p.x);
      state.bullets.push({ x: p.x + Math.cos(angle) * 20, y: p.y + Math.sin(angle) * 20, vx: Math.cos(angle) * 900, vy: Math.sin(angle) * 900, life: 0.6, from: 'player' });
      state.stats.shotsFired += 1;
      addHeat(state, 0.15);
      panicNearby(state, p.x, p.y, 260);
      if (audio) audio.shoot();
    }
  }
  // Enemies shoot back at the player when close.
  for (const e of state.enemies) {
    if (!e.alive) continue;
    const dist = Math.hypot(p.x - e.x, p.y - e.y);
    if (dist < 420 && state.time >= (e.shootAt || 0)) {
      e.shootAt = state.time + 0.9;
      const angle = Math.atan2(p.y - e.y, p.x - e.x);
      state.bullets.push({ x: e.x, y: e.y, vx: Math.cos(angle) * 620, vy: Math.sin(angle) * 620, life: 0.8, from: 'enemy' });
      if (audio) audio.shoot();
    }
    // Enemies close in on the player.
    if (dist > 120) {
      e.angle = Math.atan2(p.y - e.y, p.x - e.x);
      e.x += Math.cos(e.angle) * e.speed * STEP;
      e.y += Math.sin(e.angle) * e.speed * STEP;
    }
  }
  // Move bullets and resolve hits.
  for (const b of state.bullets) {
    b.x += b.vx * STEP;
    b.y += b.vy * STEP;
    b.life -= STEP;
    if (b.from === 'player') {
      for (const e of state.enemies) {
        if (e.alive && Math.hypot(e.x - b.x, e.y - b.y) < 20) {
          e.health -= 34;
          b.life = 0;
          spawnParticles(state, b.x, b.y, '#ff5533', 6);
          if (e.health <= 0) {
            e.alive = false;
            addHeat(state, WANTED.shoot);
            if (audio) audio.hit();
          }
        }
      }
      for (const cop of state.police) {
        if (Math.hypot(cop.x - b.x, cop.y - b.y) < 24) {
          b.life = 0;
          addHeat(state, WANTED.killCop);
          spawnParticles(state, b.x, b.y, '#ff5533', 6);
        }
      }
    } else if (Math.hypot(p.x - b.x, p.y - b.y) < 16) {
      b.life = 0;
      hurtPlayer(state, 12, audio);
    }
  }
  state.bullets = state.bullets.filter((b) => b.life > 0);
  state.enemies = state.enemies.filter((e) => e.alive);
  // Particles fade.
  for (const pt of state.particles) {
    pt.x += pt.vx * STEP;
    pt.y += pt.vy * STEP;
    pt.life -= STEP;
  }
  state.particles = state.particles.filter((pt) => pt.life > 0);
}
