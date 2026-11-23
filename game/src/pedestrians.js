// Solmar Bay — pedestrians: locals strolling the sidewalks, scattering when
// shots ring out. A knocked-down ped gets up after a while.
import { CFG, clamp, pick } from './config.js';
import { nearestRoadCentre } from './world.js';

const SHIRTS = ['#e84a4a', '#4a90e8', '#f2c94c', '#3aa655', '#e8e8e8', '#ff8ad1', '#37e6ff', '#ff9a3a'];
const SKINS = ['#f2c89b', '#c98d5a', '#8a5a34', '#f7d7b0'];

export function spawnPeds(G, count) {
  const rng = G.rng;
  const lines = G.world.lines;
  for (let i = 0; i < count; i += 1) {
    const vertical = rng() < 0.5;
    const road = pick(rng, lines);
    const along = 220 + rng() * (CFG.WORLD - 440);
    const side = (rng() < 0.5 ? -1 : 1) * (CFG.ROAD_W / 2 + 16);
    const ped = {
      x: vertical ? road + side : along,
      y: vertical ? along : road + side,
      angle: rng() * Math.PI * 2,
      speed: 34 + rng() * 30,
      shirt: pick(rng, SHIRTS),
      skin: pick(rng, SKINS),
      vertical,
      dir: rng() < 0.5 ? -1 : 1,
      down: 0, // >0 while knocked down
      flee: 0, // >0 while running from danger
      phase: rng() * Math.PI * 2,
    };
    G.peds.push(ped);
  }
}

export function updatePeds(G, dt) {
  for (const ped of G.peds) {
    if (ped.down > 0) {
      ped.down -= dt;
      continue;
    }
    if (ped.flee > 0) {
      ped.flee -= dt;
      ped.speed = 150;
    } else {
      ped.speed = 34 + (ped.baseSpeed || 20);
    }
    // Walk along the sidewalk; at an intersection, sometimes turn the corner.
    const step = ped.speed * ped.dir * dt;
    if (ped.vertical) {
      ped.y += step;
      ped.angle = ped.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      if (ped.y < 200 || ped.y > CFG.WORLD - 200) ped.dir *= -1;
      const cross = nearestRoadCentre(ped.y);
      if (Math.abs(ped.y - cross) < 6 && G.rng() < 0.02) {
        ped.vertical = false;
        ped.x = ped.x; // keep position; now walks horizontally
        ped.dir = G.rng() < 0.5 ? -1 : 1;
      }
    } else {
      ped.x += step;
      ped.angle = ped.dir > 0 ? 0 : Math.PI;
      if (ped.x < 200 || ped.x > CFG.WORLD - 200) ped.dir *= -1;
      const cross = nearestRoadCentre(ped.x);
      if (Math.abs(ped.x - cross) < 6 && G.rng() < 0.02) {
        ped.vertical = true;
        ped.dir = G.rng() < 0.5 ? -1 : 1;
      }
    }
    // Stay on the sidewalk band next to the road.
    if (ped.vertical) {
      const road = nearestRoadCentre(ped.x);
      ped.x += clamp(road + Math.sign(ped.x - road) * (CFG.ROAD_W / 2 + 16) - ped.x, -30 * dt, 30 * dt);
    } else {
      const road = nearestRoadCentre(ped.y);
      ped.y += clamp(road + Math.sign(ped.y - road) * (CFG.ROAD_W / 2 + 16) - ped.y, -30 * dt, 30 * dt);
    }
    ped.x = clamp(ped.x, 60, CFG.WORLD - 60);
    ped.y = clamp(ped.y, 60, CFG.WORLD - 60);
    ped.phase += dt * 8;
    // Never stand inside a building.
    if (G.world.hitsBuilding(ped.x, ped.y, 10)) {
      ped.dir *= -1;
      ped.x = clamp(ped.x, 60, CFG.WORLD - 60);
    }
  }
}

// Everyone nearby runs when a shot is fired or a ped is hit.
export function scarePeds(G, x, y, radius) {
  for (const ped of G.peds) {
    const dx = ped.x - x;
    const dy = ped.y - y;
    if (dx * dx + dy * dy < radius * radius) {
      ped.flee = 2.5;
      ped.dir = Math.abs(dx) > Math.abs(dy) ? Math.sign(dx) || 1 : Math.sign(dy) || 1;
      if (Math.abs(dx) > Math.abs(dy)) ped.vertical = false;
      else ped.vertical = true;
    }
  }
}

export function drawPed(ctx, ped) {
  ctx.save();
  ctx.translate(ped.x, ped.y);
  if (ped.down > 0) {
    // Lying flat, then getting up.
    ctx.rotate(ped.angle + Math.PI / 2);
    ctx.fillStyle = ped.shirt;
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ped.skin;
    ctx.beginPath();
    ctx.arc(12, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  const bob = Math.sin(ped.phase) * 1.5;
  ctx.rotate(ped.angle);
  // Legs (two dots stepping), body, head.
  ctx.fillStyle = '#22242e';
  ctx.beginPath();
  ctx.arc(-4, -4 + bob, 3, 0, Math.PI * 2);
  ctx.arc(-4, 4 - bob, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ped.shirt;
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ped.skin;
  ctx.beginPath();
  ctx.arc(8, 0, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
