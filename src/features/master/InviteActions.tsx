import { useEffect, useRef, useState } from 'react'
import { Check, Copy, KeyRound, MessageCircle } from 'lucide-react'
import type { Db } from '../../data/db'
import { issueInvite } from '../../services/auth'
import {
  buildInviteMessage,
  buildInviteUrl,
  buildWhatsAppLink,
} from '../../services/invite'
import type { Credential, Person } from '../../types'
import { smallPrimaryButtonClass, smallSecondaryButtonClass } from '../../components/ui'

interface InviteActionsProps {
  db: Db
  person: Person
  credential: Credential | undefined
}

export function InviteActions({ db, person, credential }: InviteActionsProps) {
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
    }
  }, [])

  if (!credential) return null

  async function generate() {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await issueInvite(db, person.id)
    } catch {
      setError('Não foi possível gerar o convite. Tente de novo.')
    } finally {
      setBusy(false)
    }
  }

  const token = credential.inviteToken
  if (!token) {
    return (
      <div className="mt-2">
        <button
          type="button"
          onClick={generate}
          disabled={busy}
          className={smallSecondaryButtonClass}
        >
          <KeyRound className="h-4 w-4" aria-hidden="true" />
          {busy ? 'Gerando…' : 'Gerar novo convite'}
        </button>
        {error ? (
          <p role="alert" className="mt-1 text-xs text-berry">
            {error}
          </p>
        ) : null}
      </div>
    )
  }

  const inviteUrl = buildInviteUrl(token)
  const whatsappLink = buildWhatsAppLink(
    credential.phone,
    buildInviteMessage(person.name, inviteUrl),
  )

  async function copy() {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      if (timer.current !== null) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Não foi possível copiar. Use o botão do WhatsApp.')
    }
  }

  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-2">
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Enviar convite para ${person.name} pelo WhatsApp`}
          className={smallPrimaryButtonClass}
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          Enviar convite
        </a>
        <button
          type="button"
          onClick={copy}
          aria-label={`Copiar link do convite de ${person.name}`}
          className={smallSecondaryButtonClass}
        >
          {copied ? (
            <Check className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Copy className="h-4 w-4" aria-hidden="true" />
          )}
          {copied ? 'Copiado!' : 'Copiar link'}
        </button>
      </div>
      {error ? (
        <p role="alert" className="mt-1 text-xs text-berry">
          {error}
        </p>
      ) : null}
    </div>
  )
}
