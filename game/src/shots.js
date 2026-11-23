// Solmar Bay — deterministic screenshot scenes behind ?shot=…&seed=N.
// Each scene sets up the real game state (no fake props) and returns the screen
// to draw: start = title card, drive = Milo driving with traffic + HUD, chase =
// 3-star police chase, mission = an active mission with its marker and banner.
import { SCREEN_TITLE, SCREEN_PLAY } from './render.js';

export function stageShot(name, G) {
  // Reset to a clean, seeded state, then pose the scene.
  G.reset(G.seed);
  if (name === 'start') return { screen: SCREEN_TITLE };
  if (name === 'drive') {
    const car = G.cars.find((c) => c.kind === 'parked');
    G.player.x = 1000; G.player.y = 340; G.player.onFoot = false; G.player.car = car; car.occupied = true; car.kind = 'player';
    car.x = 1000; car.y = 460; car.angle = 0; car.speed = 320;
    G.player.cash = 650; G.wanted = 0; G.missionIndex = 0; G.stageIndex = 1; // delivering the stolen car
    G.cam.x = G.player.x - G.view.w / 2; G.cam.y = G.player.y - G.view.h / 2;
    return { screen: SCREEN_PLAY };
  }
  if (name === 'chase') {
    const car = G.cars.find((c) => c.kind === 'parked');
    G.player.x = 1600; G.player.y = 900; G.player.onFoot = false; G.player.car = car; car.occupied = true; car.kind = 'player';
    car.x = 1600; car.y = 900; car.angle = 0; car.speed = 420;
    G.player.cash = 1250; G.wanted = 3; G.missionIndex = 2; G.stageIndex = 0; // Dockside Heat: escape the response
    G.police = [];
    for (let i = 0; i < 4; i += 1) G.police.push({ x: 1600 - 180 - i * 70, y: 900 + (i % 2 ? 60 : -60), angle: 0, speed: 380, hp: 80, bust: 0, sirenPhase: i });
    G.banner = 'Police response incoming!'; G.bannerTimer = 3;
    G.cam.x = G.player.x - G.view.w / 2; G.cam.y = G.player.y - G.view.h / 2;
    return { screen: SCREEN_PLAY };
  }
  // mission (default): mission 2 active, Milo on foot near the Neon Mile marker.
  G.missionIndex = 1; G.stageIndex = 0;
  G.player.x = 2350; G.player.y = 1560; G.player.cash = 900; G.wanted = 1;
  G.banner = 'Job 2 · Neon Pickup — grab the package'; G.bannerTimer = 3;
  G.cam.x = G.player.x - G.view.w / 2; G.cam.y = G.player.y - G.view.h / 2;
  return { screen: SCREEN_PLAY };
}
