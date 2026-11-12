import { describe, expect, it } from 'vitest'
import type { AppState } from '../types'
import {
  CORRUPT_KEY_PREFIX,
  STORAGE_KEY,
  createInitialState,
  loadState,
  saveState,
  type StorageLike,
} from './storage'

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}

class ThrowingStorage implements StorageLike {
  getItem(): string | null {
    throw new Error('armazenamento bloqueado')
  }

  setItem(): void {
    throw new Error('armazenamento bloqueado')
  }
}

class ReadOnlyStorage implements StorageLike {
  private readonly value: string

  constructor(value: string) {
    this.value = value
  }

  getItem(): string | null {
    return this.value
  }

  setItem(): void {
    throw new Error('somente leitura')
  }
}

function makeState(): AppState {
  return {
    version: 1,
    families: [
      { id: 'f1', name: 'Silva' },
      { id: 'f2', name: 'Souza' },
    ],
    people: [
      { id: 'a', name: 'Ana', familyId: 'f1' },
      { id: 'b', name: 'Bia', familyId: 'f1' },
      { id: 'c', name: 'Caio', familyId: 'f2' },
      { id: 'd', name: 'Duda', familyId: 'f2' },
    ],
    settings: { allowSameFamily: false },
    draw: { assignments: { a: 'c' } },
  }
}

function storeRaw(value: unknown): MemoryStorage {
  const storage = new MemoryStorage()
  storage.setItem(STORAGE_KEY, JSON.stringify(value))
  return storage
}

describe('round-trip', () => {
  it('salva e recupera o estado', () => {
    const storage = new MemoryStorage()
    const state = makeState()

    expect(saveState(state, storage)).toEqual({ ok: true })
    const loaded = loadState(storage)

    expect(loaded.state).toEqual(state)
    expect(loaded.notice).toBeNull()
  })
})

describe('dados corrompidos', () => {
  it('lida com JSON inválido e guarda um backup', () => {
    const storage = new MemoryStorage()
    storage.setItem(STORAGE_KEY, '{oops')

    const loaded = loadState(storage)

    expect(loaded.state).toEqual(createInitialState())
    expect(loaded.notice).toBe('corrupt')
    expect([...storage.values.keys()].some((key) => key.startsWith(CORRUPT_KEY_PREFIX))).toBe(
      true,
    )
  })

  it('rejeita versão desconhecida', () => {
    const storage = storeRaw({ ...makeState(), version: 99 })
    const loaded = loadState(storage)

    expect(loaded.state).toEqual(createInitialState())
    expect(loaded.notice).toBe('corrupt')
  })

  it('não quebra se o backup falhar', () => {
    const loaded = loadState(new ReadOnlyStorage('{oops'))
    expect(loaded.notice).toBe('corrupt')
    expect(loaded.state).toEqual(createInitialState())
  })
})

describe('sanitização de cadastros', () => {
  it('descarta pessoas com família inexistente', () => {
    const raw = makeState()
    raw.people.push({ id: 'z', name: 'Zé', familyId: 'f9' })

    const loaded = loadState(storeRaw(raw))

    expect(loaded.state.people.map((person) => person.id)).toEqual(['a', 'b', 'c', 'd'])
    expect(loaded.notice).toBeNull()
  })

  it('normaliza nomes', () => {
    const raw = makeState()
    raw.families[0] = { id: 'f1', name: '  Silva  ' }
    raw.people[0] = { id: 'a', name: '  Ana   Maria ', familyId: 'f1' }

    const loaded = loadState(storeRaw(raw))

    expect(loaded.state.families[0]?.name).toBe('Silva')
    expect(loaded.state.people[0]?.name).toBe('Ana Maria')
  })
})

describe('sanitização do sorteio', () => {
  it('descarta auto-sorteio e preserva os cadastros', () => {
    const raw = makeState()
    raw.draw = { assignments: { a: 'a' } }

    const loaded = loadState(storeRaw(raw))

    expect(loaded.state.draw.assignments).toEqual({})
    expect(loaded.state.people).toHaveLength(4)
    expect(loaded.notice).toBe('draw-discarded')
  })

  it('descarta alvo repetido', () => {
    const raw = makeState()
    raw.draw = { assignments: { a: 'c', b: 'c' } }

    const loaded = loadState(storeRaw(raw))

    expect(loaded.state.draw.assignments).toEqual({})
    expect(loaded.notice).toBe('draw-discarded')
  })

  it('descarta violação de família', () => {
    const raw = makeState()
    raw.draw = { assignments: { a: 'b' } }

    const loaded = loadState(storeRaw(raw))

    expect(loaded.state.draw.assignments).toEqual({})
    expect(loaded.notice).toBe('draw-discarded')
  })

  it('descarta sorteio parcial sem conclusão possível', () => {
    const storage = storeRaw({
      version: 1,
      families: [
        { id: 'f1', name: 'A' },
        { id: 'f2', name: 'B' },
        { id: 'f3', name: 'C' },
      ],
      people: [
        { id: 'a', name: 'A', familyId: 'f1' },
        { id: 'b', name: 'B', familyId: 'f2' },
        { id: 'c1', name: 'C1', familyId: 'f3' },
        { id: 'c2', name: 'C2', familyId: 'f3' },
      ],
      settings: { allowSameFamily: false },
      draw: { assignments: { a: 'b' } },
    })

    const loaded = loadState(storage)

    expect(loaded.state.draw.assignments).toEqual({})
    expect(loaded.notice).toBe('draw-discarded')
  })

  it('mantém um sorteio parcial válido', () => {
    const loaded = loadState(storeRaw(makeState()))
    expect(loaded.state.draw.assignments).toEqual({ a: 'c' })
    expect(loaded.notice).toBeNull()
  })
})

describe('armazenamento indisponível', () => {
  it('retorna aviso quando o storage lança erro na leitura', () => {
    expect(loadState(new ThrowingStorage())).toEqual({
      state: createInitialState(),
      notice: 'unavailable',
    })
  })

  it('retorna erro quando não consegue salvar', () => {
    expect(saveState(makeState(), new ThrowingStorage())).toEqual({
      ok: false,
      reason: 'write-failed',
    })
  })
})
