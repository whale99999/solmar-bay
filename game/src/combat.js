// Solmar Bay — combat: pistol (mouse aim, click to shoot, limited ammo, R reloads
// from cash) and a close-range punch (F). Bullets fly, hit police, peds and cars;
// shooting the police raises the wanted level.
import { dist, angleTo } from './config.js';
import { burst } from './world.js';
import { hurtPlayer } from './player.js';

export function firePistol(G, tx, ty) {
  const p = G.player;
  if (p.onFoot === false || p.ammo <= 0 || p.dead) return;
  p.ammo -= 1;
  const a = angleTo(p.x, p.y, tx, ty);
  G.bullets.push({ x: p.x + Math.cos(a) * 20, y: p.y + Math.sin(a) * 20, vx: Math.cos(a) * 780, vy: Math.sin(a) * 780, life: 0.9, friendly: true, dmg: 34 });
  G.audio.shoot(); G.gunshotTimer = 1.5;
  burst(G.particles, p.x + Math.cos(a) * 26, p.y + Math.sin(a) * 26, '#ffd23f', 5, 160);
}

export function punch(G) {
  const p = G.player;
  if (p.punchCd > 0 || !p.onFoot || p.dead) return;
  p.punchCd = 0.45; G.audio.punch(); G.gunshotTimer = 0.6;
  const reach = 46;
  for (const cop of G.police) {
    if (dist(p.x, p.y, cop.x, cop.y) < reach + 20) { cop.hp -= 25; burst(G.particles, cop.x, cop.y, '#ff4d4d', 8, 200); if (cop.hp <= 0) { cop.hp = 80; cop.x += 800; G.addWanted(1, 'You dropped an officer!'); } }
  }
  for (const ped of G.peds) {
    if (dist(p.x, p.y, ped.x, ped.y) < reach) { ped.panic = 2; ped.x += Math.cos(p.angle) * 30; }
  }
}

export function stepBullets(G, dt) {
  for (let i = G.bullets.length - 1; i >= 0; i -= 1) {
    const b = G.bullets[i];
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    let dead = b.life <= 0;
    if (!dead && b.friendly) {
      for (const cop of G.police) {
        if (dist(b.x, b.y, cop.x, cop.y) < 24) { cop.hp -= b.dmg; burst(G.particles, b.x, b.y, '#ff4d4d', 8, 200); dead = true; if (cop.hp <= 0) { cop.hp = 80; cop.x += 900; cop.y += 100; G.addWanted(1, 'Officer down — the whole department is coming.'); } break; }
      }
      if (!dead) for (const ped of G.peds) {
        if (dist(b.x, b.y, ped.x, ped.y) < 16) { ped.hp -= b.dmg; ped.panic = 2; burst(G.particles, b.x, b.y, '#ff4d4d', 6, 180); dead = true; G.addWanted(1, 'Shots fired in public!'); break; }
      }
      if (!dead) for (const c of G.cars) {
        if (c !== G.player.car && Math.abs(b.x - c.x) < 30 && Math.abs(b.y - c.y) < 18) { c.hp -= b.dmg; burst(G.particles, b.x, b.y, '#e8b34a', 6, 180); dead = true; if (c.hp <= 0) { burst(G.particles, c.x, c.y, '#ff8c42', 30, 320); c.hp = 100; c.x += 1200; } break; }
      }
    } else if (!dead && !b.friendly) {
      const p = G.player;
      if (dist(b.x, b.y, p.x, p.y) < 18) { hurtPlayer(G, b.dmg); burst(G.particles, b.x, b.y, '#ff4d4d', 6, 180); dead = true; }
    }
    if (dead) G.bullets.splice(i, 1);
  }
  G.gunshotTimer = Math.max(0, G.gunshotTimer - dt);
}
