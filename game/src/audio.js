// Solmar Bay — all sound is synthesized with WebAudio, zero audio assets.
// The context is created only after a user gesture, so a headless load stays
// silent and prints nothing. Every call is guarded: no audio, no crash.
export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenTimer = 0;
  let enabled = true;

  function ensure() {
    if (ctx || !enabled) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.25;
      master.connect(ctx.destination);
    } catch {
      ctx = null;
      enabled = false;
    }
    return ctx;
  }

  // Call from any real user gesture (click / key) to unlock sound.
  function unlock() {
    const c = ensure();
    if (c && c.state === 'suspended') c.resume().catch(() => {});
  }

  function blip(freq, dur, type = 'square', vol = 0.2, slideTo = 0) {
    const c = ensure();
    if (!c) return;
    try {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, c.currentTime);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
      g.gain.setValueAtTime(vol, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
      o.connect(g);
      g.connect(master);
      o.start();
      o.stop(c.currentTime + dur);
    } catch { /* sound is cosmetic */ }
  }

  function noise(dur, vol = 0.3, low = 400) {
    const c = ensure();
    if (!c) return;
    try {
      const len = Math.floor(c.sampleRate * dur);
      const buf = c.createBuffer(1, len, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = c.createBufferSource();
      src.buffer = buf;
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = low;
      const g = c.createGain();
      g.gain.value = vol;
      src.connect(filter);
      filter.connect(g);
      g.connect(master);
      src.start();
    } catch { /* sound is cosmetic */ }
  }

  return {
    unlock,
    shoot() {
      noise(0.12, 0.35, 1800);
    },
    crash() {
      noise(0.25, 0.3, 500);
    },
    pickup() {
      blip(660, 0.12, 'sine', 0.25, 990);
    },
    mission() {
      blip(523, 0.14, 'triangle', 0.25);
      setTimeout(() => blip(784, 0.22, 'triangle', 0.25), 130);
    },
    busted() {
      blip(220, 0.5, 'sawtooth', 0.2, 110);
    },
    denied() {
      blip(160, 0.15, 'square', 0.15);
    },
    // Continuous layers, driven every frame from the game state.
    update(dt, driving, speed, wanted) {
      const c = ensure();
      if (!c) return;
      try {
        if (driving) {
          if (!engineOsc) {
            engineOsc = c.createOscillator();
            engineGain = c.createGain();
            engineOsc.type = 'sawtooth';
            engineGain.gain.value = 0.0;
            const f = c.createBiquadFilter();
            f.type = 'lowpass';
            f.frequency.value = 600;
            engineOsc.connect(f);
            f.connect(engineGain);
            engineGain.connect(master);
            engineOsc.start();
          }
          engineOsc.frequency.setTargetAtTime(50 + Math.abs(speed) * 0.35, c.currentTime, 0.05);
          engineGain.gain.setTargetAtTime(0.05, c.currentTime, 0.1);
        } else if (engineGain) {
          engineGain.gain.setTargetAtTime(0.0, c.currentTime, 0.1);
        }
        if (wanted > 0) {
          if (!sirenOsc) {
            sirenOsc = c.createOscillator();
            sirenGain = c.createGain();
            sirenOsc.type = 'triangle';
            sirenGain.gain.value = 0.0;
            sirenOsc.connect(sirenGain);
            sirenGain.connect(master);
            sirenOsc.start();
          }
          sirenTimer += dt;
          const f = 650 + Math.sin(sirenTimer * 5) * 250;
          sirenOsc.frequency.setTargetAtTime(f, c.currentTime, 0.03);
          sirenGain.gain.setTargetAtTime(0.035, c.currentTime, 0.2);
        } else if (sirenGain) {
          sirenGain.gain.setTargetAtTime(0.0, c.currentTime, 0.2);
        }
      } catch { /* sound is cosmetic */ }
    },
  };
}
