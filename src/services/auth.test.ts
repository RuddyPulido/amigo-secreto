import { describe, expect, it } from 'vitest'
import { hashMasterPassword, isMasterLogin } from '../auth/credentials'
import { createMemoryDb } from '../data/memoryDb'
import { PATHS } from '../data/parse'
import { mulberry32 } from '../lib/rng'
import type { Credential } from '../types'
import { applyAdminAction } from './admin'
import {
  acceptInvite,
  getInvite,
  isSessionValid,
  issueInvite,
  login,
  requestPasswordReset,
} from './auth'
import { drawMyFriend } from './draw'
import { PASSWORD, activateAll, seedGroup } from './testSeed'

async function invitedGroup() {
  const db = createMemoryDb()
  await seedGroup(db)
  return db
}

async function tokenOf(db: ReturnType<typeof createMemoryDb>, personId: string) {
  return (await db.get<Credential>(`${PATHS.credentials}/${personId}`))!.inviteToken!
}

describe('login do master', () => {
  it('rejeita usuário errado e senha errada', async () => {
    const db = createMemoryDb()
    expect(isMasterLogin('admin', 'errada')).toBe(false)
    expect(isMasterLogin('outro', 'errada')).toBe(false)
    expect(await login(db, 'admin', 'errada')).toEqual({
      ok: false,
      message: 'Nome ou senha incorretos.',
    })
  })

  it('o hash do master usa sal próprio', () => {
    expect(hashMasterPassword('x')).toMatch(/^[0-9a-f]{64}$/)
    expect(hashMasterPassword('x')).not.toBe(hashMasterPassword('y'))
  })
})

describe('convite', () => {
  it('mostra o nome de quem foi convidado', async () => {
    const db = await invitedGroup()
    expect(await getInvite(db, await tokenOf(db, 'ana'))).toEqual({
      personId: 'ana',
      name: 'Ana',
    })
    expect(await getInvite(db, 'tokeninvalido')).toBeNull()
  })

  it('aceitar define a senha, consome o convite e já entra', async () => {
    const db = await invitedGroup()
    const token = await tokenOf(db, 'ana')

    const result = await acceptInvite(db, token, PASSWORD)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.session.role).toBe('person')
    expect(await getInvite(db, token)).toBeNull()
    const credential = await db.get<Credential>(`${PATHS.credentials}/ana`)
    expect(credential?.passwordHash).toMatch(/^[0-9a-f]{64}$/)
    expect(credential?.inviteToken).toBeUndefined()
  })

  it('não aceita o mesmo convite duas vezes nem senha curta', async () => {
    const db = await invitedGroup()
    const token = await tokenOf(db, 'ana')

    expect((await acceptInvite(db, token, '123')).ok).toBe(false)
    expect((await acceptInvite(db, token, PASSWORD)).ok).toBe(true)
    const again = await acceptInvite(db, token, 'outrasenha')
    expect(again.ok).toBe(false)
  })

  it('a senha é por pessoa: mesma senha, hashes diferentes', async () => {
    const db = await invitedGroup()
    await activateAll(db)
    const ana = await db.get<Credential>(`${PATHS.credentials}/ana`)
    const bia = await db.get<Credential>(`${PATHS.credentials}/bia`)
    expect(ana?.passwordHash).not.toBe(bia?.passwordHash)
  })
})

describe('login de pessoa', () => {
  it('entra pelo nome, sem diferenciar maiúsculas e acentos', async () => {
    const db = await invitedGroup()
    await activateAll(db)

    for (const name of ['Ana', 'ana', '  ANA ']) {
      const result = await login(db, name, PASSWORD)
      expect(result.ok, name).toBe(true)
    }
  })

  it('rejeita senha errada e nome desconhecido com a mesma mensagem', async () => {
    const db = await invitedGroup()
    await activateAll(db)

    const wrongPassword = await login(db, 'Ana', 'errada')
    const unknown = await login(db, 'Fulano', PASSWORD)
    expect(wrongPassword).toEqual({ ok: false, message: 'Nome ou senha incorretos.' })
    expect(unknown).toEqual(wrongPassword)
  })

  it('avisa quando a pessoa ainda não aceitou o convite', async () => {
    const db = await invitedGroup()
    const result = await login(db, 'Ana', PASSWORD)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toContain('convite')
  })
})

describe('esqueci a senha', () => {
  it('registra o pedido e rejeita nome desconhecido', async () => {
    const db = await invitedGroup()
    await activateAll(db)

    expect(await requestPasswordReset(db, 'Fulano')).toMatchObject({ ok: false })
    expect(await requestPasswordReset(db, 'ana')).toEqual({ ok: true, name: 'Ana' })
    expect(await db.get(`${PATHS.resets}/ana`)).toBe(true)
  })

  it('novo convite invalida o anterior e a senha antiga vale até trocar', async () => {
    const db = await invitedGroup()
    await activateAll(db)
    await requestPasswordReset(db, 'Ana')

    const token = await issueInvite(db, 'ana')
    expect(token).toMatch(/^[A-Za-z0-9]{20}$/)
    expect((await login(db, 'Ana', PASSWORD)).ok).toBe(true)

    const second = await issueInvite(db, 'ana')
    expect(await getInvite(db, token!)).toBeNull()
    expect(await getInvite(db, second!)).not.toBeNull()
  })

  it('definir nova senha limpa o pedido e a senha antiga deixa de valer', async () => {
    const db = await invitedGroup()
    await activateAll(db)
    await requestPasswordReset(db, 'Ana')
    const token = (await issueInvite(db, 'ana'))!

    const result = await acceptInvite(db, token, 'novasenha')

    expect(result.ok).toBe(true)
    expect(await db.get(`${PATHS.resets}/ana`)).toBeNull()
    expect((await login(db, 'Ana', PASSWORD)).ok).toBe(false)
    expect((await login(db, 'Ana', 'novasenha')).ok).toBe(true)
  })

  it('trocar a senha NÃO altera o resultado do sorteio', async () => {
    const db = await invitedGroup()
    await activateAll(db)
    await applyAdminAction(db, { type: 'draw/setOpen', open: true })
    const drawn = await drawMyFriend(db, 'ana', mulberry32(5))
    expect(drawn.ok).toBe(true)
    if (!drawn.ok) return

    await requestPasswordReset(db, 'Ana')
    await acceptInvite(db, (await issueInvite(db, 'ana'))!, 'novasenha')

    expect(await db.get(`${PATHS.draw}/assignments/ana`)).toBe(drawn.targetId)
    expect(await db.get(`${PATHS.draw}/drawn/ana`)).toBe(true)
    const again = await drawMyFriend(db, 'ana', mulberry32(99))
    expect(again).toEqual({ ok: true, targetId: drawn.targetId, alreadyDrawn: true })
  })

  it('issueInvite devolve null para pessoa inexistente', async () => {
    const db = createMemoryDb()
    expect(await issueInvite(db, 'ninguem')).toBeNull()
  })
})

describe('validade da sessão', () => {
  it('vale enquanto a senha e a pessoa existirem', async () => {
    const db = await invitedGroup()
    const accepted = await acceptInvite(db, await tokenOf(db, 'ana'), PASSWORD)
    if (!accepted.ok) throw new Error(accepted.message)

    expect(await isSessionValid(db, accepted.session)).toBe(true)
    expect(await isSessionValid(db, { role: 'master' })).toBe(true)
  })

  it('deixa de valer após trocar a senha ou excluir a pessoa', async () => {
    const db = await invitedGroup()
    const accepted = await acceptInvite(db, await tokenOf(db, 'ana'), PASSWORD)
    if (!accepted.ok) throw new Error(accepted.message)

    await acceptInvite(db, (await issueInvite(db, 'ana'))!, 'novasenha')
    expect(await isSessionValid(db, accepted.session)).toBe(false)

    const other = await acceptInvite(db, await tokenOf(db, 'bia'), PASSWORD)
    if (!other.ok) throw new Error(other.message)
    await applyAdminAction(db, { type: 'person/remove', id: 'bia' })
    expect(await isSessionValid(db, other.session)).toBe(false)
  })
})

describe('telefone compartilhado', () => {
  const shared = [
    { id: 'p1', name: 'Pai', familyId: 'f1', isChild: false, phone: '(11) 98888-0000' },
    { id: 'k1', name: 'Filho', familyId: 'f1', isChild: true, phone: '(11) 98888-0000' },
  ]

  it('pai e filho com o mesmo telefone e a mesma senha entram pelo nome', async () => {
    const db = createMemoryDb()
    await seedGroup(db, shared)
    await activateAll(db, shared)

    const pai = await login(db, 'Pai', PASSWORD)
    const filho = await login(db, 'Filho', PASSWORD)
    expect(pai.ok && pai.session.role === 'person' && pai.session.personId).toBe('p1')
    expect(filho.ok && filho.session.role === 'person' && filho.session.personId).toBe('k1')
  })
})
