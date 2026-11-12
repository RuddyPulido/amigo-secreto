import { describe, expect, it } from 'vitest'
import type { Family, Person } from '../types'
import {
  nameKey,
  normalizeName,
  validateFamilyChoice,
  validateFamilyName,
  validatePersonName,
} from './validation'

const families: Family[] = [
  { id: 'f1', name: 'Silva' },
  { id: 'f2', name: 'Souza' },
]

const people: Person[] = [
  { id: 'p1', name: 'Ana', familyId: 'f1' },
  { id: 'p2', name: 'Bia', familyId: 'f2' },
]

describe('normalizeName e nameKey', () => {
  it('remove espaços extras', () => {
    expect(normalizeName('  Ana   Maria  ')).toBe('Ana Maria')
  })

  it('compara nomes sem diferenciar maiúsculas', () => {
    expect(nameKey('ANA')).toBe(nameKey('ana'))
    expect(nameKey('  Ana  Maria ')).toBe(nameKey('ana maria'))
  })
})

describe('validateFamilyName', () => {
  it('exige um nome', () => {
    expect(validateFamilyName('   ', families)).toBe('Informe o nome da família.')
  })

  it('bloqueia nomes duplicados sem diferenciar maiúsculas', () => {
    expect(validateFamilyName('silva', families)).toBe(
      'Já existe uma família com esse nome.',
    )
  })

  it('permite o próprio nome ao editar', () => {
    expect(validateFamilyName('Silva', families, 'f1')).toBeNull()
  })

  it('limita o tamanho', () => {
    expect(validateFamilyName('a'.repeat(41), families)).toContain('40')
  })

  it('aceita um nome novo', () => {
    expect(validateFamilyName('  Oliveira  ', families)).toBeNull()
  })
})

describe('validatePersonName', () => {
  it('exige um nome', () => {
    expect(validatePersonName('  ', people)).toBe('Informe o nome da pessoa.')
  })

  it('bloqueia nomes duplicados', () => {
    expect(validatePersonName('ana', people)).toBe('Já existe uma pessoa com esse nome.')
  })

  it('permite o próprio nome ao editar', () => {
    expect(validatePersonName('Ana', people, 'p1')).toBeNull()
  })

  it('limita o tamanho', () => {
    expect(validatePersonName('a'.repeat(61), people)).toContain('60')
  })
})

describe('validateFamilyChoice', () => {
  it('exige uma família', () => {
    expect(validateFamilyChoice('', families)).toBe('Escolha uma família.')
  })

  it('rejeita família inexistente', () => {
    expect(validateFamilyChoice('f9', families)).toBe('Escolha uma família válida.')
  })

  it('aceita família existente', () => {
    expect(validateFamilyChoice('f2', families)).toBeNull()
  })
})
