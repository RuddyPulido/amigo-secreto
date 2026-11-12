import { useMemo } from 'react'
import type { Db } from '../data/db'
import {
  PATHS,
  parseCredentials,
  parseFamilies,
  parseIdSet,
  parsePeople,
  parseSettings,
} from '../data/parse'
import type { AppSettings, Credential, Family, Id, Person } from '../types'
import { useValue } from './useValue'

export interface MasterData {
  ready: boolean
  families: Family[]
  people: Person[]
  settings: AppSettings
  credentials: Record<Id, Credential>
  drawOpen: boolean
  // Só quem já sorteou: o organizador nunca recebe os pares.
  drawnIds: Set<Id>
  resetIds: Set<Id>
}

export function useMasterData(db: Db): MasterData {
  const families = useValue<unknown>(db, PATHS.families)
  const people = useValue<unknown>(db, PATHS.people)
  const settings = useValue<unknown>(db, PATHS.settings)
  const credentials = useValue<unknown>(db, PATHS.credentials)
  const open = useValue<boolean>(db, `${PATHS.draw}/open`)
  const drawn = useValue<unknown>(db, `${PATHS.draw}/drawn`)
  const resets = useValue<unknown>(db, PATHS.resets)

  const parsedFamilies = useMemo(() => parseFamilies(families.value), [families.value])
  const parsedPeople = useMemo(() => parsePeople(people.value), [people.value])
  const parsedSettings = useMemo(() => parseSettings(settings.value), [settings.value])
  const parsedCredentials = useMemo(
    () => parseCredentials(credentials.value),
    [credentials.value],
  )
  const drawnIds = useMemo(() => parseIdSet(drawn.value), [drawn.value])
  const resetIds = useMemo(() => parseIdSet(resets.value), [resets.value])

  return {
    ready:
      families.ready &&
      people.ready &&
      settings.ready &&
      credentials.ready &&
      open.ready &&
      drawn.ready &&
      resets.ready,
    families: parsedFamilies,
    people: parsedPeople,
    settings: parsedSettings,
    credentials: parsedCredentials,
    drawOpen: open.value === true,
    drawnIds,
    resetIds,
  }
}
