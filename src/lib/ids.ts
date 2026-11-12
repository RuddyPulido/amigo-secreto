import { randomInt } from './rng'

export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

// Sem caracteres ambíguos (0/O, 1/l/I) e só letras/dígitos: serve como chave do Firebase e em URL.
const TOKEN_ALPHABET = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function newToken(length = 20): string {
  let token = ''
  for (let i = 0; i < length; i += 1) {
    token += TOKEN_ALPHABET[randomInt(TOKEN_ALPHABET.length)]
  }
  return token
}
