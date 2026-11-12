import { useEffect, useReducer, useState } from 'react'
import { loadState, saveState, type LoadNotice } from '../lib/storage'
import { appReducer } from './appReducer'

export function useAppState() {
  const [loaded] = useState(() => loadState())
  const [state, dispatch] = useReducer(appReducer, loaded.state)
  const [notice, setNotice] = useState<LoadNotice>(loaded.notice)
  const [saveError, setSaveError] = useState(false)

  useEffect(() => {
    const result = saveState(state)
    // Sincroniza com o localStorage; o aviso de falha precisa refletir esse sistema externo.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaveError(!result.ok)
  }, [state])

  return {
    state,
    dispatch,
    notice,
    dismissNotice: () => setNotice(null),
    saveError,
  }
}
