import type { Db } from '../data/db'
import { PATHS, parsePeople, parseSettings } from '../data/parse'
import { drawForPerson } from '../lib/draw'
import type { Rng32 } from '../lib/rng'
import type { Assignments, Id } from '../types'

export type PersonDrawResult =
  | { ok: true; targetId: Id; alreadyDrawn: boolean }
  | { ok: false; message: string }

interface RawDraw {
  open?: boolean
  assignments?: Assignments
  drawn?: Record<Id, true>
}

const EMPTY_DRAW: RawDraw = { open: false }

// O sorteio de cada pessoa roda numa transação sobre `state/draw`, então dois celulares
// sorteando ao mesmo tempo nunca escolhem o mesmo alvo nem deixam o restante sem saída.
export async function drawMyFriend(
  db: Db,
  personId: Id,
  rng?: Rng32,
): Promise<PersonDrawResult> {
  const [peopleRaw, settingsRaw] = await Promise.all([
    db.get(PATHS.people),
    db.get(PATHS.settings),
  ])
  const people = parsePeople(peopleRaw)
  const settings = parseSettings(settingsRaw)

  if (!people.some((person) => person.id === personId)) {
    return { ok: false, message: 'Seu cadastro não foi encontrado. Fale com o organizador.' }
  }

  let handlerError: string | null = null
  const result = await db.transaction<RawDraw>(PATHS.draw, (current) => {
    // Primeira chamada com null é só um palpite do cliente; devolver um valor faz o
    // Firebase reexecutar com o dado real do servidor.
    if (current === null) return EMPTY_DRAW
    if (!current.open) return undefined

    const assignments = current.assignments ?? {}
    if (Object.hasOwn(assignments, personId)) return undefined

    const outcome = drawForPerson(
      people,
      settings.allowSameFamily,
      assignments,
      personId,
      rng,
      settings.onlyChildrenDrawChildren,
    )
    if (!outcome.ok) {
      handlerError = outcome.message
      return undefined
    }

    return {
      ...current,
      assignments: { ...assignments, [personId]: outcome.targetId },
      drawn: { ...(current.drawn ?? {}), [personId]: true },
    }
  })

  const final = result.value
  const targetId = final?.assignments?.[personId]
  if (targetId) return { ok: true, targetId, alreadyDrawn: !result.committed }

  if (!final?.open) return { ok: false, message: 'O sorteio ainda não foi liberado.' }
  return {
    ok: false,
    message: handlerError ?? 'Não foi possível sortear agora. Avise o organizador.',
  }
}
