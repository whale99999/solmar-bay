// Solmar Bay — keyboard + mouse input. Held keys are read every frame;
// one-shot presses (interact, punch, pause, mute, help, confirm) queue as flags.
export const ACT_ENTER = 1;
export const ACT_PUNCH = 2;
export const ACT_PAUSE = 4;
export const ACT_MUTE = 8;
export const ACT_HELP = 16;
export const ACT_CONFIRM = 32;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  const mouse = { x: 0, y: 0, down: false, clicked: false };

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'KeyE') actions |= ACT_ENTER;
    else if (event.code === 'KeyF') actions |= ACT_PUNCH;
    else if (event.code === 'KeyP' || event.code === 'Escape') actions |= ACT_PAUSE;
    else if (event.code === 'KeyM') actions |= ACT_MUTE;
    else if (event.code === 'KeyH') actions |= ACT_HELP;
    else if (event.code === 'Enter' || event.code === 'Space') actions |= ACT_CONFIRM;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());

  function trackPointer(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
  }
  canvas.addEventListener('pointermove', trackPointer);
  canvas.addEventListener('pointerdown', (event) => {
    trackPointer(event);
    mouse.down = true;
    mouse.clicked = true;
  });
  window.addEventListener('pointerup', () => { mouse.down = false; });

  return {
    keys,
    mouse,
    down(code) { return keys.has(code); },
    axis() {
      const x = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0)
        - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
      const y = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0)
        - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
      return { x, y };
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    takeClick() {
      const c = mouse.clicked;
      mouse.clicked = false;
      return c;
    },
  };
}
