/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_EMULATOR?: string
  readonly VITE_FIREBASE_PROJECT_ID?: string
  readonly VITE_FIREBASE_DATABASE_URL?: string
  readonly VITE_FIREBASE_API_KEY?: string
  readonly VITE_PUBLIC_URL?: string
  readonly VITE_NTFY_TOPIC?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
