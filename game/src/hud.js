// Solmar Bay — final pass, round 4
// Solmar Bay — the HUD: cash, health bar, wanted stars, speed, mission
// objective, message line and the circular minimap with the mission marker,
// the player arrow, police blips and the bay outline.
import { WORLD_SIZE } from './config.js';
import { currentObjective } from './missions.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

export function drawHud(ctx, state, viewW, viewH) {
  const p = state.player;
  ctx.save();
  ctx.textBaseline = 'top';
  // Top-left: cash and health.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(12, 12, 210, 64);
  ctx.fillStyle = '#7dff8a';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText(`$${p.cash.toLocaleString()}`, 24, 18);
  ctx.fillStyle = '#222';
  ctx.fillRect(24, 50, 160, 12);
  ctx.fillStyle = p.health > 40 ? '#37d67a' : '#e74c3c';
  ctx.fillRect(24, 50, 160 * Math.max(0, p.health / 100), 12);
  ctx.fillStyle = '#fff';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(`HP ${Math.ceil(p.health)}`, 24, 64);
  // Top-right: wanted stars.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(viewW - 212, 12, 200, 40);
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillStyle = '#ffd23f';
  let stars = '';
  for (let i = 0; i < 5; i += 1) stars += i < state.wanted ? '★' : '☆';
  ctx.fillText(stars, viewW - 200, 16);
  // Bottom-left: objective + message.
  const obj = currentObjective(state);
  if (state.mission) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(12, viewH - 86, 420, 74);
    ctx.fillStyle = '#ffd23f';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText(`${state.mission.name} — ${state.mission.giver}`, 24, viewH - 78);
    ctx.fillStyle = '#fff';
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText(obj ? obj.text : '', 24, viewH - 56);
    ctx.fillStyle = '#9fd8ff';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(`Reward $${state.mission.reward} · Mission ${state.missionIndex + 1} of 4`, 24, viewH - 34);
  }
  if (state.time < state.messageUntil) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    const msg = state.message;
    ctx.font = '15px system-ui, sans-serif';
    const w = ctx.measureText(msg).width + 24;
    ctx.fillRect((viewW - w) / 2, viewH - 130, w, 30);
    ctx.fillStyle = '#fff';
    ctx.fillText(msg, (viewW - w) / 2 + 12, viewH - 123);
  }
  // Speed, bottom-right above the minimap.
  if (!p.onFoot && p.car) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(viewW - 132, viewH - 210, 120, 40);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText(`${Math.round(Math.abs(p.car.speed) * 0.12)} mph`, viewW - 120, viewH - 202);
  }
  drawMinimap(ctx, state, viewW, viewH);
  ctx.restore();
}

export function drawMinimap(ctx, state, viewW, viewH) {
  const size = 150;
  const x0 = viewW - size - 12;
  const y0 = viewH - size - 12;
  const scale = size / WORLD_SIZE;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.beginPath();
  ctx.arc(x0 + size / 2, y0 + size / 2, size / 2 + 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x0 + size / 2, y0 + size / 2, size / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#2e6f8e';
  ctx.fillRect(x0, y0, size, size);
  ctx.fillStyle = '#3d7a44';
  ctx.fillRect(x0, y0, size, size - 12);
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 2;
  for (let c = 160; c < WORLD_SIZE; c += 320) {
    ctx.beginPath(); ctx.moveTo(x0 + c * scale, y0); ctx.lineTo(x0 + c * scale, y0 + size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x0, y0 + c * scale); ctx.lineTo(x0 + size, y0 + c * scale); ctx.stroke();
  }
  const obj = currentObjective(state);
  if (obj) {
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.arc(x0 + obj.x * scale, y0 + obj.y * scale, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const cop of state.police) {
    ctx.fillStyle = '#4aa3ff';
    ctx.beginPath();
    ctx.arc(x0 + cop.x * scale, y0 + cop.y * scale, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  const p = state.player;
  ctx.fillStyle = '#fff';
  ctx.save();
  ctx.translate(x0 + p.x * scale, y0 + p.y * scale);
  ctx.rotate(p.angle);
  ctx.beginPath();
  ctx.moveTo(7, 0); ctx.lineTo(-5, -5); ctx.lineTo(-5, 5); ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

export function drawTitle(ctx, state, viewW, viewH) {
  ctx.save();
  ctx.fillStyle = 'rgba(8, 12, 24, 0.72)';
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.fillText('SOLMAR BAY', viewW / 2, viewH / 2 - 120);
  ctx.fillStyle = '#fff';
  ctx.font = '22px system-ui, sans-serif';
  ctx.fillText('An original open-world crime game', viewW / 2, viewH / 2 - 60);
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillStyle = '#cfe8ff';
  const lines = [
    'WASD drive / walk · E steal & enter cars · F or click to shoot',
    'Shift run · P pause · L save · M mute',
    'Four missions from fixer Carmen Sol. Steal cars, dodge the cops, own the bay.',
    '',
    'Press SPACE or click to start',
  ];
  lines.forEach((line, i) => ctx.fillText(line, viewW / 2, viewH / 2 - 10 + i * 26));
  if (state.story.length > 0) {
    ctx.font = 'italic 15px system-ui, sans-serif';
    ctx.fillStyle = '#ffd23f';
    ctx.fillText(state.story[0], viewW / 2, viewH / 2 + 150);
  }
  ctx.restore();
}

export function drawPaused(ctx, viewW, viewH) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 40px system-ui, sans-serif';
  ctx.fillText('PAUSED', viewW / 2, viewH / 2 - 10);
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('Press P to keep playing · L to save', viewW / 2, viewH / 2 + 30);
  ctx.restore();
}

export function drawGameOver(ctx, state, viewW, viewH) {
  ctx.save();
  ctx.fillStyle = 'rgba(20,0,0,0.72)';
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff6b5e';
  ctx.font = 'bold 52px system-ui, sans-serif';
  ctx.fillText(state.missionIndex >= 4 ? 'BAY COMPLETE' : 'BUSTED', viewW / 2, viewH / 2 - 40);
  ctx.fillStyle = '#fff';
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText(`Cash $${state.player.cash} · Missions done ${state.missionDone} · Cars stolen ${state.stats.carsStolen}`, viewW / 2, viewH / 2 + 10);
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('Press SPACE to play again', viewW / 2, viewH / 2 + 50);
  ctx.restore();
}
