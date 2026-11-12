import { useEffect, useState } from 'react'
import type { Db } from '../data/db'

interface Snapshot<T> {
  path: string | null
  value: T | null
  ready: boolean
}

// Assina um caminho do banco. `ready` fica true depois da primeira resposta.
export function useValue<T>(db: Db, path: string | null): { value: T | null; ready: boolean } {
  const [snapshot, setSnapshot] = useState<Snapshot<T>>({ path, value: null, ready: false })

  useEffect(() => {
    if (!path) return
    return db.subscribe<T>(path, (value) => setSnapshot({ path, value, ready: true }))
  }, [db, path])

  if (path === null) return { value: null, ready: true }
  const current = snapshot.path === path
  return { value: current ? snapshot.value : null, ready: current && snapshot.ready }
}
