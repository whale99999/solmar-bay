// Solmar Bay — all sound is synthesized with WebAudio: no audio files.
// Engine hum, police siren, gunshots, punches, pickups, explosions, UI blips.
export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenTimer = 0;
  let sirenHigh = false;
  let muted = false;
  // Sound only ever starts from a real user gesture (unlock): the game never
  // creates an AudioContext while settling a screenshot scene, so headless
  // runs stay free of autoplay warnings too.
  let unlocked = false;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      // Engine: low sawtooth whose pitch follows speed.
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      // Siren: two-tone square wave, flipped by update().
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'square';
      sirenOsc.frequency.value = 720;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
      return true;
    } catch {
      ctx = null;
      return false;
    }
  }

  function blip(freq, dur, type, vol, slideTo) {
    if (!unlocked || !ctx || muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gain.gain.setValueAtTime(vol || 0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noise(dur, vol, lowpass) {
    if (!unlocked || !ctx || muted) return;
    const t = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = vol || 0.3;
    if (lowpass) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpass;
      src.connect(filter);
      filter.connect(gain);
    } else {
      src.connect(gain);
    }
    gain.connect(master);
    src.start(t);
  }

  return {
    get muted() { return muted; },
    unlock() { unlocked = true; ensure(); },
    setMuted(m) {
      muted = m;
      if (master) master.gain.value = muted ? 0 : 0.5;
    },
    shot() { noise(0.12, 0.35, 2400); blip(190, 0.09, 'square', 0.16, 60); },
    punch() { noise(0.08, 0.3, 900); },
    pickup() { blip(660, 0.12, 'sine', 0.22); blip(990, 0.18, 'sine', 0.2); },
    missionDone() {
      blip(523, 0.14, 'triangle', 0.25);
      setTimeout(() => blip(659, 0.14, 'triangle', 0.25), 130);
      setTimeout(() => blip(784, 0.26, 'triangle', 0.25), 260);
    },
    busted() { blip(330, 0.3, 'sawtooth', 0.2, 110); },
    explosion() { noise(0.6, 0.5, 700); blip(90, 0.5, 'sine', 0.3, 35); },
    click() { blip(880, 0.05, 'square', 0.1); },
    denied() { blip(160, 0.16, 'square', 0.16, 120); },
    // Called every frame: engine follows speed, siren wails while wanted.
    update(dt, speed, wanted) {
      if (!ctx || muted) {
        if (engineGain) engineGain.gain.value = 0;
        if (sirenGain) sirenGain.gain.value = 0;
        return;
      }
      if (engineOsc) {
        engineOsc.frequency.value = 50 + Math.abs(speed) * 0.28;
        engineGain.gain.value = speed === 0 ? 0.0 : 0.05;
      }
      if (sirenOsc) {
        if (wanted > 0) {
          sirenTimer -= dt;
          if (sirenTimer <= 0) {
            sirenTimer = 0.42;
            sirenHigh = !sirenHigh;
            sirenOsc.frequency.value = sirenHigh ? 880 : 620;
          }
          sirenGain.gain.value = 0.045;
        } else {
          sirenGain.gain.value = 0;
        }
      }
    },
  };
}
