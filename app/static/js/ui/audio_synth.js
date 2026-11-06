/**
 * AudioSynthesizer — Zero-Dependency Procedural Web Audio API Synthesizer.
 *
 * Provides:
 * - UI navigation clicks and blips
 * - 1848 Musket gunshot sound (filtered white noise burst)
 * - 2026 Dual-tone car horn (detuned square waves)
 * - River crossing water splash (FM sine wave sweep)
 * - Landmark & victory fanfare (C-Major arpeggio)
 * - Stink buzzer / comedic hazard tone
 * - iOS / desktop user gesture unlock & mute state management
 */

export class AudioSynthesizer {
  constructor() {
    this.audioCtx = null;
    this.muted = false;
    this._unlocked = false;
  }

  /**
   * Unlocks AudioContext on user interaction.
   */
  unlock() {
    if (this._unlocked && this.audioCtx && this.audioCtx.state === 'running') return;

    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    this._unlocked = true;
  }

  /**
   * Toggles global audio mute.
   * @returns {boolean} New mute state
   */
  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  /**
   * Generic tone generator.
   * @param {number} freq Frequency in Hz
   * @param {OscillatorType} [type='sine']
   * @param {number} [duration=0.1] Duration in seconds
   * @param {number} [gainLevel=0.15]
   */
  playBeep(freq = 440, type = 'sine', duration = 0.1, gainLevel = 0.15) {
    if (this.muted) return;
    this.unlock();
    if (!this.audioCtx) return;

    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(gainLevel, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch {
      // Audio playback fails gracefully if unpermitted
    }
  }

  /**
   * Procedural musket rifle gunshot sound (1848).
   * White noise burst shaped by a steep low-pass filter.
   */
  playMusket() {
    if (this.muted) return;
    this.unlock();
    if (!this.audioCtx) return;

    try {
      const now = this.audioCtx.currentTime;
      const bufferSize = this.audioCtx.sampleRate * 0.3;
      const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.audioCtx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, now);
      filter.frequency.exponentialRampToValueAtTime(60, now + 0.25);

      const gain = this.audioCtx.createGain();
      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.audioCtx.destination);

      noise.start(now);
    } catch {}
  }

  /**
   * Dual-tone 2026 SUV car horn (440Hz + 554Hz square waves).
   */
  playHonk() {
    if (this.muted) return;
    this.unlock();
    if (!this.audioCtx) return;

    try {
      const now = this.audioCtx.currentTime;
      const duration = 0.28;

      const osc1 = this.audioCtx.createOscillator();
      const osc2 = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';
      osc1.frequency.setValueAtTime(440, now);
      osc2.frequency.setValueAtTime(554, now);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + duration);
      osc2.stop(now + duration);
    } catch {}
  }

  /**
   * Water splash sound for river crossings.
   */
  playSplash() {
    if (this.muted) return;
    this.unlock();
    if (!this.audioCtx) return;

    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.35);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch {}
  }

  /**
   * C-Major arpeggio fanfare for landmark arrivals and victory screens.
   */
  playFanfare() {
    if (this.muted) return;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playBeep(freq, 'triangle', 0.22, 0.2), idx * 115);
    });
  }

  /**
   * Low comedic buzz for Arthur's Code Brown or critical hazard events.
   */
  playStinkBuzzer() {
    if (this.muted) return;
    this.unlock();
    if (!this.audioCtx) return;

    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(130, now);
      osc.frequency.linearRampToValueAtTime(75, now + 0.4);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.4);
    } catch {}
  }
}

export const sound = new AudioSynthesizer();
