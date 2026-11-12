import { useCallback, useEffect, useState } from 'react'
import { DatabaseZap } from 'lucide-react'
import { clearSession, loadSession, saveSession } from './auth/sessionStorage'
import { getDb, isDbConfigured } from './data'
import type { Db } from './data/db'
import { InviteScreen } from './features/auth/InviteScreen'
import { LoginScreen } from './features/auth/LoginScreen'
import { MasterApp } from './features/master/MasterApp'
import { PersonApp } from './features/person/PersonApp'
import { clearHash, useHash } from './hooks/useHash'
import { isSessionValid } from './services/auth'
import { parseInviteToken } from './services/invite'
import type { Session } from './types'
import { cardClass } from './components/ui'

export default function App() {
  if (!isDbConfigured()) return <ConfigMissing />
  return <Shell db={getDb()} />
}

function Shell({ db }: { db: Db }) {
  const [session, setSession] = useState<Session | null>(() => loadSession())
  const [checked, setChecked] = useState(() => loadSession() === null)
  const hash = useHash()
  const inviteToken = parseInviteToken(hash)

  // Confere a sessão salva (senha trocada ou pessoa removida derrubam o acesso).
  useEffect(() => {
    if (checked || !session) return
    let cancelled = false
    isSessionValid(db, session)
      .then((valid) => {
        if (cancelled) return
        if (!valid) {
          clearSession()
          setSession(null)
        }
        setChecked(true)
      })
      .catch(() => {
        // Sem conexão: mantém a sessão e deixa a tela tentar carregar.
        if (!cancelled) setChecked(true)
      })
    return () => {
      cancelled = true
    }
  }, [db, session, checked])

  const handleLogin = useCallback((next: Session) => {
    saveSession(next)
    setSession(next)
    setChecked(true)
    clearHash()
  }, [])

  const handleLogout = useCallback(() => {
    clearSession()
    setSession(null)
    setChecked(true)
  }, [])

  if (inviteToken) {
    return (
      <InviteScreen
        db={db}
        token={inviteToken}
        onAccepted={handleLogin}
        onBackToLogin={clearHash}
      />
    )
  }

  if (!checked) {
    return (
      <p role="status" className="py-20 text-center text-sm text-ink/55">
        Carregando…
      </p>
    )
  }

  if (!session) return <LoginScreen db={db} onLogin={handleLogin} />
  if (session.role === 'master') return <MasterApp db={db} onLogout={handleLogout} />
  return (
    <PersonApp
      db={db}
      personId={session.personId}
      passwordHash={session.passwordHash}
      onLogout={handleLogout}
    />
  )
}

function ConfigMissing() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <section className={`${cardClass} text-center`}>
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/15 text-gold">
          <DatabaseZap className="h-7 w-7" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-lg font-semibold text-forest">Banco de dados não configurado</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink/65">
          Defina as variáveis <code>VITE_FIREBASE_PROJECT_ID</code> e{' '}
          <code>VITE_FIREBASE_DATABASE_URL</code> (veja o README) ou rode o emulador local
          com <code>npm run emulator</code>.
        </p>
      </section>
    </div>
  )
}
