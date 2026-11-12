import type { AppState, Assignments, Family, Person } from '../types'
import { isPairAllowed, validatePartialDraw } from './draw'
import {
  MAX_FAMILY_NAME_LENGTH,
  MAX_PERSON_NAME_LENGTH,
  normalizeName,
} from './validation'

export const STORAGE_KEY = 'amigo-secreto:state:v1'
export const CORRUPT_KEY_PREFIX = 'amigo-secreto:corrupt:'

const MAX_FAMILIES = 200
const MAX_PEOPLE = 500

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export type LoadNotice = 'corrupt' | 'draw-discarded' | 'unavailable' | null

export interface LoadResult {
  state: AppState
  notice: LoadNotice
}

export type SaveResult =
  | { ok: true }
  | { ok: false; reason: 'unavailable' | 'write-failed' }

export function createInitialState(): AppState {
  return {
    version: 1,
    families: [],
    people: [],
    settings: { allowSameFamily: false },
    draw: { assignments: {} },
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getDefaultStorage(): StorageLike | null {
  try {
    if (typeof window === 'undefined') return null
    return window.localStorage
  } catch {
    return null
  }
}

function backupCorrupt(storage: StorageLike, raw: string): void {
  try {
    storage.setItem(`${CORRUPT_KEY_PREFIX}${Date.now()}`, raw)
  } catch {
    // O backup é melhor esforço; nunca deve impedir o app de abrir.
  }
}

function sanitizeState(raw: unknown): LoadResult | null {
  if (!isRecord(raw) || raw.version !== 1) return null
  if (!Array.isArray(raw.families) || !Array.isArray(raw.people)) return null
  if (raw.families.length > MAX_FAMILIES || raw.people.length > MAX_PEOPLE) return null

  const families: Family[] = []
  const familyIds = new Set<string>()
  for (const item of raw.families) {
    if (!isRecord(item)) continue
    const { id, name } = item
    if (typeof id !== 'string' || id.length === 0) continue
    if (typeof name !== 'string') continue

    const normalized = normalizeName(name)
    if (!normalized || normalized.length > MAX_FAMILY_NAME_LENGTH) continue
    if (familyIds.has(id)) continue

    families.push({ id, name: normalized })
    familyIds.add(id)
  }

  const people: Person[] = []
  const personIds = new Set<string>()
  for (const item of raw.people) {
    if (!isRecord(item)) continue
    const { id, name, familyId } = item
    if (typeof id !== 'string' || id.length === 0) continue
    if (typeof name !== 'string' || typeof familyId !== 'string') continue

    const normalized = normalizeName(name)
    if (!normalized || normalized.length > MAX_PERSON_NAME_LENGTH) continue
    if (personIds.has(id) || !familyIds.has(familyId)) continue

    people.push({ id, name: normalized, familyId })
    personIds.add(id)
  }

  const allowSameFamily =
    isRecord(raw.settings) && raw.settings.allowSameFamily === true

  let assignments: Assignments = {}
  let notice: LoadNotice = null

  if (isRecord(raw.draw) && isRecord(raw.draw.assignments)) {
    const rawEntries = Object.entries(raw.draw.assignments)
    const peopleById = new Map(people.map((person) => [person.id, person]))
    const usedTargets = new Set<string>()
    const entries: Array<[string, string]> = []
    let invalid = false

    for (const [drawerId, targetValue] of rawEntries) {
      const drawer = peopleById.get(drawerId)
      const target =
        typeof targetValue === 'string' ? peopleById.get(targetValue) : undefined

      if (!drawer || !target || usedTargets.has(target.id)) {
        invalid = true
        break
      }
      if (!isPairAllowed(drawer, target, allowSameFamily)) {
        invalid = true
        break
      }

      entries.push([drawer.id, target.id])
      usedTargets.add(target.id)
    }

    if (!invalid && entries.length > 0) {
      const candidate: Assignments = Object.fromEntries(entries)
      if (validatePartialDraw(people, allowSameFamily, candidate).length > 0) {
        invalid = true
      }
    }

    if (invalid) {
      if (rawEntries.length > 0) notice = 'draw-discarded'
      assignments = {}
    } else {
      assignments = Object.fromEntries(entries)
    }
  }

  return {
    state: {
      version: 1,
      families,
      people,
      settings: { allowSameFamily },
      draw: { assignments },
    },
    notice,
  }
}

export function loadState(storage?: StorageLike): LoadResult {
  const store = storage ?? getDefaultStorage()
  if (!store) return { state: createInitialState(), notice: 'unavailable' }

  let raw: string | null
  try {
    raw = store.getItem(STORAGE_KEY)
  } catch {
    return { state: createInitialState(), notice: 'unavailable' }
  }

  if (!raw) return { state: createInitialState(), notice: null }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    backupCorrupt(store, raw)
    return { state: createInitialState(), notice: 'corrupt' }
  }

  const sanitized = sanitizeState(parsed)
  if (!sanitized) {
    backupCorrupt(store, raw)
    return { state: createInitialState(), notice: 'corrupt' }
  }

  return sanitized
}

export function saveState(state: AppState, storage?: StorageLike): SaveResult {
  const store = storage ?? getDefaultStorage()
  if (!store) return { ok: false, reason: 'unavailable' }

  try {
    store.setItem(STORAGE_KEY, JSON.stringify(state))
    return { ok: true }
  } catch {
    return { ok: false, reason: 'write-failed' }
  }
}
