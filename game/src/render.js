// Solmar Bay — the camera and the painter: ground, roads, water, buildings,
// palms, cars, people, bullets, particles, mission markers. Sunset palette.
import { CFG, clamp, lerp } from './config.js';
import { districtAt } from './world.js';
import { drawCar } from './vehicles.js';
import { drawPed } from './pedestrians.js';

export function createCamera() {
  return { x: 0, y: 0, scale: 1 };
}

export function updateCamera(G, view) {
  const cam = G.cam;
  cam.scale = Math.max(view.w / 1100, view.h / 800);
  const tx = clamp(G.player.x - view.w / (2 * cam.scale), 0, CFG.WORLD - view.w / cam.scale);
  const ty = clamp(G.player.y - view.h / (2 * cam.scale), 0, CFG.WORLD - view.h / cam.scale);
  cam.x = lerp(cam.x, tx, 0.12);
  cam.y = lerp(cam.y, ty, 0.12);
}

export function updateParticles(G, dt) {
  for (let i = G.particles.length - 1; i >= 0; i -= 1) {
    const pt = G.particles[i];
    pt.t += dt;
    if (pt.t >= pt.life) G.particles.splice(i, 1);
  }
}

function drawGround(ctx, G, cam, view) {
  const W = CFG.WORLD;
  const left = Math.max(0, Math.floor(cam.x / 400) * 400);
  const top = Math.max(0, Math.floor(cam.y / 400) * 400);
  const right = Math.min(W, cam.x + view.w / cam.scale + 400);
  const bottom = Math.min(W, cam.y + view.h / cam.scale + 400);
  // Checkerboard grass so the ground reads at a glance.
  for (let x = left; x < right; x += 400) {
    for (let y = top; y < bottom; y += 400) {
      const even = ((x / 400) + (y / 400)) % 2 === 0;
      ctx.fillStyle = even ? CFG.COLORS.ground : CFG.COLORS.groundAlt;
      ctx.fillRect(x, y, 400, 400);
    }
  }
  // Parks.
  for (const park of G.world.parks) {
    ctx.fillStyle = CFG.COLORS.park;
    ctx.fillRect(park.x, park.y, park.w, park.h);
  }
  // Waterfront + sand.
  const w = G.world.water;
  ctx.fillStyle = CFG.COLORS.sand;
  ctx.fillRect(w.x - 46, w.y, 46, w.h);
  ctx.fillRect(w.x, w.y - 46, w.w, 46);
  ctx.fillStyle = CFG.COLORS.water;
  ctx.fillRect(w.x, w.y, w.w, w.h);
  // Docks piers.
  ctx.fillStyle = '#8a6f4d';
  ctx.fillRect(w.x - 10, w.y + 60, 130, 14);
  ctx.fillRect(w.x - 10, w.y + 190, 130, 14);
  // Sidewalks + roads.
  const half = CFG.ROAD_W / 2;
  for (const c of G.world.lines) {
    ctx.fillStyle = CFG.COLORS.sidewalk;
    ctx.fillRect(c - half - 14, 0, CFG.ROAD_W + 28, W);
    ctx.fillRect(0, c - half - 14, W, CFG.ROAD_W + 28);
    ctx.fillStyle = CFG.COLORS.road;
    ctx.fillRect(c - half, 0, CFG.ROAD_W, W);
    ctx.fillRect(0, c - half, W, CFG.ROAD_W);
    // Centre dashes.
    ctx.fillStyle = CFG.COLORS.roadLine;
    for (let v = 0; v < W; v += 80) {
      ctx.fillRect(c - 2, v, 4, 34);
      ctx.fillRect(v, c - 2, 34, 4);
    }
  }
  // Crosswalks at intersections.
  ctx.fillStyle = 'rgba(232,232,232,0.75)';
  for (const cx of G.world.lines) {
    for (const cy of G.world.lines) {
      for (let i = -2; i <= 2; i += 1) {
        ctx.fillRect(cx - half - 12 + i * 12, cy - half - 8, 7, 16);
        ctx.fillRect(cx - half - 8, cy - half - 12 + i * 12, 16, 7);
      }
    }
  }
}

function drawBuildings(ctx, G) {
  for (const b of G.world.buildings) {
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(b.x + 7, b.y + 9, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(b.x, b.y, b.w, 12);
    // Windows.
    ctx.fillStyle = 'rgba(20,24,32,0.5)';
    for (let wx = b.x + 16; wx < b.x + b.w - 14; wx += 30) {
      for (let wy = b.y + 26; wy < b.y + b.h - 14; wy += 30) {
        ctx.fillRect(wx, wy, 14, 10);
      }
    }
    if (b.neon) {
      ctx.strokeStyle = b.neon;
      ctx.lineWidth = 3;
      ctx.strokeRect(b.x + 3, b.y + 3, b.w - 6, b.h - 6);
    }
  }
}

function drawPalms(ctx, G) {
  for (const palm of G.world.palms) {
    ctx.strokeStyle = '#6b4a2f';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(palm.x, palm.y + 6);
    ctx.lineTo(palm.x, palm.y - 8);
    ctx.stroke();
    ctx.fillStyle = '#2f9e57';
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(palm.x + Math.cos(a) * 9, palm.y - 9 + Math.sin(a) * 6, 10, 4, a, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawPlayer(ctx, G) {
  const p = G.player;
  if (p.inCar) return; // the driven car is drawn with the cars
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.invuln > 0 && Math.floor(G.time * 12) % 2 === 0) {
    ctx.globalAlpha = 0.35; // blink while invulnerable
  }
  const bob = p.moving ? Math.sin(p.walkPhase) * 2 : 0;
  ctx.rotate(p.angle);
  // Shadow, legs, body, head, pistol.
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 3, 13, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#22242e';
  ctx.beginPath();
  ctx.arc(-5, -5 + bob, 3.5, 0, Math.PI * 2);
  ctx.arc(-5, 5 - bob, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffcf3a'; // Milo's yellow jacket
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f2c89b';
  ctx.beginPath();
  ctx.arc(9, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#22242e';
  ctx.beginPath();
  ctx.arc(11, -2, 2.4, 0, Math.PI * 2);
  ctx.fill();
  // Pistol in hand + punch swing.
  ctx.fillStyle = '#1c1e26';
  if (p.punchTimer > 0.15) {
    ctx.beginPath();
    ctx.arc(20, 0, 6, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillRect(12, -2, 12, 4);
  }
  ctx.restore();
}

function drawMissionTarget(ctx, G) {
  if (!G.mission || G.mission.done) return;
  const t = G.mission.target;
  const pulse = 1 + Math.sin(G.time * 4) * 0.12;
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.scale(pulse, pulse);
  ctx.strokeStyle = '#ffe14d';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, 46, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffe14d';
  ctx.beginPath();
  ctx.moveTo(0, -58);
  ctx.lineTo(10, -38);
  ctx.lineTo(-10, -38);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,225,77,0.15)';
  ctx.beginPath();
  ctx.arc(0, 0, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Off-screen direction arrow at the screen edge.
  const cam = G.cam;
  const sx = (t.x - cam.x) * cam.scale;
  const sy = (t.y - cam.y) * cam.scale;
  const vw = G.view.w;
  const vh = G.view.h;
  if (sx < 0 || sx > vw || sy < 0 || sy > vh) {
    const cx = clamp(sx, 40, vw - 40);
    const cy = clamp(sy, 40, vh - 40);
    const ang = Math.atan2(sy - vh / 2, sx - vw / 2);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang);
    ctx.fillStyle = '#ffe14d';
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(-8, -10);
    ctx.lineTo(-8, 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawParticles(ctx, G) {
  for (const pt of G.particles) {
    const k = 1 - pt.t / pt.life;
    if (pt.kind === 'skid') {
      ctx.save();
      ctx.translate(pt.x, pt.y);
      ctx.rotate(pt.angle);
      ctx.fillStyle = `rgba(15,15,18,${0.5 * k})`;
      ctx.fillRect(-14, -9, 26, 4);
      ctx.fillRect(-14, 5, 26, 4);
      ctx.restore();
    } else if (pt.kind === 'spark') {
      ctx.fillStyle = `rgba(255,214,90,${k})`;
      for (let i = 0; i < 5; i += 1) {
        const a = (i / 5) * Math.PI * 2 + pt.t * 9;
        ctx.beginPath();
        ctx.arc(pt.x + Math.cos(a) * 10 * (1 - k * 0.5), pt.y + Math.sin(a) * 10 * (1 - k * 0.5), 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (pt.kind === 'muzzle') {
      ctx.fillStyle = `rgba(255,240,150,${k})`;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 9 * k + 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (pt.kind === 'boom') {
      const r = 12 + (1 - k) * 46;
      ctx.fillStyle = `rgba(255,${Math.floor(120 + 100 * k)},40,${0.85 * k})`;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(40,40,44,${0.7 * k})`;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y - r * 0.4, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// One full frame: world in camera space, then (in hud.js) the screens.
export function drawGame(ctx, G) {
  const cam = G.cam;
  const view = G.view;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // Sunset wash over everything outside the canvas is the body background.
  ctx.fillStyle = '#2e6b4f';
  ctx.fillRect(0, 0, view.w, view.h);
  ctx.setTransform(cam.scale, 0, 0, cam.scale, -cam.x * cam.scale, -cam.y * cam.scale);
  drawGround(ctx, G, cam, view);
  drawBuildings(ctx, G);
  drawPalms(ctx, G);
  drawMissionTarget(ctx, G);
  // Bullets under the cars.
  ctx.fillStyle = '#ffe14d';
  for (const b of G.bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const car of G.cars) drawCar(ctx, car, G.time);
  for (const cop of G.police) drawCar(ctx, cop, G.time);
  for (const ped of G.peds) drawPed(ctx, ped);
  drawPlayer(ctx, G);
  drawParticles(ctx, G);
  // Warm sunset tint, faint, so the city glows.
  ctx.fillStyle = 'rgba(255,150,60,0.05)';
  ctx.fillRect(cam.x, cam.y, view.w / cam.scale, view.h / cam.scale);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // District name, bottom-centre, small.
  G.worldDistrict = districtAt(G.player.x, G.player.y).name;
}
