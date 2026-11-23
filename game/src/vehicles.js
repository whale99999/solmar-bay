// Solmar Bay — cars: parked cars to steal, traffic cruising the road grid.
// Traffic follows road centre lines and turns at intersections; the driven car
// is simulated by player.js, everything else here.
import { CFG, clamp, mulberry32, pick } from './config.js';
import { nearestRoadCentre } from './world.js';

const CAR_COLORS = ['#e84a4a', '#4a90e8', '#f2c94c', '#e8e8e8', '#3aa655', '#8a5fd0', '#e87f3a', '#2f2f38'];

export function makeCar(x, y, angle, color, police) {
  return {
    x, y, angle, speed: 0, color,
    police: !!police,
    driven: false,
    owned: false, // true once the player has stolen it
    parked: false,
    health: police ? 3 : 1,
    // Traffic state: which road axis it follows and which way.
    axis: Math.abs(Math.cos(angle)) > 0.5 ? 'x' : 'y',
    dir: Math.cos(angle) >= 0 || Math.sin(angle) >= 0 ? 1 : -1,
    lane: 0,
    turnAt: null,
    flash: 0,
  };
}

export function spawnTraffic(G, count) {
  const rng = G.rng;
  const lines = G.world.lines;
  for (let i = 0; i < count; i += 1) {
    const vertical = rng() < 0.5;
    const road = pick(rng, lines);
    const along = 200 + rng() * (CFG.WORLD - 400);
    const lane = (rng() < 0.5 ? -1 : 1) * 17;
    const dir = rng() < 0.5 ? -1 : 1;
    let x;
    let y;
    let angle;
    if (vertical) {
      x = road + lane;
      y = along;
      angle = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      x = along;
      y = road + lane;
      angle = dir > 0 ? 0 : Math.PI;
    }
    const car = makeCar(x, y, angle, pick(rng, CAR_COLORS), false);
    car.axis = vertical ? 'y' : 'x';
    car.dir = dir;
    car.lane = lane;
    car.speed = 70 + rng() * 55;
    G.cars.push(car);
  }
}

export function spawnParked(G, count) {
  const rng = G.rng;
  const lines = G.world.lines;
  let placed = 0;
  let guard = 0;
  while (placed < count && guard < count * 40) {
    guard += 1;
    const vertical = rng() < 0.5;
    const road = pick(rng, lines);
    const along = 260 + rng() * (CFG.WORLD - 520);
    const side = (rng() < 0.5 ? -1 : 1) * (CFG.ROAD_W / 2 + 12);
    let x;
    let y;
    let angle;
    if (vertical) {
      x = road + side;
      y = along;
      angle = rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      x = along;
      y = road + side;
      angle = rng() < 0.5 ? 0 : Math.PI;
    }
    if (G.world.hitsBuilding(x, y, 24) || G.world.inWater(x, y)) continue;
    const car = makeCar(x, y, angle, pick(rng, CAR_COLORS), false);
    car.parked = true;
    G.cars.push(car);
    placed += 1;
  }
}

function nearIntersection(car) {
  const lines = G_LINES;
  for (const c of lines) {
    const d = car.axis === 'x' ? Math.abs(car.y - c) : Math.abs(car.x - c);
    if (d < 26) return c;
  }
  return null;
}
let G_LINES = [];

// One traffic step: cruise the lane, maybe turn at an intersection, stop for
// the car ahead, and never leave the road grid.
export function updateTraffic(G, dt) {
  G_LINES = G.world.lines;
  for (const car of G.cars) {
    if (car.driven || car.parked || car.police) continue;
    // Keep a gap to the car ahead on the same lane (traffic, or the player).
    let blocked = false;
    const aheadCars = G.player.inCar && G.player.car ? [...G.cars, G.player.car] : G.cars;
    for (const other of aheadCars) {
      if (other === car || other.parked) continue;
      const dx = other.x - car.x;
      const dy = other.y - car.y;
      const ahead = car.axis === 'x' ? dx * car.dir : dy * car.dir;
      const lateral = car.axis === 'x' ? Math.abs(dy) : Math.abs(dx);
      if (ahead > 0 && ahead < 64 && lateral < 26) { blocked = true; break; }
    }
    const target = blocked ? 0 : 70 + (car.cruise || 40);
    car.speed += clamp(target - car.speed, -260 * dt, 160 * dt);
    const cross = nearIntersection(car);
    if (cross !== null && car.turnAt !== cross && G.rng() < 0.012) {
      // Turn onto the crossing road.
      car.turnAt = cross;
      const turnLeft = G.rng() < 0.5;
      const sign = car.axis === 'x' ? (car.dir > 0 ? 1 : -1) : (car.dir > 0 ? -1 : 1);
      const delta = turnLeft ? -Math.PI / 2 : Math.PI / 2;
      car.angle += delta * sign;
      car.axis = car.axis === 'x' ? 'y' : 'x';
      car.dir = Math.abs(Math.cos(car.angle)) > 0.5 ? (Math.cos(car.angle) > 0 ? 1 : -1) : (Math.sin(car.angle) > 0 ? 1 : -1);
      if (car.axis === 'x') car.y = cross + car.lane;
      else car.x = cross + car.lane;
    }
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    // Wrap around the far edge so traffic never runs dry.
    if (car.x < 120) car.x = CFG.WORLD - 140;
    if (car.x > CFG.WORLD - 120) car.x = 140;
    if (car.y < 120) car.y = CFG.WORLD - 140;
    if (car.y > CFG.WORLD - 120) car.y = 140;
    // Snap back onto the lane after a turn.
    if (car.axis === 'x') car.y += (nearestRoadCentre(car.y) + car.lane - car.y) * 0.08;
    else car.x += (nearestRoadCentre(car.x) + car.lane - car.x) * 0.08;
  }
}

// Draw one car, top-down: body, roof, windshield, headlights, wheels.
export function drawCar(ctx, car, time) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  const L = CFG.CAR_L;
  const W = CFG.CAR_W;
  // Wheels.
  ctx.fillStyle = '#14141a';
  ctx.fillRect(-L / 2 + 4, -W / 2 - 3, 10, 5);
  ctx.fillRect(-L / 2 + 4, W / 2 - 2, 10, 5);
  ctx.fillRect(L / 2 - 14, -W / 2 - 3, 10, 5);
  ctx.fillRect(L / 2 - 14, W / 2 - 2, 10, 5);
  // Body.
  ctx.fillStyle = car.color;
  ctx.beginPath();
  ctx.roundRect(-L / 2, -W / 2, L, W, 7);
  ctx.fill();
  // Roof + windshield.
  ctx.fillStyle = 'rgba(20,24,32,0.85)';
  ctx.beginPath();
  ctx.roundRect(-6, -W / 2 + 4, 16, W - 8, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(180,220,255,0.55)';
  ctx.fillRect(L / 2 - 16, -W / 2 + 4, 5, W - 8);
  // Headlights.
  ctx.fillStyle = '#fff6c9';
  ctx.fillRect(L / 2 - 2, -W / 2 + 3, 3, 5);
  ctx.fillRect(L / 2 - 2, W / 2 - 8, 3, 5);
  if (car.police) {
    // Flashing light bar.
    const on = Math.floor(time * 6) % 2 === 0;
    ctx.fillStyle = on ? '#ff2a2a' : '#2a6bff';
    ctx.fillRect(-4, -W / 2 + 2, 8, 6);
    ctx.fillStyle = on ? '#2a6bff' : '#ff2a2a';
    ctx.fillRect(-4, W / 2 - 8, 8, 6);
    ctx.fillStyle = '#e8e8e8';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SBPD', 0, 4);
  }
  ctx.restore();
  void mulberry32;
}
