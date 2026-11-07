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

// Standard Note Frequencies (Hz)
export const N = {
  REST: 0,
  C4: 261.63, CS4: 277.18, D4: 293.66, DS4: 311.13, E4: 329.63,
  F4: 349.23, FS4: 369.99, G4: 392.00, GS4: 415.30, A4: 440.00,
  AS4: 466.16, B4: 493.88, C5: 523.25, CS5: 554.37, D5: 587.33,
  DS5: 622.25, E5: 659.25, F5: 698.46, FS5: 739.99, G5: 783.99,
  A5: 880.00,
};

// ==========================================
// 1848 OREGON TRAIL LANDMARK FOLK MELODIES
// ==========================================

export const MELODY_OH_SUSANNA = [
  [N.C4, 0.5, 'square', 0.15],
  [N.D4, 0.5, 'square', 0.15],
  [N.E4, 1.0, 'square', 0.18],
  [N.G4, 1.0, 'square', 0.18],
  [N.G4, 1.0, 'square', 0.18],
  [N.A4, 1.0, 'square', 0.18],
  [N.G4, 1.0, 'square', 0.18],
  [N.E4, 1.0, 'square', 0.18],
  [N.C4, 1.0, 'square', 0.15],
  [N.D4, 1.0, 'square', 0.15],
  [N.E4, 1.0, 'square', 0.18],
  [N.E4, 1.0, 'square', 0.18],
  [N.D4, 1.0, 'square', 0.15],
  [N.D4, 2.0, 'square', 0.15],
  [N.REST, 0.5, 'square', 0],
  [N.F4, 1.5, 'triangle', 0.22],
  [N.F4, 0.5, 'triangle', 0.22],
  [N.A4, 1.0, 'triangle', 0.22],
  [N.A4, 1.0, 'triangle', 0.22],
  [N.G4, 1.0, 'square', 0.18],
  [N.G4, 1.0, 'square', 0.18],
  [N.E4, 1.0, 'square', 0.18],
  [N.C4, 1.0, 'square', 0.15],
  [N.D4, 2.0, 'square', 0.18],
];

export const MELODY_YANKEE_DOODLE = [
  [N.C4, 0.75, 'square', 0.15],
  [N.C4, 0.75, 'square', 0.15],
  [N.D4, 0.75, 'square', 0.15],
  [N.E4, 0.75, 'square', 0.18],
  [N.C4, 0.75, 'square', 0.15],
  [N.E4, 0.75, 'square', 0.18],
  [N.D4, 1.5, 'square', 0.15],
  [196.00, 0.75, 'square', 0.12],
  [N.C4, 0.75, 'square', 0.15],
  [N.C4, 0.75, 'square', 0.15],
  [N.D4, 0.75, 'square', 0.15],
  [N.E4, 0.75, 'square', 0.18],
  [N.C4, 1.5, 'square', 0.18],
  [N.B4, 1.5, 'square', 0.15],
  [N.REST, 0.5, 'square', 0],
  [N.C4, 0.75, 'triangle', 0.20],
  [N.D4, 0.75, 'triangle', 0.20],
  [N.E4, 0.75, 'triangle', 0.20],
  [N.F4, 0.75, 'triangle', 0.20],
  [N.E4, 0.75, 'triangle', 0.20],
  [N.D4, 0.75, 'triangle', 0.20],
  [N.C4, 2.0, 'triangle', 0.22],
];

export const MELODY_WILLAMETTE_VICTORY = [
  [N.C4, 1.0, 'triangle', 0.20],
  [N.C4, 1.0, 'triangle', 0.20],
  [N.C4, 1.0, 'triangle', 0.20],
  [N.G4, 2.0, 'square', 0.18],
  [N.E4, 1.0, 'square', 0.18],
  [N.C4, 1.0, 'triangle', 0.20],
  [N.E4, 1.0, 'square', 0.18],
  [N.G4, 2.5, 'square', 0.22],
  [N.REST, 0.5, 'square', 0],
  [N.G4, 1.0, 'square', 0.20],
  [N.A4, 1.0, 'triangle', 0.22],
  [N.G4, 1.0, 'square', 0.20],
  [N.F4, 1.0, 'square', 0.18],
  [N.E4, 1.0, 'square', 0.18],
  [N.F4, 1.0, 'square', 0.18],
  [N.G4, 1.5, 'triangle', 0.22],
  [N.C5, 2.5, 'triangle', 0.25],
];

// ==========================================
// 2026 AUSSIE ROAD TRIP CHIPTUNE MELODIES
// ==========================================

export const MELODY_WALTZING_MATILDA = [
  [N.C4, 0.75, 'square', 0.18],
  [N.E4, 0.75, 'square', 0.18],
  [N.G4, 0.75, 'square', 0.20],
  [N.G4, 0.75, 'square', 0.20],
  [N.A4, 0.75, 'square', 0.22],
  [N.G4, 0.75, 'square', 0.20],
  [N.E4, 0.75, 'square', 0.18],
  [N.C4, 1.5, 'square', 0.18],
  [N.A4, 0.75, 'triangle', 0.22],
  [N.C5, 0.75, 'triangle', 0.24],
  [N.C5, 0.75, 'triangle', 0.24],
  [N.A4, 0.75, 'triangle', 0.22],
  [N.G4, 2.0, 'square', 0.20],
  [N.REST, 0.5, 'square', 0],
  [N.G4, 0.75, 'square', 0.18],
  [N.A4, 0.75, 'square', 0.20],
  [N.G4, 0.75, 'square', 0.18],
  [N.E4, 0.75, 'square', 0.16],
  [N.C4, 0.75, 'square', 0.16],
  [N.D4, 0.75, 'square', 0.18],
  [N.E4, 1.0, 'triangle', 0.20],
  [N.D4, 1.0, 'square', 0.16],
  [N.C4, 2.5, 'triangle', 0.24],
];

export const MELODY_DOWN_UNDER = [
  [N.B4, 0.5, 'triangle', 0.22],
  [N.B4, 0.5, 'triangle', 0.22],
  [N.FS4, 0.5, 'square', 0.16],
  [N.B4, 0.5, 'triangle', 0.22],
  [N.CS5, 0.5, 'triangle', 0.24],
  [N.D5, 1.0, 'triangle', 0.25],
  [N.CS5, 0.5, 'triangle', 0.22],
  [N.B4, 1.0, 'triangle', 0.22],
  [N.A4, 0.5, 'square', 0.18],
  [N.FS4, 1.5, 'square', 0.18],
  [N.REST, 0.5, 'square', 0],
  [N.D5, 0.5, 'triangle', 0.24],
  [N.CS5, 0.5, 'triangle', 0.22],
  [N.B4, 0.5, 'triangle', 0.22],
  [N.A4, 0.5, 'square', 0.18],
  [N.B4, 2.0, 'triangle', 0.24],
];

export const MELODY_BIG_BANANA_JINGLE = [
  [N.C5, 0.5, 'square', 0.20],
  [N.G4, 0.5, 'square', 0.16],
  [N.E4, 0.5, 'square', 0.16],
  [N.C4, 0.5, 'square', 0.16],
  [N.E4, 0.5, 'square', 0.18],
  [N.G4, 0.5, 'square', 0.20],
  [N.C5, 1.0, 'triangle', 0.25],
  [N.REST, 0.25, 'square', 0],
  [N.D5, 0.5, 'square', 0.20],
  [N.B4, 0.5, 'square', 0.18],
  [N.G4, 0.5, 'square', 0.16],
  [N.D4, 0.5, 'square', 0.16],
  [N.G4, 0.5, 'square', 0.18],
  [N.B4, 0.5, 'square', 0.20],
  [N.D5, 1.5, 'triangle', 0.25],
  [N.E5, 0.5, 'triangle', 0.26],
  [N.D5, 0.5, 'triangle', 0.24],
  [N.C5, 2.0, 'square', 0.22],
];

export const MELODY_BRISBANE_VICTORY = [
  [N.G4, 0.35, 'square', 0.20],
  [N.C5, 0.35, 'square', 0.22],
  [N.E5, 0.35, 'square', 0.24],
  [N.G5, 1.2, 'triangle', 0.28],
  [N.E5, 0.4, 'square', 0.22],
  [N.G5, 2.0, 'triangle', 0.30],
];

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

  /**
   * Play a procedural melody track array.
   * @param {Array} notes Array of [frequencyHz, durationSec, type, volume]
   * @param {number} [tempoBpm=135] Speed multiplier
   */
  playMelody(notes, tempoBpm = 135) {
    if (this.muted || !Array.isArray(notes)) return;
    this.unlock();
    if (!this.audioCtx) return;

    try {
      const beatDuration = 60 / tempoBpm;
      let startTime = this.audioCtx.currentTime + 0.05;

      notes.forEach(([freq, beats, waveType = 'square', volume = 0.15]) => {
        const duration = beats * beatDuration;

        if (freq > 0) {
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();

          osc.type = waveType;
          osc.frequency.setValueAtTime(freq, startTime);

          // 8-bit snappy ADSR envelope
          gain.gain.setValueAtTime(0.001, startTime);
          gain.gain.linearRampToValueAtTime(volume, startTime + 0.015);
          gain.gain.setValueAtTime(volume, startTime + duration - 0.03);
          gain.gain.linearRampToValueAtTime(0.0001, startTime + duration);

          osc.connect(gain);
          gain.connect(this.audioCtx.destination);

          osc.start(startTime);
          osc.stop(startTime + duration);
        }

        startTime += duration;
      });
    } catch {}
  }
}

export const sound = new AudioSynthesizer();
export const soundSynth = sound;

/**
 * Automatically select and play the thematic landmark melody.
 * @param {string} cartridgeId 'oregon_1848' | 'pacific_2026'
 * @param {string} waypointId The ID of the reached landmark
 */
export function playLandmarkTheme(cartridgeId, waypointId) {
  if (cartridgeId === 'oregon_1848') {
    if (waypointId === 'wp_indep') {
      sound.playMelody(MELODY_OH_SUSANNA, 140);
    } else if (waypointId.includes('fort') || waypointId.includes('kearney') || waypointId.includes('laramie')) {
      sound.playMelody(MELODY_YANKEE_DOODLE, 145);
    } else if (waypointId === 'wp_dalles' || waypointId === 'wp_willamette') {
      sound.playMelody(MELODY_WILLAMETTE_VICTORY, 130);
    } else {
      sound.playMelody(MELODY_OH_SUSANNA, 150);
    }
  } else if (cartridgeId === 'pacific_2026') {
    if (waypointId === 'wp_coffs') {
      sound.playMelody(MELODY_BIG_BANANA_JINGLE, 155);
    } else if (waypointId === 'wp_brisbane') {
      sound.playMelody(MELODY_BRISBANE_VICTORY, 140);
    } else if (waypointId === 'wp_port_mac' || waypointId === 'wp_ballina') {
      sound.playMelody(MELODY_DOWN_UNDER, 138);
    } else {
      sound.playMelody(MELODY_WALTZING_MATILDA, 130);
    }
  }
}
