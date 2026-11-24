// Solmar Bay — final pass, round 4
// Solmar Bay — tuning constants for the whole game.
// One place for every number a designer would want to tweak: world size,
// speeds, wanted thresholds, mission rewards and audio levels.
export const WORLD_SIZE = 3200;
export const ROAD_SPACING = 320;
export const ROAD_WIDTH = 64;
export const BLOCK = ROAD_SPACING - ROAD_WIDTH;
export const STEP = 1 / 60;
export const SAVE_KEY = 'solmar-bay-save-v1';
export const BEST_KEY = 'solmar-bay-best-v1';

export const PLAYER = {
  walkSpeed: 210,
  runSpeed: 320,
  radius: 14,
  health: 100,
};

export const CAR = {
  accel: 420,
  brake: 700,
  maxSpeed: 560,
  reverseMax: 180,
  turnRate: 2.6,
  length: 46,
  width: 22,
};

export const TRAFFIC_COUNT = 26;
export const PED_COUNT = 46;
export const MAX_POLICE = 6;

export const WANTED = {
  // Heat gained per crime, and the wanted level each heat band maps to.
  stealCar: 1,
  hitPed: 1,
  shoot: 2,
  killCop: 2,
  decayPerSecond: 0.06,
  bands: [0, 1, 2.5, 4.5, 7, 10],
};

export const MISSIONS = [
  { id: 1, name: 'First Fare', giver: 'Carmen Sol', reward: 400,
    brief: 'Borrow a car and bring it to the Marina garage. No questions.' },
  { id: 2, name: 'Hot Delivery', giver: 'Carmen Sol', reward: 900,
    brief: 'A package for the docks. Cops are watching the bridge — take the back streets.' },
  { id: 3, name: 'Rival Heat', giver: 'Carmen Sol', reward: 1500,
    brief: 'The Vipers took our courier. Get him out of the old depot, quietly or loudly.' },
  { id: 4, name: 'Bay Run', giver: 'Carmen Sol', reward: 2500,
    brief: 'One last run across the whole bay, wanted or not. Make it to the lighthouse.' },
];

export const COLORS = {
  grass: '#3d7a44',
  road: '#2b2f36',
  roadLine: '#d8c95a',
  sidewalk: '#8a8f96',
  building: ['#c96f4a', '#4a7ac9', '#c9a44a', '#7a4ac9', '#4ac9a0', '#b0526e'],
  water: '#2e6f8e',
  sand: '#d9c48a',
};

export const AUDIO = { master: 0.35, engine: 0.05, siren: 0.06 };
