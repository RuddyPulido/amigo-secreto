import { useState } from 'react'
import { RotateCcw, Settings } from 'lucide-react'
import type { AppState } from '../../types'
import { wouldResetDraw, type AppAction } from '../../store/appReducer'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import {
  cardClass,
  dangerButtonClass,
  sectionKickerClass,
  sectionTitleClass,
} from '../../components/ui'
import { FamiliesSection } from './FamiliesSection'
import { PeopleSection } from './PeopleSection'
import { RulesSection } from './RulesSection'

interface SettingsTabProps {
  state: AppState
  dispatch: (action: AppAction) => void
}

interface PendingAction {
  action: AppAction
  onConfirmed?: () => void
}

export function SettingsTab({ state, dispatch }: SettingsTabProps) {
  const [pending, setPending] = useState<PendingAction | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  const count = Object.keys(state.draw.assignments).length
  const hasDraws = count > 0

  function requestAction(action: AppAction, onConfirmed?: () => void) {
    if (wouldResetDraw(state, action)) {
      setPending({ action, onConfirmed })
      return
    }
    dispatch(action)
    onConfirmed?.()
  }

  function applyPending() {
    if (!pending) return
    dispatch(pending.action)
    pending.onConfirmed?.()
    setPending(null)
  }

  function resetDraw() {
    dispatch({ type: 'draw/reset' })
    setConfirmReset(false)
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3 pt-1">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forest text-honey shadow-sm">
          <Settings className="h-6 w-6" aria-hidden="true" />
        </span>
        <div>
          <p className={sectionKickerClass}>Amigo secreto</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-forest">
            Configurações
          </h1>
        </div>
      </header>

      {hasDraws ? (
        <div
          role="status"
          className="rounded-2xl border border-gold/30 bg-gold/10 p-3 text-sm leading-relaxed text-ink/75"
        >
          <span className="font-semibold text-ink">Sorteio em andamento:</span>{' '}
          {count} de {state.people.length} já sortearam. Adicionar ou remover
          pessoas, trocar a família de alguém ou mudar a regra reinicia o sorteio.
        </div>
      ) : null}

      <FamiliesSection
        families={state.families}
        people={state.people}
        requestAction={requestAction}
        dispatch={dispatch}
      />

      <PeopleSection
        families={state.families}
        people={state.people}
        requestAction={requestAction}
        dispatch={dispatch}
      />

      <RulesSection
        allowSameFamily={state.settings.allowSameFamily}
        onChange={(allow) =>
          requestAction({ type: 'settings/setAllowSameFamily', allow })
        }
      />

      {hasDraws ? (
        <section className={cardClass}>
          <h2 className={sectionTitleClass}>Sorteio</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink/60">
            Recomece do zero mantendo as famílias e as pessoas cadastradas.
          </p>
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className={`${dangerButtonClass} mt-4 w-full`}
          >
            <RotateCcw className="h-5 w-5" aria-hidden="true" />
            Reiniciar sorteio
          </button>
        </section>
      ) : null}

      <p className="px-2 pb-2 text-center text-xs leading-relaxed text-ink/45">
        Os dados ficam salvos apenas neste aparelho. Limpar os dados do site apaga
        famílias, pessoas e resultados.
      </p>

      <ConfirmDialog
        open={pending !== null}
        title="Reiniciar sorteio?"
        description={`Essa alteração apaga ${count} ${
          count === 1 ? 'resultado já sorteado' : 'resultados já sorteados'
        } e reinicia o sorteio. As famílias e pessoas serão mantidas.`}
        confirmLabel="Continuar"
        tone="danger"
        onConfirm={applyPending}
        onCancel={() => setPending(null)}
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
    </div>
  )
}
