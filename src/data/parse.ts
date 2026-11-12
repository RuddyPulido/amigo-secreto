import type {
  AppSettings,
  Assignments,
  Credential,
  DrawState,
  Family,
  Id,
  Person,
} from '../types'

export const PATHS = {
  families: 'state/families',
  people: 'state/people',
  settings: 'state/settings',
  draw: 'state/draw',
  credentials: 'auth/credentials',
  invites: 'auth/invites',
  resets: 'auth/resets',
} as const

const collator = new Intl.Collator('pt-BR', { sensitivity: 'base' })

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseFamilies(raw: unknown): Family[] {
  if (!isRecord(raw)) return []
  const families: Family[] = []
  for (const [id, value] of Object.entries(raw)) {
    if (isRecord(value) && typeof value.name === 'string') {
      families.push({ id, name: value.name })
    }
  }
  return families.sort((a, b) => collator.compare(a.name, b.name))
}

export function parsePeople(raw: unknown): Person[] {
  if (!isRecord(raw)) return []
  const people: Person[] = []
  for (const [id, value] of Object.entries(raw)) {
    if (
      isRecord(value) &&
      typeof value.name === 'string' &&
      typeof value.familyId === 'string'
    ) {
      people.push({
        id,
        name: value.name,
        familyId: value.familyId,
        isChild: value.isChild === true,
      })
    }
  }
  return people.sort((a, b) => collator.compare(a.name, b.name))
}

export function parseSettings(raw: unknown): AppSettings {
  const value = isRecord(raw) ? raw : {}
  return {
    allowSameFamily: value.allowSameFamily === true,
    onlyChildrenDrawChildren: value.onlyChildrenDrawChildren === true,
  }
}

export function parseCredentials(raw: unknown): Record<Id, Credential> {
  if (!isRecord(raw)) return {}
  const credentials: Record<Id, Credential> = {}
  for (const [id, value] of Object.entries(raw)) {
    if (!isRecord(value) || typeof value.phone !== 'string') continue
    credentials[id] = {
      phone: value.phone,
      passwordHash: typeof value.passwordHash === 'string' ? value.passwordHash : undefined,
      inviteToken: typeof value.inviteToken === 'string' ? value.inviteToken : undefined,
    }
  }
  return credentials
}

export function parseAssignments(raw: unknown): Assignments {
  if (!isRecord(raw)) return {}
  const assignments: Assignments = {}
  for (const [drawerId, targetId] of Object.entries(raw)) {
    if (typeof targetId === 'string') assignments[drawerId] = targetId
  }
  return assignments
}

export function parseDraw(raw: unknown): DrawState {
  const value = isRecord(raw) ? raw : {}
  const drawn: Record<Id, true> = {}
  if (isRecord(value.drawn)) {
    for (const id of Object.keys(value.drawn)) drawn[id] = true
  }
  return {
    open: value.open === true,
    assignments: parseAssignments(value.assignments),
    drawn,
  }
}

export function parseIdSet(raw: unknown): Set<Id> {
  return new Set(isRecord(raw) ? Object.keys(raw) : [])
}
