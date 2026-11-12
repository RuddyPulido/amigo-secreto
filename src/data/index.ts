import type { Db } from './db'
import { createFirebaseDb, readFirebaseSettings } from './firebaseDb'

let instance: Db | null = null

export function isDbConfigured(): boolean {
  return readFirebaseSettings() !== null
}

export function getDb(): Db {
  if (instance) return instance

  const settings = readFirebaseSettings()
  if (!settings) {
    throw new Error('Firebase não configurado. Veja o README (variáveis VITE_FIREBASE_*).')
  }
  instance = createFirebaseDb(settings)
  return instance
}
