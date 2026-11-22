// Boot and the one loop: input is read every frame, the game advances in
// fixed 1/60 s steps, and the renderer paints what is there. Screens:
// title, play, paused, caught, win and game over.
//
// ?seed=N fixes the shuffle. ?shot=cover|alert|stacks|win (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { STEP } from './config.js';
import {
  SCREEN_CAUGHT,
  SCREEN_OVER,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
  SCREEN_WIN,
  createGame,
  resumeAfterCaught,
  startRun,
  throwPebble,
  updateGame,
} from './game.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { createRenderer } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const game = createGame(seed);
const renderer = createRenderer(canvas);

function announce(message) {
  status.textContent = message;
}

function runShot(name) {
  stageShot(name, game);
  let painted = 0;
  function paint() {
    renderer.draw(game);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas, (x, y) => renderer.toLogical(x, y));
  let accumulator = 0;
  let last = performance.now();

  function confirm() {
    game.audio.unlock();
    if (game.screen === SCREEN_TITLE || game.screen === SCREEN_OVER || game.screen === SCREEN_WIN) {
      startRun(game);
      announce(`${game.level.name}. Find every star chart, then reach the exit unseen.`);
    } else if (game.screen === SCREEN_CAUGHT) {
      resumeAfterCaught(game);
      announce('Back at the doorway. Stay low, stay patient.');
    } else if (game.screen === SCREEN_PAUSED) {
      game.screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = game.audio.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    if (actions & ACTION_CONFIRM) confirm();
    if (actions & ACTION_PAUSE) {
      if (game.screen === SCREEN_PLAY) {
        game.screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (game.screen === SCREEN_PAUSED) {
        game.screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
    if (actions & ACTION_RESTART) {
      if (game.screen === SCREEN_OVER || game.screen === SCREEN_WIN || game.screen === SCREEN_CAUGHT) confirm();
    }
    const click = input.takeClick();
    if (click) {
      game.audio.unlock();
      if (game.screen === SCREEN_PLAY) {
        // Click coordinates are already logical: the input helper converts
        // client coordinates with the renderer's letterboxed scale.
        throwPebble(game, click.x, click.y);
      } else {
        confirm();
      }
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    game.mouseAim = input.mouse;
    if (game.screen === SCREEN_PLAY) {
      while (accumulator >= STEP) {
        const move = input.direction();
        updateGame(game, STEP, move, input.run, input.crouch);
        accumulator -= STEP;
        if (game.screen !== SCREEN_PLAY) {
          accumulator = 0;
          break;
        }
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(game);
  }

  // Leaving the tab pauses a running game rather than letting a warden
  // catch Wren unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game.screen === SCREEN_PLAY) {
      game.screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Wren in the Moonmoth Archive. Press Enter or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
