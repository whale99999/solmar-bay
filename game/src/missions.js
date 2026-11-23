// Solmar Bay — missions and story: four chained jobs from fixer Carmen Sol.
// Each mission has a briefing, a map target, a completion rule and a cash reward.
import { CFG } from './config.js';
import { addWanted, spawnPoliceCar } from './police.js';

export const MISSIONS = [
  {
    name: 'First Fare',
    reward: 500,
    radius: 95,
    needCar: true,
    briefing: 'Carmen Sol: "Milo, first job. Jack a car — any car — and bring it to the Palmera Garage. Don\'t scratch it. Much."',
    objective: 'Steal a car, then deliver it to the Palmera Garage',
    target(G) { return G.world.garage; },
    onStart() {},
  },
  {
    name: 'Neon Pickup',
    reward: 800,
    radius: 75,
    needCar: false,
    briefing: 'Carmen Sol: "A package is waiting on the Neon Mile, under the pink sign. Grab it and don\'t get chatty."',
    objective: 'Pick up the package on the Neon Mile',
    target(G) { return G.world.packageSpot; },
    onStart() {},
  },
  {
    name: 'Dockside Heat',
    reward: 1500,
    radius: 95,
    needCar: false,
    briefing: 'Carmen Sol: "The docks job went loud. SBPD is already rolling — get to the Coral Docks pier and lose them there."',
    objective: 'Reach the Coral Docks pier while the police chase you',
    target(G) { return G.world.docks; },
    onStart(G) {
      addWanted(G, 3, 'docks job went loud');
      spawnPoliceCar(G);
      spawnPoliceCar(G);
    },
  },
  {
    name: 'The Bay Job',
    reward: 3000,
    radius: 95,
    needCar: false,
    briefing: 'Carmen Sol: "Last one, Milo. The score is the safehouse in Vista Hills. Bring it home and we\'re legends of Solmar Bay."',
    objective: 'Deliver the score to the Vista Hills safehouse',
    target(G) { return G.world.safehouse; },
    onStart() {},
  },
];

export function currentMission(G) {
  return G.missionIndex < MISSIONS.length ? MISSIONS[G.missionIndex] : null;
}

export function startMission(G, index) {
  G.missionIndex = index;
  const m = currentMission(G);
  if (!m) return;
  G.mission = { def: m, target: m.target(G), done: false };
  G.banner = { text: `${m.name} — ${m.objective}`, t: 0, life: 4.5 };
  G.missionBrief = { text: m.briefing, t: 0, life: 6 };
  m.onStart(G);
  G.save();
}

export function updateMissions(G, dt) {
  // Chain the next job after a short beat between missions.
  if (G.nextMissionTimer > 0) {
    G.nextMissionTimer -= dt;
    if (G.nextMissionTimer <= 0) startMission(G, G.missionIndex + 1);
    return;
  }
  const m = G.mission;
  if (!m || m.done) return;
  const p = G.player;
  const dx = p.x - m.target.x;
  const dy = p.y - m.target.y;
  const d = Math.hypot(dx, dy);
  if (d < m.def.radius) {
    if (m.def.needCar && !p.inCar) {
      G.banner = { text: 'You need to be in a car for this one.', t: 0, life: 2 };
      return;
    }
    m.done = true;
    p.cash += m.def.reward;
    p.ammo += 12;
    G.audio.missionDone();
    G.particles.push({ kind: 'boom', x: m.target.x, y: m.target.y, t: 0, life: 0.7 });
    if (G.missionIndex + 1 >= MISSIONS.length) {
      G.banner = { text: `THE BAY JOB DONE — $${m.def.reward}!`, t: 0, life: 4 };
      G.state = 'win';
      G.save();
      return;
    }
    G.banner = { text: `${m.def.name} complete! +$${m.def.reward}`, t: 0, life: 3.5 };
    G.save();
    G.nextMissionTimer = 2.2;
  }
}
