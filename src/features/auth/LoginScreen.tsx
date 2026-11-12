import { useState, type FormEvent } from 'react'
import { ArrowLeft, Gift, LogIn, Send } from 'lucide-react'
import type { Db } from '../../data/db'
import { login, requestPasswordReset } from '../../services/auth'
import type { Session } from '../../types'
import {
  cardClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../../components/ui'

interface LoginScreenProps {
  db: Db
  onLogin: (session: Session) => void
}

export function LoginScreen({ db, onLogin }: LoginScreenProps) {
  const [mode, setMode] = useState<'login' | 'forgot'>('login')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleLogin(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const result = await login(db, identifier, password)
      if (result.ok) onLogin(result.session)
      else setError(result.message)
    } catch {
      setError('Não foi possível conectar. Verifique a internet e tente de novo.')
    } finally {
      setBusy(false)
    }
  }

  async function handleForgot(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const result = await requestPasswordReset(db, identifier)
      if (result.ok) {
        setNotice(
          'Pedido enviado! O organizador vai reenviar o convite pelo WhatsApp para você criar uma nova senha. Seu sorteio não será alterado.',
        )
      } else {
        setError(result.message)
      }
    } catch {
      setError('Não foi possível conectar. Verifique a internet e tente de novo.')
    } finally {
      setBusy(false)
    }
  }

  function switchMode(next: 'login' | 'forgot') {
    setMode(next)
    setError(null)
    setNotice(null)
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
        <p className="mt-1 text-sm text-ink/60">
          {mode === 'login' ? 'Entre para ver o seu sorteio.' : 'Vamos recuperar o seu acesso.'}
        </p>
      </div>

      <section className={cardClass}>
        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="identifier" className={labelClass}>
                Telefone (WhatsApp)
              </label>
              <input
                id="identifier"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                inputMode="text"
                autoComplete="username"
                placeholder="(11) 91234-5678"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="password" className={labelClass}>
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
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
              disabled={busy || !identifier.trim() || !password}
              className={`${primaryButtonClass} w-full`}
            >
              <LogIn className="h-5 w-5" aria-hidden="true" />
              {busy ? 'Entrando…' : 'Entrar'}
            </button>
            <button
              type="button"
              onClick={() => switchMode('forgot')}
              className="min-h-11 w-full rounded-xl text-sm font-semibold text-forest underline underline-offset-2"
            >
              Esqueci minha senha
            </button>
          </form>
        ) : (
          <form onSubmit={handleForgot} className="space-y-4">
            <p className="text-sm leading-relaxed text-ink/65">
              Informe o telefone cadastrado. O organizador recebe o pedido e reenvia o
              convite por WhatsApp para você criar uma nova senha. O resultado do sorteio
              não muda.
            </p>
            <div>
              <label htmlFor="forgot-phone" className={labelClass}>
                Telefone (WhatsApp)
              </label>
              <input
                id="forgot-phone"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                autoComplete="tel"
                placeholder="(11) 91234-5678"
                className={inputClass}
              />
            </div>

            {error ? (
              <p role="alert" className="text-sm text-berry">
                {error}
              </p>
            ) : null}
            {notice ? (
              <p
                role="status"
                className="rounded-2xl border border-forest/20 bg-forest/5 p-3 text-sm leading-relaxed text-ink/75"
              >
                {notice}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={busy || !identifier.trim()}
              className={`${primaryButtonClass} w-full`}
            >
              <Send className="h-5 w-5" aria-hidden="true" />
              {busy ? 'Enviando…' : 'Pedir nova senha'}
            </button>
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`${secondaryButtonClass} w-full`}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Voltar ao login
            </button>
          </form>
        )}
      </section>
    </div>
  )
}
