import { initializeApp, type FirebaseApp } from 'firebase/app'
import {
  connectDatabaseEmulator,
  get,
  getDatabase,
  onValue,
  ref,
  runTransaction,
  set,
  update,
} from 'firebase/database'
import { stripUndefined, type Db, type Unsubscribe, type Updates } from './db'

const EMULATOR_HOST = '127.0.0.1'
const EMULATOR_PORT = 9000

export interface FirebaseSettings {
  projectId: string
  databaseURL: string
  apiKey?: string
  useEmulator: boolean
}

export function readFirebaseSettings(): FirebaseSettings | null {
  const env = import.meta.env
  const projectId = env.VITE_FIREBASE_PROJECT_ID
  const databaseURL = env.VITE_FIREBASE_DATABASE_URL
  if (!projectId || !databaseURL) return null

  return {
    projectId,
    databaseURL,
    apiKey: env.VITE_FIREBASE_API_KEY,
    useEmulator: env.VITE_USE_EMULATOR === 'true',
  }
}

export function createFirebaseDb(settings: FirebaseSettings): Db {
  const app: FirebaseApp = initializeApp({
    projectId: settings.projectId,
    databaseURL: settings.databaseURL,
    apiKey: settings.apiKey ?? 'demo-key',
  })
  const database = getDatabase(app)
  if (settings.useEmulator) {
    connectDatabaseEmulator(database, EMULATOR_HOST, EMULATOR_PORT)
  }

  return {
    async get<T>(path: string): Promise<T | null> {
      const snapshot = await get(ref(database, path))
      return snapshot.exists() ? (snapshot.val() as T) : null
    },

    async set(path, value) {
      await set(ref(database, path), stripUndefined(value) ?? null)
    },

    async update(updates: Updates) {
      await update(ref(database), stripUndefined(updates))
    },

    subscribe<T>(path: string, callback: (value: T | null) => void): Unsubscribe {
      return onValue(ref(database, path), (snapshot) => {
        callback(snapshot.exists() ? (snapshot.val() as T) : null)
      })
    },

    async transaction<T>(path: string, handler: (current: T | null) => T | undefined) {
      const result = await runTransaction(
        ref(database, path),
        (current) => handler((current ?? null) as T | null),
        { applyLocally: false },
      )
      return {
        committed: result.committed,
        value: result.snapshot.exists() ? (result.snapshot.val() as T) : null,
      }
    },
  }
}
