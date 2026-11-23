// Solmar Bay — boot and the one loop: fixed 1/60 s steps, screens
// (title / playing / paused / busted / wasted / win), save + continue,
// and the deterministic ?shot= scenes for screenshots.
import { CFG, clamp, mulberry32 } from './config.js';
import { buildWorld, districtAt } from './world.js';
import { createInput, ACT_CONFIRM, ACT_ENTER, ACT_HELP, ACT_MUTE, ACT_PAUSE, ACT_PUNCH } from './input.js';
import { createAudio } from './audio.js';
import { createPlayer, updatePlayer, updateAim, exitCar } from './player.js';
import { spawnTraffic, spawnParked, updateTraffic } from './vehicles.js';
import { spawnPeds, updatePeds } from './pedestrians.js';
import { updatePolice, addWanted } from './police.js';
import { startMission, updateMissions, currentMission } from './missions.js';
import { shoot, punch, updateBullets } from './combat.js';
import { createCamera, updateCamera, updateParticles, drawGame } from './render.js';
import { drawHUD, drawTitle, drawPaused, drawBusted, drawWasted, drawWin, drawHelp } from './hud.js';
import { stageShot } from './shots.js';

const STEP = 1 / 60;
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : (Math.floor(Math.random() * 4294967296) >>> 0);

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

const world = buildWorld(seed);
const rng = mulberry32(seed ^ 0x9e3779b9);
const input = createInput(canvas);
const audio = createAudio();

const G = {
  world, rng, input, audio,
  time: 0,
  state: 'title',
  cam: createCamera(),
  view: { w: window.innerWidth, h: window.innerHeight },
  player: null,
  cars: [],
  peds: [],
  police: [],
  bullets: [],
  particles: [],
  wanted: 0,
  crimeTimer: 99,
  decayTimer: 0,
  missionIndex: 0,
  mission: null,
  missionBrief: null,
  banner: null,
  nextMissionTimer: 0,
  help: false,
  fireCooldown: 0,
  worldDistrict: 'Palmera Strip',
  save,
  addWanted(stars, why) { addWanted(G, stars, why); },
  busted,
  wasted,
};
G.player = createPlayer(world);

function readSave() {
  try {
    const raw = window.localStorage.getItem(CFG.SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.cash !== 'number' || typeof data.missionIndex !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

function save() {
  try {
    window.localStorage.setItem(CFG.SAVE_KEY, JSON.stringify({
      cash: Math.floor(G.player.cash),
      missionIndex: G.missionIndex,
    }));
  } catch {
    // Storage off (private windows): progress lasts this visit only.
  }
}

function busted() {
  const p = G.player;
  if (p.inCar) exitCar(G);
  p.x = world.spawn.x;
  p.y = world.spawn.y;
  p.health = 100;
  p.cash = Math.floor(p.cash * 0.9);
  G.wanted = 0;
  G.police = [];
  G.state = 'busted';
  audio.busted();
  save();
  announce('Busted. You lose 10 percent of your cash.');
}

function wasted() {
  const p = G.player;
  if (p.inCar) exitCar(G);
  p.x = world.spawn.x;
  p.y = world.spawn.y;
  p.health = 100;
  p.cash = Math.floor(p.cash * 0.5);
  G.wanted = 0;
  G.police = [];
  G.state = 'wasted';
  audio.busted();
  save();
  announce('Wasted. You lose half your cash.');
}

function announce(message) {
  statusEl.textContent = message;
}

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  G.view.w = window.innerWidth;
  G.view.h = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

function startStory(fresh) {
  const saveData = fresh ? null : readSave();
  if (saveData) {
    G.player.cash = saveData.cash;
    G.missionIndex = clamp(saveData.missionIndex, 0, 4);
  } else {
    G.player.cash = 0;
    G.missionIndex = 0;
  }
  G.player.health = 100;
  G.player.ammo = 24;
  G.player.x = world.spawn.x;
  G.player.y = world.spawn.y;
  G.wanted = 0;
  G.police = [];
  G.state = 'playing';
  audio.unlock();
  if (G.missionIndex < 4) startMission(G, G.missionIndex);
  else {
    G.mission = null;
    G.banner = { text: 'Free roam — all four jobs done. Solmar Bay is yours.', t: 0, life: 4 };
  }
  announce('Playing. Carmen Sol has work for you.');
}

function snapCamera() {
  const cam = G.cam;
  cam.scale = Math.max(G.view.w / 1100, G.view.h / 800);
  cam.x = clamp(G.player.x - G.view.w / (2 * cam.scale), 0, CFG.WORLD - G.view.w / cam.scale);
  cam.y = clamp(G.player.y - G.view.h / (2 * cam.scale), 0, CFG.WORLD - G.view.h / cam.scale);
}

function step(dt) {
  G.time += dt;
  if (G.banner) G.banner.t += dt;
  if (G.missionBrief) G.missionBrief.t += dt;
  if (G.state === 'title') {
    // Attract mode: the city lives behind the title screen.
    updateTraffic(G, dt);
    updatePeds(G, dt);
    updateParticles(G, dt);
    updateCamera(G, G.view);
    return;
  }
  if (G.state !== 'playing') return;

  const actions = input.takeActions();
  if (actions & ACT_MUTE) audio.setMuted(!audio.muted);
  if (actions & ACT_HELP) G.help = !G.help;
  if (actions & ACT_PAUSE) {
    G.state = 'paused';
    announce('Paused.');
    return;
  }
  updateAim(G, input, G.cam);
  updatePlayer(G, dt, input, actions);
  if (actions & ACT_PUNCH) punch(G);
  // Hold the mouse to keep firing; click fires once.
  G.fireCooldown -= dt;
  if (input.mouse.down && G.fireCooldown <= 0 && !G.player.inCar) {
    shoot(G, G.cam);
    G.fireCooldown = 0.22;
  }
  input.takeClick();
  updateTraffic(G, dt);
  updatePeds(G, dt);
  updatePolice(G, dt);
  updateBullets(G, dt);
  updateParticles(G, dt);
  updateMissions(G, dt);
  updateCamera(G, G.view);
  audio.update(dt, G.player.speed, G.wanted);
  if (G.player.health <= 0 && G.state === 'playing') wasted();
}

function paint() {
  drawGame(ctx, G);
  if (G.state === 'title') {
    drawTitle(ctx, G, G.view, readSave());
  } else if (G.state === 'playing') {
    drawHUD(ctx, G, G.view);
    if (G.help) drawHelp(ctx, G.view);
  } else if (G.state === 'paused') {
    drawHUD(ctx, G, G.view);
    drawPaused(ctx, G.view);
  } else if (G.state === 'busted') {
    drawBusted(ctx, G.view);
  } else if (G.state === 'wasted') {
    drawWasted(ctx, G.view);
  } else if (G.state === 'win') {
    drawWin(ctx, G, G.view);
  }
}

function handleScreenActions() {
  // While playing, step() owns every action; screens only listen when not playing.
  if (G.state === 'playing') return;
  const actions = input.takeActions();
  if (actions & ACT_MUTE) audio.setMuted(!audio.muted);
  if (G.state === 'paused' && (actions & (ACT_PAUSE | ACT_CONFIRM))) {
    G.state = 'playing';
    announce('Playing.');
  } else if (G.state === 'title' && (actions & ACT_CONFIRM)) {
    startStory(false);
  } else if ((G.state === 'busted' || G.state === 'wasted') && (actions & ACT_CONFIRM)) {
    G.state = 'playing';
    if (G.missionIndex < 4 && (!G.mission || G.mission.done)) startMission(G, G.missionIndex);
    announce('Back on the streets.');
  } else if (G.state === 'win' && (actions & ACT_CONFIRM)) {
    G.state = 'playing';
    G.mission = null;
    announce('Free roam. Solmar Bay is yours.');
  }
  // Clicking the title / end screens also starts.
  if (input.takeClick()) {
    if (G.state === 'title') startStory(false);
    else if (G.state === 'busted' || G.state === 'wasted') {
      G.state = 'playing';
      if (G.missionIndex < 4 && (!G.mission || G.mission.done)) startMission(G, G.missionIndex);
    } else if (G.state === 'win') {
      G.state = 'playing';
      G.mission = null;
    }
  }
}

// --- Boot: populate the city ------------------------------------------------
spawnTraffic(G, 14);
spawnParked(G, 16);
spawnPeds(G, 26);
updateCamera(G, G.view);
snapCamera();

document.addEventListener('visibilitychange', () => {
  if (document.hidden && G.state === 'playing') {
    G.state = 'paused';
    announce('Paused.');
  }
});

if (shot) {
  // Deterministic screenshot scene: stage it, settle it, paint it.
  stageShot(G, shot);
  snapCamera();
  const steps = shot === 'start' ? 150 : 45;
  for (let i = 0; i < steps; i += 1) step(STEP);
  snapCamera();
  let painted = 0;
  (function paintShot() {
    paint();
    painted += 1;
    if (painted < 2) requestAnimationFrame(paintShot);
    else window.__shotReady = true;
  }());
} else {
  let last = performance.now();
  let accumulator = 0;
  announce('Solmar Bay. Press Enter or click to play.');
  (function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleScreenActions();
    while (accumulator >= STEP) {
      step(STEP);
      accumulator -= STEP;
      if (G.state === 'paused') break;
    }
    if (G.state !== 'paused') paint();
    else paint();
  }(performance.now()));
}

// Keep the linter honest about imports used only by the state machine.
void currentMission;
void districtAt;
void ACT_ENTER;
