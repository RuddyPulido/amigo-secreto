import { useEffect, useState, type FormEvent } from 'react'
import { Gift, KeyRound } from 'lucide-react'
import type { Db } from '../../data/db'
import { acceptInvite, getInvite, type InviteInfo } from '../../services/auth'
import type { Session } from '../../types'
import {
  cardClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../../components/ui'

interface InviteScreenProps {
  db: Db
  token: string
  onAccepted: (session: Session) => void
  onBackToLogin: () => void
}

type InviteState =
  | { status: 'loading' }
  | { status: 'invalid' }
  | { status: 'error' }
  | { status: 'ready'; info: InviteInfo }

export function InviteScreen({ db, token, onAccepted, onBackToLogin }: InviteScreenProps) {
  const [invite, setInvite] = useState<InviteState>({ status: 'loading' })
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    getInvite(db, token)
      .then((info) => {
        if (cancelled) return
        setInvite(info ? { status: 'ready', info } : { status: 'invalid' })
      })
      .catch(() => {
        if (!cancelled) setInvite({ status: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [db, token])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    if (password !== confirm) {
      setError('As senhas não conferem.')
      return
    }

    setBusy(true)
    setError(null)
    try {
      const result = await acceptInvite(db, token, password)
      if (result.ok) onAccepted(result.session)
      else setError(result.message)
    } catch {
      setError('Não foi possível salvar sua senha. Verifique a internet e tente de novo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-forest text-honey shadow-sm">
          <Gift className="h-8 w-8" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-forest">
          Amigo Secreto
        </h1>
      </div>

      <section className={cardClass}>
        {invite.status === 'loading' ? (
          <p role="status" className="text-center text-sm text-ink/60">
            Abrindo seu convite…
          </p>
        ) : invite.status === 'error' ? (
          <div className="space-y-4 text-center">
            <p role="alert" className="text-sm text-berry">
              Não foi possível abrir o convite. Verifique a internet e tente de novo.
            </p>
            <button type="button" onClick={onBackToLogin} className={`${secondaryButtonClass} w-full`}>
              Ir para o login
            </button>
          </div>
        ) : invite.status === 'invalid' ? (
          <div className="space-y-4 text-center">
            <h2 className="text-lg font-semibold text-forest">Convite indisponível</h2>
            <p className="text-sm leading-relaxed text-ink/65">
              Esse convite é inválido ou já foi usado. Se você já criou sua senha, é só
              entrar. Se esqueceu, peça um novo convite ao organizador.
            </p>
            <button type="button" onClick={onBackToLogin} className={`${primaryButtonClass} w-full`}>
              Ir para o login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-forest">
                Olá, {invite.info.name}!
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-ink/65">
                Você foi convidado(a) para o amigo secreto. Crie uma senha para entrar e
                fazer o seu sorteio.
              </p>
            </div>

            <div>
              <label htmlFor="new-password" className={labelClass}>
                Crie uma senha
              </label>
              <input
                id="new-password"
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value)
                  setError(null)
                }}
                autoComplete="new-password"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className={labelClass}>
                Repita a senha
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirm}
                onChange={(event) => {
                  setConfirm(event.target.value)
                  setError(null)
                }}
                autoComplete="new-password"
                className={inputClass}
              />
            </div>

            {error ? (
              <p role="alert" className="text-sm text-berry">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={busy || !password || !confirm}
              className={`${primaryButtonClass} w-full`}
            >
              <KeyRound className="h-5 w-5" aria-hidden="true" />
              {busy ? 'Salvando…' : 'Salvar senha e entrar'}
            </button>
          </form>
        )}
      </section>
    </div>
  )
}
