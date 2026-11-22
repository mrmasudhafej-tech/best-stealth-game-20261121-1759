// Synthesised sound: no audio files, no network. Short WebAudio blips for
// footsteps, pebbles, seals, alarms and the win chime. Everything is
// guarded so a browser without audio (or a muted tab) simply stays silent.
export function createAudio() {
  const audio = {
    context: null,
    muted: false,
    master: null,
  };

  function ensure() {
    if (audio.context || typeof window === 'undefined') return audio.context;
    const AudioContext = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContext) return null;
    try {
      audio.context = new AudioContext();
      audio.master = audio.context.createGain();
      audio.master.gain.value = 0.5;
      audio.master.connect(audio.context.destination);
    } catch {
      audio.context = null;
    }
    return audio.context;
  }

  /** Call from a key or click handler: browsers need a gesture to start audio. */
  function unlock() {
    const ctx = ensure();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  function tone(frequency, duration, type, volume, slideTo) {
    if (audio.muted) return;
    const ctx = ensure();
    if (!ctx || !audio.master) return;
    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gain);
    gain.connect(audio.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  function thud(volume) {
    if (audio.muted) return;
    const ctx = ensure();
    if (!ctx || !audio.master) return;
    const now = ctx.currentTime;
    const length = Math.floor(ctx.sampleRate * 0.07);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(audio.master);
    source.start(now);
  }

  return {
    unlock,
    toggleMute() {
      audio.muted = !audio.muted;
      return audio.muted;
    },
    get isMuted() {
      return audio.muted;
    },
    /** Soft step; `near` (0..1) scales a guard's footstep by distance. */
    footstep(near = 1) {
      thud(0.16 * near);
    },
    guardStep(distance) {
      const near = Math.max(0, 1 - distance / 320);
      if (near > 0.08) thud(0.1 * near);
    },
    pebble() {
      tone(1400, 0.08, 'triangle', 0.12, 700);
    },
    pebbleLand() {
      thud(0.2);
      tone(900, 0.12, 'sine', 0.1, 500);
    },
    seal() {
      tone(660, 0.12, 'sine', 0.18);
      setTimeout(() => tone(990, 0.18, 'sine', 0.18), 90);
    },
    alarm() {
      tone(220, 0.3, 'sawtooth', 0.16, 180);
      setTimeout(() => tone(220, 0.3, 'sawtooth', 0.16, 180), 320);
    },
    caught() {
      tone(330, 0.4, 'sawtooth', 0.2, 110);
    },
    win() {
      [523, 659, 784, 1047].forEach((freq, i) => {
        setTimeout(() => tone(freq, 0.25, 'triangle', 0.18), i * 120);
      });
    },
    exitOpen() {
      tone(520, 0.15, 'triangle', 0.15, 780);
    },
  };
}
