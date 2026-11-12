export type Rng32 = () => number

const UINT32_RANGE = 0x1_0000_0000

export function randomInt(maxExclusive: number, rng: Rng32 = cryptoRng32): number {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
    throw new RangeError('maxExclusive precisa ser um inteiro positivo.')
  }

  const limit = Math.floor(UINT32_RANGE / maxExclusive) * maxExclusive
  let value = rng()
  while (value >= limit) value = rng()
  return value % maxExclusive
}

export function cryptoRng32(): number {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    return crypto.getRandomValues(new Uint32Array(1))[0]!
  }
  return Math.floor(Math.random() * UINT32_RANGE)
}

export function mulberry32(seed: number): Rng32 {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return (value ^ (value >>> 14)) >>> 0
  }
}
