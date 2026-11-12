import { describe, expect, it } from 'vitest'
import type { AppState } from '../types'
import { appReducer, wouldResetDraw, type AppAction } from './appReducer'

function makeState(): AppState {
  return {
    version: 1,
    families: [
      { id: 'f1', name: 'Silva' },
      { id: 'f2', name: 'Souza' },
    ],
    people: [
      { id: 'a', name: 'Ana', familyId: 'f1', isChild: false },
      { id: 'b', name: 'Bia', familyId: 'f1', isChild: false },
      { id: 'c', name: 'Caio', familyId: 'f2', isChild: false },
      { id: 'd', name: 'Duda', familyId: 'f2', isChild: false },
    ],
    settings: { allowSameFamily: false, onlyChildrenDrawChildren: false },
    draw: { assignments: { a: 'c' } },
  }
}

function makeAgeState(): AppState {
  const state = makeState()
  state.people = [
    { id: 'a', name: 'Ana', familyId: 'f1', isChild: true },
    { id: 'b', name: 'Bia', familyId: 'f2', isChild: true },
    { id: 'c', name: 'Caio', familyId: 'f1', isChild: false },
    { id: 'd', name: 'Duda', familyId: 'f2', isChild: false },
  ]
  state.settings = { allowSameFamily: false, onlyChildrenDrawChildren: true }
  state.draw = { assignments: {} }
  return state
}

describe('cadastros', () => {
  it('adiciona família sem reiniciar o sorteio', () => {
    const state = makeState()
    const next = appReducer(state, {
      type: 'family/add',
      family: { id: 'f3', name: 'Oliveira' },
    })

    expect(next.families.map((family) => family.id)).toContain('f3')
    expect(next.draw.assignments).toEqual({ a: 'c' })
  })

  it('renomeia família sem reiniciar o sorteio', () => {
    const next = appReducer(makeState(), {
      type: 'family/rename',
      id: 'f1',
      name: 'Silva Lima',
    })

    expect(next.families[0]?.name).toBe('Silva Lima')
    expect(next.draw.assignments).toEqual({ a: 'c' })
  })

  it('bloqueia excluir família com membros', () => {
    const state = makeState()
    expect(appReducer(state, { type: 'family/remove', id: 'f1' })).toBe(state)
  })

  it('exclui família vazia sem reiniciar o sorteio', () => {
    const state = makeState()
    state.families.push({ id: 'f3', name: 'Vazia' })

    const next = appReducer(state, { type: 'family/remove', id: 'f3' })

    expect(next.families.map((family) => family.id)).toEqual(['f1', 'f2'])
    expect(next.draw.assignments).toEqual({ a: 'c' })
  })

  it('adiciona pessoa e reinicia o sorteio', () => {
    const next = appReducer(makeState(), {
      type: 'person/add',
      person: { id: 'e', name: 'Eva', familyId: 'f2', isChild: false },
    })

    expect(next.people.map((person) => person.id)).toContain('e')
    expect(next.draw.assignments).toEqual({})
  })

  it('renomeia pessoa sem reiniciar o sorteio', () => {
    const next = appReducer(makeState(), {
      type: 'person/update',
      id: 'a',
      name: 'Ana Paula',
      familyId: 'f1',
      isChild: false,
    })

    expect(next.people.find((person) => person.id === 'a')?.name).toBe('Ana Paula')
    expect(next.draw.assignments).toEqual({ a: 'c' })
  })

  it('troca a família de uma pessoa e reinicia o sorteio', () => {
    const next = appReducer(makeState(), {
      type: 'person/update',
      id: 'c',
      name: 'Caio',
      familyId: 'f1',
      isChild: false,
    })

    expect(next.people.find((person) => person.id === 'c')?.familyId).toBe('f1')
    expect(next.draw.assignments).toEqual({})
  })

  it('exclui pessoa e reinicia o sorteio', () => {
    const next = appReducer(makeState(), { type: 'person/remove', id: 'b' })

    expect(next.people.map((person) => person.id)).not.toContain('b')
    expect(next.draw.assignments).toEqual({})
  })
})

describe('regra de família', () => {
  it('alterar o toggle reinicia o sorteio', () => {
    const next = appReducer(makeState(), {
      type: 'settings/setAllowSameFamily',
      allow: true,
    })

    expect(next.settings.allowSameFamily).toBe(true)
    expect(next.draw.assignments).toEqual({})
  })

  it('não muda nada ao definir o mesmo valor', () => {
    const state = makeState()
    expect(
      appReducer(state, { type: 'settings/setAllowSameFamily', allow: false }),
    ).toBe(state)
  })
})

describe('separação por idade', () => {
  it('alterar a separação por idade reinicia o sorteio', () => {
    const next = appReducer(makeState(), {
      type: 'settings/setOnlyChildrenDrawChildren',
      onlyChildrenDrawChildren: true,
    })

    expect(next.settings.onlyChildrenDrawChildren).toBe(true)
    expect(next.draw.assignments).toEqual({})
  })

  it('não muda nada ao definir o mesmo valor', () => {
    const state = makeState()
    expect(
      appReducer(state, {
        type: 'settings/setOnlyChildrenDrawChildren',
        onlyChildrenDrawChildren: false,
      }),
    ).toBe(state)
  })

  it('alterar se a pessoa é criança reinicia o sorteio', () => {
    const next = appReducer(makeState(), {
      type: 'person/update',
      id: 'a',
      name: 'Ana',
      familyId: 'f1',
      isChild: true,
    })

    expect(next.people.find((person) => person.id === 'a')?.isChild).toBe(true)
    expect(next.draw.assignments).toEqual({})
  })

  it('rejeita par entre criança e adulto com a regra ligada', () => {
    const state = makeAgeState()
    state.settings.allowSameFamily = true

    expect(
      appReducer(state, { type: 'draw/assign', drawerId: 'a', targetId: 'c' }),
    ).toBe(state)
  })

  it('aceita par criança–criança com a regra ligada', () => {
    const next = appReducer(makeAgeState(), {
      type: 'draw/assign',
      drawerId: 'a',
      targetId: 'b',
    })

    expect(next.draw.assignments).toEqual({ a: 'b' })
  })
})

describe('atribuições', () => {
  it('registra uma atribuição válida', () => {
    const next = appReducer(makeState(), {
      type: 'draw/assign',
      drawerId: 'b',
      targetId: 'd',
    })

    expect(next.draw.assignments).toEqual({ a: 'c', b: 'd' })
  })

  it('rejeita quem já sorteou', () => {
    const state = makeState()
    expect(
      appReducer(state, { type: 'draw/assign', drawerId: 'a', targetId: 'd' }),
    ).toBe(state)
  })

  it('rejeita alvo já usado', () => {
    const state = makeState()
    expect(
      appReducer(state, { type: 'draw/assign', drawerId: 'b', targetId: 'c' }),
    ).toBe(state)
  })

  it('rejeita auto-sorteio', () => {
    const state = makeState()
    expect(
      appReducer(state, { type: 'draw/assign', drawerId: 'b', targetId: 'b' }),
    ).toBe(state)
  })

  it('rejeita a própria família com a regra desligada', () => {
    const state = makeState()
    expect(
      appReducer(state, { type: 'draw/assign', drawerId: 'b', targetId: 'a' }),
    ).toBe(state)
  })

  it('aceita a própria família com a regra ligada', () => {
    const state = makeState()
    state.settings.allowSameFamily = true

    const next = appReducer(state, {
      type: 'draw/assign',
      drawerId: 'b',
      targetId: 'a',
    })

    expect(next.draw.assignments).toEqual({ a: 'c', b: 'a' })
  })

  it('reinicia o sorteio', () => {
    const next = appReducer(makeState(), { type: 'draw/reset' })
    expect(next.draw.assignments).toEqual({})
    expect(next.people).toHaveLength(4)
  })
})

describe('wouldResetDraw', () => {
  const state = makeState()
  const cases: Array<[string, AppAction, boolean]> = [
    [
      'adicionar pessoa',
      { type: 'person/add', person: { id: 'e', name: 'Eva', familyId: 'f2', isChild: false } },
      true,
    ],
    [
      'renomear pessoa',
      { type: 'person/update', id: 'a', name: 'Ana Paula', familyId: 'f1', isChild: false },
      false,
    ],
    ['renomear família', { type: 'family/rename', id: 'f1', name: 'Silva Lima' }, false],
    ['mudar toggle', { type: 'settings/setAllowSameFamily', allow: true }, true],
    [
      'mudar separação por idade',
      { type: 'settings/setOnlyChildrenDrawChildren', onlyChildrenDrawChildren: true },
      true,
    ],
    [
      'mudar idade da pessoa',
      { type: 'person/update', id: 'a', name: 'Ana', familyId: 'f1', isChild: true },
      true,
    ],
    ['adicionar família', { type: 'family/add', family: { id: 'f3', name: 'Nova' } }, false],
    ['excluir pessoa', { type: 'person/remove', id: 'b' }, true],
    ['registrar atribuição', { type: 'draw/assign', drawerId: 'b', targetId: 'd' }, false],
  ]

  for (const [label, action, expected] of cases) {
    it(`${label}: ${expected ? 'reinicia' : 'preserva'}`, () => {
      expect(wouldResetDraw(state, action)).toBe(expected)
    })
  }
})
