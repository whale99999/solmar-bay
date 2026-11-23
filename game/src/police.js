// Solmar Bay — the Solmar Bay Police Department: wanted stars, response,
// pursuit, ramming, and the bust. Wanted 1-5; more stars, more cruisers.
import { CFG, angDiff, clamp, dist2 } from './config.js';
import { makeCar } from './vehicles.js';

export function addWanted(G, stars, why) {
  const before = G.wanted;
  G.wanted = clamp(G.wanted + stars, 0, 5);
  G.crimeTimer = 0; // fresh crime resets the cool-down clock
  if (G.wanted > before) {
    G.banner = { text: `WANTED — ${'★'.repeat(G.wanted)} (${why})`, t: 0, life: 2.5 };
  }
}

// Spawn one cruiser on a road near the player, at a safe distance.
export function spawnPoliceCar(G) {
  const rng = G.rng;
  const lines = G.world.lines;
  const p = G.player;
  for (let tries = 0; tries < 12; tries += 1) {
    const road = lines[Math.floor(rng() * lines.length)];
    const along = 200 + rng() * (CFG.WORLD - 400);
    const vertical = rng() < 0.5;
    const x = vertical ? road : along;
    const y = vertical ? along : road;
    const d = Math.hypot(x - p.x, y - p.y);
    if (d < 500 || d > 1100) continue;
    const car = makeCar(x, y, Math.atan2(p.y - y, p.x - x), '#20242e', true);
    car.speed = 200;
    car.ramCooldown = 0;
    car.bustTimer = 0;
    G.police.push(car);
    return car;
  }
  return null;
}

export function updatePolice(G, dt) {
  const p = G.player;
  // Wanted decays: 15 s after the last crime, one star fades every 8 s
  // while no cruiser is close.
  G.crimeTimer += dt;
  if (G.wanted > 0 && G.crimeTimer > 15) {
    let near = false;
    for (const cop of G.police) {
      if (dist2(cop.x, cop.y, p.x, p.y) < 420 * 420) { near = true; break; }
    }
    if (!near) {
      G.decayTimer += dt;
      if (G.decayTimer > 8) {
        G.decayTimer = 0;
        G.wanted -= 1;
      }
    } else {
      G.decayTimer = 0;
    }
  } else {
    G.decayTimer = 0;
  }

  // Keep cruisers on the road: wanted stars = cruisers on the street.
  const want = G.wanted;
  while (G.police.length < want) {
    if (!spawnPoliceCar(G)) break;
  }
  while (G.police.length > want) G.police.pop();

  for (const cop of G.police) {
    if (cop.ramCooldown > 0) cop.ramCooldown -= dt;
    // Steer toward the player, arcade-style, with a top speed above traffic.
    const targetAngle = Math.atan2(p.y - cop.y, p.x - cop.x);
    const diff = angDiff(cop.angle, targetAngle);
    cop.angle += clamp(diff, -2.4 * dt, 2.4 * dt);
    const targetSpeed = 250 + G.wanted * 18;
    cop.speed += clamp(targetSpeed - cop.speed, -300 * dt, 260 * dt);
    const nx = cop.x + Math.cos(cop.angle) * cop.speed * dt;
    const ny = cop.y + Math.sin(cop.angle) * cop.speed * dt;
    const probe = { x: nx, y: ny };
    if (!G.world.resolveBuilding(probe, 20) && !G.world.inWater(nx, ny)) {
      cop.x = nx;
      cop.y = ny;
    } else {
      cop.speed *= 0.5;
      cop.angle += 0.6 * dt;
    }
    cop.x = clamp(cop.x, 40, CFG.WORLD - 40);
    cop.y = clamp(cop.y, 40, CFG.WORLD - 40);

    const d = Math.hypot(p.x - cop.x, p.y - cop.y);
    if (p.inCar) {
      // Ram: shove the player's car and hurt the player.
      if (d < 52 && cop.ramCooldown <= 0) {
        cop.ramCooldown = 1.1;
        p.health -= 6;
        p.invuln = 0.4;
        if (p.car) p.car.speed *= 0.55;
        G.particles.push({ kind: 'spark', x: (p.x + cop.x) / 2, y: (p.y + cop.y) / 2, t: 0, life: 0.4 });
        G.audio.punch();
        if (p.health <= 0) G.wasted();
      }
      cop.bustTimer = 0;
    } else if (d < 48) {
      // On foot and caught: the bust meter fills, then it's over.
      cop.bustTimer += dt;
      if (cop.bustTimer > 1.2) G.busted();
    } else {
      cop.bustTimer = 0;
    }
  }
}

// A police cruiser shot to pieces: explosion, debris, and the heat rises.
export function damagePoliceCar(G, cop) {
  cop.health -= 1;
  G.particles.push({ kind: 'spark', x: cop.x, y: cop.y, t: 0, life: 0.35 });
  if (cop.health <= 0) {
    G.particles.push({ kind: 'boom', x: cop.x, y: cop.y, t: 0, life: 0.8 });
    G.audio.explosion();
    G.police = G.police.filter((c) => c !== cop);
    addWanted(G, 1, 'blew up a cruiser');
  }
}
