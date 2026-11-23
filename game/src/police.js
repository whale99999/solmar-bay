// Solmar Bay — the Solmar Bay Police Department: wanted stars 1–5, cruisers spawn
// at the city edge, chase and ram the player, officers bust Milo on foot up close,
// and the heat cools off when Milo stays out of sight and slow.
import { WORLD, ROADS_X, ROADS_Y, clamp, dist, angleTo, pick } from './config.js';
import { collideBuildings } from './world.js';
import { hurtPlayer } from './player.js';

export function spawnPolice(G, n) {
  for (let i = 0; i < n; i += 1) {
    const edge = Math.floor(Math.random() * 4);
    const x = edge === 0 ? 120 : edge === 1 ? WORLD.width - 120 : 120 + Math.random() * (WORLD.width - 240);
    const y = edge === 2 ? 120 : edge === 3 ? WORLD.height - 120 : 120 + Math.random() * (WORLD.height - 240);
    G.police.push({ x, y, angle: 0, speed: 0, hp: 80, bust: 0, sirenPhase: Math.random() * 6 });
  }
}

export function stepPolice(G, dt) {
  const p = G.player;
  const want = Math.min(5, Math.max(0, G.wanted));
  const need = want === 0 ? 0 : want + 1;
  while (G.police.length < need) spawnPolice(G, 1);
  while (G.police.length > need) G.police.pop();
  for (const cop of G.police) {
    cop.sirenPhase += dt * 6;
    const d = dist(cop.x, cop.y, p.x, p.y);
    const target = angleTo(cop.x, cop.y, p.x, p.y);
    let diff = target - cop.angle;
    while (diff > Math.PI) diff -= Math.PI * 2; while (diff < -Math.PI) diff += Math.PI * 2;
    cop.angle += clamp(diff, -2.6 * dt, 2.6 * dt);
    const top = 300 + want * 55;
    cop.speed = clamp(cop.speed + 320 * dt, 0, top);
    cop.x += Math.cos(cop.angle) * cop.speed * dt;
    cop.y += Math.sin(cop.angle) * cop.speed * dt;
    collideBuildings(G.city, cop, 22);
    // Ram: damage on contact with the player's car or body.
    if (d < 46) {
      if (!p.onFoot && p.car) { G.hurtCar(p.car); cop.speed *= 0.4; if (Math.abs(p.car.speed) > 200) G.audio.crash(); }
      else if (p.onFoot) {
        cop.bust += dt;
        if (cop.bust > 1.6) { p.busted = true; G.audio.busted(); }
      }
    } else cop.bust = Math.max(0, cop.bust - dt * 2);
    // Cops shoot back at range when wanted is high.
    if (want >= 3 && d < 420 && d > 120 && Math.random() < dt * 0.5) {
      G.bullets.push({ x: cop.x, y: cop.y, vx: Math.cos(target) * 620, vy: Math.sin(target) * 620, life: 1.2, friendly: false, dmg: 6 });
      G.audio.shoot();
    }
  }
  // Heat decay: stay slow and far from cops and the stars fade, one at a time.
  if (want > 0) {
    const nearest = G.police.reduce((m, c) => Math.min(m, dist(c.x, c.y, p.x, p.y)), 9999);
    if (nearest > 700 && p.speed < 120) { G.coolTimer += dt; if (G.coolTimer > 6) { G.wanted = Math.max(0, G.wanted - 1); G.coolTimer = 0; G.banner = 'The heat is cooling off…'; G.bannerTimer = 2; } }
    else G.coolTimer = 0;
  }
}
