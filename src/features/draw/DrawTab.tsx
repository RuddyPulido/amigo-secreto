import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Gift,
  PartyPopper,
  RotateCcw,
  Settings,
  Shuffle,
  Users,
} from 'lucide-react'
import type { AppState, Person } from '../../types'
import {
  checkFeasibility,
  drawForPerson,
  getRemainingDrawers,
} from '../../lib/draw'
import type { AppAction } from '../../store/appReducer'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { ProgressBar } from '../../components/ProgressBar'
import {
  cardClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  sectionKickerClass,
} from '../../components/ui'
import { CompletedList } from './CompletedList'
import { FeasibilityAlert } from './FeasibilityAlert'
import { RevealDialog } from './RevealDialog'

interface DrawTabProps {
  state: AppState
  dispatch: (action: AppAction) => void
  onOpenSettings: () => void
}

interface RevealState {
  drawer: Person
  target: Person
}

const nameCollator = new Intl.Collator('pt-BR', { sensitivity: 'base' })

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function DrawTab({ state, dispatch, onOpenSettings }: DrawTabProps) {
  const { families, people, settings, draw } = state
  const assignments = draw.assignments

  const familyNameById = useMemo(
    () => new Map(families.map((family) => [family.id, family.name])),
    [families],
  )
  const remainingDrawers = useMemo(
    () => getRemainingDrawers(people, assignments),
    [people, assignments],
  )
  const sortedRemaining = useMemo(
    () => [...remainingDrawers].sort((a, b) => nameCollator.compare(a.name, b.name)),
    [remainingDrawers],
  )
  const feasibility = useMemo(
    () =>
      checkFeasibility(
        people,
        families,
        settings.allowSameFamily,
        assignments,
        settings.onlyChildrenDrawChildren,
      ),
    [
      people,
      families,
      settings.allowSameFamily,
      settings.onlyChildrenDrawChildren,
      assignments,
    ],
  )
  const shuffleNames = useMemo(() => people.map((person) => person.name), [people])

  const completedCount = people.length - remainingDrawers.length
  const allDrawn = people.length > 0 && remainingDrawers.length === 0

  const [selectedId, setSelectedId] = useState('')
  const [phase, setPhase] = useState<'idle' | 'drawing'>('idle')
  const [reveal, setReveal] = useState<RevealState | null>(null)
  const [pendingView, setPendingView] = useState<Person | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [drawError, setDrawError] = useState<string | null>(null)

  const drawingRef = useRef(false)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
      drawingRef.current = false
    }
  }, [])

  function handleDraw() {
    if (!selectedId || drawingRef.current) return

    const drawer = people.find((person) => person.id === selectedId)
    if (!drawer) return

    const outcome = drawForPerson(
      people,
      settings.allowSameFamily,
      assignments,
      selectedId,
      undefined,
      settings.onlyChildrenDrawChildren,
    )
    if (!outcome.ok) {
      setDrawError(outcome.message)
      return
    }

    const target = people.find((person) => person.id === outcome.targetId)
    if (!target) {
      setDrawError('Não foi possível concluir o sorteio. Reinicie o sorteio.')
      return
    }

    drawingRef.current = true
    setDrawError(null)
    dispatch({ type: 'draw/assign', drawerId: drawer.id, targetId: target.id })

    if (prefersReducedMotion()) {
      drawingRef.current = false
      setReveal({ drawer, target })
      return
    }

    setPhase('drawing')
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      drawingRef.current = false
      setPhase('idle')
      setReveal({ drawer, target })
    }, 850)
  }

  function hideReveal() {
    setReveal(null)
    setSelectedId('')
    setDrawError(null)
  }

  function confirmView() {
    if (!pendingView) return

    const targetId = assignments[pendingView.id]
    const target = targetId
      ? people.find((person) => person.id === targetId)
      : undefined
    if (target) setReveal({ drawer: pendingView, target })
    setPendingView(null)
  }

  function resetDraw() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    drawingRef.current = false
    setPhase('idle')
    setSelectedId('')
    setReveal(null)
    setDrawError(null)
    setConfirmReset(false)
    dispatch({ type: 'draw/reset' })
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3 pt-1">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forest text-honey shadow-sm">
          <Gift className="h-6 w-6" aria-hidden="true" />
        </span>
        <div>
          <p className={sectionKickerClass}>Amigo secreto</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-forest">
            Sorteio
          </h1>
        </div>
      </header>

      {people.length === 0 ? (
        <EmptyDrawState onOpenSettings={onOpenSettings} />
      ) : phase === 'drawing' ? (
        <DrawingCard names={shuffleNames} />
      ) : (
        <>
          {allDrawn ? (
            <CompletionCard total={people.length} onReset={() => setConfirmReset(true)} />
          ) : (
            <>
              {!feasibility.ok ? (
                <FeasibilityAlert
                  feasibility={feasibility}
                  hasDraws={completedCount > 0}
                  onOpenSettings={onOpenSettings}
                  onReset={() => setConfirmReset(true)}
                />
              ) : null}

              <section className={cardClass}>
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-lg font-semibold text-forest">
                    Quem vai sortear?
                  </h2>
                  <span className="text-sm font-medium tabular-nums text-ink/45">
                    {completedCount}/{people.length}
                  </span>
                </div>
                <div className="mt-3">
                  <ProgressBar value={completedCount} max={people.length} />
                </div>

                <form
                  onSubmit={(event) => {
                    event.preventDefault()
                    handleDraw()
                  }}
                  className="mt-5 space-y-4"
                >
                  <div>
                    <label htmlFor="drawer" className={labelClass}>
                      Seu nome
                    </label>
                    <select
                      id="drawer"
                      value={selectedId}
                      onChange={(event) => setSelectedId(event.target.value)}
                      className={inputClass}
                      disabled={!feasibility.ok}
                    >
                      <option value="">Selecione seu nome</option>
                      {sortedRemaining.map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.name} —{' '}
                          {familyNameById.get(person.familyId) ?? 'Sem família'}
                          {person.isChild ? ' · criança' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={!selectedId || !feasibility.ok}
                    className={`${primaryButtonClass} w-full`}
                  >
                    <Shuffle className="h-5 w-5" aria-hidden="true" />
                    Sortear
                  </button>

                  <p className="text-center text-xs leading-relaxed text-ink/50">
                    Cada pessoa sorteia uma vez. O app garante que todos consigam
                    sortear sem repetir ninguém.
                    {settings.onlyChildrenDrawChildren
                      ? ' Crianças sorteiam apenas crianças e adultos apenas adultos.'
                      : ''}
                  </p>
                </form>

                {drawError ? (
                  <div
                    role="alert"
                    className="mt-4 rounded-2xl border border-berry/20 bg-berry/5 p-3 text-sm text-berry"
                  >
                    <p>{drawError}</p>
                    <button
                      type="button"
                      onClick={() => setConfirmReset(true)}
                      className="mt-2 min-h-11 font-semibold underline underline-offset-2"
                    >
                      Reiniciar sorteio
                    </button>
                  </div>
                ) : null}
              </section>
            </>
          )}

          <CompletedList
            people={people}
            families={families}
            assignments={assignments}
            onReveal={setPendingView}
          />
        </>
      )}

      <ConfirmDialog
        open={pendingView !== null}
        title={
          pendingView ? `Ver resultado de ${pendingView.name}?` : 'Ver resultado'
        }
        description="Confirme que somente essa pessoa está vendo a tela. O resultado será exibido novamente."
        confirmLabel="Ver resultado"
        onConfirm={confirmView}
        onCancel={() => setPendingView(null)}
      />

      <ConfirmDialog
        open={confirmReset}
        title="Reiniciar sorteio?"
        description="Todos os resultados serão apagados. As famílias e pessoas serão mantidas."
        confirmLabel="Reiniciar"
        tone="danger"
        onConfirm={resetDraw}
        onCancel={() => setConfirmReset(false)}
      />

      {reveal ? (
        <RevealDialog
          key={`${reveal.drawer.id}-${reveal.target.id}`}
          drawer={reveal.drawer}
          target={reveal.target}
          targetFamilyName={familyNameById.get(reveal.target.familyId) ?? ''}
          onHide={hideReveal}
        />
      ) : null}
    </div>
  )
}

function EmptyDrawState({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <section className="rounded-3xl border border-dashed border-forest/20 bg-paper p-6 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-forest/10 text-forest">
        <Users className="h-7 w-7" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-forest">Vamos começar?</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink/60">
        Cadastre as famílias e as pessoas do grupo para liberar o sorteio.
      </p>
      <button
        type="button"
        onClick={onOpenSettings}
        className={`${primaryButtonClass} mt-5 w-full`}
      >
        <Settings className="h-5 w-5" aria-hidden="true" />
        Ir para Configurações
      </button>
    </section>
  )
}

function DrawingCard({ names }: { names: string[] }) {
  return (
    <section className="rounded-3xl bg-gradient-to-br from-forest to-pine p-8 text-center text-white shadow-lg">
      <Shuffle className="mx-auto h-8 w-8 text-honey" aria-hidden="true" />
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-white/55">
        Sorteando
      </p>
      <p className="mt-2 flex min-h-12 items-center justify-center text-3xl font-extrabold tracking-tight">
        <ShuffleNames names={names} />
      </p>
      <p className="mt-2 text-sm text-white/70">Em instantes o resultado aparece.</p>
    </section>
  )
}

function ShuffleNames({ names }: { names: string[] }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (names.length < 2) return
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % names.length)
    }, 85)
    return () => window.clearInterval(id)
  }, [names])

  return <span aria-hidden="true">{names[index] ?? names[0] ?? '…'}</span>
}

function CompletionCard({
  total,
  onReset,
}: {
  total: number
  onReset: () => void
}) {
  return (
    <section className="rounded-3xl bg-gradient-to-br from-forest to-pine p-6 text-white shadow-lg">
      <PartyPopper className="h-8 w-8 text-honey" aria-hidden="true" />
      <h2 className="mt-3 text-2xl font-extrabold tracking-tight">
        Sorteio concluído!
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-white/75">
        Todas as {total} pessoas já sortearam. Guardem os resultados e bom amigo
        secreto!
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        Reiniciar sorteio
      </button>
    </section>
  )
}
