// Solmar Bay — all sound is synthesised WebAudio: engine hum, siren, gunshots,
// punches, pickups and mission jingles. No audio files, no network. M toggles mute.
export function createAudio() {
  const audio = { ctx: null, muted: false, engineOsc: null, engineGain: null, sirenOsc: null, sirenGain: null, sirenOn: false };
  function ensure() {
    if (audio.ctx) return true;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return false;
      audio.ctx = new Ctx();
      audio.engineOsc = audio.ctx.createOscillator(); audio.engineOsc.type = 'sawtooth'; audio.engineOsc.frequency.value = 60;
      audio.engineGain = audio.ctx.createGain(); audio.engineGain.gain.value = 0;
      audio.engineOsc.connect(audio.engineGain); audio.engineGain.connect(audio.ctx.destination); audio.engineOsc.start();
      audio.sirenOsc = audio.ctx.createOscillator(); audio.sirenOsc.type = 'sine'; audio.sirenOsc.frequency.value = 700;
      audio.sirenGain = audio.ctx.createGain(); audio.sirenGain.gain.value = 0;
      audio.sirenOsc.connect(audio.sirenGain); audio.sirenGain.connect(audio.ctx.destination); audio.sirenOsc.start();
      return true;
    } catch { return false; }
  }
  function blip(freq, dur, type, vol, slideTo) {
    if (audio.muted || !ensure()) return;
    try {
      const t = audio.ctx.currentTime;
      const o = audio.ctx.createOscillator(), g = audio.ctx.createGain();
      o.type = type || 'square'; o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(vol || 0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); g.connect(audio.ctx.destination); o.start(t); o.stop(t + dur);
    } catch { /* sound is best-effort */ }
  }
  return {
    unlock() { ensure(); if (audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume().catch(() => {}); },
    toggleMute() { audio.muted = !audio.muted; if (audio.engineGain) audio.engineGain.gain.value = 0; if (audio.sirenGain) audio.sirenGain.gain.value = 0; return audio.muted; },
    get muted() { return audio.muted; },
    shoot() { blip(900, 0.12, 'square', 0.14, 120); },
    punch() { blip(160, 0.1, 'triangle', 0.16, 70); },
    pickup() { blip(660, 0.12, 'sine', 0.14, 990); },
    crash() { blip(90, 0.25, 'sawtooth', 0.18, 40); },
    mission() { blip(523, 0.14, 'sine', 0.14); setTimeout(() => blip(659, 0.14, 'sine', 0.14), 130); setTimeout(() => blip(784, 0.26, 'sine', 0.16), 260); },
    busted() { blip(330, 0.3, 'sawtooth', 0.14, 110); },
    engine(speed01, driving) {
      if (!ensure() || audio.muted) return;
      try {
        audio.engineOsc.frequency.value = 55 + speed01 * 140;
        audio.engineGain.gain.value = driving ? 0.03 + speed01 * 0.05 : 0.012;
      } catch { /* ignore */ }
    },
    siren(wanted) {
      if (!ensure() || audio.muted) return;
      try {
        if (wanted > 0) {
          const t = audio.ctx.currentTime;
          audio.sirenOsc.frequency.setValueAtTime(650 + 250 * Math.sin(t * 4), t);
          audio.sirenGain.gain.value = 0.025;
        } else audio.sirenGain.gain.value = 0;
      } catch { /* ignore */ }
    },
  };
}
