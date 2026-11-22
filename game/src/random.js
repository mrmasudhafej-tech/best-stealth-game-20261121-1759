// A small seeded random generator (mulberry32) so a ?seed=N run of the game
// always shuffles its patrol pauses the same way.

/** Return a function that yields deterministic pseudo-random numbers in [0, 1). */
export function createRandom(seed) {
  let state = (seed >>> 0) || 0x9e3779b9;
  return function nextRandom() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick an integer in [min, max] from a random function. */
export function randomInt(random, min, max) {
  return min + Math.floor(random() * (max - min + 1));
}
