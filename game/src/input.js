// Keyboard and mouse input. Movement keys, run, crouch, pause, confirm and
// restart are keyboard; aiming and throwing a pebble are mouse. The mouse
// position is converted into the game's 1280x720 logical coordinates using
// the same letterboxed scale the renderer uses.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;
export const ACTION_MUTE = 8;

const MOVE_KEYS = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
};

export function createInput(canvas, toLogical) {
  const held = new Set();
  let actions = 0;
  let click = null;
  let mouse = { x: 640, y: 360 };

  function updateMouse(event) {
    mouse = toLogical(event.clientX, event.clientY);
  }

  function onKeyDown(event) {
    if (event.repeat) return;
    held.add(event.code);
    if (event.code === 'Enter' || event.code === 'Space') {
      actions |= ACTION_CONFIRM;
      event.preventDefault();
    } else if (event.code === 'KeyP' || event.code === 'Escape') {
      actions |= ACTION_PAUSE;
    } else if (event.code === 'KeyR') {
      actions |= ACTION_RESTART;
    } else if (event.code === 'KeyM') {
      actions |= ACTION_MUTE;
    }
  }

  function onKeyUp(event) {
    held.delete(event.code);
  }

  function onMouseMove(event) {
    updateMouse(event);
  }

  function onMouseDown(event) {
    updateMouse(event);
    click = { x: mouse.x, y: mouse.y, button: event.button };
  }

  function onBlur() {
    held.clear();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);

  return {
    /** Normalised movement vector from the held keys. */
    direction() {
      let x = 0;
      let y = 0;
      if (held.has('KeyW') || held.has('ArrowUp')) y -= 1;
      if (held.has('KeyS') || held.has('ArrowDown')) y += 1;
      if (held.has('KeyA') || held.has('ArrowLeft')) x -= 1;
      if (held.has('KeyD') || held.has('ArrowRight')) x += 1;
      const magnitude = Math.hypot(x, y);
      return magnitude > 0 ? { x: x / magnitude, y: y / magnitude } : { x: 0, y: 0 };
    },
    get run() {
      return held.has('ShiftLeft') || held.has('ShiftRight');
    },
    get crouch() {
      return held.has('KeyC') || held.has('ControlLeft') || held.has('ControlRight');
    },
    get mouse() {
      return mouse;
    },
    /** Actions queued since the last take, as a bitmask. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The latest mouse click since the last take, or null. */
    takeClick() {
      const taken = click;
      click = null;
      return taken;
    },
    destroy() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mousedown', onMouseDown);
    },
  };
}

export { MOVE_KEYS };
