// Wren, the night archivist: walking, running, crouching and pebble throws.
// Movement slides along walls (x then y), so hugging a shelf never snags.
import { PLAYER } from './config.js';
import { collidesWithSolids } from './level.js';

/** Fresh player state at the level's start point. */
export function createPlayer(start) {
  return {
    x: start.x,
    y: start.y,
    facing: -Math.PI / 2,
    crouched: false,
    running: false,
    moving: false,
    stepPhase: 0,
    /** Seconds since the last footstep sound (for the caller's audio). */
    stepTimer: 0,
    /** Ring pulse shown while running, 0 when quiet. */
    noisePulse: 0,
  };
}

/**
 * Move the player from a normalised input vector. Returns 'step' when a
 * footstep falls due, so the caller can play it and warn nearby guards.
 */
export function updatePlayer(player, dt, moveX, moveY, run, crouch, level) {
  player.crouched = crouch;
  player.running = run && !crouch && (moveX !== 0 || moveY !== 0);
  const speed = player.crouched
    ? PLAYER.crouchSpeed
    : player.running
      ? PLAYER.runSpeed
      : PLAYER.walkSpeed;
  const magnitude = Math.hypot(moveX, moveY);
  player.moving = magnitude > 0;
  if (player.moving) {
    const nx = moveX / magnitude;
    const ny = moveY / magnitude;
    player.facing = Math.atan2(ny, nx);
    const stepX = nx * speed * dt;
    const stepY = ny * speed * dt;
    if (!collidesWithSolids(player.x + stepX, player.y, PLAYER.radius, level)) {
      player.x += stepX;
    }
    if (!collidesWithSolids(player.x, player.y + stepY, PLAYER.radius, level)) {
      player.y += stepY;
    }
  }
  if (player.moving) {
    player.stepPhase += speed * dt;
    player.stepTimer += dt;
    const stride = player.crouched ? 30 : player.running ? 52 : 38;
    if (player.stepPhase >= stride) {
      player.stepPhase = 0;
      player.noisePulse = 1;
      return 'step';
    }
  }
  player.noisePulse = Math.max(0, player.noisePulse - dt * 3);
  return null;
}

/** A thrown pebble arcing to a point, then ringing to attract guards. */
export function createPebble(fromX, fromY, toX, toY) {
  return {
    fromX,
    fromY,
    x: fromX,
    y: fromY,
    toX,
    toY,
    flight: 0,
    landed: false,
    ring: 0,
    /** Seconds the ring keeps attracting guards after landing. */
    attractLeft: 2.5,
  };
}

/** Advance a pebble; returns true on the frame it lands. */
export function updatePebble(pebble, dt) {
  if (!pebble.landed) {
    pebble.flight = Math.min(1, pebble.flight + dt / 0.35);
    const t = pebble.flight;
    pebble.x = pebble.fromX + (pebble.toX - pebble.fromX) * t;
    pebble.y = pebble.fromY + (pebble.toY - pebble.fromY) * t;
    if (t >= 1) {
      pebble.landed = true;
      pebble.ring = 1;
      return true;
    }
  } else {
    pebble.ring = Math.max(0, pebble.ring - dt * 1.4);
    pebble.attractLeft -= dt;
  }
  return false;
}
