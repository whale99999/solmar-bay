// Solmar Bay — boot and the one loop: input is read every frame, the world
// advances in fixed 1/60 s steps, and the renderer paints what is there.
// Screens: title, play, paused. ?seed=N fixes the city; ?shot=start|drive|
// mission|chase (with &seed=N) stages that scene instead of running the loop,
// paints it twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, SAVE_KEY, STEP } from './config.js';
import { createState, updateEffects } from './world.js';
import { createRenderer, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import {
  ACTION_CONFIRM, ACTION_ENTER_CAR, ACTION_PAUSE, ACTION_SHOOT, createInput,
} from './input.js';
import { createAudio } from './audio.js';
import { enterCar, exitCar, nearestCar, updatePlayer } from './player.js';
import { updateVehicles } from './vehicles.js';
import { updatePedestrians } from './pedestrians.js';
import { updatePolice } from './police.js';
import { playerShoot, updateCombat } from './combat.js';
import { updateMissions } from './missions.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const SAVE_EVERY = 10;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const renderer = createRenderer(canvas);
const audio = createAudio();

function readSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSave(state) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: state.player.cash,
      missionIndex: state.missions.index,
      missionStage: state.missions.stage,
      x: state.player.x,
      y: state.player.y,
      health: state.player.health,
    }));
  } catch {
    // Storage can be off (private windows): progress then lasts this visit only.
  }
}

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off: best then lasts this visit only.
  }
}

function applySave(state, save) {
  if (!save) return;
  state.player.cash = save.cash ?? 120;
  state.player.health = save.health ?? 100;
  state.player.x = save.x ?? state.player.x;
  state.player.y = save.y ?? state.player.y;
  // Mission progress restores at the current job's start (objectives re-point).
  state.missions.index = Math.min(save.missionIndex ?? 0, 3);
  state.missions.stage = 0;
}

function runShot(name) {
  const { state, screen } = stageShot(name, seed);
  state.aim = false;
  let painted = 0;
  function paint() {
    renderer.draw(state, screen, 0);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let state = createState(seed);
  const saved = readSave();
  let best = readBest();
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();
  let saveCountdown = SAVE_EVERY;
  state.audio = audio;

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    state = createState(seed);
    state.audio = audio;
    if (saved) applySave(state, saved);
    accumulator = 0;
    saveCountdown = SAVE_EVERY;
    screen = SCREEN_PLAY;
    announce('Playing Solmar Bay. Follow the gold marker.');
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM) audio.unlock();
    if (actions & ACTION_CONFIRM && screen === SCREEN_TITLE) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
    if (screen !== SCREEN_PLAY) return;
    if (actions & ACTION_ENTER_CAR) {
      audio.unlock();
      const p = state.player;
      if (p.onFoot) {
        const car = nearestCar(state);
        if (car) enterCar(state, car, audio);
        else audio.denied();
      } else {
        exitCar(state);
      }
    }
    if (actions & ACTION_SHOOT) {
      audio.unlock();
      if (state.player.onFoot) {
        const m = input.mouse;
        const world = screenToWorld(m.x, m.y);
        playerShoot(state, world.x, world.y, audio);
      }
    }
  }

  function screenToWorld(sx, sy) {
    const p = state.player;
    const w = renderer.width;
    const h = renderer.height;
    const camX = Math.max(-40, Math.min(3200 - w + 40, p.x - w / 2));
    const camY = Math.max(-40, Math.min(2400 - h + 40, p.y - h / 2));
    return { x: sx + camX, y: sy + camY };
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      state.time += STEP;
      updatePedestrians(state, STEP);
      updateVehicles(state, STEP, input);
      updateEffects(state, STEP);
      return;
    }
    state.time += STEP;
    // Aim: where the mouse points in the world, for the aim line + shooting.
    const m = input.mouse;
    const world = screenToWorld(m.x, m.y);
    state.aim = state.player.onFoot;
    if (state.player.onFoot && (input.shooting() || m.down)) {
      playerShoot(state, world.x, world.y, audio);
    }
    updatePlayer(state, STEP, input, audio);
    updateVehicles(state, STEP, input);
    updatePedestrians(state, STEP);
    updatePolice(state, STEP, audio);
    updateCombat(state, STEP, audio);
    updateMissions(state, STEP, audio);
    updateEffects(state, STEP);
    audio.update(STEP, !!state.player.car, state.player.car ? state.player.car.speed : 0, state.player.wanted);
    // Autosave while playing, and keep the best haul.
    saveCountdown -= STEP;
    if (saveCountdown <= 0) {
      saveCountdown = SAVE_EVERY;
      writeSave(state);
      if (state.player.cash > best) {
        best = state.player.cash;
        saveBest(best);
      }
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(state, screen, best);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      writeSave(state);
      announce('Paused.');
    }
  });

  announce('Solmar Bay. Press Enter or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
