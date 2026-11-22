// Screenshot staging: each named shot drives the real game forward with
// the real rules — guards patrol, suspicion fills, seals are pocketed by
// walking over them — then the frame is painted twice and
// window.__shotReady is set. Nothing is composited or edited afterwards.
import { STEP } from './config.js';
import { SCREEN_CAUGHT, SCREEN_PLAY, SCREEN_WIN, beginLevel, resumeAfterCaught, startRun, updateGame } from './game.js';

/** Steer the player toward a point for up to `seconds`, in fixed steps. */
function steerToward(game, target, seconds, run = false) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const dx = target.x - game.player.x;
    const dy = target.y - game.player.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 6) break;
    updateGame(game, STEP, { x: dx / distance, y: dy / distance }, run, false);
    if (game.screen !== SCREEN_PLAY) break;
  }
}

function idle(game, seconds) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (game.screen === SCREEN_CAUGHT) resumeAfterCaught(game);
    updateGame(game, STEP, { x: 0, y: 0 }, false, false);
  }
}

/** Crouch in place for `seconds`, slipping back to the doorway if caught. */
function crouchIdle(game, seconds) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (game.screen === SCREEN_CAUGHT) resumeAfterCaught(game);
    updateGame(game, STEP, { x: 0, y: 0 }, false, true);
  }
}

/**
 * Steer toward a target patiently: flee from a chasing guard, wait out
 * suspicion crouched, and only then carry on. Returns false if caught.
 */
function patientSteer(game, target, maxSeconds) {
  const steps = Math.floor(maxSeconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (game.screen !== SCREEN_PLAY) return false;
    const chaser = game.guards.find((guard) => guard.state === 'chase');
    if (chaser) {
      const dx = game.player.x - chaser.x;
      const dy = game.player.y - chaser.y;
      const distance = Math.hypot(dx, dy) || 1;
      updateGame(game, STEP, { x: dx / distance, y: dy / distance }, true, false);
      continue;
    }
    if (game.alarm > 0.55) {
      // Slip away low and slow instead of freezing in the open.
      let nearestGuard = null;
      let nearestDistance = Infinity;
      for (const guard of game.guards) {
        const d = Math.hypot(guard.x - game.player.x, guard.y - game.player.y);
        if (d < nearestDistance) {
          nearestDistance = d;
          nearestGuard = guard;
        }
      }
      if (nearestGuard) {
        const dx = game.player.x - nearestGuard.x;
        const dy = game.player.y - nearestGuard.y;
        const distance = Math.hypot(dx, dy) || 1;
        updateGame(game, STEP, { x: dx / distance, y: dy / distance }, false, true);
      } else {
        updateGame(game, STEP, { x: 0, y: 0 }, false, true);
      }
      continue;
    }
    const dx = target.x - game.player.x;
    const dy = target.y - game.player.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 8) return true;
    updateGame(game, STEP, { x: dx / distance, y: dy / distance }, game.alarm < 0.2, false);
  }
  return Math.hypot(target.x - game.player.x, target.y - game.player.y) < 12;
}

/** Crouch behind the nearest low crate, then wait while guards patrol. */
function stageCover(game) {
  startRun(game);
  steerToward(game, { x: 320, y: 610 }, 3);
  const steps = Math.floor(4 / STEP);
  for (let i = 0; i < steps; i += 1) {
    updateGame(game, STEP, { x: 0, y: 0 }, false, true);
    if (game.screen !== SCREEN_PLAY) resumeAfterCaught(game);
  }
  game.mouseAim = { x: 980, y: 200 };
  return game.screen;
}

/** Walk into a warden's cone until the chase begins, then flee a few steps. */
function stageAlert(game) {
  startRun(game);
  const guard = game.guards[0];
  const steps = Math.floor(14 / STEP);
  let chased = false;
  for (let i = 0; i < steps; i += 1) {
    if (guard.state === 'chase') {
      chased = true;
      break;
    }
    // Step into the ground the guard is looking at, ahead of its lantern.
    const spot = {
      x: guard.x + Math.cos(guard.facing) * 75,
      y: guard.y + Math.sin(guard.facing) * 75,
    };
    const dx = spot.x - game.player.x;
    const dy = spot.y - game.player.y;
    const distance = Math.hypot(dx, dy);
    const move = distance > 6 ? { x: dx / distance, y: dy / distance } : { x: 0, y: 0 };
    updateGame(game, STEP, move, false, false);
    if (game.screen !== SCREEN_PLAY) resumeAfterCaught(game);
  }
  if (chased) {
    // Flee: the frame catches the chase mid-stride, before the catch.
    const fleeSteps = Math.floor(0.35 / STEP);
    for (let i = 0; i < fleeSteps; i += 1) {
      const dx = game.player.x - guard.x;
      const dy = game.player.y - guard.y;
      const distance = Math.hypot(dx, dy) || 1;
      updateGame(game, STEP, { x: dx / distance, y: dy / distance }, true, false);
      if (game.screen !== SCREEN_PLAY) break;
    }
  }
  game.mouseAim = null;
  return game.screen;
}

/** Night 2: Wren waits low at the doorway while the stacks' patrols sweep past. */
function stageStacks(game) {
  startRun(game);
  beginLevel(game, 1);
  game.screen = SCREEN_PLAY;
  crouchIdle(game, 5);
  game.mouseAim = { x: 900, y: 330 };
  return game.screen;
}

/** The final night escaped: every chart pocketed, the exit reached. */
function stageWin(game) {
  startRun(game);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    beginLevel(game, 2);
    game.screen = SCREEN_PLAY;
    game.lives = 3;
    let clean = true;
    // Nearest chart first: the tour adapts to where Wren stands.
    while (game.sealsGot < game.seals.length) {
      let nearest = null;
      let nearestDistance = Infinity;
      for (const seal of game.seals) {
        if (seal.got) continue;
        const d = Math.hypot(seal.x - game.player.x, seal.y - game.player.y);
        if (d < nearestDistance) {
          nearestDistance = d;
          nearest = seal;
        }
      }
      if (!nearest || !patientSteer(game, { x: nearest.x, y: nearest.y }, 20)) {
        clean = false;
        break;
      }
    }
    if (clean && game.exitOpen) {
      const exit = game.level.exit;
      patientSteer(game, { x: exit.x + exit.w / 2, y: exit.y + exit.h / 2 }, 20);
    }
    if (game.screen === SCREEN_WIN) return game.screen;
    if (game.screen === SCREEN_CAUGHT) resumeAfterCaught(game);
  }
  // No clean run: show the night mid-play rather than a false win.
  beginLevel(game, 2);
  game.screen = SCREEN_PLAY;
  game.lives = 3;
  patientSteer(game, { x: 640, y: 640 }, 6);
  idle(game, 2);
  return game.screen;
}

/**
 * Set the game to the named shot scene and return the screen to draw.
 * Unknown names stage the cover scene.
 */
export function stageShot(name, game) {
  if (name === 'alert') return stageAlert(game);
  if (name === 'stacks') return stageStacks(game);
  if (name === 'win') return stageWin(game);
  return stageCover(game);
}
