import { AlertTriangle, RotateCcw, Settings } from 'lucide-react'
import type { Feasibility } from '../../lib/draw'
import {
  smallSecondaryButtonClass,
} from '../../components/ui'

type FailedFeasibility = Extract<Feasibility, { ok: false }>

interface FeasibilityAlertProps {
  feasibility: FailedFeasibility
  hasDraws: boolean
  onOpenSettings: () => void
  onReset: () => void
}

export function FeasibilityAlert({
  feasibility,
  hasDraws,
  onOpenSettings,
  onReset,
}: FeasibilityAlertProps) {
  return (
    <div
      role="alert"
      className="rounded-3xl border border-gold/30 bg-gold/10 p-4"
    >
      <div className="flex gap-3">
        <AlertTriangle
          className="mt-0.5 h-5 w-5 shrink-0 text-gold"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="font-semibold text-ink">Não é possível sortear</p>
          <p className="mt-1 text-sm leading-relaxed text-ink/70">
            {feasibility.message}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onOpenSettings}
              className={smallSecondaryButtonClass}
            >
              <Settings className="h-4 w-4" aria-hidden="true" />
              Abrir Configurações
            </button>
            {hasDraws ? (
              <button
                type="button"
                onClick={onReset}
                className={smallSecondaryButtonClass}
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Reiniciar sorteio
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
