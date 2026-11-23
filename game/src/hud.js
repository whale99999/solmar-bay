// Solmar Bay — the HUD: health bar, cash, wanted stars, mission objective, ammo,
// district name, banners, and a live minimap (top right) with player, police,
// traffic and the mission marker.
import { WORLD, PALETTE, FONT, ROADS_X, ROADS_Y, districtAt } from './config.js';
import { missionState } from './missions.js';

export function drawHUD(ctx, G, view) {
  const p = G.player, w = view.w, h = view.h;
  const ms = missionState(G);
  ctx.save();
  ctx.font = `600 15px ${FONT}`; ctx.textBaseline = 'top';
  // Top-left status panel.
  ctx.fillStyle = PALETTE.panel; roundRect(ctx, 12, 12, 250, 108, 10); ctx.fill();
  ctx.fillStyle = PALETTE.text; ctx.fillText('MILO VEGA', 24, 20);
  ctx.fillStyle = '#3a4152'; roundRect(ctx, 24, 44, 150, 12, 6); ctx.fill();
  ctx.fillStyle = p.hp > 30 ? '#57d977' : '#ff4d4d'; roundRect(ctx, 24, 44, 150 * Math.max(0, p.hp) / 100, 12, 6); ctx.fill();
  ctx.fillStyle = PALETTE.text; ctx.fillText(`$${p.cash}`, 184, 42);
  // Wanted stars.
  for (let i = 0; i < 5; i += 1) {
    ctx.fillStyle = i < G.wanted ? '#ffd23f' : 'rgba(255,255,255,0.22)';
    star(ctx, 30 + i * 26, 78, i < G.wanted ? 11 : 9);
  }
  ctx.fillStyle = PALETTE.muted; ctx.font = `12px ${FONT}`;
  ctx.fillText(p.onFoot ? `On foot · ammo ${p.ammo}` : 'Driving · E to exit', 24, 100);
  // Mission objective, top centre.
  ctx.font = `600 15px ${FONT}`;
  const obj = ms.done ? '★ All jobs done — free roam' : `${ms.title}: ${ms.text}`;
  const ow = ctx.measureText(obj).width + 28;
  ctx.fillStyle = PALETTE.panel; roundRect(ctx, (w - ow) / 2, 12, ow, 34, 10); ctx.fill();
  ctx.fillStyle = '#ffd23f'; ctx.fillText(obj, (w - ow) / 2 + 14, 20);
  // District label + controls hint, bottom left.
  ctx.font = `13px ${FONT}`; ctx.fillStyle = PALETTE.muted;
  ctx.fillText(`${districtAt(p.x, p.y).name} · Solmar Bay`, 14, h - 44);
  ctx.fillText('WASD move/drive · E enter car · Click shoot · F punch · P pause · M mute', 14, h - 24);
  // Banner.
  if (G.bannerTimer > 0 && G.banner) {
    ctx.font = `700 20px ${FONT}`;
    const bw = ctx.measureText(G.banner).width + 32;
    ctx.fillStyle = 'rgba(12,16,28,0.88)'; roundRect(ctx, (w - bw) / 2, 58, bw, 38, 10); ctx.fill();
    ctx.fillStyle = '#ffd23f'; ctx.fillText(G.banner, (w - bw) / 2 + 16, 68);
  }
  drawMinimap(ctx, G, w, h);
  ctx.restore();
}

function drawMinimap(ctx, G, w, h) {
  const mw = 190, mh = 142, mx = w - mw - 12, my = 12;
  const sx = mw / WORLD.width, sy = mh / WORLD.height;
  ctx.save();
  ctx.fillStyle = 'rgba(12,16,28,0.85)'; roundRect(ctx, mx - 4, my - 4, mw + 8, mh + 8, 8); ctx.fill();
  ctx.fillStyle = '#22405c'; ctx.fillRect(mx, my, mw, mh);
  ctx.fillStyle = '#33363f';
  for (const rx of ROADS_X) ctx.fillRect(mx + rx * sx - 2, my, 4, mh);
  for (const ry of ROADS_Y) ctx.fillRect(mx, my + ry * sy, mw, 4);
  const ms = missionState(G);
  if (!ms.done) { ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(mx + ms.x * sx, my + ms.y * sy, 5, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#9fb4c8';
  for (const c of G.cars) ctx.fillRect(mx + c.x * sx - 1, my + c.y * sy - 1, 3, 3);
  ctx.fillStyle = '#ff4d4d';
  for (const cop of G.police) { ctx.beginPath(); ctx.arc(mx + cop.x * sx, my + cop.y * sy, 3, 0, Math.PI * 2); ctx.fill(); }
  const p = G.player;
  ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(mx + p.x * sx, my + p.y * sy, 4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(mx + p.x * sx, my + p.y * sy, 6, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
export function star(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 === 0 ? r : r * 0.45;
    const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath(); ctx.fill();
}
