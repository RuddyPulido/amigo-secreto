import { useMemo, useState } from 'react'
import { LogOut, Settings, ShieldCheck, Users } from 'lucide-react'
import type { Db } from '../../data/db'
import { useMasterData } from '../../hooks/useMasterData'
import { applyAdminAction, wouldResetDraw, type AdminAction } from '../../services/admin'
import { BottomNav, type NavItem } from '../../components/BottomNav'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { NoticeBanner } from '../../components/NoticeBanner'
import { sectionKickerClass } from '../../components/ui'
import { FamiliesSection } from './FamiliesSection'
import { PanelTab } from './PanelTab'
import { PeopleSection } from './PeopleSection'
import { RulesSection } from './RulesSection'

type MasterTab = 'painel' | 'cadastros'

const NAV_ITEMS: readonly NavItem<MasterTab>[] = [
  { id: 'painel', label: 'Painel', icon: ShieldCheck },
  { id: 'cadastros', label: 'Cadastros', icon: Settings },
]

interface PendingAction {
  action: AdminAction
  onDone?: () => void
}

interface MasterAppProps {
  db: Db
  onLogout: () => void
}

export function MasterApp({ db, onLogout }: MasterAppProps) {
  const data = useMasterData(db)
  const [tab, setTab] = useState<MasterTab>('painel')
  const [pending, setPending] = useState<PendingAction | null>(null)
  const [error, setError] = useState<string | null>(null)

  const drawnCount = data.drawnIds.size
  const hasDraws = drawnCount > 0
  const people = data.people

  const snapshot = useMemo(() => ({ people, hasDraws }), [people, hasDraws])

  async function execute(action: AdminAction, onDone?: () => void) {
    setError(null)
    try {
      const result = await applyAdminAction(db, action)
      if (result.ok) onDone?.()
      else setError(result.message)
    } catch {
      setError('Não foi possível salvar. Verifique a internet e tente de novo.')
    }
  }

  function requestAction(action: AdminAction, onDone?: () => void) {
    if (wouldResetDraw(snapshot, action)) setPending({ action, onDone })
    else void execute(action, onDone)
  }

  function dispatch(action: AdminAction) {
    void execute(action)
  }

  function applyPending() {
    if (!pending) return
    void execute(pending.action, pending.onDone)
    setPending(null)
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <main className="flex-1 px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
        <header className="flex items-center gap-3 pt-1">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forest text-honey shadow-sm">
            {tab === 'painel' ? (
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Users className="h-6 w-6" aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className={sectionKickerClass}>Organizador</p>
            <h1 className="text-2xl font-extrabold tracking-tight text-forest">
              {tab === 'painel' ? 'Painel' : 'Cadastros'}
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

        <div className="mt-5 space-y-5">
          {error ? (
            <NoticeBanner tone="warning" message={error} onDismiss={() => setError(null)} />
          ) : null}

          {!data.ready ? (
            <p role="status" className="py-8 text-center text-sm text-ink/55">
              Carregando…
            </p>
          ) : tab === 'painel' ? (
            <PanelTab
              db={db}
              data={data}
              requestAction={requestAction}
              dispatch={dispatch}
              onOpenRegistry={() => setTab('cadastros')}
            />
          ) : (
            <>
              {hasDraws ? (
                <div
                  role="status"
                  className="rounded-2xl border border-gold/30 bg-gold/10 p-3 text-sm leading-relaxed text-ink/75"
                >
                  <span className="font-semibold text-ink">Sorteio em andamento:</span>{' '}
                  {drawnCount} de {people.length} já sortearam. Adicionar ou remover pessoas,
                  trocar a família ou a idade de alguém, ou mudar as regras reinicia o
                  sorteio.
                </div>
              ) : null}

              <FamiliesSection
                families={data.families}
                people={people}
                requestAction={requestAction}
                dispatch={dispatch}
              />
              <PeopleSection
                db={db}
                families={data.families}
                people={people}
                credentials={data.credentials}
                requestAction={requestAction}
                dispatch={dispatch}
              />
              <RulesSection
                allowSameFamily={data.settings.allowSameFamily}
                onlyChildrenDrawChildren={data.settings.onlyChildrenDrawChildren}
                onChangeAllowSameFamily={(allow) =>
                  requestAction({ type: 'settings/setAllowSameFamily', allow })
                }
                onChangeOnlyChildrenDrawChildren={(value) =>
                  requestAction({ type: 'settings/setOnlyChildrenDrawChildren', value })
                }
              />
            </>
          )}
        </div>
      </main>

      <BottomNav items={NAV_ITEMS} value={tab} onChange={setTab} />

      <ConfirmDialog
        open={pending !== null}
        title="Reiniciar sorteio?"
        description={`Essa alteração apaga ${drawnCount} ${
          drawnCount === 1 ? 'resultado já sorteado' : 'resultados já sorteados'
        } e fecha o sorteio. Famílias, pessoas e senhas serão mantidas.`}
        confirmLabel="Continuar"
        tone="danger"
        onConfirm={applyPending}
        onCancel={() => setPending(null)}
      />
    </div>
  )
}
