import type { Db } from '../data/db'
import { PATHS, parseDraw, parsePeople, parseFamilies, parseSettings } from '../data/parse'
import { checkFeasibility } from '../lib/draw'
import { newToken } from '../lib/ids'
import { normalizePhone, validatePhone } from '../lib/phone'
import type { Credential, Family, Id, Person } from '../types'

export type AdminAction =
  | { type: 'family/add'; family: Family }
  | { type: 'family/rename'; id: Id; name: string }
  | { type: 'family/remove'; id: Id }
  | { type: 'person/add'; person: Person; phone: string }
  | {
      type: 'person/update'
      id: Id
      name: string
      familyId: Id
      isChild: boolean
      phone: string
    }
  | { type: 'person/remove'; id: Id }
  | { type: 'settings/setAllowSameFamily'; allow: boolean }
  | { type: 'settings/setOnlyChildrenDrawChildren'; value: boolean }
  | { type: 'draw/setOpen'; open: boolean }
  | { type: 'draw/reset' }

export type AdminResult = { ok: true } | { ok: false; message: string }

const OK: AdminResult = { ok: true }

function fail(message: string): AdminResult {
  return { ok: false, message }
}

// Reiniciar apaga os resultados e fecha o sorteio; cadastros e senhas continuam.
const RESET_DRAW: Record<string, null | boolean> = {
  [`${PATHS.draw}/assignments`]: null,
  [`${PATHS.draw}/drawn`]: null,
  [`${PATHS.draw}/open`]: false,
}

// Usada pela interface para pedir confirmação antes de uma ação que descarta o sorteio.
export function wouldResetDraw(
  snapshot: { people: readonly Person[]; hasDraws: boolean },
  action: AdminAction,
): boolean {
  if (!snapshot.hasDraws) return false

  switch (action.type) {
    case 'person/add':
    case 'person/remove':
    case 'settings/setAllowSameFamily':
    case 'settings/setOnlyChildrenDrawChildren':
    case 'draw/reset':
      return true
    case 'person/update': {
      const existing = snapshot.people.find((person) => person.id === action.id)
      return (
        !!existing &&
        (existing.familyId !== action.familyId || existing.isChild !== action.isChild)
      )
    }
    default:
      return false
  }
}

async function hasDraws(db: Db): Promise<boolean> {
  return (await db.get(`${PATHS.draw}/drawn`)) !== null
}

export async function applyAdminAction(db: Db, action: AdminAction): Promise<AdminResult> {
  switch (action.type) {
    case 'family/add': {
      await db.set(`${PATHS.families}/${action.family.id}`, { name: action.family.name })
      return OK
    }

    case 'family/rename': {
      await db.set(`${PATHS.families}/${action.id}/name`, action.name)
      return OK
    }

    case 'family/remove': {
      const people = parsePeople(await db.get(PATHS.people))
      if (people.some((person) => person.familyId === action.id)) {
        return fail('Exclua ou mova as pessoas dessa família antes de excluí-la.')
      }
      await db.set(`${PATHS.families}/${action.id}`, null)
      return OK
    }

    case 'person/add': {
      const phone = normalizePhone(action.phone)
      const phoneError = validatePhone(action.phone)
      if (phoneError) return fail(phoneError)

      const token = newToken()
      await db.update({
        [`${PATHS.people}/${action.person.id}`]: {
          name: action.person.name,
          familyId: action.person.familyId,
          isChild: action.person.isChild,
        },
        [`${PATHS.credentials}/${action.person.id}`]: { phone, inviteToken: token },
        [`${PATHS.phones}/${phone}/${action.person.id}`]: true,
        [`${PATHS.invites}/${token}`]: action.person.id,
        ...((await hasDraws(db)) ? RESET_DRAW : {}),
      })
      return OK
    }

    case 'person/update': {
      const people = parsePeople(await db.get(PATHS.people))
      const existing = people.find((person) => person.id === action.id)
      if (!existing) return fail('Pessoa não encontrada.')

      const phone = normalizePhone(action.phone)
      const phoneError = validatePhone(action.phone)
      if (phoneError) return fail(phoneError)

      const credential = await db.get<Credential>(`${PATHS.credentials}/${action.id}`)
      const phoneChanged = credential?.phone !== phone

      const constraintsChanged =
        existing.familyId !== action.familyId || existing.isChild !== action.isChild

      await db.update({
        [`${PATHS.people}/${action.id}`]: {
          name: action.name,
          familyId: action.familyId,
          isChild: action.isChild,
        },
        ...(phoneChanged
          ? {
              ...(credential
                ? { [`${PATHS.phones}/${credential.phone}/${action.id}`]: null }
                : {}),
              [`${PATHS.phones}/${phone}/${action.id}`]: true,
              [`${PATHS.credentials}/${action.id}/phone`]: phone,
            }
          : {}),
        ...(constraintsChanged && (await hasDraws(db)) ? RESET_DRAW : {}),
      })
      return OK
    }

    case 'person/remove': {
      const credential = await db.get<Credential>(`${PATHS.credentials}/${action.id}`)
      await db.update({
        [`${PATHS.people}/${action.id}`]: null,
        [`${PATHS.credentials}/${action.id}`]: null,
        [`${PATHS.resets}/${action.id}`]: null,
        ...(credential
          ? {
              [`${PATHS.phones}/${credential.phone}/${action.id}`]: null,
              ...(credential.inviteToken
                ? { [`${PATHS.invites}/${credential.inviteToken}`]: null }
                : {}),
            }
          : {}),
        ...((await hasDraws(db)) ? RESET_DRAW : {}),
      })
      return OK
    }

    case 'settings/setAllowSameFamily': {
      await db.update({
        [`${PATHS.settings}/allowSameFamily`]: action.allow,
        ...((await hasDraws(db)) ? RESET_DRAW : {}),
      })
      return OK
    }

    case 'settings/setOnlyChildrenDrawChildren': {
      await db.update({
        [`${PATHS.settings}/onlyChildrenDrawChildren`]: action.value,
        ...((await hasDraws(db)) ? RESET_DRAW : {}),
      })
      return OK
    }

    case 'draw/setOpen': {
      if (action.open) {
        const [people, families, settings, draw] = await Promise.all([
          db.get(PATHS.people),
          db.get(PATHS.families),
          db.get(PATHS.settings),
          db.get(PATHS.draw),
        ])
        const parsedSettings = parseSettings(settings)
        const feasibility = checkFeasibility(
          parsePeople(people),
          parseFamilies(families),
          parsedSettings.allowSameFamily,
          parseDraw(draw).assignments,
          parsedSettings.onlyChildrenDrawChildren,
        )
        if (!feasibility.ok) return fail(feasibility.message)
      }
      await db.set(`${PATHS.draw}/open`, action.open)
      return OK
    }

    case 'draw/reset': {
      await db.update(RESET_DRAW)
      return OK
    }
  }
}
