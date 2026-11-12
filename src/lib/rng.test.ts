import { describe, expect, it } from 'vitest'
import { cryptoRng32, mulberry32, randomInt } from './rng'

describe('randomInt', () => {
  it('retorna 0 quando o intervalo tem apenas um valor', () => {
    expect(randomInt(1, () => 0)).toBe(0)
  })

  it('rejeita valores fora da faixa para evitar viés de módulo', () => {
    const values = [0xffff_ffff, 1]
    let index = 0
    const rng = () => values[index++] ?? 0
    expect(randomInt(3, rng)).toBe(1)
  })

  it('valida o limite', () => {
    expect(() => randomInt(0)).toThrow(RangeError)
    expect(() => randomInt(-1)).toThrow(RangeError)
    expect(() => randomInt(1.5)).toThrow(RangeError)
  })

  it('devolve sempre um inteiro dentro do intervalo', () => {
    const rng = mulberry32(42)
    for (let i = 0; i < 200; i += 1) {
      const value = randomInt(7, rng)
      expect(Number.isInteger(value)).toBe(true)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(7)
    }
  })
})

describe('mulberry32', () => {
  it('é determinístico para a mesma semente', () => {
    const first = mulberry32(123)
    const second = mulberry32(123)
    for (let i = 0; i < 10; i += 1) {
      expect(first()).toBe(second())
    }
  })

  it('gera inteiros de 32 bits', () => {
    const rng = mulberry32(7)
    for (let i = 0; i < 50; i += 1) {
      const value = rng()
      expect(Number.isInteger(value)).toBe(true)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(0x1_0000_0000)
    }
  })
})

describe('cryptoRng32', () => {
  it('gera inteiros de 32 bits', () => {
    for (let i = 0; i < 20; i += 1) {
      const value = cryptoRng32()
      expect(Number.isInteger(value)).toBe(true)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(0x1_0000_0000)
    }
  })
})
