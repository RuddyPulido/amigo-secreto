import type { Family, Person } from '../types'

export const MAX_FAMILY_NAME_LENGTH = 40
export const MAX_PERSON_NAME_LENGTH = 60

export function normalizeName(value: string): string {
  return value.normalize('NFC').trim().replace(/\s+/g, ' ')
}

export function nameKey(value: string): string {
  // Sem acentos nem maiúsculas: "João" e "joao" são o mesmo nome (o login é pelo nome).
  return normalizeName(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
}

export function validateFamilyName(
  value: string,
  families: readonly Family[],
  ignoreId?: string,
): string | null {
  const name = normalizeName(value)
  if (!name) return 'Informe o nome da família.'
  if (name.length > MAX_FAMILY_NAME_LENGTH) {
    return `O nome da família deve ter no máximo ${MAX_FAMILY_NAME_LENGTH} caracteres.`
  }

  const key = nameKey(name)
  if (families.some((family) => family.id !== ignoreId && nameKey(family.name) === key)) {
    return 'Já existe uma família com esse nome.'
  }
  return null
}

export function validatePersonName(
  value: string,
  people: readonly Person[],
  ignoreId?: string,
): string | null {
  const name = normalizeName(value)
  if (!name) return 'Informe o nome da pessoa.'
  if (name.length > MAX_PERSON_NAME_LENGTH) {
    return `O nome da pessoa deve ter no máximo ${MAX_PERSON_NAME_LENGTH} caracteres.`
  }

  const key = nameKey(name)
  if (key === 'admin') return 'Esse nome é reservado ao organizador.'
  if (people.some((person) => person.id !== ignoreId && nameKey(person.name) === key)) {
    return 'Já existe uma pessoa com esse nome.'
  }
  return null
}

export function validateFamilyChoice(
  familyId: string,
  families: readonly Family[],
): string | null {
  if (!familyId) return 'Escolha uma família.'
  if (!families.some((family) => family.id === familyId)) return 'Escolha uma família válida.'
  return null
}
