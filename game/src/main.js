// Solmar Bay — boot and the one loop: input every frame, the world in fixed
// 1/60 s steps, camera follow with smoothing, save/load in localStorage.
// ?seed=N fixes the city. ?shot=start|drive|chase|mission (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { WORLD, STEP, SAVE_KEY, createRandom, clamp } from './config.js';
import { createCity, makeParticles, stepParticles } from './world.js';
import { createPlayer, stepPlayer, tryEnterExitCar, hurtPlayer } from './player.js';
import { spawnTraffic, stepTraffic } from './vehicles.js';
import { spawnPedestrians, stepPedestrians } from './pedestrians.js';
import { stepPolice } from './police.js';
import { updateMissions, missionState } from './missions.js';
import { firePistol, punch, stepBullets } from './combat.js';
import { createAudio } from './audio.js';
import { createInput, ACTION_CONFIRM, ACTION_PAUSE, ACTION_ENTER, ACTION_PUNCH, ACTION_MUTE } from './input.js';
import { createRenderer, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_OVER, SCREEN_BUSTED, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const audio = createAudio();

function loadSave() {
  try { const raw = window.localStorage.getItem(SAVE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}

// The whole game state in one object so every system can read and mutate it.
const G = {
  seed, time: 0, city: null, player: null, cars: [], peds: [], police: [], bullets: [],
  particles: makeParticles(), wanted: 0, coolTimer: 0, gunshotTimer: 0, missionIndex: 0, stageIndex: 0,
  stageArmed: false, banner: '', bannerTimer: 0, saveInfo: '', audio,
  cam: { x: 0, y: 0 },
  view: { w: window.innerWidth, h: window.innerHeight, scale: 1 },
  save() {
    try { window.localStorage.setItem(SAVE_KEY, JSON.stringify({ cash: G.player.cash, missionIndex: G.missionIndex, stageIndex: G.stageIndex, hp: G.player.hp })); } catch { /* storage may be off */ }
  },
  addWanted(n, msg) {
    G.wanted = clamp(G.wanted + n, 0, 5);
    if (msg) { G.banner = msg; G.bannerTimer = 2.5; }
  },
  hurtCar(car) {
    car.hp -= 15;
    if (car.hp <= 0) { car.hp = 100; car.x += 1000; car.speed = 0; G.addWanted(1, 'You wrecked a car in traffic!'); }
  },
  reset(s) {
    G.time = 0; G.city = createCity(s); G.player = createPlayer(1000, 460);
    const sv = loadSave();
    if (sv && !shot) { G.player.cash = sv.cash || 0; G.missionIndex = sv.missionIndex || 0; G.stageIndex = sv.stageIndex || 0; G.player.hp = sv.hp || 100; }
    G.cars = []; G.peds = []; G.police = []; G.bullets = []; G.particles = makeParticles();
    G.wanted = 0; G.coolTimer = 0; G.gunshotTimer = 0; G.stageArmed = false; G.banner = ''; G.bannerTimer = 0;
    spawnTraffic(G, 16); spawnPedestrians(G, 26);
    G.cam.x = G.player.x - G.view.w / 2; G.cam.y = G.player.y - G.view.h / 2;
  },
};
G.reset(seed);
const saved = loadSave();
if (saved && saved.cash > 0) G.saveInfo = `Welcome back — $${saved.cash} saved, job ${Math.min(saved.missionIndex + 1, 4)} of 4.`;
const renderer = createRenderer(canvas);

function updateView() {
  G.view.w = window.innerWidth; G.view.h = window.innerHeight;
  G.view.scale = Math.max(0.7, Math.min(1.15, G.view.w / 1280));
}
updateView();
window.addEventListener('resize', updateView);

function stepWorld(dt, input) {
  G.time += dt;
  stepPlayer(G, dt, input);
  stepTraffic(G, dt);
  stepPedestrians(G, dt);
  stepPolice(G, dt);
  stepBullets(G, dt);
  stepParticles(G.particles, dt);
  updateMissions(G, dt);
  G.bannerTimer = Math.max(0, G.bannerTimer - dt);
  // Smooth camera follow on the player.
  const tx = G.player.x - G.view.w / G.view.scale / 2, ty = G.player.y - G.view.h / G.view.scale / 2;
  G.cam.x += (tx - G.cam.x) * Math.min(1, dt * 5);
  G.cam.y += (ty - G.cam.y) * Math.min(1, dt * 5);
  G.cam.x = clamp(G.cam.x, -40, WORLD.width - G.view.w / G.view.scale + 40);
  G.cam.y = clamp(G.cam.y, -40, WORLD.height - G.view.h / G.view.scale + 40);
  audio.engine(G.player.onFoot ? 0 : Math.abs((G.player.car ? G.player.car.speed : 0)) / 520, !G.player.onFoot);
  audio.siren(G.wanted);
  if (G.player.dead || G.player.busted) return;
  if (G.player.ammo === 0 && G.player.cash >= 50 && Math.random() < dt * 0.05) { G.player.ammo = 24; G.player.cash -= 50; G.banner = 'Bought ammo — $50'; G.bannerTimer = 2; }
}

function runShot(name) {
  const scene = stageShot(name, G);
  let painted = 0;
  function paint() {
    updateView();
    renderer.draw(G, scene.screen);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let accumulator = 0, last = performance.now(), saveTimer = 0;
  function announce(msg) { status.textContent = msg; }
  function startGame() {
    G.reset(seed); screen = SCREEN_PLAY; announce('Playing Solmar Bay. Steal a car — press E near one.');
    audio.unlock();
  }
  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) { const m = audio.toggleMute(); G.banner = m ? 'Sound off (M to unmute)' : 'Sound on'; G.bannerTimer = 1.5; }
    if (actions & ACTION_CONFIRM) {
      audio.unlock();
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_BUSTED || screen === SCREEN_WIN) {
        if (screen === SCREEN_WIN) { screen = SCREEN_PLAY; } else startGame();
      }
    }
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; announce('Paused.'); }
      else if (screen === SCREEN_PAUSED) { screen = SCREEN_PLAY; announce('Playing.'); }
    }
    if (screen === SCREEN_PLAY) {
      if (actions & ACTION_ENTER) { const r = tryEnterExitCar(G); if (r) announce(r); }
      if (actions & ACTION_PUNCH) punch(G);
      if (input.takeClick() && G.player.onFoot) {
        const wx = G.cam.x + input.state.mouseX / G.view.scale, wy = G.cam.y + input.state.mouseY / G.view.scale;
        firePistol(G, wx, wy);
      }
    }
  }
  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP) { stepWorld(STEP, input); accumulator -= STEP; }
      saveTimer += STEP;
      if (saveTimer > 5) { saveTimer = 0; G.save(); }
      if (G.player.dead) screen = SCREEN_OVER;
      else if (G.player.busted) screen = SCREEN_BUSTED;
      else if (G.missionIndex >= 4 && !G.winShown) { G.winShown = true; screen = SCREEN_WIN; }
    } else accumulator = 0;
    renderer.draw(G, screen);
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden && screen === SCREEN_PLAY) screen = SCREEN_PAUSED; });
  announce('Solmar Bay. Press Enter or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
