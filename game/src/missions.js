// Solmar Bay — the story: four jobs for fixer Carmen Sol, in order.
// Each mission points at a gold marker; reaching it (or finishing its fight)
// pays out, advances the story and saves the game.
import { dist2 } from './config.js';
import { addFloat, showMessage } from './world.js';
import { scarePeds } from './pedestrians.js';

const MISSIONS = [
  {
    name: 'First Errand',
    text: 'Pick up the package at the marina. Keep it quiet.',
    reward: 250,
  },
  {
    name: 'Three Drops',
    text: 'Three drops across town: north park, east side, south beach. Hit them all.',
    reward: 600,
  },
  {
    name: 'Hot Wheels',
    text: 'Steal a car and bring it to the chop shop — the cops will notice.',
    reward: 900,
  },
  {
    name: 'Dockside Showdown',
    text: 'The Marlin crew is at the docks. Drop all three, then report back to Carmen.',
    reward: 1500,
  },
];

function setMarker(state, spot, objective) {
  state.missions.marker = { x: spot.x, y: spot.y };
  state.missions.objective = objective;
}

function completeMission(state, audio) {
  const m = state.missions;
  const def = MISSIONS[m.index];
  state.player.cash += def.reward;
  state.stats.missionsDone += 1;
  addFloat(state, state.player.x, state.player.y - 40, `+$${def.reward}`, '#2ecc71');
  m.toast = `${def.name} complete — +$${def.reward}`;
  m.toastTimer = 4;
  if (audio) audio.mission();
  m.index += 1;
  m.stage = 0;
  if (m.index >= MISSIONS.length) {
    m.complete = true;
    m.objective = 'Story complete — Solmar Bay is yours. Free roam, Boss.';
    showMessage(state, 'STORY COMPLETE — you run Solmar Bay now.');
  } else {
    startMission(state);
  }
}

function startMission(state) {
  const m = state.missions;
  const def = MISSIONS[m.index];
  const s = state.spots;
  if (m.index === 0) {
    setMarker(state, s.marina, def.text);
  } else if (m.index === 1) {
    m.stage = 0;
    setMarker(state, s.dropA, `(1/3) ${def.text}`);
  } else if (m.index === 2) {
    setMarker(state, s.chopShop, def.text);
  } else if (m.index === 3) {
    setMarker(state, s.docks, def.text);
    spawnRivals(state);
  }
  showMessage(state, `New job — ${def.name}: ${def.text}`, 5);
}

function spawnRivals(state) {
  const d = state.spots.docks;
  state.rivals = [
    { x: d.x - 60, y: d.y - 40, angle: 0, health: 3, shootTimer: 1.2, color: '#8e44ad' },
    { x: d.x + 40, y: d.y - 70, angle: 0, health: 3, shootTimer: 1.8, color: '#8e44ad' },
    { x: d.x + 10, y: d.y + 50, angle: 0, health: 3, shootTimer: 2.4, color: '#8e44ad' },
  ];
  scarePeds(state, d.x, d.y, 500);
}

function near(state, spot, radius = 70) {
  return dist2(state.player.x, state.player.y, spot.x, spot.y) < radius * radius;
}

export function missionName(state) {
  if (state.missions.complete) return 'Free Roam';
  return MISSIONS[state.missions.index].name;
}

export function updateMissions(state, dt, audio) {
  const m = state.missions;
  if (m.complete) return;
  const s = state.spots;
  if (m.index === 0) {
    // Meet Carmen first, then the marina pickup opens.
    if (m.stage === 0 && near(state, s.carmen, 80)) {
      m.stage = 1;
      setMarker(state, s.marina, 'Pick up the package at the marina.');
      showMessage(state, 'Carmen: "Good. Package is at the marina. Go."', 4);
      if (audio) audio.pickup();
    } else if (m.stage === 1 && near(state, s.marina, 70)) {
      completeMission(state, audio);
    }
  } else if (m.index === 1) {
    const drops = [s.dropA, s.dropB, s.dropC];
    const spot = drops[m.stage];
    if (near(state, spot, 70)) {
      state.player.cash += 0; // payout lands on completion, not per drop
      m.stage += 1;
      if (audio) audio.pickup();
      if (m.stage >= 3) {
        completeMission(state, audio);
      } else {
        setMarker(state, drops[m.stage], `Drop ${m.stage + 1}/3: next drop marked in gold.`);
        showMessage(state, `Drop ${m.stage}/3 done. Next one is marked.`);
      }
    }
  } else if (m.index === 2) {
    // Steal any car (wanted jumps to 2), then deliver it to the chop shop.
    if (m.stage === 0 && state.player.car && state.player.car.stolen) {
      m.stage = 1;
      setMarker(state, s.chopShop, 'Lose the heat and reach the chop shop.');
      showMessage(state, 'Carmen: "Nice ride. Now bring it to the chop shop."', 4);
    } else if (m.stage === 1 && state.player.car && near(state, s.chopShop, 90)) {
      const car = state.player.car;
      car.parked = true;
      car.speed = 0;
      state.player.car = null;
      state.player.onFoot = true;
      state.player.x = car.x + 40;
      state.player.y = car.y;
      state.cars = state.cars.filter((c) => c !== car);
      completeMission(state, audio);
    }
  } else if (m.index === 3) {
    if (m.stage === 0 && near(state, s.docks, 130)) {
      m.stage = 1;
      setMarker(state, s.docks, 'Drop all three Marlin crew.');
      showMessage(state, 'The Marlin crew is here. End it.', 4);
    } else if (m.stage === 1) {
      const alive = state.rivals.filter((r) => r.health > 0).length;
      if (alive === 0) {
        m.stage = 2;
        setMarker(state, s.carmen, 'Report back to Carmen.');
        showMessage(state, 'All three down. Get back to Carmen.', 4);
      }
    } else if (m.stage === 2 && near(state, s.carmen, 80)) {
      completeMission(state, audio);
    }
  }
}
