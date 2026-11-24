// Solmar Bay — final pass, round 4
// Solmar Bay — missions and story. Fixer Carmen Sol hands out four jobs
// across the bay; each mission is a chain of stages (go, take, deliver,
// escape) with a marker on the map and the minimap, dialogue lines, and a
// cash reward. Finishing all four completes the story thread.
import { MISSIONS, WORLD_SIZE } from './config.js';
import { setMessage } from './world.js';

const STAGES = {
  1: [
    { type: 'go', x: 800, y: 800, text: 'Steal any car and drive to the Marina garage' },
    { type: 'reach', x: 1600, y: 2880, text: 'Park inside the garage marker' },
  ],
  2: [
    { type: 'go', x: 1120, y: 1120, text: 'Pick up the package at the market' },
    { type: 'reach', x: 2880, y: 2880, text: 'Deliver it to the docks — avoid the bridge' },
  ],
  3: [
    { type: 'go', x: 2400, y: 800, text: 'Reach the old depot where the Vipers hold our courier' },
    { type: 'fight', x: 2400, y: 800, text: 'Deal with the Vipers guarding the depot' },
    { type: 'reach', x: 480, y: 2400, text: 'Bring the courier to the safehouse' },
  ],
  4: [
    { type: 'go', x: 480, y: 480, text: 'Meet Carmen at the north gate' },
    { type: 'reach', x: 2880, y: 480, text: 'Cross the whole bay to the lighthouse — go!' },
  ],
};

const DIALOGUE = {
  1: [
    'Carmen Sol: "New in town? Everyone starts with a fare. Bring me a car."',
    'Carmen Sol: "The Marina garage. No questions, no cops. Good luck."',
  ],
  2: [
    'Carmen Sol: "The package is hot. Market stall, noon sharp."',
    'Carmen Sol: "Bridge is watched. Take the back streets to the docks."',
  ],
  3: [
    'Carmen Sol: "The Vipers grabbed our courier. Get him out."',
    'Courier: "They are armed. I knew you would come."',
  ],
  4: [
    'Carmen Sol: "Last run. Whole bay, lighthouse, one shot at the big money."',
    'Carmen Sol: "Drive like the bay is yours. Because tonight, it is."',
  ],
};

export function startMission(state, index) {
  const def = MISSIONS[index];
  if (!def) return;
  state.missionIndex = index;
  state.mission = {
    id: def.id, name: def.name, giver: def.giver, reward: def.reward,
    stage: 0, stages: STAGES[def.id], done: false,
  };
  state.story = DIALOGUE[def.id].slice();
  setMessage(state, `New mission: ${def.name} — ${def.brief}`, 6);
}

export function currentObjective(state) {
  if (!state.mission) return null;
  return state.mission.stages[state.mission.stage] ?? null;
}

export function stepMissions(state, audio) {
  const p = state.player;
  if (!state.mission) {
    if (state.missionIndex < MISSIONS.length) startMission(state, state.missionIndex);
    return;
  }
  const m = state.mission;
  const obj = currentObjective(state);
  if (!obj) return;
  const dist = Math.hypot(p.x - obj.x, p.y - obj.y);
  if (obj.type === 'go' || obj.type === 'reach') {
    if (dist < 70) advanceMission(state, audio);
  } else if (obj.type === 'fight') {
    if (state.enemies.length === 0) advanceMission(state, audio);
  }
}

function advanceMission(state, audio) {
  const m = state.mission;
  m.stage += 1;
  if (audio) audio.pickup();
  if (m.stage >= m.stages.length) {
    state.player.cash += m.reward;
    state.missionDone += 1;
    state.stats.missionsDone += 1;
    setMessage(state, `Mission complete: ${m.name}! +$${m.reward}`, 6);
    if (audio) audio.cash();
    state.mission = null;
    state.missionIndex += 1;
    if (state.missionIndex >= MISSIONS.length) {
      setMessage(state, 'Story complete! Solmar Bay is yours, Boss. $6,300 earned.', 8);
    }
  } else {
    const next = m.stages[m.stage];
    setMessage(state, next.text, 5);
    if (m.id === 3 && m.stage === 1) spawnDepotGuards(state);
  }
}

function spawnDepotGuards(state) {
  for (let i = 0; i < 3; i += 1) {
    state.enemies.push({
      x: 2400 + (i - 1) * 90, y: 800 + (i % 2) * 70,
      health: 50, angle: 0, speed: 90, shootAt: 0, alive: true,
    });
  }
  setMessage(state, 'Vipers! They are armed — fight or run.', 4);
}

export function missionMarker(state) {
  const obj = currentObjective(state);
  return obj ? { x: obj.x, y: obj.y } : null;
}
