import type { AdminAction } from '../../services/admin'

// `requestAction` pede confirmação quando a ação apagaria o sorteio em andamento;
// `dispatch` executa direto. Erros aparecem no aviso do painel.
export type RequestAction = (action: AdminAction, onDone?: () => void) => void
export type DispatchAction = (action: AdminAction) => void
