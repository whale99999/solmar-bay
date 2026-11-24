// Solmar Bay — final pass, round 4
// Solmar Bay — the Solmar Bay Police Department. Wanted level 1–5 decides
// how many cruisers hunt the player; cruisers ram the player's car, and on
// foot they close in and try to bust the player. Heat cools when the player
// stays out of trouble, and cruisers give up when the player escapes far.
import { MAX_POLICE, STEP, WORLD_SIZE } from './config.js';
import { spawnParticles } from './world.js';

export function stepPolice(state, audio) {
  const p = state.player;
  const wantedCount = Math.min(MAX_POLICE, state.wanted + 1);
  // Spawn cruisers up to the wanted count, at road points near the player.
  while (state.police.length < wantedCount && state.wanted > 0) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 500 + Math.random() * 300;
    state.police.push({
      x: Math.max(60, Math.min(WORLD_SIZE - 60, p.x + Math.cos(angle) * dist)),
      y: Math.max(60, Math.min(WORLD_SIZE - 60, p.y + Math.sin(angle) * dist)),
      angle: 0, speed: 0, color: '#1c2733', kind: 'police', siren: Math.random() * 10,
    });
  }
  // Despawn when the heat is gone.
  if (state.wanted === 0) {
    state.police.length = 0;
    return;
  }
  for (const cop of state.police) {
    const dx = p.x - cop.x;
    const dy = p.y - cop.y;
    const dist = Math.hypot(dx, dy);
    const wantAngle = Math.atan2(dy, dx);
    let diff = wantAngle - cop.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    cop.angle += Math.max(-2.4 * STEP, Math.min(2.4 * STEP, diff));
    const targetSpeed = dist > 700 ? 520 : 380 + state.wanted * 30;
    cop.speed += (targetSpeed - cop.speed) * STEP * 1.2;
    cop.x += Math.cos(cop.angle) * cop.speed * STEP;
    cop.y += Math.sin(cop.angle) * cop.speed * STEP;
    cop.siren += STEP;
    // Ram the player's car.
    if (!p.onFoot && p.car && dist < 52) {
      p.car.speed *= 0.75;
      cop.speed *= 0.7;
      spawnParticles(state, cop.x, cop.y, '#ffcc33', 8);
      if (audio) audio.crash();
    }
    // On foot, a cruiser that catches the player busts them.
    if (p.onFoot && dist < 34 && p.alive) {
      p.health -= 25 * STEP * 4;
      if (p.health <= 0) {
        p.health = 0;
        p.alive = false;
      }
    }
  }
  // Escaped far enough: the tail cools off.
  if (state.police.length > 0) {
    const nearest = Math.min(...state.police.map((c) => Math.hypot(c.x - p.x, c.y - p.y)));
    if (nearest > 1100) state.heat = Math.max(0, state.heat - STEP * 0.5);
  }
}

export function decayHeat(state) {
  if (state.wanted === 0) return;
  // Heat only cools while the player is not actively committing crimes;
  // the main loop calls this every step with a small rate.
  state.heat = Math.max(0, state.heat - 0.06 * STEP);
  const bands = [0, 1, 2.5, 4.5, 7, 10];
  let level = 0;
  for (let i = 0; i < bands.length; i += 1) if (state.heat >= bands[i]) level = i;
  state.wanted = level;
}
