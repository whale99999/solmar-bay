// Solmar Bay — final pass, round 4
// Solmar Bay — keyboard and mouse input, read once per frame by the loop.
// WASD/arrows move and drive, E enters or steals a car, F or click shoots,
// Shift runs, P pauses, M mutes, S saves the game.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_SAVE = 4;
export const ACTION_ENTER = 8;
export const ACTION_MUTE = 16;

const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'run', ShiftRight: 'run',
  KeyE: 'enter',
  KeyF: 'shoot',
  Space: 'confirm',
  KeyP: 'pause',
  Escape: 'pause',
  KeyM: 'mute',
  KeyL: 'save',
};

export function createInput(canvas) {
  const held = new Set();
  const pressed = new Set();
  let mouse = { x: 0, y: 0, down: false, clicked: false };
  let actions = 0;

  function onKeyDown(event) {
    const name = KEYMAP[event.code];
    if (!name) return;
    if (['up', 'down', 'left', 'right', 'confirm'].includes(name)) event.preventDefault();
    if (!event.repeat) {
      pressed.add(name);
      if (name === 'confirm') actions |= ACTION_CONFIRM;
      if (name === 'pause') actions |= ACTION_PAUSE;
      if (name === 'save') actions |= ACTION_SAVE;
      if (name === 'enter') actions |= ACTION_ENTER;
      if (name === 'mute') actions |= ACTION_MUTE;
    }
    held.add(name);
  }
  function onKeyUp(event) {
    const name = KEYMAP[event.code];
    if (name) held.delete(name);
  }
  function onMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
  }
  function onMouseDown(event) {
    onMouseMove(event);
    mouse.down = true;
    mouse.clicked = true;
    pressed.add('shoot');
  }
  function onMouseUp() { mouse.down = false; }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    // Steering: -1 left, 0 none, +1 right; throttle: -1 brake/reverse, +1 forward.
    direction() {
      return (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0);
    },
    throttle() {
      return (held.has('up') ? 1 : 0) - (held.has('down') ? 1 : 0);
    },
    running() { return held.has('run'); },
    shooting() { return held.has('shoot') || mouse.down; },
    mouse() { return mouse; },
    takeActions() {
      const out = actions;
      actions = 0;
      return out;
    },
    // One-shot presses, consumed by the caller each frame.
    takePressed(name) {
      if (!pressed.has(name)) return false;
      pressed.delete(name);
      return true;
    },
    endFrame() {
      pressed.clear();
      mouse.clicked = false;
    },
  };
}
