import { describe, expect, it } from 'vitest'
import type { Assignments, Family, Person } from '../types'
import {
  buildAllowed,
  checkFeasibility,
  drawForPerson,
  getRemainingDrawers,
  getRemainingTargets,
  hasPerfectMatching,
  isPairAllowed,
  listViableTargets,
  validateCompleteDraw,
  validatePartialDraw,
} from './draw'
import { mulberry32 } from './rng'

function makeWorld(groups: string[][]): { families: Family[]; people: Person[] } {
  const families = groups.map((_, index) => ({
    id: `f${index}`,
    name: `Família ${index + 1}`,
  }))
  const people = groups.flatMap((names, index) =>
    names.map((name) => ({
      id: name.toLowerCase(),
      name,
      familyId: `f${index}`,
      isChild: false,
    })),
  )
  return { families, people }
}

function makeAgeWorld(
  groups: string[][],
  childNames: readonly string[],
): { families: Family[]; people: Person[] } {
  const world = makeWorld(groups)
  return {
    families: world.families,
    people: world.people.map((person) => ({
      ...person,
      isChild: childNames.includes(person.name),
    })),
  }
}

describe('regras de par', () => {
  const ana = { id: 'ana', name: 'Ana', familyId: 'f1', isChild: false }
  const bia = { id: 'bia', name: 'Bia', familyId: 'f1', isChild: false }
  const caio = { id: 'caio', name: 'Caio', familyId: 'f2', isChild: false }

  it('proíbe a própria pessoa', () => {
    expect(isPairAllowed(ana, ana, true)).toBe(false)
    expect(isPairAllowed(ana, ana, false)).toBe(false)
  })

  it('proíbe a mesma família com a regra desligada', () => {
    expect(isPairAllowed(ana, bia, false)).toBe(false)
  })

  it('permite a mesma família com a regra ligada', () => {
    expect(isPairAllowed(ana, bia, true)).toBe(true)
  })

  it('permite famílias diferentes', () => {
    expect(isPairAllowed(ana, caio, false)).toBe(true)
  })
})

describe('buildAllowed e matching', () => {
  it('monta as arestas permitidas', () => {
    const { people } = makeWorld([['a', 'b'], ['c']])
    const allowed = buildAllowed(people, false)
    expect(allowed.get('a')?.has('b')).toBe(false)
    expect(allowed.get('a')?.has('c')).toBe(true)
    expect(allowed.get('a')?.has('a')).toBe(false)
  })

  it('detecta emparelhamento perfeito', () => {
    const { people } = makeWorld([['a', 'b'], ['c', 'd']])
    const allowed = buildAllowed(people, false)
    const ids = people.map((person) => person.id)
    expect(hasPerfectMatching(ids, ids, allowed)).toBe(true)
  })

  it('rejeita emparelhamento impossível', () => {
    const { people } = makeWorld([['a', 'b'], ['c']])
    const allowed = buildAllowed(people, false)
    const ids = people.map((person) => person.id)
    expect(hasPerfectMatching(ids, ids, allowed)).toBe(false)
  })
})

describe('viabilidade inicial', () => {
  it('exige pelo menos duas pessoas', () => {
    expect(checkFeasibility([], [], false, {})).toMatchObject({
      ok: false,
      code: 'NOT_ENOUGH_PEOPLE',
    })
    const one = makeWorld([['a']])
    expect(checkFeasibility(one.people, one.families, true, {})).toMatchObject({
      ok: false,
      code: 'NOT_ENOUGH_PEOPLE',
    })
  })

  it('aceita duas pessoas de famílias diferentes com a regra desligada', () => {
    const { families, people } = makeWorld([['a'], ['b']])
    expect(checkFeasibility(people, families, false, {})).toEqual({ ok: true })
  })

  it('rejeita duas pessoas da mesma família com a regra desligada', () => {
    const { families, people } = makeWorld([['a', 'b']])
    const result = checkFeasibility(people, families, false, {})
    expect(result).toMatchObject({ ok: false, code: 'TOO_MANY_SAME_FAMILY', familyId: 'f0' })
    if (!result.ok) {
      expect(result.message).toContain('Família 1')
      expect(result.message).toContain('metade')
    }
  })

  it('rejeita 3+1 pessoas com a regra desligada', () => {
    const { families, people } = makeWorld([['a', 'b', 'c'], ['d']])
    expect(checkFeasibility(people, families, false, {})).toMatchObject({
      ok: false,
      code: 'TOO_MANY_SAME_FAMILY',
    })
  })

  it('aceita famílias 2+2 com a regra desligada', () => {
    const { families, people } = makeWorld([['a', 'b'], ['c', 'd']])
    expect(checkFeasibility(people, families, false, {})).toEqual({ ok: true })
  })

  it('aceita famílias 2+2+2 com a regra desligada', () => {
    const { families, people } = makeWorld([['a', 'b'], ['c', 'd'], ['e', 'f']])
    expect(checkFeasibility(people, families, false, {})).toEqual({ ok: true })
  })

  it('com a regra ligada, qualquer grupo com 2+ pessoas é viável', () => {
    const sameFamily = makeWorld([['a', 'b', 'c']])
    expect(
      checkFeasibility(sameFamily.people, sameFamily.families, true, {}),
    ).toEqual({ ok: true })
  })

  it('aceita um estado parcial que ainda pode ser concluído', () => {
    const { families, people } = makeWorld([['a', 'b'], ['c', 'd']])
    expect(checkFeasibility(people, families, false, { a: 'c' })).toEqual({ ok: true })
  })

  it('rejeita um estado parcial sem conclusão possível', () => {
    const { families, people } = makeWorld([['a'], ['b'], ['c1', 'c2']])
    expect(checkFeasibility(people, families, false, { a: 'b' })).toMatchObject({
      ok: false,
      code: 'NO_PERFECT_MATCHING',
    })
  })
})

describe('pendências', () => {
  it('não remove do lado esquerdo quem foi apenas sorteado', () => {
    const { people } = makeWorld([['a'], ['b'], ['c']])
    const assignments: Assignments = { a: 'b' }
    expect(getRemainingDrawers(people, assignments).map((person) => person.id)).toEqual([
      'b',
      'c',
    ])
    expect(getRemainingTargets(people, assignments).map((person) => person.id)).toEqual([
      'a',
      'c',
    ])
  })
})

describe('alvos viáveis', () => {
  it('com regra ligada, evita alvo que deixaria o restante sem saída', () => {
    const { people } = makeWorld([['a', 'b', 'c']])
    const viable = listViableTargets(people, true, { a: 'b' }, 'b')
    expect(viable.map((person) => person.id)).toEqual(['c'])
  })

  it('com regra desligada, evita alvo que deixaria o restante sem saída', () => {
    const { people } = makeWorld([['a'], ['b'], ['c1', 'c2']])
    const viable = listViableTargets(people, false, {}, 'a')
    expect(viable.map((person) => person.id)).toEqual(['c1', 'c2'])
  })

  it('não oferece alvos para quem já sorteou', () => {
    const { people } = makeWorld([['a'], ['b'], ['c']])
    expect(listViableTargets(people, true, { a: 'b' }, 'a')).toEqual([])
  })
})

describe('drawForPerson', () => {
  it('sorteia o único alvo viável', () => {
    const { people } = makeWorld([['a', 'b', 'c']])
    const outcome = drawForPerson(people, true, { a: 'b' }, 'b', mulberry32(1))
    expect(outcome).toEqual({ ok: true, targetId: 'c' })
  })

  it('rejeita pessoa que já sorteou', () => {
    const { people } = makeWorld([['a'], ['b'], ['c']])
    expect(drawForPerson(people, true, { a: 'b' }, 'a', mulberry32(1))).toMatchObject({
      ok: false,
      code: 'ALREADY_DRAWN',
    })
  })

  it('rejeita pessoa inexistente', () => {
    const { people } = makeWorld([['a'], ['b']])
    expect(drawForPerson(people, true, {}, 'x', mulberry32(1))).toMatchObject({
      ok: false,
      code: 'NOT_A_PARTICIPANT',
    })
  })

  it('rejeita estado inviável', () => {
    const { people } = makeWorld([['a', 'b']])
    expect(drawForPerson(people, false, {}, 'a', mulberry32(1))).toMatchObject({
      ok: false,
      code: 'NOT_FEASIBLE',
    })
  })

  it('é determinístico com a mesma semente', () => {
    const { people } = makeWorld([['a', 'b', 'c']])
    const first = drawForPerson(people, true, {}, 'a', mulberry32(11))
    const second = drawForPerson(people, true, {}, 'a', mulberry32(11))
    expect(first).toEqual(second)
    expect(first.ok).toBe(true)
  })

  it('nunca sorteia a si mesmo nem a própria família', () => {
    const { people } = makeWorld([
      ['a', 'b', 'c'],
      ['d', 'e', 'f'],
    ])
    const assignments: Assignments = {}
    const rng = mulberry32(2024)

    for (const person of people) {
      const outcome = drawForPerson(people, false, assignments, person.id, rng)
      expect(outcome.ok).toBe(true)
      if (!outcome.ok) return
      expect(outcome.targetId).not.toBe(person.id)
      const target = people.find((candidate) => candidate.id === outcome.targetId)
      expect(target?.familyId).not.toBe(person.familyId)
      expect(Object.values(assignments)).not.toContain(outcome.targetId)
      assignments[person.id] = outcome.targetId
      expect(validatePartialDraw(people, false, assignments)).toEqual([])
    }

    expect(validateCompleteDraw(people, false, assignments)).toEqual([])
  })
})

describe('validação de sorteios', () => {
  it('aceita um sorteio completo válido', () => {
    const { people } = makeWorld([['a'], ['b']])
    expect(validateCompleteDraw(people, false, { a: 'b', b: 'a' })).toEqual([])
  })

  it('detecta auto-sorteio', () => {
    const { people } = makeWorld([['a'], ['b']])
    expect(validatePartialDraw(people, false, { a: 'a' })).toContain(
      'Há um par inválido no sorteio.',
    )
  })

  it('detecta alvo repetido', () => {
    const { people } = makeWorld([['a'], ['b'], ['c']])
    expect(validatePartialDraw(people, true, { a: 'c', b: 'c' })).toContain(
      'A mesma pessoa foi sorteada mais de uma vez.',
    )
  })

  it('detecta referência inexistente', () => {
    const { people } = makeWorld([['a'], ['b']])
    expect(validatePartialDraw(people, false, { a: 'x' })).toContain(
      'A pessoa sorteada não existe mais.',
    )
  })

  it('detecta restrição de família', () => {
    const { people } = makeWorld([['a', 'b']])
    expect(validatePartialDraw(people, false, { a: 'b', b: 'a' })).toContain(
      'Há um par inválido no sorteio.',
    )
  })

  it('detecta restante sem emparelhamento', () => {
    const { people } = makeWorld([['a'], ['b'], ['c1', 'c2']])
    expect(validatePartialDraw(people, false, { a: 'b' })).toContain(
      'O sorteio restante não pode ser concluído.',
    )
  })

  it('detecta sorteio incompleto', () => {
    const { people } = makeWorld([['a'], ['b']])
    expect(validateCompleteDraw(people, false, { a: 'b' })).toContain(
      'O sorteio ainda não foi concluído.',
    )
  })
})

describe('separação por idade', () => {
  it('permite criança–criança e adulto–adulto, mas bloqueia criança–adulto', () => {
    const childA = { id: 'a', name: 'A', familyId: 'f1', isChild: true }
    const childB = { id: 'b', name: 'B', familyId: 'f2', isChild: true }
    const adult = { id: 'c', name: 'C', familyId: 'f2', isChild: false }

    expect(isPairAllowed(childA, childB, false, true)).toBe(true)
    expect(isPairAllowed(childA, adult, false, true)).toBe(false)
    expect(isPairAllowed(adult, childA, false, true)).toBe(false)
    expect(isPairAllowed(childA, adult, false, false)).toBe(true)
  })

  it('exige pelo menos 2 crianças e 2 adultos quando a regra está ligada', () => {
    const oneChild = makeAgeWorld([['a'], ['b'], ['c']], ['a'])
    const childResult = checkFeasibility(
      oneChild.people,
      oneChild.families,
      false,
      {},
      true,
    )
    expect(childResult).toMatchObject({
      ok: false,
      code: 'AGE_GROUP_TOO_SMALL',
    })
    if (!childResult.ok) expect(childResult.message).toContain('1 criança')

    const oneAdult = makeAgeWorld([['a'], ['b'], ['c']], ['a', 'b'])
    const adultResult = checkFeasibility(
      oneAdult.people,
      oneAdult.families,
      false,
      {},
      true,
    )
    expect(adultResult).toMatchObject({
      ok: false,
      code: 'AGE_GROUP_TOO_SMALL',
    })
    if (!adultResult.ok) expect(adultResult.message).toContain('1 adulto')
  })

  it('aceita grupos de crianças e adultos em famílias diferentes', () => {
    const { families, people } = makeAgeWorld(
      [['a'], ['b'], ['c'], ['d']],
      ['a', 'b'],
    )
    expect(checkFeasibility(people, families, false, {}, true)).toEqual({
      ok: true,
    })
  })

  it('rejeita família grande dentro do grupo de crianças', () => {
    const { families, people } = makeAgeWorld(
      [['a', 'b'], ['c'], ['d']],
      ['a', 'b'],
    )
    const result = checkFeasibility(people, families, false, {}, true)
    expect(result).toMatchObject({
      ok: false,
      code: 'AGE_GROUP_FAMILY_TOO_LARGE',
      familyId: 'f0',
    })
    if (!result.ok) {
      expect(result.message).toContain('crianças')
      expect(result.message).toContain('Família 1')
    }
  })

  it('permite família grande dentro do grupo quando familiares podem se sortear', () => {
    const { families, people } = makeAgeWorld(
      [['a', 'b'], ['c', 'd']],
      ['a', 'b'],
    )
    expect(checkFeasibility(people, families, true, {}, true)).toEqual({
      ok: true,
    })
  })

  it('sorteia apenas dentro do mesmo grupo de idade', () => {
    const { people } = makeAgeWorld(
      [['a'], ['b'], ['c'], ['d'], ['e'], ['f']],
      ['a', 'b', 'c'],
    )
    const assignments: Assignments = {}
    const rng = mulberry32(99)

    for (const person of people) {
      const outcome = drawForPerson(
        people,
        false,
        assignments,
        person.id,
        rng,
        true,
      )
      expect(outcome.ok).toBe(true)
      if (!outcome.ok) return

      const target = people.find((candidate) => candidate.id === outcome.targetId)
      expect(target?.isChild).toBe(person.isChild)
      expect(Object.values(assignments)).not.toContain(outcome.targetId)
      assignments[person.id] = outcome.targetId
      expect(validatePartialDraw(people, false, assignments, true)).toEqual([])
    }

    expect(validateCompleteDraw(people, false, assignments, true)).toEqual([])
  })

  it('evita alvo que deixaria o grupo de crianças sem saída', () => {
    const { people } = makeAgeWorld(
      [['a'], ['b'], ['c'], ['d'], ['e'], ['f']],
      ['a', 'b', 'c'],
    )
    const viable = listViableTargets(people, false, { a: 'b' }, 'b', true)
    expect(viable.map((person) => person.id)).toEqual(['c'])
  })

  it('detecta par entre idades diferentes na validação', () => {
    const { people } = makeAgeWorld(
      [['a'], ['b'], ['c'], ['d']],
      ['a', 'b'],
    )
    expect(validatePartialDraw(people, false, { a: 'c' }, true)).toContain(
      'Há um par inválido no sorteio.',
    )
  })
})
