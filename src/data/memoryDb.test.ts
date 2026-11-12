import { describe, expect, it } from 'vitest'
import { createMemoryDb } from './memoryDb'

describe('memoryDb', () => {
  it('grava e lê valores aninhados', async () => {
    const db = createMemoryDb()
    await db.set('a/b/c', 1)
    expect(await db.get('a/b/c')).toBe(1)
    expect(await db.get('a/b')).toEqual({ c: 1 })
    expect(await db.get('a/x')).toBeNull()
  })

  it('null apaga e remove nós vazios', async () => {
    const db = createMemoryDb()
    await db.set('a/b/c', 1)
    await db.set('a/b/c', null)
    expect(await db.get('a')).toBeNull()
  })

  it('update aplica vários caminhos de uma vez', async () => {
    const db = createMemoryDb()
    await db.update({ 'x/1': 'um', 'x/2': 'dois', 'y/z': true })
    await db.update({ 'x/1': null, 'y/z': false })
    expect(await db.get('x')).toEqual({ '2': 'dois' })
    expect(await db.get('y/z')).toBe(false)
  })

  it('devolve cópias, não referências internas', async () => {
    const db = createMemoryDb()
    await db.set('a', { n: 1 })
    const value = (await db.get<{ n: number }>('a'))!
    value.n = 99
    expect(await db.get('a/n')).toBe(1)
  })

  it('notifica assinantes só quando o valor muda', async () => {
    const db = createMemoryDb()
    const seen: unknown[] = []
    const stop = db.subscribe('a/b', (value) => seen.push(value))

    await Promise.resolve()
    await db.set('a/b', 1)
    await db.set('a/b', 1)
    await db.set('a/other', 5)
    await db.set('a/b', 2)
    stop()
    await db.set('a/b', 3)

    expect(seen).toEqual([null, 1, 2])
  })

  it('transação aplica o valor devolvido e aborta com undefined', async () => {
    const db = createMemoryDb()
    const first = await db.transaction<number>('n', (current) => (current ?? 0) + 1)
    expect(first).toEqual({ committed: true, value: 1 })

    const aborted = await db.transaction<number>('n', () => undefined)
    expect(aborted).toEqual({ committed: false, value: 1 })
    expect(await db.get('n')).toBe(1)
  })
})
