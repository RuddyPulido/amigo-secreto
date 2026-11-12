import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { Gift, Sparkles, X } from 'lucide-react'
import type { Person } from '../../types'
import { goldButtonClass, primaryButtonClass } from '../../components/ui'

interface RevealDialogProps {
  drawer: Person
  target: Person
  targetFamilyName: string
  onHide: () => void
}

export function RevealDialog({
  drawer,
  target,
  targetFamilyName,
  onHide,
}: RevealDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (!dialog.open) dialog.showModal()
    return () => {
      if (dialog.open) dialog.close()
    }
  }, [])

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return

    const handleCancel = (event: Event) => {
      event.preventDefault()
      onHide()
    }
    dialog.addEventListener('cancel', handleCancel)
    return () => dialog.removeEventListener('cancel', handleCancel)
  }, [onHide])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') onHide()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [onHide])

  const handleBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) onHide()
  }

  return (
    <dialog
      ref={ref}
      aria-label="Resultado do sorteio"
      onClick={handleBackdropClick}
      className={`m-auto max-h-[min(90dvh,42rem)] w-[calc(100%-2rem)] max-w-sm overflow-y-auto rounded-3xl border-0 p-0 shadow-2xl ${
        revealed ? 'bg-forest text-white' : 'bg-paper text-ink'
      }`}
    >
      <div className="relative p-6">
        <button
          type="button"
          onClick={onHide}
          aria-label="Fechar resultado"
          className={`absolute right-3 top-3 inline-flex h-11 w-11 items-center justify-center rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
            revealed
              ? 'text-white/60 hover:bg-white/10 hover:text-white'
              : 'text-ink/45 hover:bg-ink/5 hover:text-ink'
          }`}
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <div aria-live="polite" className="sr-only">
          {revealed ? `Você tirou ${target.name}` : ''}
        </div>

        {revealed ? (
          <div className="pt-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/55">
              Você tirou
            </p>
            <p className="mt-4 break-words text-4xl font-extrabold tracking-tight text-honey">
              {target.name}
            </p>
            {targetFamilyName ? (
              <p className="mt-2 text-sm text-white/65">Família {targetFamilyName}</p>
            ) : null}
            <p className="mx-auto mt-5 max-w-xs text-sm leading-relaxed text-white/75">
              Anote ou memorize e não conte para ninguém. Depois, oculte e passe o
              celular adiante.
            </p>
            <button
              type="button"
              onClick={onHide}
              autoFocus
              className={`${goldButtonClass} mt-6 w-full`}
            >
              <X className="h-5 w-5" aria-hidden="true" />
              Ocultar e passar o celular
            </button>
          </div>
        ) : (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-forest/10 text-forest">
              <Gift className="h-7 w-7" aria-hidden="true" />
            </div>
            <h2 className="mt-5 pr-10 text-2xl font-extrabold tracking-tight text-forest">
              Resultado pronto
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/65">
              Passe o celular para <strong>{drawer.name}</strong>. O nome do amigo
              secreto só aparece depois do toque.
            </p>
            <button
              type="button"
              onClick={() => setRevealed(true)}
              autoFocus
              className={`${primaryButtonClass} mt-6 w-full`}
            >
              <Sparkles className="h-5 w-5" aria-hidden="true" />
              Sou {drawer.name}, ver resultado
            </button>
            <button
              type="button"
              onClick={onHide}
              className="mt-2 min-h-11 w-full rounded-xl px-3 py-2 text-sm font-medium text-ink/55 transition hover:bg-ink/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              Agora não
            </button>
          </>
        )}
      </div>
    </dialog>
  )
}
