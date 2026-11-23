// Solmar Bay — HUD: health, cash, wanted stars, objective, banner and the
// live minimap; plus the title, pause, busted, wasted, win and help screens.
import { CFG, clamp } from './config.js';
import { currentMission } from './missions.js';

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

function text(ctx, value, x, y, size, color, align, bold) {
  ctx.font = `${bold ? 'bold ' : ''}${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(value, x, y);
}

function panel(ctx, x, y, w, h, color) {
  ctx.fillStyle = color || 'rgba(12,14,20,0.72)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
}

export function drawHUD(ctx, G, view) {
  const p = G.player;
  const W = view.w;
  const H = view.h;

  // Top-left: health bar, cash, ammo.
  panel(ctx, 12, 12, 250, 86, 'rgba(12,14,20,0.72)');
  text(ctx, 'MILO VEGA', 24, 38, 15, '#ffffff', 'left', true);
  ctx.fillStyle = '#22242e';
  ctx.beginPath();
  ctx.roundRect(24, 46, 150, 14, 7);
  ctx.fill();
  ctx.fillStyle = p.health > 50 ? '#3ddc6a' : p.health > 25 ? '#f2c94c' : '#e84a4a';
  ctx.beginPath();
  ctx.roundRect(24, 46, 150 * clamp(p.health / 100, 0, 1), 14, 7);
  ctx.fill();
  text(ctx, `${Math.ceil(p.health)}`, 182, 59, 14, '#ffffff', 'left', true);
  text(ctx, `$${p.cash.toLocaleString('en-US')}`, 24, 86, 18, '#7dff5a', 'left', true);
  text(ctx, `Ammo ${p.ammo}${p.inCar ? '  •  DRIVING' : ''}`, 150, 86, 14, '#cfd3da', 'left');

  // Top-centre: wanted stars.
  const stars = '★'.repeat(G.wanted) + '☆'.repeat(5 - G.wanted);
  panel(ctx, W / 2 - 90, 12, 180, 40, 'rgba(12,14,20,0.72)');
  text(ctx, stars, W / 2, 41, 22, G.wanted > 0 ? '#ffb02a' : '#5a5f6b', 'center', true);

  // Minimap, top-right.
  drawMinimap(ctx, G, W - 188, 12, 176);

  // Bottom-left: current objective.
  const m = currentMission(G);
  if (m && G.state === 'playing') {
    const obj = `${m.name}: ${m.objective}`;
    ctx.font = `bold 15px ${FONT}`;
    const w = ctx.measureText(obj).width;
    panel(ctx, 12, H - 52, Math.min(560, w + 36), 40, 'rgba(12,14,20,0.72)');
    text(ctx, '◆ ' + obj, 28, H - 26, 15, '#ffe14d', 'left', true);
  }

  // Centre banner (mission updates, wanted alerts).
  if (G.banner && G.banner.t < G.banner.life) {
    const b = G.banner;
    ctx.font = `bold 20px ${FONT}`;
    const w = ctx.measureText(b.text).width;
    panel(ctx, W / 2 - w / 2 - 18, 64, w + 36, 38, 'rgba(12,14,20,0.78)');
    text(ctx, b.text, W / 2, 90, 20, '#ffffff', 'center', true);
  }
  // Mission briefing line under the banner.
  if (G.missionBrief && G.missionBrief.t < G.missionBrief.life) {
    const b = G.missionBrief;
    ctx.font = `15px ${FONT}`;
    const w = Math.min(W - 120, ctx.measureText(b.text).width);
    panel(ctx, W / 2 - w / 2 - 14, 110, w + 28, 34, 'rgba(12,14,20,0.62)');
    text(ctx, b.text, W / 2, 133, 15, '#ffe9f6', 'center');
  }

  // Bust meter while a cruiser is on top of the player on foot.
  if (!p.inCar && G.wanted > 0) {
    let worst = 0;
    for (const cop of G.police) worst = Math.max(worst, cop.bustTimer || 0);
    if (worst > 0) {
      panel(ctx, W / 2 - 110, H - 96, 220, 30, 'rgba(12,14,20,0.78)');
      text(ctx, 'BUSTED IN…', W / 2 - 96, H - 76, 14, '#ff5a5a', 'left', true);
      ctx.fillStyle = '#ff5a5a';
      ctx.fillRect(W / 2 + 8, H - 88, 92 * clamp(worst / 1.2, 0, 1), 12);
    }
  }

  // Crosshair when on foot.
  if (!p.inCar && G.state === 'playing') {
    const mx = G.input.mouse.x;
    const my = G.input.mouse.y;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(mx, my, 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(mx - 13, my);
    ctx.lineTo(mx - 5, my);
    ctx.moveTo(mx + 5, my);
    ctx.lineTo(mx + 13, my);
    ctx.moveTo(mx, my - 13);
    ctx.lineTo(mx, my - 5);
    ctx.moveTo(mx, my + 5);
    ctx.lineTo(mx, my + 13);
    ctx.stroke();
  }

  // Bottom-right: controls hint + mute state.
  text(ctx, `H help   •   M ${G.audio.muted ? 'unmute' : 'mute'}   •   P pause`, W - 200, H - 16, 13, 'rgba(255,255,255,0.75)', 'left');
}

function drawMinimap(ctx, G, x, y, size) {
  const scale = size / CFG.WORLD;
  panel(ctx, x - 6, y - 6, size + 12, size + 12, 'rgba(12,14,20,0.78)');
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, size, size);
  ctx.clip();
  // Ground, water, roads.
  ctx.fillStyle = '#2e6b4f';
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = '#1d6f8e';
  ctx.fillRect(x + G.world.water.x * scale, y + G.world.water.y * scale, G.world.water.w * scale, G.world.water.h * scale);
  ctx.strokeStyle = '#565b66';
  ctx.lineWidth = 3;
  for (const c of G.world.lines) {
    ctx.beginPath();
    ctx.moveTo(x + c * scale, y);
    ctx.lineTo(x + c * scale, y + size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y + c * scale);
    ctx.lineTo(x + size, y + c * scale);
    ctx.stroke();
  }
  // Mission target: pulsing yellow diamond.
  if (G.mission && !G.mission.done) {
    const pulse = 4 + Math.sin(G.time * 5) * 1.5;
    ctx.fillStyle = '#ffe14d';
    ctx.save();
    ctx.translate(x + G.mission.target.x * scale, y + G.mission.target.y * scale);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-pulse, -pulse, pulse * 2, pulse * 2);
    ctx.restore();
  }
  // Police: red/blue dots. Player: white dot with ring.
  for (const cop of G.police) {
    ctx.fillStyle = Math.floor(G.time * 6) % 2 === 0 ? '#ff2a2a' : '#2a6bff';
    ctx.beginPath();
    ctx.arc(x + cop.x * scale, y + cop.y * scale, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x + G.player.x * scale, y + G.player.y * scale, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x + G.player.x * scale, y + G.player.y * scale, 5.5, 0, Math.PI * 2);
  ctx.stroke();
  // District label.
  const d = G.worldDistrict;
  if (d) text(ctx, d.toUpperCase(), x + size / 2, y + size + 24, 11, '#ffffff', 'center', true);
  ctx.restore();
}

function screenPanel(ctx, view, title, lines, prompt, accent) {
  const W = view.w;
  const H = view.h;
  ctx.fillStyle = 'rgba(8,10,16,0.62)';
  ctx.fillRect(0, 0, W, H);
  const pw = 640;
  const ph = 120 + lines.length * 30 + 70;
  const x = (W - pw) / 2;
  const y = (H - ph) / 2;
  panel(ctx, x, y, pw, ph, 'rgba(12,14,20,0.92)');
  ctx.strokeStyle = accent || '#ff5ad1';
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, pw, ph);
  text(ctx, title, W / 2, y + 64, 44, accent || '#ff5ad1', 'center', true);
  lines.forEach((line, i) => {
    text(ctx, line, W / 2, y + 108 + i * 30, 16, '#e8eaf0', 'center');
  });
  if (prompt) text(ctx, prompt, W / 2, y + ph - 28, 17, '#ffe14d', 'center', true);
}

export function drawTitle(ctx, G, view, save) {
  const lines = [
    'A neon palm-city. One driver-for-hire. Four jobs from fixer Carmen Sol.',
    'Steal cars, outrun the Solmar Bay police, and pull off The Bay Job.',
    '',
    'WASD / arrows — move & drive      E — enter / exit car      F — punch',
    'Mouse aim, click — shoot      P — pause      M — mute      H — help',
    '',
    save ? `Save found: $${save.cash.toLocaleString('en-US')} banked, mission ${Math.min(save.missionIndex + 1, 4)} of 4 — press Enter to continue` : 'No save yet — press Enter to start a new story',
  ];
  screenPanel(ctx, view, 'SOLMAR BAY', lines, 'Press Enter or click to play', '#ff5ad1');
}

export function drawPaused(ctx, view) {
  screenPanel(ctx, view, 'PAUSED', ['Solmar Bay waits for no one. Well — right now it does.', 'Your progress is saved.'], 'Press P to resume', '#37e6ff');
}

export function drawBusted(ctx, view) {
  screenPanel(ctx, view, 'BUSTED', ['The SBPD caught up with Milo Vega.', 'You lose 10% of your cash. The heat is off — for now.'], 'Press Enter to get back out there', '#ffb02a');
}

export function drawWasted(ctx, view) {
  screenPanel(ctx, view, 'WASTED', ['Milo Vega got in over his head on the streets of Solmar Bay.', 'You lose half your cash. Carmen Sol is not impressed.'], 'Press Enter to try again', '#e84a4a');
}

export function drawWin(ctx, G, view) {
  const lines = [
    'The Bay Job is done. Milo Vega drives off into the Solmar Bay sunset,',
    'a legend of the Neon Mile — and Carmen Sol already has the next job lined up.',
    '',
    `Final take: $${G.player.cash.toLocaleString('en-US')}`,
    'Thanks for playing Solmar Bay.',
  ];
  screenPanel(ctx, view, 'LEGEND OF THE BAY', lines, 'Press Enter to keep cruising Solmar Bay', '#7dff5a');
}

export function drawHelp(ctx, view) {
  const lines = [
    'WASD / arrows — walk, or drive when in a car (W accelerate, S brake/reverse)',
    'E — steal / enter the nearest car, or step out of it',
    'F — punch      Mouse — aim      Click — shoot your pistol',
    'Stealing cars, hitting people and shooting cops raises your wanted level.',
    'Lose the cops: break line of sight and wait for the stars to fade.',
    'On foot, a cop standing on you fills the BUSTED meter. In a car, rams hurt.',
    'Finish all four missions for Carmen Sol to beat the game. Progress auto-saves.',
  ];
  screenPanel(ctx, view, 'HOW TO PLAY', lines, 'Press H to close', '#37e6ff');
}
