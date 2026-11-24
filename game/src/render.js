// Solmar Bay — final pass, round 4
// Solmar Bay — the renderer: one Canvas 2D camera that follows the player
// and paints the island city, roads, buildings, water, cars, pedestrians,
// police, bullets, particles and the mission marker, then the HUD screens.
import { BLOCK, COLORS, ROAD_SPACING, ROAD_WIDTH, WORLD_SIZE } from './config.js';
import { missionMarker } from './missions.js';
import { drawGameOver, drawHud, drawPaused, drawTitle, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './hud.js';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const camera = { x: 0, y: 0 };

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    return { w, h };
  }

  function drawCar(x, y, angle, color, isPolice) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(-24, -12, 48, 24);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(-23, -11, 46, 22, 6);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.roundRect(-4, -9, 16, 18, 4);
    ctx.fill();
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(21, -9, 2, 4);
    ctx.fillRect(21, 5, 2, 4);
    if (isPolice) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 8px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('POLICE', 0, 3);
      ctx.fillStyle = (Math.floor(performance.now() / 300) % 2 === 0) ? '#ff3b30' : '#3b82ff';
      ctx.beginPath();
      ctx.arc(-10, 0, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function draw(state, screen) {
    const { w, h } = resize();
    const p = state.player;
    camera.x = Math.max(0, Math.min(WORLD_SIZE - w, p.x - w / 2));
    camera.y = Math.max(0, Math.min(WORLD_SIZE - h, p.y - h / 2));
    // Sea and sand around the island.
    ctx.fillStyle = COLORS.water;
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    ctx.fillStyle = COLORS.sand;
    ctx.fillRect(-40, -40, WORLD_SIZE + 80, WORLD_SIZE + 80);
    ctx.fillStyle = COLORS.grass;
    ctx.fillRect(0, 0, WORLD_SIZE, WORLD_SIZE - 150);
    // Marina water on the south shore.
    ctx.fillStyle = COLORS.water;
    ctx.fillRect(0, WORLD_SIZE - 150, WORLD_SIZE, 150);
    ctx.fillStyle = '#c9a44a';
    ctx.fillRect(0, WORLD_SIZE - 160, WORLD_SIZE, 10);
    // Roads.
    ctx.fillStyle = COLORS.road;
    for (let c = ROAD_SPACING / 2; c < WORLD_SIZE; c += ROAD_SPACING) {
      ctx.fillRect(0, c - ROAD_WIDTH / 2, WORLD_SIZE, ROAD_WIDTH);
      ctx.fillRect(c - ROAD_WIDTH / 2, 0, ROAD_WIDTH, WORLD_SIZE);
    }
    // Sidewalks and centre dashes.
    ctx.fillStyle = COLORS.sidewalk;
    for (let c = ROAD_SPACING / 2; c < WORLD_SIZE; c += ROAD_SPACING) {
      ctx.fillRect(0, c - ROAD_WIDTH / 2 - 8, WORLD_SIZE, 8);
      ctx.fillRect(0, c + ROAD_WIDTH / 2, WORLD_SIZE, 8);
      ctx.fillRect(c - ROAD_WIDTH / 2 - 8, 0, 8, WORLD_SIZE);
      ctx.fillRect(c + ROAD_WIDTH / 2, 0, 8, WORLD_SIZE);
    }
    ctx.strokeStyle = COLORS.roadLine;
    ctx.setLineDash([18, 18]);
    ctx.lineWidth = 3;
    for (let c = ROAD_SPACING / 2; c < WORLD_SIZE; c += ROAD_SPACING) {
      ctx.beginPath(); ctx.moveTo(0, c); ctx.lineTo(WORLD_SIZE, c); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(c, 0); ctx.lineTo(c, WORLD_SIZE); ctx.stroke();
    }
    ctx.setLineDash([]);
    // Buildings with roofs, windows and a lighthouse on the north-east point.
    for (const b of state.buildings) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(b.x + 4, b.y + 5, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, 8);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      for (let wx = b.x + 10; wx < b.x + b.w - 12; wx += 18) {
        for (let wy = b.y + 22; wy < b.y + b.h - 10; wy += 20) ctx.fillRect(wx, wy, 8, 10);
      }
    }
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(WORLD_SIZE - 90, 60, 26, 120);
    ctx.fillStyle = '#d94f3d';
    ctx.fillRect(WORLD_SIZE - 94, 44, 34, 22);
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.arc(WORLD_SIZE - 77, 55, 18 + 6 * Math.sin(state.time * 2), 0, Math.PI * 2);
    ctx.fill();
    // Mission marker: a pulsing golden beacon.
    const marker = missionMarker(state);
    if (marker && (screen === SCREEN_PLAY || screen === SCREEN_TITLE)) {
      const pulse = 26 + 8 * Math.sin(state.time * 4);
      ctx.strokeStyle = '#ffd23f';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(marker.x, marker.y, pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.arc(marker.x, marker.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd23f';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('▼', marker.x, marker.y - pulse - 6);
    }
    // Pickups (cash drops).
    for (const pk of state.pickups) {
      ctx.fillStyle = '#7dff8a';
      ctx.beginPath();
      ctx.arc(pk.x, pk.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#14532d';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('$', pk.x, pk.y + 4);
    }
    // Pedestrians.
    for (const ped of state.peds) {
      if (!ped.alive) continue;
      ctx.fillStyle = ped.color;
      ctx.beginPath();
      ctx.arc(ped.x, ped.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f5d7b0';
      ctx.beginPath();
      ctx.arc(ped.x, ped.y - 2, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Cars: traffic, parked, player, then police on top.
    for (const car of state.cars) drawCar(car.x, car.y, car.angle, car.color, false);
    for (const cop of state.police) drawCar(cop.x, cop.y, cop.angle, cop.color, true);
    // Rival crew.
    for (const e of state.enemies) {
      ctx.fillStyle = '#8e1f1f';
      ctx.beginPath();
      ctx.arc(e.x, e.y, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd23f';
      ctx.fillRect(e.x - 14, e.y - 24, 28 * Math.max(0, e.health / 50), 4);
    }
    // Player on foot.
    if (p.onFoot && p.alive) {
      ctx.fillStyle = '#1f6feb';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + Math.cos(p.angle) * 20, p.y + Math.sin(p.angle) * 20);
      ctx.stroke();
    }
    // Bullets and sparks.
    for (const b of state.bullets) {
      ctx.fillStyle = '#ffe14d';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const pt of state.particles) {
      ctx.globalAlpha = Math.max(0, pt.life * 2);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    // Screens and HUD on top of the world.
    if (screen === SCREEN_TITLE) drawTitle(ctx, state, w, h);
    else if (screen === SCREEN_PAUSED) drawPaused(ctx, w, h);
    else if (screen === SCREEN_OVER || screen === SCREEN_WIN) drawGameOver(ctx, state, w, h);
    if (screen === SCREEN_PLAY) drawHud(ctx, state, w, h);
    // Sun-soaked vignette for the look.
    const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.75);
    grad.addColorStop(0, 'rgba(255,220,120,0)');
    grad.addColorStop(1, 'rgba(255,180,60,0.10)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    return camera;
  }

  return { draw, camera };
}
