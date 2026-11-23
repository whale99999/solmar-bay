// Solmar Bay — deterministic screenshot scenes behind ?shot= &seed=.
// Each scene is a real game state, staged from a fresh seeded world:
//   start   — title screen over the city
//   drive   — Milo driving with traffic around, full HUD + minimap
//   chase   — wanted 3 stars, SBPD cruisers in pursuit
//   mission — an active mission with its objective marker and banner
import { CFG } from './config.js';
import { makeCar } from './vehicles.js';
import { spawnPoliceCar } from './police.js';
import { startMission } from './missions.js';

export function stageShot(G, name) {
  const rng = G.rng;
  const p = G.player;
  if (name === 'start') {
    G.state = 'title';
    return;
  }
  G.state = 'playing';
  if (name === 'drive') {
    // Milo driving east on the Neon Mile with traffic around him.
    const car = makeCar(1400, 1000, 0, '#e84a4a', false);
    car.owned = true;
    G.cars.push(car);
    p.inCar = true;
    p.car = car;
    car.driven = true;
    car.speed = 240;
    p.x = car.x;
    p.y = car.y;
    p.angle = 0;
    p.cash = 1250;
    startMission(G, 0);
    G.banner = { text: 'First Fare — steal a car, deliver it to the Palmera Garage', t: 0, life: 30 };
    G.missionBrief = { text: '', t: 99, life: 0 };
    return;
  }
  if (name === 'chase') {
    // Wanted 3 stars, Milo fleeing in a stolen car, cruisers closing in.
    const car = makeCar(1600, 1400, -Math.PI / 2, '#f2c94c', false);
    car.owned = true;
    G.cars.push(car);
    p.inCar = true;
    p.car = car;
    car.driven = true;
    car.speed = 320;
    p.x = car.x;
    p.y = car.y;
    p.angle = -Math.PI / 2;
    p.cash = 2750;
    p.health = 82;
    // Mission 3's onStart raises the heat to 3 stars and rolls cruisers out.
    startMission(G, 2);
    G.banner = { text: 'WANTED ★★★ — Dockside Heat: reach the Coral Docks pier!', t: 0, life: 30 };
    G.missionBrief = { text: '', t: 99, life: 0 };
    spawnPoliceCar(G);
    // Pull the cruisers in close so the chase reads in one frame.
    for (let i = 0; i < G.police.length; i += 1) {
      const cop = G.police[i];
      const a = (i / G.police.length) * Math.PI * 2 + 0.6;
      cop.x = p.x + Math.cos(a) * 260;
      cop.y = p.y + Math.sin(a) * 260;
      cop.angle = Math.atan2(p.y - cop.y, p.x - cop.x);
      cop.speed = 300;
    }
    return;
  }
  if (name === 'mission') {
    // On foot on the Neon Mile, package marker ahead, mission live.
    p.x = 1620;
    p.y = 1020;
    p.angle = 0;
    p.cash = 800;
    startMission(G, 1);
    G.banner = { text: 'Neon Pickup — grab the package on the Neon Mile', t: 0, life: 30 };
    G.missionBrief = { text: '', t: 99, life: 0 };
    return;
  }
  // Any other name: plain title.
  G.state = 'title';
  void CFG;
  void rng;
}
