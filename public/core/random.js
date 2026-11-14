/** Deterministic random source with a serializable state. */
export class Random {
  constructor(seed) {
    if (typeof seed === 'number') this.state = seed >>> 0;
    else {
      let hash = 2166136261;
      for (const character of String(seed)) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
      this.state = hash >>> 0;
    }
  }
  next() {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let value = this.state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }
  int(max) { return Math.floor(this.next() * max); }
}
