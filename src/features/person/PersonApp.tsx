import { useEffect, useState } from 'react'
import { Clock, Eye, EyeOff, Gift, LogOut, Shuffle } from 'lucide-react'
import type { Db } from '../../data/db'
import { PATHS } from '../../data/parse'
import { useValue } from '../../hooks/useValue'
import { drawMyFriend } from '../../services/draw'
import type { Id } from '../../types'
import {
  cardClass,
  primaryButtonClass,
  sectionKickerClass,
  secondaryButtonClass,
} from '../../components/ui'

interface PersonAppProps {
  db: Db
  personId: Id
  passwordHash: string
  onLogout: () => void
}

interface NamedNode {
  name?: string
  familyId?: string
}

export function PersonApp({ db, personId, passwordHash, onLogout }: PersonAppProps) {
  const person = useValue<NamedNode>(db, `${PATHS.people}/${personId}`)
  const storedHash = useValue<string>(db, `${PATHS.credentials}/${personId}/passwordHash`)
  const open = useValue<boolean>(db, `${PATHS.draw}/open`)
  const targetId = useValue<Id>(db, `${PATHS.draw}/assignments/${personId}`)
  const target = useValue<NamedNode>(
    db,
    targetId.value ? `${PATHS.people}/${targetId.value}` : null,
  )
  const targetFamily = useValue<NamedNode>(
    db,
    target.value?.familyId ? `${PATHS.families}/${target.value.familyId}` : null,
  )

  const [revealed, setRevealed] = useState(false)
  const [drawing, setDrawing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loaded = person.ready && storedHash.ready && open.ready && targetId.ready
  const sessionLost =
    loaded && (person.value === null || storedHash.value !== passwordHash)

  useEffect(() => {
    if (sessionLost) onLogout()
  }, [sessionLost, onLogout])

  // O resultado nunca fica à mostra quando o app vai para segundo plano.
  useEffect(() => {
    const hide = () => {
      if (document.visibilityState === 'hidden') setRevealed(false)
    }
    document.addEventListener('visibilitychange', hide)
    return () => document.removeEventListener('visibilitychange', hide)
  }, [])

  async function handleDraw() {
    if (drawing) return
    setDrawing(true)
    setError(null)
    try {
      const result = await drawMyFriend(db, personId)
      if (result.ok) setRevealed(true)
      else setError(result.message)
    } catch {
      setError('Não foi possível sortear. Verifique a internet e tente de novo.')
    } finally {
      setDrawing(false)
    }
  }

  const hasResult = !!targetId.value
  const targetReady = hasResult && target.ready && targetFamily.ready

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <header className="flex items-center gap-3 pt-1">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forest text-honey shadow-sm">
          <Gift className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className={sectionKickerClass}>Amigo secreto</p>
          <h1 className="truncate text-2xl font-extrabold tracking-tight text-forest">
            {person.value?.name ? `Olá, ${person.value.name}!` : 'Olá!'}
          </h1>
        </div>
        <button
          type="button"
          onClick={onLogout}
          aria-label="Sair"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink/55 transition hover:bg-forest/10 hover:text-forest focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          <LogOut className="h-5 w-5" aria-hidden="true" />
        </button>
      </header>

      <main className="mt-6 space-y-5">
        {!loaded ? (
          <p role="status" className="text-center text-sm text-ink/55">
            Carregando…
          </p>
        ) : hasResult ? (
          <section className="rounded-3xl bg-gradient-to-br from-forest to-pine p-6 text-white shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/55">
              Seu amigo secreto
            </p>

            {revealed && targetReady ? (
              <div aria-live="polite" className="mt-4">
                <p className="break-words text-4xl font-extrabold tracking-tight text-honey">
                  {target.value?.name ?? '—'}
                </p>
                {targetFamily.value?.name ? (
                  <p className="mt-2 text-sm text-white/65">
                    Família {targetFamily.value.name}
                  </p>
                ) : null}
                <p className="mt-4 text-sm leading-relaxed text-white/75">
                  Não conte para ninguém! Se quiser, oculte para ninguém ver sua tela.
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm leading-relaxed text-white/75">
                Seu sorteio já foi feito. O nome fica escondido até você querer ver.
              </p>
            )}

            <button
              type="button"
              onClick={() => setRevealed((value) => !value)}
              disabled={!targetReady}
              className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-gold px-5 py-3 font-semibold text-ink transition hover:bg-gold/90 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {revealed ? (
                <EyeOff className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Eye className="h-5 w-5" aria-hidden="true" />
              )}
              {revealed ? 'Ocultar' : 'Ver quem eu tirei'}
            </button>
          </section>
        ) : open.value === true ? (
          <section className={cardClass}>
            <h2 className="text-lg font-semibold text-forest">Chegou a sua vez!</h2>
            <p className="mt-1 text-sm leading-relaxed text-ink/65">
              O sorteio está liberado. Toque no botão para descobrir quem é o seu amigo
              secreto. Só você vai ver o resultado.
            </p>
            <button
              type="button"
              onClick={handleDraw}
              disabled={drawing}
              className={`${primaryButtonClass} mt-5 w-full`}
            >
              <Shuffle className="h-5 w-5" aria-hidden="true" />
              {drawing ? 'Sorteando…' : 'Sortear meu amigo secreto'}
            </button>
            {error ? (
              <p role="alert" className="mt-3 text-sm text-berry">
                {error}
              </p>
            ) : null}
          </section>
        ) : (
          <section className={`${cardClass} text-center`}>
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/15 text-gold">
              <Clock className="h-7 w-7" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-forest">
              Aguardando o organizador
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-ink/65">
              O sorteio ainda não foi liberado. Esta tela atualiza sozinha quando chegar a
              hora.
            </p>
          </section>
        )}

        <button
          type="button"
          onClick={onLogout}
          className={`${secondaryButtonClass} w-full`}
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sair
        </button>
      </main>
    </div>
  )
}
