// The three nights of the Moonmoth Archive: walls, cover, shadow patches,
// seals, exits and guard patrols. Tall shelves block movement and sight.
// Low crates block movement, and block sight only while Wren crouches
// behind them. Shadow patches slow detection. Every coordinate is in the
// 1280x720 logical playfield.
import { BORDER, FIELD } from './config.js';

/** True when point (x, y) lies inside rectangle r. */
export function pointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

/** True when circle (x, y, radius) overlaps rectangle r. */
export function circleHitsRect(x, y, radius, r) {
  const nearestX = Math.max(r.x, Math.min(x, r.x + r.w));
  const nearestY = Math.max(r.y, Math.min(y, r.y + r.h));
  const dx = x - nearestX;
  const dy = y - nearestY;
  return dx * dx + dy * dy < radius * radius;
}

/** True when segment (x1,y1)-(x2,y2) touches rectangle r. */
export function segmentHitsRect(x1, y1, x2, y2, r) {
  if (pointInRect(x1, y1, r) || pointInRect(x2, y2, r)) return true;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const edges = [
    [r.x, r.y, r.x + r.w, r.y],
    [r.x + r.w, r.y, r.x + r.w, r.y + r.h],
    [r.x + r.w, r.y + r.h, r.x, r.y + r.h],
    [r.x, r.y + r.h, r.x, r.y],
  ];
  for (const [ax, ay, bx, by] of edges) {
    const ex = bx - ax;
    const ey = by - ay;
    const denom = dx * ey - dy * ex;
    if (denom === 0) continue;
    const t = ((ax - x1) * ey - (ay - y1) * ex) / denom;
    const u = ((ax - x1) * dy - (ay - y1) * dx) / denom;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return true;
  }
  return false;
}

/**
 * True when a straight line of sight between two points is blocked by any
 * tall shelf. Low crates block it only when `crouched` is true.
 */
export function sightBlocked(x1, y1, x2, y2, level, crouched) {
  for (const wall of level.walls) {
    if (segmentHitsRect(x1, y1, x2, y2, wall)) return true;
  }
  if (crouched) {
    for (const crate of level.lowCover) {
      if (segmentHitsRect(x1, y1, x2, y2, crate)) return true;
    }
  }
  return false;
}

/** True when a circle at (x, y) with `radius` would collide with a solid. */
export function collidesWithSolids(x, y, radius, level) {
  if (x - radius < BORDER || x + radius > FIELD.width - BORDER) return true;
  if (y - radius < BORDER || y + radius > FIELD.height - BORDER) return true;
  for (const wall of level.walls) {
    if (circleHitsRect(x, y, radius, wall)) return true;
  }
  for (const crate of level.lowCover) {
    if (circleHitsRect(x, y, radius, crate)) return true;
  }
  return false;
}

/** True when point (x, y) lies inside any shadow patch of the level. */
export function inShadow(x, y, level) {
  return level.shadows.some((patch) => pointInRect(x, y, patch));
}

function borderWalls() {
  return [
    { x: 0, y: 0, w: FIELD.width, h: BORDER },
    { x: 0, y: FIELD.height - BORDER, w: FIELD.width, h: BORDER },
    { x: 0, y: 0, w: BORDER, h: FIELD.height },
    { x: FIELD.width - BORDER, y: 0, w: BORDER, h: FIELD.height },
  ];
}

/** A tall bookshelf. */
function shelf(x, y, w, h) {
  return { x, y, w, h };
}

/** A low crate or reading table: cover only while crouched. */
function crate(x, y, w, h) {
  return { x, y, w, h };
}

export const LEVELS = [
  {
    name: 'Night 1 — The Reading Room',
    hint: 'Slip past the wardens. Crouch (hold C) behind low crates to vanish.',
    start: { x: 92, y: 616 },
    exit: { x: 1176, y: 84, w: 64, h: 64 },
    walls: [
      ...borderWalls(),
      shelf(300, 120, 40, 320),
      shelf(560, 280, 40, 320),
      shelf(820, 120, 40, 320),
    ],
    lowCover: [
      crate(430, 640, 92, 44),
      crate(660, 560, 92, 44),
      crate(880, 600, 92, 44),
      crate(260, 600, 92, 44),
    ],
    shadows: [
      { x: 110, y: 110, w: 220, h: 160 },
      { x: 900, y: 500, w: 250, h: 140 },
      { x: 420, y: 560, w: 210, h: 110 },
    ],
    seals: [
      { x: 648, y: 118 },
      { x: 1152, y: 360 },
      { x: 182, y: 622 },
    ],
    guards: [
      {
        name: 'Warden Brisk',
        patrol: [
          { x: 200, y: 100 },
          { x: 200, y: 560 },
          { x: 480, y: 560 },
          { x: 480, y: 100 },
        ],
      },
      {
        name: 'Warden Pello',
        patrol: [
          { x: 980, y: 180 },
          { x: 980, y: 520 },
          { x: 1120, y: 520 },
          { x: 1120, y: 180 },
        ],
      },
    ],
  },
  {
    name: 'Night 2 — The Stacks',
    hint: 'Long shelves, long sightlines. Wait for a patrol to pass, then run.',
    start: { x: 520, y: 656 },
    exit: { x: 608, y: 48, w: 64, h: 64 },
    walls: [
      ...borderWalls(),
      shelf(180, 200, 360, 40),
      shelf(740, 200, 360, 40),
      shelf(180, 460, 360, 40),
      shelf(740, 460, 360, 40),
    ],
    lowCover: [
      crate(500, 380, 80, 44),
      crate(180, 330, 92, 44),
      crate(1010, 380, 92, 44),
      crate(600, 620, 80, 44),
      crate(340, 60, 92, 44),
    ],
    shadows: [
      { x: 60, y: 300, w: 170, h: 130 },
      { x: 1050, y: 300, w: 170, h: 130 },
      { x: 520, y: 560, w: 240, h: 110 },
      { x: 520, y: 90, w: 240, h: 90 },
    ],
    seals: [
      { x: 640, y: 356 },
      { x: 110, y: 640 },
      { x: 1170, y: 640 },
    ],
    guards: [
      {
        name: 'Warden Brisk',
        patrol: [
          { x: 620, y: 330 },
          { x: 620, y: 140 },
          { x: 1140, y: 140 },
          { x: 1140, y: 330 },
        ],
      },
      {
        name: 'Warden Pello',
        patrol: [
          { x: 300, y: 580 },
          { x: 980, y: 580 },
        ],
      },
      {
        name: 'Warden Sable',
        patrol: [
          { x: 640, y: 90 },
          { x: 640, y: 580 },
          { x: 1120, y: 580 },
          { x: 1120, y: 90 },
        ],
      },
    ],
  },
  {
    name: 'Night 3 — The Vault Wing',
    hint: 'Four wardens, one vault. Toss a pebble (click) to pull a guard away.',
    start: { x: 92, y: 92 },
    exit: { x: 1176, y: 596, w: 64, h: 64 },
    walls: [
      ...borderWalls(),
      shelf(240, 180, 40, 360),
      shelf(620, 180, 40, 360),
      shelf(1000, 180, 40, 360),
    ],
    lowCover: [
      crate(330, 150, 92, 44),
      crate(720, 150, 92, 44),
      crate(1100, 520, 92, 44),
      crate(140, 520, 92, 44),
      crate(700, 480, 92, 44),
      crate(480, 520, 92, 44),
    ],
    shadows: [
      { x: 60, y: 560, w: 210, h: 120 },
      { x: 880, y: 60, w: 230, h: 120 },
      { x: 300, y: 420, w: 190, h: 110 },
      { x: 700, y: 220, w: 180, h: 110 },
    ],
    seals: [
      { x: 1180, y: 110 },
      { x: 110, y: 640 },
      { x: 640, y: 640 },
    ],
    guards: [
      {
        name: 'Warden Brisk',
        patrol: [
          { x: 140, y: 620 },
          { x: 1140, y: 620 },
          { x: 1140, y: 580 },
          { x: 140, y: 580 },
        ],
      },
      {
        name: 'Warden Pello',
        patrol: [
          { x: 140, y: 100 },
          { x: 1140, y: 100 },
          { x: 1140, y: 140 },
          { x: 140, y: 140 },
        ],
      },
      {
        name: 'Warden Sable',
        patrol: [
          { x: 820, y: 220 },
          { x: 820, y: 500 },
          { x: 900, y: 500 },
          { x: 900, y: 220 },
        ],
      },
      {
        name: 'Warden Moth',
        patrol: [
          { x: 420, y: 220 },
          { x: 420, y: 500 },
          { x: 560, y: 500 },
          { x: 560, y: 220 },
        ],
      },
    ],
  },
];
