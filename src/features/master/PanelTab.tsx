import { useMemo, useState } from 'react'
import { CheckCircle2, KeyRound, RotateCcw, Users } from 'lucide-react'
import type { Db } from '../../data/db'
import type { MasterData } from '../../hooks/useMasterData'
import { checkFeasibility } from '../../lib/draw'
import { formatPhone } from '../../lib/phone'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { ProgressBar } from '../../components/ProgressBar'
import { Switch } from '../../components/Switch'
import {
  cardClass,
  dangerButtonClass,
  sectionTitleClass,
} from '../../components/ui'
import type { DispatchAction, RequestAction } from './controller'
import { FeasibilityAlert } from './FeasibilityAlert'
import { InviteActions } from './InviteActions'
import { AccountChips, StatusChip } from './StatusChip'

interface PanelTabProps {
  db: Db
  data: MasterData
  requestAction: RequestAction
  dispatch: DispatchAction
  onOpenRegistry: () => void
}

export function PanelTab({ db, data, requestAction, dispatch, onOpenRegistry }: PanelTabProps) {
  const { families, people, settings, credentials, drawOpen, drawnIds, resetIds } = data
  const [confirmReset, setConfirmReset] = useState(false)

  const feasibility = useMemo(
    () =>
      checkFeasibility(
        people,
        families,
        settings.allowSameFamily,
        {},
        settings.onlyChildrenDrawChildren,
      ),
    [people, families, settings],
  )

  const familyName = useMemo(
    () => new Map(families.map((family) => [family.id, family.name])),
    [families],
  )

  const drawnCount = people.filter((person) => drawnIds.has(person.id)).length
  const hasDraws = drawnIds.size > 0
  const withoutAccount = people.filter((person) => !credentials[person.id]?.passwordHash).length
  const resetRequests = people.filter((person) => resetIds.has(person.id))

  return (
    <div className="space-y-5">
      {!feasibility.ok ? (
        <FeasibilityAlert
          feasibility={feasibility}
          hasDraws={hasDraws}
          onOpenSettings={onOpenRegistry}
          onReset={() => setConfirmReset(true)}
        />
      ) : null}

      <section className={cardClass}>
        <div className="flex items-center justify-between gap-3">
          <h2 className={sectionTitleClass}>Sorteio</h2>
          <StatusChip tone={drawOpen ? 'ok' : 'idle'}>{drawOpen ? 'Liberado' : 'Fechado'}</StatusChip>
        </div>

        <div className="mt-4">
          <Switch
            checked={drawOpen}
            onChange={(open) => requestAction({ type: 'draw/setOpen', open })}
            label="Sorteio liberado"
            description={
              drawOpen
                ? 'As pessoas já podem tocar em “Sortear” no próprio celular.'
                : 'Libere quando todos estiverem prontos. Cada pessoa só vê o próprio resultado.'
            }
          />
        </div>

        <div className="mt-5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-ink/65">Já sortearam</span>
            <span className="font-medium tabular-nums text-ink/55">
              {drawnCount}/{people.length}
            </span>
          </div>
          <div className="mt-2">
            <ProgressBar value={drawnCount} max={people.length} />
          </div>
          {people.length > 0 && withoutAccount > 0 ? (
            <p className="mt-3 text-xs leading-relaxed text-ink/55">
              {withoutAccount} {withoutAccount === 1 ? 'pessoa ainda não criou' : 'pessoas ainda não criaram'} a
              senha. Elas podem sortear assim que entrarem.
            </p>
          ) : null}
        </div>

        {hasDraws || drawOpen ? (
          <button
            type="button"
            onClick={() => (hasDraws ? setConfirmReset(true) : dispatch({ type: 'draw/reset' }))}
            className={`${dangerButtonClass} mt-5 w-full`}
          >
            <RotateCcw className="h-5 w-5" aria-hidden="true" />
            Reiniciar sorteio
          </button>
        ) : null}
      </section>

      {resetRequests.length > 0 ? (
        <section className={cardClass}>
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-gold" aria-hidden="true" />
            <h2 className={sectionTitleClass}>Pedidos de nova senha</h2>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-ink/60">
            Reenvie o convite pelo WhatsApp. Ao criar a nova senha, o resultado do sorteio
            continua o mesmo.
          </p>
          <ul className="mt-3 divide-y divide-forest/10 overflow-hidden rounded-2xl border border-forest/10">
            {resetRequests.map((person) => (
              <li key={person.id} className="px-3 py-2.5">
                <p className="font-medium text-ink">{person.name}</p>
                <p className="text-xs text-ink/55">
                  {formatPhone(credentials[person.id]?.phone ?? '')}
                </p>
                <InviteActions db={db} person={person} credential={credentials[person.id]} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className={cardClass}>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-forest" aria-hidden="true" />
          <h2 className={sectionTitleClass}>Participantes</h2>
          <span className="ml-auto text-xs font-medium tabular-nums text-ink/40">
            {people.length}
          </span>
        </div>

        {people.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-forest/15 p-3 text-sm text-ink/50">
            Cadastre famílias e pessoas na aba Cadastros.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-forest/10 overflow-hidden rounded-2xl border border-forest/10">
            {people.map((person) => (
              <li key={person.id} className="flex items-start gap-3 px-3 py-2.5">
                <CheckCircle2
                  className={`mt-0.5 h-5 w-5 shrink-0 ${
                    drawnIds.has(person.id) ? 'text-forest' : 'text-ink/20'
                  }`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{person.name}</p>
                  <p className="truncate text-xs text-ink/50">
                    {familyName.get(person.familyId) ?? 'Sem família'}
                    {person.isChild ? ' · criança' : ''}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <AccountChips credential={credentials[person.id]} />
                    <StatusChip tone={drawnIds.has(person.id) ? 'ok' : 'idle'}>
                      {drawnIds.has(person.id) ? 'Já sorteou' : 'Ainda não sorteou'}
                    </StatusChip>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={confirmReset}
        title="Reiniciar sorteio?"
        description="Todos os resultados serão apagados e o sorteio será fechado. Famílias, pessoas e senhas serão mantidas."
        confirmLabel="Reiniciar"
        tone="danger"
        onConfirm={() => {
          setConfirmReset(false)
          dispatch({ type: 'draw/reset' })
        }}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  )
}
