/**
 * Seeded Mulberry32 Pseudorandom Number Generator (PRNG).
 * Provides deterministic random sequence generation with state save/restore capabilities.
 */
export class PRNG {
  /**
   * @param {number} [seed=18482026] 32-bit integer seed
   */
  constructor(seed = 18482026) {
    this.seed = (seed >>> 0) || 1;
    this.state = this.seed;
  }

  /**
   * Advances the generator and returns a float in [0, 1).
   * @returns {number}
   */
  next() {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generates a random number in range [min, max).
   * @param {number} min
   * @param {number} max
   * @param {boolean} [asFloat=false]
   * @returns {number}
   */
  range(min, max, asFloat = false) {
    const val = min + this.next() * (max - min);
    return asFloat ? val : Math.floor(val);
  }

  /**
   * Picks a random element from an array.
   * @template T
   * @param {T[]} array
   * @returns {T|null}
   */
  pick(array) {
    if (!array || array.length === 0) return null;
    return array[Math.floor(this.next() * array.length)];
  }

  /**
   * Rolls a 1d100 value in [1, 100].
   * @returns {number}
   */
  d100() {
    return Math.floor(this.next() * 100) + 1;
  }

  /**
   * Serializes current PRNG state.
   * @returns {{seed: number, state: number}}
   */
  getState() {
    return {
      seed: this.seed,
      state: this.state,
    };
  }

  /**
   * Restores PRNG state from saved object.
   * @param {{seed?: number, state?: number}} saved
   */
  setState(saved) {
    if (saved && typeof saved.state === 'number') {
      this.seed = (saved.seed >>> 0) || 1;
      this.state = saved.state >>> 0;
    }
  }
}
