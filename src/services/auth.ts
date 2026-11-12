import { hashPersonPassword, isMasterIdentifier, isMasterLogin, validatePassword } from '../auth/credentials'
import type { Db } from '../data/db'
import { PATHS, parsePeople } from '../data/parse'
import { newToken } from '../lib/ids'
import { nameKey } from '../lib/validation'
import type { Credential, Id, Session } from '../types'

export type AuthResult = { ok: true; session: Session } | { ok: false; message: string }

const BAD_LOGIN = 'Nome ou senha incorretos.'

export async function login(db: Db, identifier: string, password: string): Promise<AuthResult> {
  if (isMasterIdentifier(identifier)) {
    return isMasterLogin(identifier, password)
      ? { ok: true, session: { role: 'master' } }
      : { ok: false, message: BAD_LOGIN }
  }

  const person = await findPersonByName(db, identifier)
  if (!person) return { ok: false, message: BAD_LOGIN }

  const credential = await db.get<Credential>(`${PATHS.credentials}/${person.id}`)
  if (!credential?.passwordHash) {
    return {
      ok: false,
      message:
        'Você ainda não criou sua senha. Abra o link do convite enviado por WhatsApp.',
    }
  }

  const passwordHash = hashPersonPassword(person.id, password)
  if (passwordHash !== credential.passwordHash) return { ok: false, message: BAD_LOGIN }

  return { ok: true, session: { role: 'person', personId: person.id, passwordHash } }
}

// O login é pelo nome (sem diferenciar acentos e maiúsculas); nomes são únicos.
async function findPersonByName(db: Db, name: string) {
  const key = nameKey(name)
  if (!key) return null
  const people = parsePeople(await db.get(PATHS.people))
  return people.find((person) => nameKey(person.name) === key) ?? null
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
  nameInput: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const person = await findPersonByName(db, nameInput)
  if (!person) {
    return { ok: false, message: 'Não encontramos esse nome. Confira como foi cadastrado.' }
  }

  await db.set(`${PATHS.resets}/${person.id}`, true)
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
