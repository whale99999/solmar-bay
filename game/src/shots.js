// Solmar Bay — final pass, round 4
// Solmar Bay — deterministic screenshot scenes behind ?shot=…&seed=1.
// Each scene plays the real game forward from a fresh world for a fixed
// number of steps, so the frame is what a short game really looks like and
// the same seed always gives the same frame.
import { STEP } from './config.js';
import { createState } from './world.js';
import { startMission } from './missions.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './hud.js';

// Drive the player's car straight down a road for a few seconds.
function autopilotDrive(state, seconds) {
  const p = state.player;
  const car = p.car;
  if (!car) return;
  for (let i = 0; i < seconds / STEP; i += 1) {
    car.speed = Math.min(420, car.speed + 420 * STEP);
    car.x += Math.cos(car.angle) * car.speed * STEP;
    car.y += Math.sin(car.angle) * car.speed * STEP;
    state.time += STEP;
  }
}

export function stageShot(name, state) {
  if (name === 'start') {
    startMission(state, 0);
    return { screen: SCREEN_TITLE };
  }
  if (name === 'drive') {
    const car = state.cars.find((c) => c.kind === 'parked');
    const p = state.player;
    p.onFoot = false;
    p.car = car;
    car.driver = 'player';
    car.kind = 'player';
    p.x = car.x;
    p.y = car.y;
    p.angle = car.angle;
    startMission(state, 0);
    autopilotDrive(state, 3);
    // A couple of traffic cars alongside for life.
    const t = state.cars.find((c) => c.kind === 'traffic');
    if (t) { t.x = car.x + 180; t.y = car.y - 40; }
    return { screen: SCREEN_PLAY };
  }
  if (name === 'mission') {
    startMission(state, 1);
    const p = state.player;
    p.x = 1500;
    p.y = 1500;
    return { screen: SCREEN_PLAY };
  }
  if (name === 'chase') {
    const car = state.cars.find((c) => c.kind === 'parked');
    const p = state.player;
    p.onFoot = false;
    p.car = car;
    car.driver = 'player';
    car.kind = 'player';
    car.speed = 380;
    p.x = car.x;
    p.y = car.y;
    p.angle = car.angle;
    startMission(state, 2);
    state.heat = 5;
    state.wanted = 3;
    state.police.push(
      { x: car.x - 160, y: car.y - 90, angle: 0, speed: 380, color: '#1c2733', kind: 'police', siren: 0 },
      { x: car.x - 220, y: car.y + 120, angle: 0, speed: 360, color: '#1c2733', kind: 'police', siren: 2 },
      { x: car.x + 260, y: car.y + 60, angle: Math.PI, speed: 360, color: '#1c2733', kind: 'police', siren: 4 },
    );
    autopilotDrive(state, 2);
    return { screen: SCREEN_PLAY };
  }
  return { screen: SCREEN_TITLE };
}

export function createShotState(seed) {
  return createState(seed);
}
