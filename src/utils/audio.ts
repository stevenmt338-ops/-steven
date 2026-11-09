/**
 * Web Audio API procedural soundscape for THE LAST WISH
 * Strict ambient sound: gentle winter wind, deep midnight drone, crystal chimes, and star transformation sweep.
 * Always remains soft in the background so it never distracts from the experience.
 * Starts playback after visitor's first interaction if autoplay was blocked.
 */

class AudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private hasUserExplicitlyMuted: boolean = false;
  private volume: number = 0.28; // Soft, unobtrusive background volume
  private masterGain: GainNode | null = null;
  private windGain: GainNode | null = null;
  private droneGain: GainNode | null = null;
  private isRunning: boolean = false;
  private interactionListenerAttached: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.attachFirstInteractionListener();
    }
  }

  public init() {
    if (this.ctx) return;
    const AudioCtxClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtxClass) return;

    try {
      this.ctx = new AudioCtxClass();
      this.masterGain = this.ctx.createGain();
      const initialGain = this.isMuted || this.hasUserExplicitlyMuted ? 0 : this.volume;
      this.masterGain.gain.setValueAtTime(initialGain, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      console.warn('AudioContext creation notice:', e);
    }
  }

  public attachFirstInteractionListener() {
    if (this.interactionListenerAttached) return;
    this.interactionListenerAttached = true;

    const onFirstUserInteraction = () => {
      // Remove listeners once interacted
      window.removeEventListener('pointerdown', onFirstUserInteraction);
      window.removeEventListener('touchstart', onFirstUserInteraction);
      window.removeEventListener('keydown', onFirstUserInteraction);
      window.removeEventListener('click', onFirstUserInteraction);

      if (this.hasUserExplicitlyMuted) return;

      this.init();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().then(() => {
          this.startAmbient();
          if (this.masterGain) {
            this.masterGain.gain.setTargetAtTime(this.volume, this.ctx!.currentTime, 1.2);
          }
        }).catch(() => {});
      } else {
        this.startAmbient();
      }
    };

    window.addEventListener('pointerdown', onFirstUserInteraction, { once: true });
    window.addEventListener('touchstart', onFirstUserInteraction, { once: true });
    window.addEventListener('keydown', onFirstUserInteraction, { once: true });
    window.addEventListener('click', onFirstUserInteraction, { once: true });

    // Also attempt initial start in case browser allows it
    try {
      this.init();
      if (this.ctx && this.ctx.state === 'running') {
        this.startAmbient();
      }
    } catch {
      // Autoplay blocked, listener will trigger on interaction
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.hasUserExplicitlyMuted = true;
    } else {
      this.hasUserExplicitlyMuted = false;
    }

    if (!this.ctx) {
      if (!muted) {
        this.init();
        this.startAmbient();
      }
      return;
    }

    if (this.ctx.state === 'suspended' && !muted) {
      this.ctx.resume();
    }

    if (this.masterGain) {
      const targetGain = muted ? 0 : this.volume;
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.4);
    }

    if (!muted && !this.isRunning) {
      this.startAmbient();
    }
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && !this.isMuted && !this.hasUserExplicitlyMuted && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.1);
    }
  }

  public getMuted(): boolean {
    return this.isMuted || this.hasUserExplicitlyMuted;
  }

  public getVolume(): number {
    return this.volume;
  }

  private startAmbient() {
    if (!this.ctx || !this.masterGain || this.isRunning) return;
    this.isRunning = true;

    // 1. Procedural Winter Wind (Pink noise + soft bandpass filter)
    try {
      const bufferSize = this.ctx.sampleRate * 3;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.035;
        b6 = white * 0.115926;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(260, this.ctx.currentTime);
      filter.Q.setValueAtTime(2.0, this.ctx.currentTime);

      // Slow LFO for gentle wind breathing
      const lfo = this.ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.06, this.ctx.currentTime);
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(90, this.ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start();

      this.windGain = this.ctx.createGain();
      this.windGain.gain.setValueAtTime(0.14, this.ctx.currentTime); // Soft background wind

      whiteNoise.connect(filter);
      filter.connect(this.windGain);
      this.windGain.connect(this.masterGain);
      whiteNoise.start();

      // 2. Distant Deep Midnight Drone (Subtle minor harmonic pad)
      const freqs = [73.42, 110.0, 146.83, 220.0]; // D2, A2, D3, A3
      this.droneGain = this.ctx.createGain();
      this.droneGain.gain.setValueAtTime(0.09, this.ctx.currentTime); // Soft background drone
      this.droneGain.connect(this.masterGain);

      freqs.forEach((freq, idx) => {
        if (!this.ctx || !this.droneGain) return;
        const osc = this.ctx.createOscillator();
        const detune = (idx % 2 === 0 ? 1 : -1) * (1.5 + idx * 1.2);
        osc.type = idx === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        osc.detune.setValueAtTime(detune, this.ctx.currentTime);

        const oscGain = this.ctx.createGain();
        oscGain.gain.setValueAtTime(0.06 / (idx + 1), this.ctx.currentTime);

        const oscFilter = this.ctx.createBiquadFilter();
        oscFilter.type = 'lowpass';
        oscFilter.frequency.setValueAtTime(320, this.ctx.currentTime);

        osc.connect(oscFilter);
        oscFilter.connect(oscGain);
        oscGain.connect(this.droneGain);
        osc.start();
      });
    } catch (e) {
      console.warn('Audio ambient startup notice:', e);
    }
  }

  // Play delicate chime on button click or star hover
  public playChime(freq = 1174.66) {
    if (this.getMuted() || !this.ctx || !this.masterGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      filter.type = 'highpass';
      filter.frequency.setValueAtTime(500, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 2.1);
    } catch {
      // ignore
    }
  }

  // Play sparkling transformation soundscape
  public playTransformation() {
    if (this.getMuted() || !this.ctx || !this.masterGain) return;
    try {
      const now = this.ctx.currentTime;
      const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.51, 1760, 2217.46];

      notes.forEach((freq, i) => {
        if (!this.ctx || !this.masterGain) return;
        const timeOffset = now + i * 0.2;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, timeOffset);

        gain.gain.setValueAtTime(0.0001, timeOffset);
        gain.gain.linearRampToValueAtTime(0.1, timeOffset + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, timeOffset + 1.6);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(timeOffset);
        osc.stop(timeOffset + 1.7);
      });

      // Shimmer sweep
      const sweepOsc = this.ctx.createOscillator();
      const sweepGain = this.ctx.createGain();
      sweepOsc.type = 'triangle';
      sweepOsc.frequency.setValueAtTime(220, now);
      sweepOsc.frequency.exponentialRampToValueAtTime(1600, now + 2.8);

      sweepGain.gain.setValueAtTime(0.001, now);
      sweepGain.gain.linearRampToValueAtTime(0.08, now + 1.0);
      sweepGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);

      sweepOsc.connect(sweepGain);
      sweepGain.connect(this.masterGain);
      sweepOsc.start(now);
      sweepOsc.stop(now + 3.3);
    } catch {
      // ignore
    }
  }
}

export const soundEngine = new AudioEngine();
