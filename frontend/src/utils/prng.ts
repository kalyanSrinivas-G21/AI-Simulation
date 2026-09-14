/**
 * Deterministic Mulberry32 PRNG for reproducible simulation runs per §14.
 */
export class PRNG {
  private s: number;

  constructor(seed: number = 1337) {
    this.s = Math.floor(seed) >>> 0;
  }

  /**
   * Returns pseudo-random float in [0, 1)
   */
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(this.s ^ (this.s >>> 15), 1 | this.s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Uniform float in [min, max)
   */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /**
   * Uniform integer in [min, max]
   */
  rangeInt(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /**
   * Derive an independent deterministic child PRNG for a subsystem
   */
  subsystem(offset: number): PRNG {
    return new PRNG((this.s * 10007 + offset * 1009) >>> 0);
  }
}
