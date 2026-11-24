// Solmar Bay — the renderer: camera, city, cars, people, effects and the
// title / pause / game-over screens. Everything is drawn with Canvas 2D.
import { COLORS, ROAD_W, WORLD_H, WORLD_W, clamp } from './config.js';
import { WATER_X, roadCentersX, roadCentersY } from './world.js';
import { drawHUD } from './hud.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let w = 0;
  let h = 0;
  let camX = 0;
  let camY = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  function drawGround() {
    // Grass base.
    ctx.fillStyle = COLORS.grass;
    ctx.fillRect(0, 0, w, h);
    // Bay on the west, with a sand beach.
    ctx.fillStyle = COLORS.water;
    ctx.fillRect(-camX, -camY, WATER_X, WORLD_H);
    ctx.fillStyle = COLORS.waterDeep;
    for (let y = 0; y < WORLD_H; y += 90) {
      ctx.fillRect(-camX + 20, -camY + y, 90, 8);
    }
    ctx.fillStyle = COLORS.sand;
    ctx.fillRect(-camX + WATER_X, -camY, 52, WORLD_H);
    // Sidewalks: pale strips along every road.
    ctx.fillStyle = COLORS.sidewalk;
    for (const rx of roadCentersX()) {
      ctx.fillRect(rx - ROAD_W / 2 - 12 - camX, -camY, ROAD_W + 24, WORLD_H);
    }
    for (const ry of roadCentersY()) {
      ctx.fillRect(-camX, ry - ROAD_W / 2 - 12 - camY, WORLD_W, ROAD_W + 24);
    }
    // Roads.
    ctx.fillStyle = COLORS.road;
    for (const rx of roadCentersX()) {
      ctx.fillRect(rx - ROAD_W / 2 - camX, -camY, ROAD_W, WORLD_H);
    }
    for (const ry of roadCentersY()) {
      ctx.fillRect(-camX, ry - ROAD_W / 2 - camY, WORLD_W, ROAD_W);
    }
    // Centre dashes.
    ctx.fillStyle = COLORS.roadLine;
    for (const rx of roadCentersX()) {
      for (let y = 0; y < WORLD_H; y += 64) {
        ctx.fillRect(rx - 3 - camX, y - camY, 6, 32);
      }
    }
    for (const ry of roadCentersY()) {
      for (let x = WATER_X + 40; x < WORLD_W; x += 64) {
        ctx.fillRect(x - camX, ry - 3 - camY, 32, 6);
      }
    }
  }

  function drawParks(state) {
    for (const park of state.city.parks) {
      ctx.fillStyle = COLORS.park;
      ctx.fillRect(park.x - camX, park.y - camY, park.w, park.h);
      ctx.fillStyle = '#2a5d2e';
      // A few round trees.
      for (let i = 0; i < 8; i += 1) {
        const tx = park.x + 30 + ((i * 97) % (park.w - 60));
        const ty = park.y + 30 + ((i * 53) % (park.h - 60));
        ctx.beginPath();
        ctx.arc(tx - camX, ty - camY, 14, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawBuildings(state) {
    for (const b of state.city.buildings) {
      const x = b.x - camX;
      const y = b.y - camY;
      if (x > w || y > h || x + b.w < 0 || y + b.h < 0) continue;
      ctx.fillStyle = COLORS.buildingWall;
      ctx.fillRect(x + 3, y + 4, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(x, y, b.w, b.h);
      // Roof detail: inner border + a vent block.
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 8.5, y + 8.5, b.w - 17, b.h - 17);
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.fillRect(x + b.w * 0.2, y + b.h * 0.25, b.w * 0.22, b.h * 0.22);
    }
  }

  function drawCarShape(car, isPolice) {
    ctx.save();
    ctx.translate(car.x - camX, car.y - camY);
    ctx.rotate(car.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-22, -10, 46, 24);
    ctx.fillStyle = isPolice ? '#e8e8e8' : car.color;
    ctx.fillRect(-23, -11, 46, 22);
    if (isPolice) {
      ctx.fillStyle = '#1c2733';
      ctx.fillRect(-8, -11, 16, 22);
    }
    // Cabin + windshield.
    ctx.fillStyle = isPolice ? '#2c3e50' : 'rgba(20,30,40,0.85)';
    ctx.fillRect(-6, -9, 14, 18);
    ctx.fillStyle = '#dfe9f2';
    ctx.fillRect(8, -8, 5, 16);
    // Headlights.
    ctx.fillStyle = '#fef9a7';
    ctx.fillRect(20, -10, 3, 5);
    ctx.fillRect(20, 5, 3, 5);
    // Tail lights.
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(-23, -10, 3, 5);
    ctx.fillRect(-23, 5, 3, 5);
    ctx.restore();
  }

  function drawPersonShape(x, y, angle, color, down) {
    ctx.save();
    ctx.translate(x - camX, y - camY);
    if (down) {
      ctx.rotate(angle + Math.PI / 2);
      ctx.fillStyle = color;
      ctx.fillRect(-9, -4, 18, 8);
      return;
    }
    ctx.rotate(angle);
    // Shadow + body + head, facing the walk direction.
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.arc(1, 2, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f5cba7';
    ctx.beginPath();
    ctx.arc(5, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawMarker(state) {
    const m = state.missions.marker;
    const pulse = 1 + Math.sin(state.time * 5) * 0.12;
    const x = m.x - camX;
    const y = m.y - camY;
    if (x < -80 || y < -120 || x > w + 80 || y > h + 80) return;
    // Ground ring + floating beacon.
    ctx.save();
    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, 30 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(241,196,15,0.25)';
    ctx.beginPath();
    ctx.arc(x, y, 30 * pulse, 0, Math.PI * 2);
    ctx.fill();
    // Beacon column.
    const grad = ctx.createLinearGradient(x, y - 130, x, y);
    grad.addColorStop(0, 'rgba(241,196,15,0)');
    grad.addColorStop(1, 'rgba(241,196,15,0.5)');
    ctx.fillStyle = grad;
    ctx.fillRect(x - 7, y - 130, 14, 130);
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.moveTo(x, y - 148);
    ctx.lineTo(x - 10, y - 128);
    ctx.lineTo(x + 10, y - 128);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawWorld(state) {
    drawGround();
    drawParks(state);
    drawBuildings(state);
    // Mission marker under the entities so it never hides them.
    if (!state.missions.complete) drawMarker(state);
    // Carmen Sol, the fixer, at her plaza spot.
    if (!state.missions.complete || state.missions.index < 4) {
      drawPersonShape(state.spots.carmen.x, state.spots.carmen.y, -Math.PI / 2, '#9b59b6', false);
    }
    for (const car of state.cars) {
      if (car.x - camX < -60 || car.y - camY < -60 || car.x - camX > w + 60 || car.y - camY > h + 60) continue;
      drawCarShape(car, false);
    }
    for (const cop of state.police) {
      drawCarShape(cop, true);
      // Light bar flashing red / blue.
      const red = Math.sin(state.time * 9 + cop.siren) > 0;
      ctx.fillStyle = red ? '#ff2d2d' : '#2d7dff';
      ctx.fillRect(cop.x - camX - 6, cop.y - camY - 13, 12, 4);
    }
    for (const ped of state.peds) {
      drawPersonShape(ped.x, ped.y, ped.angle, ped.color, ped.mode === 'down');
    }
    for (const rival of state.rivals) {
      if (rival.health <= 0) continue;
      drawPersonShape(rival.x, rival.y, rival.angle, rival.color, false);
      // Health pips above rivals.
      ctx.fillStyle = '#e74c3c';
      for (let i = 0; i < rival.health; i += 1) {
        ctx.fillRect(rival.x - camX - 12 + i * 9, rival.y - camY - 24, 7, 4);
      }
    }
    // The player: red jacket on foot, or the car they drive.
    const p = state.player;
    if (p.onFoot) {
      drawPersonShape(p.x, p.y, p.angle, '#e74c3c', false);
      // Aim line toward the mouse.
      if (state.aim) {
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x - camX, p.y - camY);
        ctx.lineTo(p.x - camX + Math.cos(p.angle) * 46, p.y - camY + Math.sin(p.angle) * 46);
        ctx.stroke();
      }
    }
    // Bullets.
    ctx.fillStyle = '#f1c40f';
    for (const b of state.bullets) {
      ctx.beginPath();
      ctx.arc(b.x - camX, b.y - camY, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // Particles.
    for (const pt of state.particles) {
      ctx.globalAlpha = clamp(pt.life / pt.maxLife, 0, 1);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x - camX, pt.y - camY, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Floating score text.
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    for (const f of state.floats) {
      ctx.globalAlpha = clamp(f.life, 0, 1);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x - camX, f.y - camY);
    }
    ctx.globalAlpha = 1;
  }

  function drawTitle(state, best) {
    drawWorld(state);
    ctx.fillStyle = 'rgba(8, 12, 18, 0.62)';
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f1c40f';
    ctx.font = 'bold 84px sans-serif';
    ctx.fillText('SOLMAR BAY', w / 2, h / 2 - 130);
    ctx.fillStyle = '#fff';
    ctx.font = '24px sans-serif';
    ctx.fillText('An open-world crime story — original, made for make.fun gta6-01', w / 2, h / 2 - 88);
    ctx.font = '17px sans-serif';
    ctx.fillStyle = '#d5dbdb';
    ctx.fillText('Carmen Sol needs a driver. Steal cars, lose the cops, run her jobs, own the bay.', w / 2, h / 2 - 52);
    ctx.fillStyle = '#2ecc71';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('Press ENTER or CLICK to start', w / 2, h / 2 + 10);
    ctx.fillStyle = '#fff';
    ctx.font = '15px sans-serif';
    ctx.fillText('WASD move & drive · E enter / steal car · Mouse + Click shoot · Shift run · Esc pause', w / 2, h / 2 + 52);
    ctx.fillText('4 missions · wanted level 1–5 · police chases · save game', w / 2, h / 2 + 80);
    if (best > 0) {
      ctx.fillStyle = '#f1c40f';
      ctx.fillText(`Best haul so far: $${best.toLocaleString('en-US')}`, w / 2, h / 2 + 112);
    }
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(8, 12, 18, 0.6)';
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 48px sans-serif';
    ctx.fillText('PAUSED', w / 2, h / 2 - 10);
    ctx.font = '18px sans-serif';
    ctx.fillText('Esc / P to resume', w / 2, h / 2 + 30);
  }

  return {
    get width() {
      return w;
    },
    get height() {
      return h;
    },
    draw(state, screen, best) {
      const p = state.player;
      camX = clamp(p.x - w / 2, -40, WORLD_W - w + 40);
      camY = clamp(p.y - h / 2, -40, WORLD_H - h + 40);
      if (screen === SCREEN_TITLE) {
        drawTitle(state, best);
        return;
      }
      drawWorld(state);
      drawHUD(ctx, state, w, h);
      if (screen === SCREEN_PAUSED) drawPaused();
    },
  };
}
