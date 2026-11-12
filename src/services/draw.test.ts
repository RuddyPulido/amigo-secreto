import { describe, expect, it } from 'vitest'
import { createMemoryDb } from '../data/memoryDb'
import { PATHS, parseAssignments } from '../data/parse'
import { mulberry32 } from '../lib/rng'
import { validateCompleteDraw } from '../lib/draw'
import type { Person } from '../types'
import { applyAdminAction } from './admin'
import { drawMyFriend } from './draw'
import {
  DEFAULT_PEOPLE,
  activateAll,
  seedGroup,
  type SeededPerson,
} from './testSeed'

function asPeople(list: SeededPerson[]): Person[] {
  return list.map(({ phone, ...person }) => {
    void phone
    return person
  })
}

async function openGroup(people: SeededPerson[] = DEFAULT_PEOPLE) {
  const db = createMemoryDb()
  await seedGroup(db, people)
  await activateAll(db, people)
  await applyAdminAction(db, { type: 'draw/setOpen', open: true })
  return db
}

describe('sorteio por pessoa', () => {
  it('só funciona depois que o organizador libera', async () => {
    const db = createMemoryDb()
    await seedGroup(db)
    await activateAll(db)

    const closed = await drawMyFriend(db, 'ana', mulberry32(1))
    expect(closed).toEqual({ ok: false, message: 'O sorteio ainda não foi liberado.' })
    expect(await db.get(`${PATHS.draw}/assignments`)).toBeNull()
  })

  it('rejeita quem não está cadastrado', async () => {
    const db = await openGroup()
    expect(await drawMyFriend(db, 'fantasma', mulberry32(1))).toMatchObject({ ok: false })
  })

  it('sorteia um alvo válido e registra quem já sorteou', async () => {
    const db = await openGroup()

    const result = await drawMyFriend(db, 'ana', mulberry32(3))

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.alreadyDrawn).toBe(false)
    expect(['caio', 'duda']).toContain(result.targetId)
    expect(await db.get(`${PATHS.draw}/assignments/ana`)).toBe(result.targetId)
    expect(await db.get(`${PATHS.draw}/drawn/ana`)).toBe(true)
  })

  it('sortear de novo devolve o mesmo resultado sem mudar nada', async () => {
    const db = await openGroup()
    const first = await drawMyFriend(db, 'ana', mulberry32(3))
    const second = await drawMyFriend(db, 'ana', mulberry32(777))

    expect(first.ok && second.ok).toBe(true)
    if (!first.ok || !second.ok) return
    expect(second.targetId).toBe(first.targetId)
    expect(second.alreadyDrawn).toBe(true)
  })

  it('todos sorteiam em qualquer ordem e o resultado é uma bijeção válida', async () => {
    const people = asPeople(DEFAULT_PEOPLE)
    for (const order of [
      ['ana', 'bia', 'caio', 'duda'],
      ['duda', 'caio', 'bia', 'ana'],
      ['caio', 'ana', 'duda', 'bia'],
    ]) {
      const db = await openGroup()
      const rng = mulberry32(order.join('').length + order[0]!.length)
      for (const id of order) {
        expect((await drawMyFriend(db, id, rng)).ok, id).toBe(true)
      }
      const assignments = parseAssignments(await db.get(`${PATHS.draw}/assignments`))
      expect(validateCompleteDraw(people, false, assignments)).toEqual([])
    }
  })

  it('sorteios simultâneos não colidem', async () => {
    const people = asPeople(DEFAULT_PEOPLE)
    const db = await openGroup()

    const results = await Promise.all(
      people.map((person, index) => drawMyFriend(db, person.id, mulberry32(index + 10))),
    )

    expect(results.every((result) => result.ok)).toBe(true)
    const assignments = parseAssignments(await db.get(`${PATHS.draw}/assignments`))
    expect(validateCompleteDraw(people, false, assignments)).toEqual([])
  })

  it('respeita a regra de crianças e adultos', async () => {
    const group: SeededPerson[] = [
      { id: 'a', name: 'A', familyId: 'f1', isChild: true, phone: '11911110001' },
      { id: 'b', name: 'B', familyId: 'f2', isChild: true, phone: '11911110002' },
      { id: 'c', name: 'C', familyId: 'f1', isChild: false, phone: '11911110003' },
      { id: 'd', name: 'D', familyId: 'f2', isChild: false, phone: '11911110004' },
    ]
    const db = createMemoryDb()
    await seedGroup(db, group)
    await activateAll(db, group)
    await applyAdminAction(db, { type: 'settings/setOnlyChildrenDrawChildren', value: true })
    await applyAdminAction(db, { type: 'draw/setOpen', open: true })

    const rng = mulberry32(8)
    for (const id of ['a', 'c', 'b', 'd']) await drawMyFriend(db, id, rng)

    const assignments = parseAssignments(await db.get(`${PATHS.draw}/assignments`))
    expect(assignments).toEqual({ a: 'b', b: 'a', c: 'd', d: 'c' })
  })

  it('após reiniciar e liberar de novo, dá para sortear outra vez', async () => {
    const db = await openGroup()
    await drawMyFriend(db, 'ana', mulberry32(3))

    await applyAdminAction(db, { type: 'draw/reset' })
    expect(await drawMyFriend(db, 'ana', mulberry32(3))).toMatchObject({ ok: false })

    await applyAdminAction(db, { type: 'draw/setOpen', open: true })
    expect((await drawMyFriend(db, 'ana', mulberry32(3))).ok).toBe(true)
  })

  it('a família inviável bloqueia o sorteio com mensagem', async () => {
    const db = await openGroup()
    await applyAdminAction(db, { type: 'person/remove', id: 'caio' })
    await applyAdminAction(db, { type: 'person/remove', id: 'duda' })
    await applyAdminAction(db, { type: 'draw/setOpen', open: false })
    // Libera de novo à força para simular estado inconsistente.
    await db.set(`${PATHS.draw}/open`, true)

    const result = await drawMyFriend(db, 'ana', mulberry32(1))
    expect(result.ok).toBe(false)
  })
})
