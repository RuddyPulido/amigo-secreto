import { applyAdminAction } from './admin'
import { acceptInvite } from './auth'
import type { Db } from '../data/db'
import { PATHS } from '../data/parse'
import type { Credential, Id } from '../types'

export interface SeededPerson {
  id: Id
  name: string
  familyId: Id
  isChild: boolean
  phone: string
}

export const SEED_FAMILIES = [
  { id: 'f1', name: 'Silva' },
  { id: 'f2', name: 'Souza' },
] as const

export const DEFAULT_PEOPLE: SeededPerson[] = [
  { id: 'ana', name: 'Ana', familyId: 'f1', isChild: false, phone: '(11) 90000-0001' },
  { id: 'bia', name: 'Bia', familyId: 'f1', isChild: false, phone: '(11) 90000-0002' },
  { id: 'caio', name: 'Caio', familyId: 'f2', isChild: false, phone: '(11) 90000-0003' },
  { id: 'duda', name: 'Duda', familyId: 'f2', isChild: false, phone: '(11) 90000-0004' },
]

export async function seedGroup(
  db: Db,
  people: SeededPerson[] = DEFAULT_PEOPLE,
): Promise<void> {
  for (const family of SEED_FAMILIES) {
    await applyAdminAction(db, { type: 'family/add', family })
  }
  for (const { phone, ...person } of people) {
    const result = await applyAdminAction(db, { type: 'person/add', person, phone })
    if (!result.ok) throw new Error(result.message)
  }
}

export const PASSWORD = 'senha123'

export async function activateAll(db: Db, people: SeededPerson[] = DEFAULT_PEOPLE) {
  for (const person of people) {
    const credential = await db.get<Credential>(`${PATHS.credentials}/${person.id}`)
    const result = await acceptInvite(db, credential!.inviteToken!, PASSWORD)
    if (!result.ok) throw new Error(result.message)
  }
}
