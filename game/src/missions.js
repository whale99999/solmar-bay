// Solmar Bay — the story: fixer Carmen Sol hires Milo Vega for four chained jobs.
// Each mission has stages with a map marker; reaching it advances the stage, pays
// cash, and unlocks the next job. Save progress in localStorage via main.js.
export const MISSIONS = [
  {
    id: 'first-fare', title: '1 · First Fare', giver: 'Carmen Sol',
    brief: 'Milo Vega, driver-for-hire, needs a car. Steal any parked car on the Strip, then bring it to the yellow marker at the Palmera garage.',
    stages: [
      { text: 'Steal a car — walk up to a parked car and press E', x: 1000, y: 340, r: 90, needCar: true },
      { text: 'Deliver the car to the Palmera garage', x: 700, y: 700, r: 90, needCar: true },
    ], reward: 250,
  },
  {
    id: 'neon-pickup', title: '2 · Neon Pickup', giver: 'Carmen Sol',
    brief: 'A package is waiting in the Neon Mile. Pick it up on foot or by car, then run it down to the Coral Docks before the buyer walks.',
    stages: [
      { text: 'Pick up the package in the Neon Mile', x: 2500, y: 1700, r: 90 },
      { text: 'Deliver the package to the Coral Docks', x: 600, y: 2100, r: 90 },
    ], reward: 400,
  },
  {
    id: 'dockside-heat', title: '3 · Dockside Heat', giver: 'Carmen Sol',
    brief: 'The docks job went loud. The police are coming — reach the Coral Docks, then lose the heat and get to the safehouse in Vista Hills.',
    stages: [
      { text: 'Reach the Coral Docks — the police will be on you', x: 500, y: 2000, r: 100, wanted: 3 },
      { text: 'Lose the heat, then reach the Vista Hills safehouse', x: 2400, y: 600, r: 100, needCool: true },
    ], reward: 600,
  },
  {
    id: 'bay-job', title: '4 · The Bay Job', giver: 'Carmen Sol',
    brief: 'The finale. Hit the Vista Hills vault, grab the cash, outrun a four-star response, and bring it home to Carmen on the Palmera Strip.',
    stages: [
      { text: 'Hit the Vista Hills vault', x: 2600, y: 500, r: 100, wanted: 4 },
      { text: 'Bring the cash home to Carmen — Palmera Strip', x: 1000, y: 700, r: 100 },
    ], reward: 1000,
  },
];

export function missionState(G) {
  if (G.missionIndex >= MISSIONS.length) return { done: true, title: 'All jobs done', text: 'Solmar Bay is yours, Milo. Free roam — keep the rep.', x: 0, y: 0, r: 0 };
  const m = MISSIONS[G.missionIndex];
  const s = m.stages[G.stageIndex] || m.stages[0];
  return { done: false, title: m.title, brief: m.brief, text: s.text, x: s.x, y: s.y, r: s.r, stage: s, mission: m };
}

export function updateMissions(G, dt) {
  if (G.missionIndex >= MISSIONS.length) return;
  const cur = missionState(G);
  const p = G.player;
  // Stage entry effects (heat spikes) fire once per stage.
  if (cur.stage.wanted && !G.stageArmed) { G.wanted = Math.max(G.wanted, cur.stage.wanted); G.stageArmed = true; G.banner = 'Police response incoming!'; G.bannerTimer = 3; }
  const d = Math.hypot(p.x - cur.x, p.y - cur.y);
  const needCarOk = !cur.stage.needCar || !p.onFoot;
  const needCoolOk = !cur.stage.needCool || G.wanted === 0;
  if (d < cur.r && needCarOk && needCoolOk) {
    const m = cur.mission;
    G.stageIndex += 1; G.stageArmed = false;
    G.audio.pickup();
    if (G.stageIndex >= m.stages.length) {
      p.cash += m.reward; G.missionIndex += 1; G.stageIndex = 0;
      G.banner = `Job complete — +$${m.reward}`; G.bannerTimer = 3.5; G.audio.mission();
      G.save();
      if (G.missionIndex >= MISSIONS.length) { G.banner = 'THE BAY JOB DONE — Solmar Bay is yours!'; G.bannerTimer = 5; }
    } else {
      G.banner = 'Stage complete — next stop marked'; G.bannerTimer = 2.5;
    }
  }
}
