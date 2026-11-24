// Solmar Bay — screenshot scenes behind ?shot=start|drive|mission|chase.
// Each one plays the real rules forward from a fresh world for a fixed number
// of steps, steered by a simple autopilot, so the frame is what real play
// looks like and the same seed always gives the same frame.
import { STEP } from './config.js';
import { createState, updateEffects } from './world.js';
import { updatePlayer } from './player.js';
import { updateVehicles } from './vehicles.js';
import { updatePedestrians } from './pedestrians.js';
import { updatePolice } from './police.js';
import { updateCombat } from './combat.js';
import { updateMissions } from './missions.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const DRIVE_SECONDS = 4;
const MISSION_SECONDS = 2;
const CHASE_SECONDS = 7;

function makeInput() {
  let steer = 0;
  let throttle = 0;
  return {
    set(s, t) {
      steer = s;
      throttle = t;
    },
    steer() {
      return steer;
    },
    throttle() {
      return throttle;
    },
    moveX() {
      return 0;
    },
    moveY() {
      return 0;
    },
    running() {
      return false;
    },
    shooting() {
      return false;
    },
    takeActions() {
      return 0;
    },
  };
}

// One fixed step of everything, with the given driving input.
function stepAll(state, dt, input) {
  state.time += dt;
  updatePlayer(state, dt, input, null);
  updateVehicles(state, dt, input);
  updatePedestrians(state, dt);
  updatePolice(state, dt, null);
  updateCombat(state, dt, null);
  updateMissions(state, dt, null);
  updateEffects(state, dt);
}

// Put the player in a car on the east-west road at y=1000, heading east.
function putPlayerInCar(state, x, y) {
  const car = state.cars.find((c) => c.parked) || state.cars[0];
  car.x = x;
  car.y = y;
  car.angle = 0;
  car.speed = 0;
  car.parked = false;
  car.traffic = false;
  car.stolen = true; // staged, not a fresh theft: no wanted jump
  state.player.car = car;
  state.player.onFoot = false;
  state.player.x = x;
  state.player.y = y;
  state.player.angle = 0;
  return car;
}

// Drive east along y=1000, steering back to the road centre when pushed off.
function driveAutopilot(state, input, seconds) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const car = state.player.car;
    const steer = Math.max(-1, Math.min(1, (1000 - car.y) * 0.02));
    input.set(steer, 1);
    stepAll(state, STEP, input);
  }
}

/**
 * Set up the named scene (start, drive, mission or chase) on a fresh seeded
 * state and return the screen to draw over it.
 */
export function stageShot(name, seed) {
  const state = createState(seed);
  const input = makeInput();
  if (name === 'drive') {
    putPlayerInCar(state, 800, 1000);
    driveAutopilot(state, input, DRIVE_SECONDS);
    return { state, screen: SCREEN_PLAY };
  }
  if (name === 'mission') {
    // Carmen met, first job live: player walks up to the marina pickup.
    state.missions.stage = 1;
    state.missions.marker = { ...state.spots.marina };
    state.missions.objective = 'Pick up the package at the marina.';
    state.player.x = state.spots.marina.x;
    state.player.y = state.spots.marina.y + 150;
    state.player.angle = -Math.PI / 2;
    for (let i = 0; i < Math.round(MISSION_SECONDS / STEP); i += 1) {
      stepAll(state, STEP, input);
    }
    return { state, screen: SCREEN_PLAY };
  }
  if (name === 'chase') {
    const car = putPlayerInCar(state, 1400, 1000);
    state.player.wanted = 3;
    state.player.wantedTimer = 0;
    updatePolice(state, 0, null); // spawn the cruisers for wanted 3
    // Pull the cruisers into frame, spread across lanes so they do not
    // start in a pile-up: two closing in from behind, one head-on.
    const spots = [
      { x: car.x - 320, y: 978 }, { x: car.x - 460, y: 1044 }, { x: car.x + 380, y: 1000 },
    ];
    state.police.forEach((cop, i) => {
      const s = spots[i % spots.length];
      cop.x = s.x;
      cop.y = s.y;
      cop.angle = i === 2 ? Math.PI : 0;
      cop.speed = 380;
    });
    driveAutopilot(state, input, CHASE_SECONDS);
    return { state, screen: SCREEN_PLAY };
  }
  // Default: the title screen over a living city.
  for (let i = 0; i < Math.round(START_SECONDS / STEP); i += 1) {
    stepAll(state, STEP, input);
  }
  return { state, screen: SCREEN_TITLE };
}
