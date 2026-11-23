// Solmar Bay — keyboard + mouse input. WASD/arrows move and drive, E enters/exits
// a car, F punches, mouse aims, click shoots, P/Esc pauses, M mutes, Enter confirms.
export const ACTION_CONFIRM = 1, ACTION_PAUSE = 2, ACTION_ENTER = 4, ACTION_PUNCH = 8, ACTION_MUTE = 16;

export function createInput(canvas) {
  const keys = new Set();
  const state = { mouseX: 0, mouseY: 0, mouseDown: false, clicked: false, actions: 0 };
  function key(e) { return e.key.length === 1 ? e.key.toLowerCase() : e.key; }
  window.addEventListener('keydown', (e) => {
    const k = key(e);
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
    if (!e.repeat) {
      if (k === ' ' || k === 'enter') state.actions |= ACTION_CONFIRM;
      if (k === 'p' || k === 'escape') state.actions |= ACTION_PAUSE;
      if (k === 'e') state.actions |= ACTION_ENTER;
      if (k === 'f') state.actions |= ACTION_PUNCH;
      if (k === 'm') state.actions |= ACTION_MUTE;
    }
    keys.add(k);
  });
  window.addEventListener('keyup', (e) => keys.delete(key(e)));
  canvas.addEventListener('mousemove', (e) => { const r = canvas.getBoundingClientRect(); state.mouseX = e.clientX - r.left; state.mouseY = e.clientY - r.top; });
  canvas.addEventListener('mousedown', (e) => { if (e.button === 0) { state.mouseDown = true; state.clicked = true; } });
  window.addEventListener('mouseup', () => { state.mouseDown = false; });
  return {
    state,
    takeActions() { const a = state.actions; state.actions = 0; return a; },
    takeClick() { const c = state.clicked; state.clicked = false; return c; },
    axis() {
      let x = 0, y = 0;
      if (keys.has('a') || keys.has('arrowleft')) x -= 1;
      if (keys.has('d') || keys.has('arrowright')) x += 1;
      if (keys.has('w') || keys.has('arrowup')) y -= 1;
      if (keys.has('s') || keys.has('arrowdown')) y += 1;
      return { x, y };
    },
    isDown(k) { return keys.has(k); },
  };
}
