import { useSyncExternalStore } from 'react'

function subscribe(callback: () => void): () => void {
  window.addEventListener('hashchange', callback)
  return () => window.removeEventListener('hashchange', callback)
}

export function useHash(): string {
  return useSyncExternalStore(
    subscribe,
    () => window.location.hash,
    () => '',
  )
}

export function clearHash(): void {
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}
