import { AlertTriangle, CheckCircle2, X } from 'lucide-react'

interface NoticeBannerProps {
  tone?: 'warning' | 'info' | 'success'
  message: string
  onDismiss?: () => void
}

const toneStyles = {
  warning: 'border-gold/30 bg-gold/10 text-ink',
  info: 'border-forest/20 bg-forest/5 text-ink',
  success: 'border-forest/20 bg-forest/10 text-ink',
} as const

export function NoticeBanner({
  tone = 'info',
  message,
  onDismiss,
}: NoticeBannerProps) {
  const Icon = tone === 'success' ? CheckCircle2 : AlertTriangle

  return (
    <div
      role={tone === 'warning' ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-2xl border p-3 text-sm ${toneStyles[tone]}`}
    >
      <Icon
        className={`mt-0.5 h-5 w-5 shrink-0 ${
          tone === 'success' ? 'text-forest' : 'text-gold'
        }`}
        aria-hidden="true"
      />
      <p className="min-w-0 flex-1 leading-relaxed">{message}</p>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Fechar aviso"
          className="-m-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink/50 transition hover:bg-ink/5 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  )
}
