import type { Session } from '../types'

const KEY = 'amigo-secreto:session:v2'

function isSession(value: unknown): value is Session {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  if (candidate.role === 'master') return true
  return (
    candidate.role === 'person' &&
    typeof candidate.personId === 'string' &&
    typeof candidate.passwordHash === 'string'
  )
}

export function loadSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isSession(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function saveSession(session: Session): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(session))
  } catch {
    // Sem armazenamento a pessoa só precisa entrar de novo na próxima visita.
  }
}

export function clearSession(): void {
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    // ignorado: nada para limpar.
  }
}
