// Telefones ficam guardados só com dígitos, já com o código do país (55 = Brasil).
// Com "+" o código do país foi digitado; sem ele, DDD + número vira brasileiro.
export function normalizePhone(input: string): string {
  const international = input.trim().startsWith('+')
  let digits = input.replace(/\D/g, '')
  if (international) return digits

  digits = digits.replace(/^0+/, '')
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`
  return digits
}

export function validatePhone(input: string): string | null {
  const digits = normalizePhone(input)
  if (!digits) return 'Informe o telefone do WhatsApp.'
  if (digits.length < 12 || digits.length > 15) {
    return 'Telefone inválido. Use DDD + número, por exemplo (11) 91234-5678.'
  }
  return null
}

export function formatPhone(normalized: string): string {
  const match = /^55(\d{2})(\d{4,5})(\d{4})$/.exec(normalized)
  if (!match) return normalized ? `+${normalized}` : ''
  return `(${match[1]}) ${match[2]}-${match[3]}`
}
