import { getAppBaseUrl } from './invite'

// Aviso ao organizador via ntfy.sh (push no celular). Falhar aqui nunca atrapalha o pedido,
// que já está registrado no painel. Sem VITE_NTFY_TOPIC (ex.: desenvolvimento) não faz nada.
export async function notifyPasswordReset(personName: string): Promise<void> {
  const topic = import.meta.env.VITE_NTFY_TOPIC
  if (!topic) return

  try {
    await fetch('https://ntfy.sh/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic,
        title: 'Amigo Secreto: nova senha',
        message: `${personName} pediu uma nova senha. Reenvie o convite no painel.`,
        tags: ['key'],
        priority: 4,
        click: getAppBaseUrl(),
      }),
    })
  } catch {
    // sem conexão com o ntfy: o pedido continua visível no painel
  }
}
