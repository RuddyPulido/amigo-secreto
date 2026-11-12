import { sha256Hex } from '../lib/sha256'

// Acesso pensado para um grupo de amigos, não para segurança: a senha do master é conferida
// no próprio navegador, então o hash abaixo é público junto com o código do site.
export const MASTER_USERNAME = 'admin'
const MASTER_PASSWORD_HASH =
  'ce907dea6b723fced8976336955a0e8df1b5d2c07f92bf9f556cc8ce9a5a148f'

export function hashMasterPassword(password: string): string {
  return sha256Hex(`amigo-secreto:master:${password}`)
}

export function hashPersonPassword(personId: string, password: string): string {
  return sha256Hex(`amigo-secreto:${personId}:${password}`)
}

export function isMasterLogin(identifier: string, password: string): boolean {
  return (
    identifier.trim().toLowerCase() === MASTER_USERNAME &&
    hashMasterPassword(password) === MASTER_PASSWORD_HASH
  )
}

export function isMasterIdentifier(identifier: string): boolean {
  return identifier.trim().toLowerCase() === MASTER_USERNAME
}

export const MIN_PASSWORD_LENGTH = 4

export function validatePassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`
  }
  return null
}
