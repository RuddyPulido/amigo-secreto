import type { Db, TransactionResult, Unsubscribe, Updates } from './db'

type Node = Record<string, unknown>

function isNode(value: unknown): value is Node {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function split(path: string): string[] {
  return path.split('/').filter(Boolean)
}

function clone<T>(value: T): T {
  return value === undefined || value === null ? value : (structuredClone(value) as T)
}

// Banco em memória com a mesma semântica do Realtime Database (nós vazios somem, null apaga).
// Serve para testar os serviços sem Firebase.
export function createMemoryDb(): Db {
  let root: Node = {}
  const listeners = new Set<{ path: string; callback: (value: unknown) => void; last: string }>()

  function read(path: string): unknown {
    let current: unknown = root
    for (const key of split(path)) {
      if (!isNode(current) || !(key in current)) return null
      current = current[key]
    }
    return current ?? null
  }

  function prune(parts: string[]): void {
    for (let depth = parts.length; depth > 0; depth -= 1) {
      let node: unknown = root
      for (const key of parts.slice(0, depth - 1)) node = isNode(node) ? node[key] : undefined
      const key = parts[depth - 1]!
      if (!isNode(node)) return
      const child = node[key]
      if (isNode(child) && Object.keys(child).length === 0) delete node[key]
      else return
    }
  }

  function write(path: string, value: unknown): void {
    const parts = split(path)
    if (parts.length === 0) {
      root = isNode(value) ? (clone(value) as Node) : {}
      return
    }

    if (value === null || value === undefined) {
      let node: unknown = root
      for (const key of parts.slice(0, -1)) node = isNode(node) ? node[key] : undefined
      if (isNode(node)) delete node[parts[parts.length - 1]!]
      prune(parts.slice(0, -1))
      return
    }

    let node: Node = root
    for (const key of parts.slice(0, -1)) {
      const next = node[key]
      if (isNode(next)) {
        node = next
      } else {
        const created: Node = {}
        node[key] = created
        node = created
      }
    }
    node[parts[parts.length - 1]!] = clone(value)
  }

  function notify(): void {
    for (const listener of listeners) {
      const value = read(listener.path)
      const serialized = JSON.stringify(value)
      if (serialized !== listener.last) {
        listener.last = serialized
        listener.callback(clone(value))
      }
    }
  }

  return {
    async get<T>(path: string): Promise<T | null> {
      return clone(read(path)) as T | null
    },

    async set(path, value) {
      write(path, value)
      notify()
    },

    async update(updates: Updates) {
      for (const [path, value] of Object.entries(updates)) write(path, value)
      notify()
    },

    subscribe<T>(path: string, callback: (value: T | null) => void): Unsubscribe {
      const value = read(path)
      const listener = {
        path,
        callback: callback as (value: unknown) => void,
        last: JSON.stringify(value),
      }
      listeners.add(listener)
      queueMicrotask(() => {
        if (listeners.has(listener)) callback(clone(value) as T | null)
      })
      return () => {
        listeners.delete(listener)
      }
    },

    async transaction<T>(
      path: string,
      handler: (current: T | null) => T | undefined,
    ): Promise<TransactionResult<T>> {
      const current = clone(read(path)) as T | null
      const next = handler(current)
      if (next === undefined) return { committed: false, value: current }
      write(path, next)
      notify()
      return { committed: true, value: clone(read(path)) as T | null }
    },
  }
}
