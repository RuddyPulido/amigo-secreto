import { useEffect, useRef, type MouseEvent } from 'react'
import {
  dangerButtonClass,
  primaryButtonClass,
  secondaryButtonClass,
} from './ui'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  tone?: 'default' | 'danger'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancelar',
  tone = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return

    const handleCancel = (event: Event) => {
      event.preventDefault()
      onCancel()
    }
    dialog.addEventListener('cancel', handleCancel)
    return () => dialog.removeEventListener('cancel', handleCancel)
  }, [onCancel])

  const handleBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) onCancel()
  }

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClick={handleBackdropClick}
      className="m-auto max-h-[min(90dvh,40rem)] w-[calc(100%-2rem)] max-w-sm overflow-y-auto rounded-3xl border-0 bg-paper p-0 text-ink shadow-2xl"
    >
      <div className="p-6">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink/65">{description}</p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            autoFocus
            className={`${secondaryButtonClass} flex-1`}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`${tone === 'danger' ? dangerButtonClass : primaryButtonClass} flex-1`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}
