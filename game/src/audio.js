// Solmar Bay — final pass, round 4
// Solmar Bay — all sound is synthesized with WebAudio: no audio files, no
// network. The AudioContext is created only on a user gesture, so a headless
// run stays silent and error-free. Engine hum, siren wail, gunshots, pickups
// and a little two-bar bass loop are all oscillators and noise buffers.
import { AUDIO } from './config.js';

export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let musicTimer = null;
  let muted = false;
  let musicStep = 0;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') void ctx.resume();
      return true;
    }
    try {
      const AC = window.AudioContext ?? window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : AUDIO.master;
      master.connect(ctx.destination);
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 60;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineGain).connect(master);
      engineOsc.start();
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'sine';
      sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain).connect(master);
      sirenOsc.start();
    } catch {
      ctx = null;
      return false;
    }
    return true;
  }

  function blip(freq, dur, type, vol) {
    if (!ensure()) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain).connect(master);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  function noise(dur, vol, lowpass) {
    if (!ensure()) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter).connect(gain).connect(master);
    src.start();
  }

  return {
    unlock() { ensure(); },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : AUDIO.master;
      return muted;
    },
    isMuted() { return muted; },
    setEngine(speedRatio, driving) {
      if (!ctx || !engineOsc) return;
      engineOsc.frequency.value = 55 + speedRatio * 140;
      engineGain.gain.value = driving ? AUDIO.engine * (0.4 + speedRatio) : 0;
    },
    setSiren(on, time) {
      if (!ctx || !sirenOsc) return;
      sirenGain.gain.value = on ? AUDIO.siren : 0;
      if (on) sirenOsc.frequency.value = 650 + 250 * Math.sin(time * 4);
    },
    shoot() { noise(0.12, 0.5, 1800); },
    hit() { noise(0.08, 0.3, 900); },
    pickup() { blip(880, 0.12, 'sine', 0.3); blip(1320, 0.18, 'sine', 0.25); },
    cash() { blip(1046, 0.1, 'triangle', 0.3); blip(1568, 0.22, 'triangle', 0.3); },
    mission() { [523, 659, 784].forEach((f, i) => setTimeout(() => blip(f, 0.2, 'triangle', 0.3), i * 110)); },
    crash() { noise(0.25, 0.6, 500); },
    startMusic() {
      if (!ensure() || musicTimer) return;
      const bass = [55, 55, 65.4, 49];
      musicTimer = setInterval(() => {
        if (muted) return;
        const note = bass[musicStep % bass.length];
        blip(note, 0.45, 'triangle', 0.12);
        if (musicStep % 2 === 0) blip(note * 4, 0.08, 'square', 0.04);
        musicStep += 1;
      }, 300);
    },
  };
}
