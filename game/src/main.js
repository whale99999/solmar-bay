// Solmar Bay — final pass, round 4
// Solmar Bay — boot and the one loop. Input is read every frame, the world
// advances in fixed 1/60 s steps, and the renderer paints what is there.
// Screens: title, play, paused, game over. ?seed=N fixes the city layout;
// ?shot=start|drive|mission|chase (with &seed=N) stages that scene instead
// of running the loop, paints it twice and sets window.__shotReady.
import { BEST_KEY, SAVE_KEY, STEP } from './config.js';
import { createState, setMessage } from './world.js';
import { createRandom } from './random.js';
import { ACTION_CONFIRM, ACTION_ENTER, ACTION_MUTE, ACTION_PAUSE, ACTION_SAVE, createInput } from './input.js';
import { createRenderer } from './render.js';
import { SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './hud.js';
import { createAudio } from './audio.js';
import { stepPlayer, tryEnterCar, exitCar } from './player.js';
import { stepPlayerCar, stepTraffic, resolveCarCollisions } from './vehicles.js';
import { stepPedestrians, checkPedCarHits } from './pedestrians.js';
import { stepPolice, decayHeat } from './police.js';
import { stepMissions, startMission } from './missions.js';
import { stepCombat } from './combat.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const state = createState(seed);
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

function writeSave() {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: state.player.cash, missionIndex: state.missionIndex,
      missionDone: state.missionDone, carsStolen: state.stats.carsStolen,
      x: state.player.x, y: state.player.y, savedAt: Date.now(),
    }));
    state.savedAt = Date.now();
    setMessage(state, 'Game saved. Progress is safe.', 3);
  } catch {
    setMessage(state, 'Save failed — storage is off in this browser.', 3);
  }
}

function applySave(save) {
  if (!save) return;
  state.player.cash = save.cash ?? 250;
  state.missionIndex = save.missionIndex ?? 0;
  state.missionDone = save.missionDone ?? 0;
  state.stats.carsStolen = save.carsStolen ?? 0;
  state.player.x = save.x ?? state.player.x;
  state.player.y = save.y ?? state.player.y;
}

function runShot(name) {
  const scene = stageShot(name, state);
  let painted = 0;
  function paint() {
    renderer.draw(state, scene.screen);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();
  const saved = readSave();
  if (saved) applySave(saved);

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    state.player.alive = true;
    state.player.health = 100;
    state.mission = null;
    startMission(state, state.missionIndex);
    screen = SCREEN_PLAY;
    audio.unlock();
    audio.startMusic();
    announce('Playing Solmar Bay. Follow the gold marker.');
  }

  function endGame(win) {
    screen = win ? SCREEN_WIN : SCREEN_OVER;
    try {
      const best = Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
      if (state.player.cash > best) window.localStorage.setItem(BEST_KEY, String(state.player.cash));
    } catch {
      // Storage off: the best cash lasts this visit only.
    }
    announce(win ? 'Story complete.' : 'Busted. Press Space to play again.');
  }

  function stepWorld() {
    state.time += STEP;
    stepPlayer(state, input, audio);
    stepPlayerCar(state, input, audio);
    stepTraffic(state);
    resolveCarCollisions(state, audio);
    stepPedestrians(state);
    checkPedCarHits(state, audio);
    stepPolice(state, audio);
    decayHeat(state);
    stepMissions(state, audio);
    stepCombat(state, input, audio, renderer.camera);
    if (state.missionIndex >= 4 && state.mission === null) endGame(true);
    if (!state.player.alive) endGame(false);
    const driving = !state.player.onFoot && state.player.car;
    audio.setEngine(driving ? Math.abs(state.player.car.speed) / 560 : 0, !!driving);
    audio.setSiren(state.wanted > 0, state.time);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      state.muted = audio.toggleMute();
      setMessage(state, state.muted ? 'Muted.' : 'Sound on.', 2);
    }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN)) {
      audio.unlock();
      startGame();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
    if (actions & ACTION_SAVE && screen === SCREEN_PLAY) writeSave();
    if (actions & ACTION_ENTER && screen === SCREEN_PLAY) {
      if (state.player.onFoot) tryEnterCar(state, audio);
      else exitCar(state);
    }
    if (input.takePressed('shoot')) audio.unlock();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        if (screen === SCREEN_PLAY) stepWorld();
        else state.time += STEP;
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(state, screen);
    input.endFrame();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });
  canvas.addEventListener('mousedown', () => audio.unlock());

  announce('Solmar Bay. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
