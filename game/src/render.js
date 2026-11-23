// Solmar Bay — the renderer: sunset-lit city, roads with lane lines, neon buildings,
// palms, beach and docks, cars / peds / police / player drawn in code, mission
// markers, particles, and the title / pause / busted / game-over screens.
import { WORLD, ROADS_X, ROADS_Y, ROAD_W, PALETTE, FONT, districtAt } from './config.js';
import { drawHUD, roundRect, star } from './hud.js';
import { missionState } from './missions.js';

export const SCREEN_TITLE = 'title', SCREEN_PLAY = 'play', SCREEN_PAUSED = 'paused', SCREEN_OVER = 'over', SCREEN_BUSTED = 'busted', SCREEN_WIN = 'win';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  function resize(view) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(view.w * dpr); canvas.height = Math.floor(view.h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  return {
    draw(G, screen) {
      const view = G.view;
      if (canvas.width !== Math.floor(view.w * Math.min(2, window.devicePixelRatio || 1))) resize(view);
      ctx.clearRect(0, 0, view.w, view.h);
      if (screen === SCREEN_TITLE) { drawTitle(ctx, G, view); return; }
      drawWorld(ctx, G, view);
      drawEntities(ctx, G, view);
      drawHUD(ctx, G, view);
      if (screen === SCREEN_PAUSED) overlay(ctx, view, 'PAUSED', 'P or Esc to resume · M mute · progress auto-saves');
      if (screen === SCREEN_OVER) overlay(ctx, view, 'WASTED', 'Milo is down. Press Enter to start over — your cash and jobs are saved.');
      if (screen === SCREEN_BUSTED) overlay(ctx, view, 'BUSTED', 'The Solmar Bay police got you. Press Enter to start over — your cash and jobs are saved.');
      if (screen === SCREEN_WIN) overlay(ctx, view, 'SOLMAR BAY IS YOURS', 'Every job done. Free roam — press Enter to keep playing.');
    },
  };
}

function drawTitle(ctx, G, view) {
  const grad = ctx.createLinearGradient(0, 0, 0, view.h);
  grad.addColorStop(0, '#ff7a3d'); grad.addColorStop(0.45, '#c94b7a'); grad.addColorStop(1, '#1d2b4a');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, view.w, view.h);
  // Sun + palm silhouettes + skyline for the title card (sun off to the side so it
  // never sits behind the subtitle text).
  ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(view.w * 0.8, view.h * 0.20, 56, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(20,16,40,0.9)';
  for (let i = 0; i < 9; i += 1) { const bx = 60 + i * (view.w - 120) / 8, bh = 90 + ((i * 53) % 130); ctx.fillRect(bx, view.h * 0.62 - bh, 70, bh); }
  drawPalm(ctx, 90, view.h * 0.66, 1.2); drawPalm(ctx, view.w - 100, view.h * 0.66, 1.4);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff'; ctx.font = `900 64px ${FONT}`; ctx.fillText('SOLMAR BAY', view.w / 2, view.h * 0.30);
  ctx.fillStyle = '#ffd23f'; ctx.font = `600 22px ${FONT}`; ctx.fillText('A neon palm-city crime story', view.w / 2, view.h * 0.30 + 38);
  ctx.fillStyle = '#f5f1e6'; ctx.font = `16px ${FONT}`;
  ctx.fillText('Milo Vega, driver-for-hire. Carmen Sol has four jobs for you — steal cars, run', view.w / 2, view.h * 0.70);
  ctx.fillText('packages, outrun the Solmar Bay police, and take the Bay Job.', view.w / 2, view.h * 0.70 + 24);
  ctx.fillStyle = '#ffd23f'; ctx.font = `700 20px ${FONT}`;
  ctx.fillText('Press Enter or click to start', view.w / 2, view.h * 0.70 + 66);
  ctx.fillStyle = '#d8d0c0'; ctx.font = `14px ${FONT}`;
  ctx.fillText('WASD move / drive · E enter & exit cars · Mouse aim, click shoot · F punch · P pause · M mute', view.w / 2, view.h * 0.70 + 96);
  if (G.saveInfo) { ctx.fillStyle = '#fff'; ctx.fillText(G.saveInfo, view.w / 2, view.h * 0.70 + 122); }
  ctx.textAlign = 'left';
}

function drawPalm(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = '#2a1a2e'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(6, -34, 16, -52); ctx.stroke();
  ctx.strokeStyle = '#1d5c33'; ctx.lineWidth = 5;
  for (let i = 0; i < 6; i += 1) { const a = -Math.PI * (0.15 + i * 0.14); ctx.beginPath(); ctx.moveTo(16, -52); ctx.quadraticCurveTo(16 + Math.cos(a) * 26, -52 + Math.sin(a) * 18, 16 + Math.cos(a) * 44, -52 + Math.sin(a) * 30); ctx.stroke(); }
  ctx.restore();
}

function drawWorld(ctx, G, view) {
  const cam = G.cam, scale = view.scale;
  ctx.save();
  // Sunset sky tint over the whole view, then the ground.
  ctx.fillStyle = '#2e6b4f'; ctx.fillRect(0, 0, view.w, view.h);
  ctx.translate(-cam.x * scale, -cam.y * scale); ctx.scale(scale, scale);
  const vx0 = cam.x - 60, vy0 = cam.y - 60, vx1 = cam.x + view.w / scale + 60, vy1 = cam.y + view.h / scale + 60;
  // Beach strip along the south shore + bay water.
  ctx.fillStyle = PALETTE.sand; ctx.fillRect(0, WORLD.height - 90, WORLD.width, 90);
  ctx.fillStyle = PALETTE.water; ctx.fillRect(0, WORLD.height - 26, WORLD.width, 26);
  // Roads.
  ctx.fillStyle = PALETTE.road;
  for (const rx of ROADS_X) ctx.fillRect(rx - ROAD_W / 2, 0, ROAD_W, WORLD.height);
  for (const ry of ROADS_Y) ctx.fillRect(0, ry - ROAD_W / 2, WORLD.width, ROAD_W);
  // Lane dashes.
  ctx.fillStyle = PALETTE.roadLine;
  for (const rx of ROADS_X) for (let y = 20; y < WORLD.height; y += 70) ctx.fillRect(rx - 2, y, 4, 34);
  for (const ry of ROADS_Y) for (let x = 20; x < WORLD.width; x += 70) ctx.fillRect(x, ry - 2, 34, 4);
  // District tint wash + labels on the ground.
  ctx.font = `700 44px ${FONT}`; ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.fillText('PALMERA STRIP', 180, 300); ctx.fillText('VISTA HILLS', 1900, 300);
  ctx.fillText('CORAL DOCKS', 180, 2250); ctx.fillText('NEON MILE', 1900, 2250);
  // Buildings.
  for (const b of G.city.buildings) {
    if (b.x > vx1 || b.x + b.w < vx0 || b.y > vy1 || b.y + b.h < vy0) continue;
    ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(b.x, b.y, b.w, 10);
    ctx.fillStyle = 'rgba(255,240,180,0.75)';
    const cols = Math.max(1, Math.floor(b.w / 34)), rows = Math.max(1, Math.floor(b.h / 34));
    for (let i = 0; i < cols; i += 1) for (let j = 0; j < rows; j += 1) if ((i + j) % 2 === 0) ctx.fillRect(b.x + 10 + i * 34, b.y + 20 + j * 34, 14, 18);
    if (b.neon) { ctx.strokeStyle = '#ff4fd8'; ctx.lineWidth = 3; ctx.strokeRect(b.x + 3, b.y + 3, b.w - 6, b.h - 6); }
  }
  // Docks piers.
  ctx.fillStyle = '#6b4a2e';
  for (const pier of G.city.piers) ctx.fillRect(pier.x, pier.y, pier.w, pier.h);
  // Palms.
  for (const palm of G.city.palms) {
    if (palm.x < vx0 || palm.x > vx1 || palm.y < vy0 || palm.y > vy1) continue;
    drawPalm(ctx, palm.x, palm.y, palm.s * 0.7);
  }
  // Mission marker: pulsing beacon + ground ring.
  const ms = missionState(G);
  if (!ms.done) {
    const pulse = 1 + 0.25 * Math.sin(G.time * 5);
    ctx.fillStyle = 'rgba(255,210,63,0.25)'; ctx.beginPath(); ctx.arc(ms.x, ms.y, ms.r * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(ms.x, ms.y, 26 * pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(ms.x, ms.y - 44); ctx.lineTo(ms.x - 14, ms.y - 14); ctx.lineTo(ms.x + 14, ms.y - 14); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

function drawCar(ctx, x, y, angle, color, isPolice, flash) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; roundRect(ctx, -28, -14, 56, 28, 8); ctx.fill();
  ctx.fillStyle = color; roundRect(ctx, -27, -13, 54, 26, 8); ctx.fill();
  ctx.fillStyle = 'rgba(180,220,255,0.85)'; roundRect(ctx, -6, -11, 16, 22, 4); ctx.fill();
  ctx.fillStyle = '#ffd23f'; ctx.fillRect(24, -11, 3, 5); ctx.fillRect(24, 6, 3, 5);
  ctx.fillStyle = '#ff4d4d'; ctx.fillRect(-28, -11, 3, 5); ctx.fillRect(-28, 6, 3, 5);
  if (isPolice) {
    ctx.fillStyle = '#fff'; ctx.fillRect(-2, -13, 8, 26);
    ctx.fillStyle = flash ? '#ff2d2d' : '#2d6bff'; ctx.beginPath(); ctx.arc(-2, -6, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = flash ? '#2d6bff' : '#ff2d2d'; ctx.beginPath(); ctx.arc(-2, 6, 5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawEntities(ctx, G, view) {
  const cam = G.cam, scale = view.scale;
  ctx.save(); ctx.translate(-cam.x * scale, -cam.y * scale); ctx.scale(scale, scale);
  for (const c of G.cars) {
    if (c === G.player.car) continue;
    drawCar(ctx, c.x, c.y, c.angle, c.color, false, false);
    if (c.kind === 'parked' && !c.stolen) { ctx.fillStyle = 'rgba(255,210,63,0.9)'; ctx.font = `700 13px ${FONT}`; ctx.fillText('E', c.x - 4, c.y - 22); }
  }
  if (G.player.car) drawCar(ctx, G.player.car.x, G.player.car.y, G.player.car.angle, G.player.car.color, false, false);
  for (const cop of G.police) drawCar(ctx, cop.x, cop.y, cop.angle, '#1c2436', true, Math.sin(cop.sirenPhase) > 0);
  for (const ped of G.peds) {
    ctx.save(); ctx.translate(ped.x, ped.y);
    const bob = Math.sin(ped.walkPhase) * 2;
    ctx.fillStyle = ped.shirt; ctx.beginPath(); ctx.arc(0, bob * 0.3, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8b88a'; ctx.beginPath(); ctx.arc(0, -2 + bob * 0.3, 6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  const p = G.player;
  if (p.onFoot && !p.dead) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle);
    ctx.fillStyle = PALETTE.player; ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#222'; ctx.fillRect(8, -3, 16, 6); // pistol / arm
    ctx.fillStyle = '#e8b88a'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // Bullets.
  ctx.fillStyle = '#ffe27a';
  for (const b of G.bullets) { ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI * 2); ctx.fill(); }
  // Particles.
  for (const pt of G.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / (pt.max || 1));
    ctx.fillStyle = pt.color; ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Off-screen mission arrow at the view edge.
  const ms = missionState(G);
  if (!ms.done) {
    const dx = ms.x - p.x, dy = ms.y - p.y, d = Math.hypot(dx, dy);
    if (d > 520) {
      const a = Math.atan2(dy, dx);
      const ax = p.x + Math.cos(a) * 300, ay = p.y + Math.sin(a) * 300;
      ctx.save(); ctx.translate(ax, ay); ctx.rotate(a);
      ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-10, -12); ctx.lineTo(-10, 12); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#ffd23f'; ctx.font = `700 15px ${FONT}`; ctx.fillText(`${Math.round(d)}m`, ax - 16, ay - 22);
    }
  }
  ctx.restore();
}

function overlay(ctx, view, title, sub) {
  ctx.fillStyle = 'rgba(8,10,18,0.72)'; ctx.fillRect(0, 0, view.w, view.h);
  ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = `900 52px ${FONT}`; ctx.fillText(title, view.w / 2, view.h / 2 - 10);
  ctx.fillStyle = '#ffd23f'; ctx.font = `18px ${FONT}`; ctx.fillText(sub, view.w / 2, view.h / 2 + 32);
  ctx.textAlign = 'left';
}
