interface ProgressBarProps {
  value: number
  max: number
}

export function ProgressBar({ value, max }: ProgressBarProps) {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0

  return (
    <div
      className="h-2 overflow-hidden rounded-full bg-forest/10"
      role="progressbar"
      aria-label="Progresso do sorteio"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-forest to-gold transition-[width] duration-500"
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}
