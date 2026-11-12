import { describe, expect, it } from 'vitest'
import { createMemoryDb } from '../data/memoryDb'
import { PATHS } from '../data/parse'
import type { Credential } from '../types'
import { applyAdminAction, wouldResetDraw } from './admin'
import { acceptInvite } from './auth'
import { drawMyFriend } from './draw'
import { activateAll, DEFAULT_PEOPLE, seedGroup } from './testSeed'
import { mulberry32 } from '../lib/rng'

async function startedGroup() {
  const db = createMemoryDb()
  await seedGroup(db)
  await activateAll(db)
  await applyAdminAction(db, { type: 'draw/setOpen', open: true })
  await drawMyFriend(db, 'ana', mulberry32(1))
  return db
}

describe('cadastro de pessoas', () => {
  it('cria pessoa, telefone normalizado e convite', async () => {
    const db = createMemoryDb()
    await seedGroup(db)

    expect(await db.get(`${PATHS.people}/ana`)).toEqual({
      name: 'Ana',
      familyId: 'f1',
      isChild: false,
    })
    const credential = await db.get<Credential>(`${PATHS.credentials}/ana`)
    expect(credential?.phone).toBe('5511900000001')
    expect(credential?.inviteToken).toMatch(/^[A-Za-z0-9]{20}$/)
    expect(credential?.passwordHash).toBeUndefined()
    expect(await db.get(`${PATHS.invites}/${credential!.inviteToken}`)).toBe('ana')
  })

  it('aceita telefone repetido e rejeita inválido', async () => {
    const db = createMemoryDb()
    await seedGroup(db)

    const duplicate = await applyAdminAction(db, {
      type: 'person/add',
      person: { id: 'novo', name: 'Novo', familyId: 'f1', isChild: false },
      phone: '+55 11 90000-0001',
    })
    expect(duplicate.ok).toBe(true)

    const invalid = await applyAdminAction(db, {
      type: 'person/add',
      person: { id: 'novo2', name: 'Novo2', familyId: 'f1', isChild: false },
      phone: '123',
    })
    expect(invalid.ok).toBe(false)
    expect(await db.get(`${PATHS.people}/novo2`)).toBeNull()
  })

  it('rejeita nome repetido (sem acento/maiúscula) e o nome admin', async () => {
    const db = createMemoryDb()
    await seedGroup(db)
    for (const name of ['ana', 'ÁNA', 'Admin']) {
      const result = await applyAdminAction(db, {
        type: 'person/add',
        person: { id: 'x', name, familyId: 'f1', isChild: false },
        phone: '(11) 97777-0000',
      })
      expect(result.ok, name).toBe(false)
    }
    const rename = await applyAdminAction(db, {
      type: 'person/update',
      id: 'bia',
      name: 'Ana',
      familyId: 'f1',
      isChild: false,
      phone: '(11) 90000-0002',
    })
    expect(rename.ok).toBe(false)
  })

  it('trocar o telefone preserva a senha', async () => {
    const db = createMemoryDb()
    await seedGroup(db)
    await activateAll(db)
    const before = await db.get<Credential>(`${PATHS.credentials}/ana`)

    const result = await applyAdminAction(db, {
      type: 'person/update',
      id: 'ana',
      name: 'Ana Paula',
      familyId: 'f1',
      isChild: false,
      phone: '(21) 98888-7777',
    })

    expect(result.ok).toBe(true)
    const after = await db.get<Credential>(`${PATHS.credentials}/ana`)
    expect(after?.phone).toBe('5521988887777')
    expect(after?.passwordHash).toBe(before?.passwordHash)
  })

  it('permite usar o telefone de outra pessoa na edição', async () => {
    const db = createMemoryDb()
    await seedGroup(db)

    const result = await applyAdminAction(db, {
      type: 'person/update',
      id: 'ana',
      name: 'Ana',
      familyId: 'f1',
      isChild: false,
      phone: '(11) 90000-0002',
    })
    expect(result.ok).toBe(true)
  })

  it('excluir pessoa limpa credenciais e convite', async () => {
    const db = createMemoryDb()
    await seedGroup(db)
    const credential = await db.get<Credential>(`${PATHS.credentials}/ana`)

    await applyAdminAction(db, { type: 'person/remove', id: 'ana' })

    expect(await db.get(`${PATHS.people}/ana`)).toBeNull()
    expect(await db.get(`${PATHS.credentials}/ana`)).toBeNull()
    expect(await db.get(`${PATHS.invites}/${credential!.inviteToken}`)).toBeNull()
  })
})

describe('famílias', () => {
  it('bloqueia excluir família com membros', async () => {
    const db = createMemoryDb()
    await seedGroup(db)

    const result = await applyAdminAction(db, { type: 'family/remove', id: 'f1' })
    expect(result.ok).toBe(false)
    expect(await db.get(`${PATHS.families}/f1`)).not.toBeNull()
  })

  it('exclui família vazia e renomeia', async () => {
    const db = createMemoryDb()
    await applyAdminAction(db, { type: 'family/add', family: { id: 'x', name: 'Vazia' } })
    await applyAdminAction(db, { type: 'family/rename', id: 'x', name: 'Outra' })
    expect(await db.get(`${PATHS.families}/x/name`)).toBe('Outra')

    expect((await applyAdminAction(db, { type: 'family/remove', id: 'x' })).ok).toBe(true)
    expect(await db.get(`${PATHS.families}/x`)).toBeNull()
  })
})

describe('liberação e reinício do sorteio', () => {
  it('só libera quando o sorteio é viável', async () => {
    const db = createMemoryDb()
    await applyAdminAction(db, { type: 'family/add', family: { id: 'f1', name: 'Silva' } })
    for (const [id, phone] of [['a', '11911110001'], ['b', '11911110002']] as const) {
      await applyAdminAction(db, {
        type: 'person/add',
        person: { id, name: id, familyId: 'f1', isChild: false },
        phone,
      })
    }

    const blocked = await applyAdminAction(db, { type: 'draw/setOpen', open: true })
    expect(blocked.ok).toBe(false)
    expect(await db.get(`${PATHS.draw}/open`)).toBeNull()

    await applyAdminAction(db, { type: 'settings/setAllowSameFamily', allow: true })
    expect((await applyAdminAction(db, { type: 'draw/setOpen', open: true })).ok).toBe(true)
    expect(await db.get(`${PATHS.draw}/open`)).toBe(true)
  })

  it('fechar o sorteio é sempre permitido', async () => {
    const db = createMemoryDb()
    expect((await applyAdminAction(db, { type: 'draw/setOpen', open: false })).ok).toBe(true)
  })

  it('reiniciar apaga resultados, fecha o sorteio e mantém contas', async () => {
    const db = await startedGroup()

    await applyAdminAction(db, { type: 'draw/reset' })

    expect(await db.get(`${PATHS.draw}/assignments`)).toBeNull()
    expect(await db.get(`${PATHS.draw}/drawn`)).toBeNull()
    expect(await db.get(`${PATHS.draw}/open`)).toBe(false)
    expect((await db.get<Credential>(`${PATHS.credentials}/ana`))?.passwordHash).toBeDefined()
  })

  it('adicionar pessoa, mudar regra ou idade durante o sorteio reinicia', async () => {
    for (const action of [
      {
        type: 'person/add' as const,
        person: { id: 'eva', name: 'Eva', familyId: 'f2', isChild: false },
        phone: '11 98888-0000',
      },
      { type: 'settings/setAllowSameFamily' as const, allow: true },
      { type: 'settings/setOnlyChildrenDrawChildren' as const, value: true },
      { type: 'person/remove' as const, id: 'duda' },
      {
        type: 'person/update' as const,
        id: 'ana',
        name: 'Ana',
        familyId: 'f1',
        isChild: true,
        phone: '(11) 90000-0001',
      },
    ]) {
      const db = await startedGroup()
      await applyAdminAction(db, action)
      expect(await db.get(`${PATHS.draw}/assignments`), action.type).toBeNull()
      expect(await db.get(`${PATHS.draw}/open`), action.type).toBe(false)
    }
  })

  it('renomear não reinicia o sorteio', async () => {
    const db = await startedGroup()

    await applyAdminAction(db, {
      type: 'person/update',
      id: 'ana',
      name: 'Ana Paula',
      familyId: 'f1',
      isChild: false,
      phone: '(11) 90000-0001',
    })
    await applyAdminAction(db, { type: 'family/rename', id: 'f1', name: 'Silva Lima' })

    expect(await db.get(`${PATHS.draw}/assignments/ana`)).not.toBeNull()
    expect(await db.get(`${PATHS.draw}/open`)).toBe(true)
  })

  it('sem sorteios em andamento, mudar regra não mexe em nada', async () => {
    const db = createMemoryDb()
    await seedGroup(db)
    await applyAdminAction(db, { type: 'draw/setOpen', open: true })

    await applyAdminAction(db, { type: 'settings/setAllowSameFamily', allow: true })

    expect(await db.get(`${PATHS.draw}/open`)).toBe(true)
  })
})

describe('wouldResetDraw', () => {
  const people = DEFAULT_PEOPLE.map(({ phone, ...person }) => {
    void phone
    return person
  })

  it('não pede confirmação quando ninguém sorteou', () => {
    expect(
      wouldResetDraw(
        { people, hasDraws: false },
        { type: 'settings/setAllowSameFamily', allow: true },
      ),
    ).toBe(false)
  })

  it('pede confirmação nas ações que descartam o sorteio', () => {
    const state = { people, hasDraws: true }
    expect(wouldResetDraw(state, { type: 'settings/setAllowSameFamily', allow: true })).toBe(true)
    expect(wouldResetDraw(state, { type: 'person/remove', id: 'ana' })).toBe(true)
    expect(
      wouldResetDraw(state, {
        type: 'person/update',
        id: 'ana',
        name: 'Ana',
        familyId: 'f2',
        isChild: false,
        phone: '1',
      }),
    ).toBe(true)
  })

  it('não pede confirmação em renomear nem em adicionar família', () => {
    const state = { people, hasDraws: true }
    expect(
      wouldResetDraw(state, {
        type: 'person/update',
        id: 'ana',
        name: 'Ana Paula',
        familyId: 'f1',
        isChild: false,
        phone: '1',
      }),
    ).toBe(false)
    expect(
      wouldResetDraw(state, { type: 'family/add', family: { id: 'x', name: 'X' } }),
    ).toBe(false)
  })
})

describe('integração com convite', () => {
  it('convite aceito continua válido após reiniciar o sorteio', async () => {
    const db = await startedGroup()
    await applyAdminAction(db, { type: 'draw/reset' })
    const credential = await db.get<Credential>(`${PATHS.credentials}/ana`)
    expect(credential?.passwordHash).toBeDefined()
    expect(credential?.inviteToken).toBeUndefined()
    expect((await acceptInvite(db, 'inexistente', 'senha123')).ok).toBe(false)
  })
})
