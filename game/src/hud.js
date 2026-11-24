// Solmar Bay — the HUD: cash, health, wanted stars, mission banner, speed,
// minimap and message toasts, all drawn in screen space over the world.
import { WORLD_H, WORLD_W, clamp } from './config.js';
import { missionName } from './missions.js';

const MAP_W = 208;
const MAP_H = 156;

function drawStars(ctx, x, y, wanted) {
  ctx.font = '22px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < 5; i += 1) {
    ctx.fillStyle = i < wanted ? '#f1c40f' : 'rgba(255,255,255,0.25)';
    ctx.fillText('★', x + i * 26, y);
  }
}

function drawMinimap(ctx, state, x, y) {
  const sx = MAP_W / WORLD_W;
  const sy = MAP_H / WORLD_H;
  ctx.save();
  ctx.fillStyle = 'rgba(10, 14, 20, 0.82)';
  ctx.fillRect(x, y, MAP_W, MAP_H);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, MAP_W - 1, MAP_H - 1);
  // Water on the west edge.
  ctx.fillStyle = '#1d6f8e';
  ctx.fillRect(x, y, 150 * sx, MAP_H);
  // Roads.
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 2;
  for (let rx = 200; rx <= WORLD_W - 200; rx += 400) {
    ctx.beginPath();
    ctx.moveTo(x + rx * sx, y);
    ctx.lineTo(x + rx * sx, y + MAP_H);
    ctx.stroke();
  }
  for (let ry = 200; ry <= WORLD_H - 200; ry += 400) {
    ctx.beginPath();
    ctx.moveTo(x, y + ry * sy);
    ctx.lineTo(x + MAP_W, y + ry * sy);
    ctx.stroke();
  }
  // Buildings, faint.
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  for (const b of state.city.buildings) {
    ctx.fillRect(x + b.x * sx, y + b.y * sy, Math.max(1, b.w * sx), Math.max(1, b.h * sy));
  }
  // Mission marker, pulsing gold.
  const m = state.missions.marker;
  const pulse = 3 + Math.sin(state.time * 5) * 1.5;
  ctx.fillStyle = '#f1c40f';
  ctx.beginPath();
  ctx.arc(x + m.x * sx, y + m.y * sy, pulse + 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Police, red; player, white with green ring.
  ctx.fillStyle = '#e74c3c';
  for (const cop of state.police) {
    ctx.beginPath();
    ctx.arc(x + cop.x * sx, y + cop.y * sy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  const p = state.player;
  ctx.fillStyle = '#2ecc71';
  ctx.beginPath();
  ctx.arc(x + p.x * sx, y + p.y * sy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.stroke();
  ctx.restore();
}

export function drawHUD(ctx, state, w, h) {
  const p = state.player;
  const m = state.missions;
  ctx.save();
  ctx.textBaseline = 'middle';

  // Top-left: cash, health bar, wanted stars.
  ctx.fillStyle = 'rgba(10, 14, 20, 0.72)';
  ctx.fillRect(12, 12, 250, 92);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.strokeRect(12.5, 12.5, 249, 91);
  ctx.fillStyle = '#2ecc71';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`$${p.cash.toLocaleString('en-US')}`, 24, 32);
  ctx.fillStyle = '#fff';
  ctx.font = '13px sans-serif';
  ctx.fillText('HEALTH', 24, 58);
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillRect(88, 50, 150, 14);
  ctx.fillStyle = p.health > 50 ? '#2ecc71' : p.health > 25 ? '#f39c12' : '#e74c3c';
  ctx.fillRect(88, 50, 150 * clamp(p.health / 100, 0, 1), 14);
  drawStars(ctx, 24, 86, p.wanted);

  // Top-centre: mission banner.
  const banner = `${missionName(state)} — ${m.objective}`;
  ctx.font = 'bold 15px sans-serif';
  const bw = Math.min(w - 560, ctx.measureText(banner).width + 28);
  ctx.fillStyle = 'rgba(10, 14, 20, 0.72)';
  ctx.fillRect((w - bw) / 2, 12, bw, 34);
  ctx.strokeStyle = '#f1c40f';
  ctx.strokeRect((w - bw) / 2 + 0.5, 12.5, bw - 1, 33);
  ctx.fillStyle = '#f1c40f';
  ctx.textAlign = 'center';
  ctx.fillText(banner, w / 2, 30);

  // Minimap, bottom-right, with N marker.
  drawMinimap(ctx, state, w - MAP_W - 12, h - MAP_H - 12);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SOLMAR BAY', w - MAP_W / 2 - 12, h - MAP_H - 22);

  // Bottom-left: controls, fading out after a while.
  if (state.time < 25) {
    ctx.globalAlpha = clamp((25 - state.time) / 5, 0.25, 0.9);
    ctx.fillStyle = 'rgba(10, 14, 20, 0.72)';
    ctx.fillRect(12, h - 84, 330, 72);
    ctx.fillStyle = '#fff';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('WASD / Arrows — move & drive   E — enter / steal car', 22, h - 64);
    ctx.fillText('Mouse + Click / Space — shoot   Shift — run', 22, h - 44);
    ctx.fillText('Esc — pause   Gold marker — your next job', 22, h - 24);
    ctx.globalAlpha = 1;
  }

  // Speed, bottom-centre, only while driving.
  if (p.car) {
    ctx.fillStyle = 'rgba(10, 14, 20, 0.72)';
    ctx.fillRect(w / 2 - 75, h - 46, 150, 34);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.strokeRect(w / 2 - 74.5, h - 45.5, 149, 33);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(Math.abs(p.car.speed) * 0.18)} km/h`, w / 2, h - 28);
  }

  // Toasts and messages.
  if (m.toastTimer > 0) {
    ctx.globalAlpha = clamp(m.toastTimer, 0, 1);
    ctx.fillStyle = '#2ecc71';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(m.toast, w / 2, 96);
    ctx.globalAlpha = 1;
  }
  if (state.messageTimer > 0) {
    ctx.globalAlpha = clamp(state.messageTimer, 0, 1);
    ctx.fillStyle = '#fff';
    ctx.font = '15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.message, w / 2, h - 200);
    ctx.globalAlpha = 1;
  }
  // Busted / wasted overlays.
  if (p.bustProgress > 0 && p.deadTimer <= 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#e74c3c';
    ctx.font = 'bold 54px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BUSTED', w / 2, h / 2 - 10);
    ctx.fillStyle = '#fff';
    ctx.font = '18px sans-serif';
    ctx.fillText('The Solmar Bay PD has you…', w / 2, h / 2 + 30);
  }
  if (p.deadTimer > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#e74c3c';
    ctx.font = 'bold 54px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WASTED', w / 2, h / 2 - 10);
    ctx.fillStyle = '#fff';
    ctx.font = '18px sans-serif';
    ctx.fillText('You wake up at the hospital…', w / 2, h / 2 + 30);
  }
  ctx.restore();
}
