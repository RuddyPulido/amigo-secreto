import { useState } from 'react'
import { BottomNav } from './components/BottomNav'
import { NoticeBanner } from './components/NoticeBanner'
import { DrawTab } from './features/draw/DrawTab'
import { SettingsTab } from './features/settings/SettingsTab'
import { useAppState } from './store/useAppState'

export type Tab = 'draw' | 'settings'

export default function App() {
  const { state, dispatch, notice, dismissNotice, saveError } = useAppState()
  const [tab, setTab] = useState<Tab>('draw')

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <main className="flex-1 px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="space-y-3">
          {saveError ? (
            <NoticeBanner
              tone="warning"
              message="Não foi possível salvar neste navegador. Os dados podem ser perdidos ao fechar a página."
            />
          ) : notice === 'unavailable' ? (
            <NoticeBanner
              tone="warning"
              message="Não foi possível acessar o armazenamento deste navegador. O app funciona, mas os dados não serão salvos."
              onDismiss={dismissNotice}
            />
          ) : null}

          {notice === 'corrupt' ? (
            <NoticeBanner
              tone="warning"
              message="Os dados salvos estavam inválidos e foram reiniciados."
              onDismiss={dismissNotice}
            />
          ) : null}

          {notice === 'draw-discarded' ? (
            <NoticeBanner
              tone="warning"
              message="O sorteio salvo não pôde ser recuperado e foi reiniciado. Os cadastros foram mantidos."
              onDismiss={dismissNotice}
            />
          ) : null}
        </div>

        {tab === 'draw' ? (
          <DrawTab
            state={state}
            dispatch={dispatch}
            onOpenSettings={() => setTab('settings')}
          />
        ) : (
          <SettingsTab state={state} dispatch={dispatch} />
        )}
      </main>

      <BottomNav tab={tab} onChange={setTab} />
    </div>
  )
}
