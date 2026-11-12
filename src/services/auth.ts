import { hashPersonPassword, isMasterIdentifier, isMasterLogin, validatePassword } from '../auth/credentials'
import type { Db } from '../data/db'
import { PATHS } from '../data/parse'
import { newToken } from '../lib/ids'
import { normalizePhone } from '../lib/phone'
import type { Credential, Id, Session } from '../types'

export type AuthResult = { ok: true; session: Session } | { ok: false; message: string }

const BAD_LOGIN = 'Telefone ou senha incorretos.'

export async function login(db: Db, identifier: string, password: string): Promise<AuthResult> {
  if (isMasterIdentifier(identifier)) {
    return isMasterLogin(identifier, password)
      ? { ok: true, session: { role: 'master' } }
      : { ok: false, message: BAD_LOGIN }
  }

  const phone = normalizePhone(identifier)
  if (!phone) return { ok: false, message: BAD_LOGIN }

  // Várias pessoas podem compartilhar o mesmo telefone (ex.: crianças): a senha decide quem é.
  const personIds = await personIdsByPhone(db, phone)
  let anyPassword = false
  for (const personId of personIds) {
    const credential = await db.get<Credential>(`${PATHS.credentials}/${personId}`)
    if (!credential?.passwordHash) continue
    anyPassword = true
    const passwordHash = hashPersonPassword(personId, password)
    if (passwordHash === credential.passwordHash) {
      return { ok: true, session: { role: 'person', personId, passwordHash } }
    }
  }

  if (personIds.length > 0 && !anyPassword) {
    return {
      ok: false,
      message:
        'Você ainda não criou sua senha. Abra o link do convite enviado por WhatsApp.',
    }
  }
  return { ok: false, message: BAD_LOGIN }
}

async function personIdsByPhone(db: Db, phone: string): Promise<Id[]> {
  const raw = await db.get<Record<string, unknown>>(`${PATHS.phones}/${phone}`)
  return raw && typeof raw === 'object' ? Object.keys(raw) : []
}

export interface InviteInfo {
  personId: Id
  name: string
}

export async function getInvite(db: Db, token: string): Promise<InviteInfo | null> {
  if (!token) return null
  const personId = await db.get<Id>(`${PATHS.invites}/${token}`)
  if (!personId) return null

  const person = await db.get<{ name?: string }>(`${PATHS.people}/${personId}`)
  if (!person || typeof person.name !== 'string') return null
  return { personId, name: person.name }
}

export async function acceptInvite(db: Db, token: string, password: string): Promise<AuthResult> {
  const passwordError = validatePassword(password)
  if (passwordError) return { ok: false, message: passwordError }

  const invite = await getInvite(db, token)
  if (!invite) {
    return {
      ok: false,
      message: 'Convite inválido ou já utilizado. Peça um novo convite ao organizador.',
    }
  }

  // Com telefone compartilhado, a senha é o que identifica a pessoa: não pode repetir.
  const own = await db.get<Credential>(`${PATHS.credentials}/${invite.personId}`)
  if (own) {
    for (const otherId of await personIdsByPhone(db, own.phone)) {
      if (otherId === invite.personId) continue
      const otherHash = await db.get<string>(`${PATHS.credentials}/${otherId}/passwordHash`)
      if (otherHash && otherHash === hashPersonPassword(otherId, password)) {
        return {
          ok: false,
          message: 'Essa senha já é usada por outra pessoa com o mesmo telefone. Escolha outra.',
        }
      }
    }
  }

  const passwordHash = hashPersonPassword(invite.personId, password)
  await db.update({
    [`${PATHS.credentials}/${invite.personId}/passwordHash`]: passwordHash,
    [`${PATHS.credentials}/${invite.personId}/inviteToken`]: null,
    [`${PATHS.invites}/${token}`]: null,
    [`${PATHS.resets}/${invite.personId}`]: null,
  })

  return { ok: true, session: { role: 'person', personId: invite.personId, passwordHash } }
}

// "Esqueci a senha": sem servidor de mensagens, o pedido fica registrado e o organizador
// reenvia o convite. O resultado do sorteio não é tocado.
export async function requestPasswordReset(
  db: Db,
  phoneInput: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const phone = normalizePhone(phoneInput)
  const personIds = phone ? await personIdsByPhone(db, phone) : []
  if (personIds.length === 0) {
    return { ok: false, message: 'Não encontramos esse telefone. Confira o número cadastrado.' }
  }

  // Telefone compartilhado: o pedido vale para todas as pessoas desse número.
  await db.update(Object.fromEntries(personIds.map((id) => [`${PATHS.resets}/${id}`, true])))
  return { ok: true }
}

// Gera um novo convite (e invalida o anterior). Não altera a senha atual nem o sorteio.
export async function issueInvite(db: Db, personId: Id): Promise<string | null> {
  const credential = await db.get<Credential>(`${PATHS.credentials}/${personId}`)
  if (!credential) return null

  const token = newToken()
  await db.update({
    [`${PATHS.credentials}/${personId}/inviteToken`]: token,
    [`${PATHS.invites}/${token}`]: personId,
    ...(credential.inviteToken ? { [`${PATHS.invites}/${credential.inviteToken}`]: null } : {}),
  })
  return token
}

export async function isSessionValid(db: Db, session: Session): Promise<boolean> {
  if (session.role === 'master') return true

  const [person, passwordHash] = await Promise.all([
    db.get(`${PATHS.people}/${session.personId}`),
    db.get<string>(`${PATHS.credentials}/${session.personId}/passwordHash`),
  ])
  return person !== null && passwordHash === session.passwordHash
}
