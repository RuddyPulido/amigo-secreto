const WHATSAPP_BASE = 'https://wa.me'

// Base pública usada nos convites. Em produção vem de VITE_PUBLIC_URL; em desenvolvimento
// usa o endereço atual (o link só funciona no mesmo aparelho/rede).
export function getAppBaseUrl(): string {
  const configured = import.meta.env.VITE_PUBLIC_URL
  if (configured) return configured.split('#')[0]!
  return `${window.location.origin}${window.location.pathname}`
}

export function buildInviteUrl(token: string, baseUrl = getAppBaseUrl()): string {
  return `${baseUrl}#/convite/${token}`
}

export function buildInviteMessage(name: string, inviteUrl: string): string {
  return [
    `Olá, ${name}! 🎁`,
    'Você foi convidado(a) para o nosso amigo secreto.',
    'Toque no link abaixo para criar sua senha e entrar:',
    inviteUrl,
  ].join('\n')
}

export function buildWhatsAppLink(phone: string, message: string): string {
  return `${WHATSAPP_BASE}/${phone}?text=${encodeURIComponent(message)}`
}

export function parseInviteToken(hash: string): string | null {
  const match = /^#\/convite\/([A-Za-z0-9]+)$/.exec(hash)
  return match ? match[1]! : null
}
