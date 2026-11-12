import { describe, expect, it } from 'vitest'
import { newToken } from './ids'
import { formatPhone, normalizePhone, validatePhone } from './phone'

describe('normalizePhone', () => {
  it('mantém só dígitos e adiciona 55 em números brasileiros', () => {
    expect(normalizePhone('(11) 91234-5678')).toBe('5511912345678')
    expect(normalizePhone('11 1234-5678')).toBe('551112345678')
    expect(normalizePhone('+55 11 91234-5678')).toBe('5511912345678')
    expect(normalizePhone('011 91234-5678')).toBe('5511912345678')
  })

  it('não altera números que já têm código do país', () => {
    expect(normalizePhone('5511912345678')).toBe('5511912345678')
    expect(normalizePhone('+1 415 555 2671')).toBe('14155552671')
  })
})

describe('validatePhone', () => {
  it('exige o telefone', () => {
    expect(validatePhone('  ')).toBe('Informe o telefone do WhatsApp.')
  })

  it('rejeita números curtos ou longos demais', () => {
    expect(validatePhone('1234')).toContain('inválido')
    expect(validatePhone('1234567890123456')).toContain('inválido')
  })

  it('aceita celular e fixo brasileiros', () => {
    expect(validatePhone('(11) 91234-5678')).toBeNull()
    expect(validatePhone('(11) 1234-5678')).toBeNull()
  })
})

describe('formatPhone', () => {
  it('formata números brasileiros', () => {
    expect(formatPhone('5511912345678')).toBe('(11) 91234-5678')
    expect(formatPhone('551112345678')).toBe('(11) 1234-5678')
  })

  it('mostra outros países com +', () => {
    expect(formatPhone('14155552671')).toBe('+14155552671')
  })
})

describe('newToken', () => {
  it('gera tokens só com letras e dígitos, sem repetir', () => {
    const tokens = new Set(Array.from({ length: 200 }, () => newToken()))
    expect(tokens.size).toBe(200)
    for (const token of tokens) expect(token).toMatch(/^[A-Za-z0-9]{20}$/)
  })

  it('respeita o tamanho pedido', () => {
    expect(newToken(8)).toHaveLength(8)
  })
})
