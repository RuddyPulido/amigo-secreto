export type Unsubscribe = () => void

// Caminhos relativos à raiz; um valor null apaga o caminho (como no Firebase).
export type Updates = Record<string, unknown>

export interface TransactionResult<T> {
  committed: boolean
  value: T | null
}

export interface Db {
  get<T = unknown>(path: string): Promise<T | null>
  set(path: string, value: unknown): Promise<void>
  update(updates: Updates): Promise<void>
  subscribe<T = unknown>(path: string, callback: (value: T | null) => void): Unsubscribe
  // O handler pode ser chamado mais de uma vez e com null enquanto o valor real não chega:
  // deve ser puro, devolver um valor para continuar ou undefined para abortar.
  transaction<T>(
    path: string,
    handler: (current: T | null) => T | undefined,
  ): Promise<TransactionResult<T>>
}

export function stripUndefined<T>(value: T): T {
  if (value === undefined) return value
  return JSON.parse(JSON.stringify(value)) as T
}
