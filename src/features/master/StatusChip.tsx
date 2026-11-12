import type { Credential } from '../../types'

interface StatusChipProps {
  tone: 'ok' | 'wait' | 'idle'
  children: string
}

const tones = {
  ok: 'bg-forest/10 text-forest',
  wait: 'bg-gold/15 text-ink/75',
  idle: 'bg-ink/5 text-ink/55',
} as const

export function StatusChip({ tone, children }: StatusChipProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  )
}

export function AccountChips({ credential }: { credential: Credential | undefined }) {
  if (!credential) return <StatusChip tone="idle">Sem acesso</StatusChip>

  const hasPassword = !!credential.passwordHash
  const hasInvite = !!credential.inviteToken

  return (
    <>
      {hasPassword ? <StatusChip tone="ok">Conta criada</StatusChip> : null}
      {hasInvite ? (
        <StatusChip tone="wait">
          {hasPassword ? 'Novo convite pendente' : 'Convite pendente'}
        </StatusChip>
      ) : null}
    </>
  )
}
