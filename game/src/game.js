// The rules of the Moonmoth Archive: screens, seals, the exit, lives and
// scoring. Guards and the player live in their own modules; this file
// owns what happens when they meet.
import { BEST_KEY, GAME, GUARD } from './config.js';
import { createGuard, updateGuard } from './guards.js';
import { createPebble, createPlayer, updatePebble, updatePlayer } from './player.js';
import { LEVELS, pointInRect } from './level.js';
import { createAudio } from './audio.js';
import { createRandom } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_WIN = 'win';
export const SCREEN_OVER = 'over';

export const EVENT_NONE = 0;
export const EVENT_CAUGHT = 1;
export const EVENT_SEAL = 2;
export const EVENT_EXIT_OPEN = 4;

/** Build the whole game state. `audio` may be replaced by a stub in tests. */
export function createGame(seed = 1, audio = createAudio()) {
  const game = {
    random: createRandom(seed),
    audio,
    screen: SCREEN_TITLE,
    levelIndex: 0,
    level: LEVELS[0],
    player: null,
    guards: [],
    pebbles: [],
    pebblesLeft: GAME.pebbles,
    sealsGot: 0,
    seals: [],
    exitOpen: false,
    lives: GAME.lives,
    score: 0,
    caughtCount: 0,
    time: 0,
    levelTime: 0,
    message: '',
    messageLeft: 0,
    best: 0,
    /** Highest suspicion among guards, for the HUD eye. */
    alarm: 0,
    /** Running footstep sounds waiting to warn guards this frame. */
    sounds: [],
  };
  game.best = readBest();
  beginLevel(game, 0);
  return game;
}

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(game) {
  try {
    window.localStorage.setItem(BEST_KEY, String(game.best));
  } catch {
    // Private windows: the best score lasts this visit only.
  }
}

/** (Re)start a night: fresh player, guards on patrol, seals uncollected. */
export function beginLevel(game, levelIndex) {
  game.levelIndex = levelIndex;
  game.level = LEVELS[levelIndex];
  game.player = createPlayer(game.level.start);
  game.guards = game.level.guards.map((def, i) => createGuard(def, i));
  game.seals = game.level.seals.map((seal) => ({ ...seal, got: false }));
  game.pebbles = [];
  game.pebblesLeft = GAME.pebbles;
  game.sealsGot = 0;
  game.exitOpen = false;
  game.levelTime = 0;
  game.alarm = 0;
  game.sounds = [];
  game.message = game.level.hint;
  game.messageLeft = 4;
}

/** Start the run from the title screen. */
export function startRun(game) {
  game.lives = GAME.lives;
  game.score = 0;
  game.caughtCount = 0;
  game.time = 0;
  beginLevel(game, 0);
  game.screen = SCREEN_PLAY;
}

function showMessage(game, text, seconds = 3) {
  game.message = text;
  game.messageLeft = seconds;
}

/**
 * Throw a pebble toward a logical point. Returns true when one was thrown.
 */
export function throwPebble(game, x, y) {
  if (game.pebblesLeft <= 0) {
    showMessage(game, 'No pebbles left — seals restock them.', 2);
    return false;
  }
  game.pebblesLeft -= 1;
  game.pebbles.push(createPebble(game.player.x, game.player.y, x, y));
  game.audio.pebble();
  return true;
}

/** Advance the simulation by dt seconds. `move` is {x, y}; `run`/`crouch` booleans. */
export function updateGame(game, dt, move, run, crouch) {
  if (game.screen !== SCREEN_PLAY) return EVENT_NONE;
  game.time += dt;
  game.levelTime += dt;
  game.messageLeft = Math.max(0, game.messageLeft - dt);
  game.sounds = [];
  let events = EVENT_NONE;

  const stepCue = updatePlayer(game.player, dt, move.x, move.y, run, crouch, game.level);
  if (stepCue === 'step') {
    if (game.player.running) {
      game.sounds.push({ x: game.player.x, y: game.player.y, radius: 175 });
    }
    game.audio.footstep(1);
  }

  for (const pebble of game.pebbles) {
    if (updatePebble(pebble, dt) && pebble.landed) game.audio.pebbleLand();
    if (pebble.landed && pebble.attractLeft > 0) {
      game.sounds.push({ x: pebble.x, y: pebble.y, radius: 260 });
    }
  }
  game.pebbles = game.pebbles.filter((pebble) => !pebble.landed || pebble.attractLeft > 0);

  for (const guard of game.guards) {
    const stepped = updateGuard(guard, dt, game.player, game.level, game.sounds, game.random);
    if (stepped) {
      game.audio.guardStep(Math.hypot(guard.x - game.player.x, guard.y - game.player.y));
    }
  }
  game.alarm = game.guards.reduce((max, guard) => Math.max(max, guard.suspicion), 0);

  // A chasing guard that reaches Wren catches her.
  for (const guard of game.guards) {
    if (
      guard.state === 'chase' &&
      Math.hypot(guard.x - game.player.x, guard.y - game.player.y) < GUARD.catchDistance
    ) {
      game.caughtCount += 1;
      game.lives -= 1;
      game.audio.caught();
      if (game.lives <= 0) {
        game.screen = SCREEN_OVER;
        showMessage(game, 'The wardens found Wren too many times.', 5);
      } else {
        game.screen = SCREEN_CAUGHT;
        showMessage(game, `Caught! ${game.lives} lantern${game.lives === 1 ? '' : 's'} left.`, 5);
      }
      return EVENT_CAUGHT;
    }
  }

  // Seals: walk over one to pocket it; each one restocks a pebble.
  for (const seal of game.seals) {
    if (!seal.got && Math.hypot(seal.x - game.player.x, seal.y - game.player.y) < 26) {
      seal.got = true;
      game.sealsGot += 1;
      game.score += GAME.sealPoints;
      game.pebblesLeft += 1;
      game.audio.seal();
      showMessage(game, `Star chart ${game.sealsGot} of ${game.seals.length} — a pebble returns to your pocket.`, 3);
      events |= EVENT_SEAL;
      if (game.sealsGot === game.seals.length) {
        game.exitOpen = true;
        game.audio.exitOpen();
        showMessage(game, 'All charts found — the moonlit exit is open!', 4);
        events |= EVENT_EXIT_OPEN;
      }
    }
  }

  // The exit only works once every seal is found.
  if (game.exitOpen && pointInRect(game.player.x, game.player.y, game.level.exit)) {
    const bonus = Math.max(0, GAME.winBonus - Math.floor(game.levelTime) * 2);
    game.score += bonus;
    if (game.levelIndex + 1 < LEVELS.length) {
      beginLevel(game, game.levelIndex + 1);
      showMessage(game, `Night ${game.levelIndex + 1} begins. +${bonus} swift bonus.`, 4);
    } else {
      game.screen = SCREEN_WIN;
      game.audio.win();
      if (game.caughtCount < game.best || game.best === 0) {
        game.best = game.caughtCount;
        saveBest(game);
      }
    }
  }
  return events;
}

/** After being caught: back to the night's start, guards reset, score kept. */
export function resumeAfterCaught(game) {
  beginLevel(game, game.levelIndex);
  game.screen = SCREEN_PLAY;
  showMessage(game, 'Wren slips back to the doorway. Stay low, stay patient.', 3);
}
