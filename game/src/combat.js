// Solmar Bay — combat: Milo's fists (F) and his pistol (mouse aim, click to
// fire). Bullets fly, peds go down, cruisers take damage and blow up.
import { CFG, dist2 } from './config.js';
import { scarePeds } from './pedestrians.js';
import { addWanted, damagePoliceCar } from './police.js';

export function shoot(G, cam) {
  const p = G.player;
  if (p.inCar || p.ammo <= 0) {
    if (p.ammo <= 0) G.audio.denied();
    return;
  }
  p.ammo -= 1;
  const wx = G.input.mouse.x / cam.scale + cam.x;
  const wy = G.input.mouse.y / cam.scale + cam.y;
  const angle = Math.atan2(wy - p.y, wx - p.x);
  p.angle = angle;
  G.bullets.push({
    x: p.x + Math.cos(angle) * 20,
    y: p.y + Math.sin(angle) * 20,
    vx: Math.cos(angle) * CFG.BULLET_SPEED,
    vy: Math.sin(angle) * CFG.BULLET_SPEED,
    life: 0.7,
  });
  G.particles.push({ kind: 'muzzle', x: p.x + Math.cos(angle) * 24, y: p.y + Math.sin(angle) * 24, t: 0, life: 0.12 });
  G.audio.shot();
  scarePeds(G, p.x, p.y, 320);
}

export function punch(G) {
  const p = G.player;
  if (p.inCar || p.punchTimer > 0) return;
  p.punchTimer = 0.35;
  p.punchDidHit = false;
  G.audio.punch();
  const px = p.x + Math.cos(p.angle) * 34;
  const py = p.y + Math.sin(p.angle) * 34;
  // Fists vs pedestrians.
  for (const ped of G.peds) {
    if (ped.down > 0) continue;
    if (dist2(px, py, ped.x, ped.y) < 30 * 30) {
      ped.down = 4;
      ped.flee = 4;
      p.punchDidHit = true;
      addWanted(G, 1, 'assault');
      scarePeds(G, p.x, p.y, 260);
      break;
    }
  }
  // Fists vs a cruiser's door.
  if (!p.punchDidHit) {
    for (const cop of G.police) {
      if (dist2(px, py, cop.x, cop.y) < 44 * 44) {
        damagePoliceCar(G, cop);
        p.punchDidHit = true;
        break;
      }
    }
  }
  if (p.punchDidHit) {
    G.particles.push({ kind: 'spark', x: px, y: py, t: 0, life: 0.3 });
  }
}

export function updateBullets(G, dt) {
  for (let i = G.bullets.length - 1; i >= 0; i -= 1) {
    const b = G.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let dead = b.life <= 0;
    if (!dead && G.world.hitsBuilding(b.x, b.y, 2)) {
      G.particles.push({ kind: 'spark', x: b.x, y: b.y, t: 0, life: 0.25 });
      dead = true;
    }
    if (!dead) {
      for (const ped of G.peds) {
        if (ped.down > 0) continue;
        if (dist2(b.x, b.y, ped.x, ped.y) < 14 * 14) {
          ped.down = 6;
          ped.flee = 6;
          addWanted(G, 1, 'shot a civilian');
          scarePeds(G, b.x, b.y, 300);
          dead = true;
          break;
        }
      }
    }
    if (!dead) {
      for (const cop of G.police) {
        if (dist2(b.x, b.y, cop.x, cop.y) < 26 * 26) {
          damagePoliceCar(G, cop);
          dead = true;
          break;
        }
      }
    }
    if (dead) G.bullets.splice(i, 1);
  }
}
