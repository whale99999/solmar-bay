// Solmar Bay — keyboard + mouse input. WASD/arrows to move and drive,
// E to enter/exit a car, mouse aim + click (or Space) to shoot, Esc/P pause.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER_CAR = 4;
export const ACTION_SHOOT = 8;

const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'run', ShiftRight: 'run',
};

export function createInput(canvas) {
  const held = new Set();
  const pressed = new Set();
  let mouse = { x: 0, y: 0, down: false };
  let actions = 0;

  function onKeyDown(e) {
    if (e.repeat) return;
    const name = KEYMAP[e.code];
    if (name) {
      held.add(name);
      e.preventDefault();
    }
    if (e.code === 'Enter' || e.code === 'Space') {
      actions |= ACTION_CONFIRM;
      if (e.code === 'Space') actions |= ACTION_SHOOT;
      e.preventDefault();
    }
    if (e.code === 'Escape' || e.code === 'KeyP') actions |= ACTION_PAUSE;
    if (e.code === 'KeyE') actions |= ACTION_ENTER_CAR;
  }

  function onKeyUp(e) {
    const name = KEYMAP[e.code];
    if (name) held.delete(name);
  }

  function onMouseMove(e) {
    const r = canvas.getBoundingClientRect();
    mouse = { x: e.clientX - r.left, y: e.clientY - r.top, down: mouse.down };
  }

  function onMouseDown(e) {
    onMouseMove(e);
    mouse.down = true;
    actions |= ACTION_SHOOT;
  }

  function onMouseUp() {
    mouse.down = false;
  }

  function onClick() {
    actions |= ACTION_CONFIRM;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('click', onClick);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  return {
    held,
    get mouse() {
      return mouse;
    },
    // -1/0/1 steering and throttle intents, read fresh every frame.
    steer() {
      return (held.has('left') ? -1 : 0) + (held.has('right') ? 1 : 0);
    },
    throttle() {
      return (held.has('up') ? 1 : 0) + (held.has('down') ? -1 : 0);
    },
    moveX() {
      return (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0);
    },
    moveY() {
      return (held.has('down') ? 1 : 0) - (held.has('up') ? 1 : 0);
    },
    running() {
      return held.has('run');
    },
    shooting() {
      return mouse.down || held.has('shoot');
    },
    takeActions() {
      const out = actions;
      actions = 0;
      return out;
    },
  };
}
