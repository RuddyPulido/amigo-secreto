import type { AppAction } from '../../store/appReducer'

export type RequestAction = (
  action: AppAction,
  onConfirmed?: () => void,
) => void

export type DispatchAction = (action: AppAction) => void
