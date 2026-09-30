export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('8')) return `7${digits.slice(1)}`
  if (digits.length === 10 && digits.startsWith('9')) return `7${digits}`
  return digits
}

export function phoneSearchDigits(query: string): string {
  const digits = query.replace(/\D/g, '')
  return digits.startsWith('8') ? `7${digits.slice(1)}` : digits
}

export function isValidPhone(phone: string): boolean {
  return /^\d{10,15}$/.test(phone)
}

export function formatPhone(phone: string): string {
  const match = /^7(\d{3})(\d{3})(\d{2})(\d{2})$/.exec(phone)
  if (match) return `+7 ${match[1]} ${match[2]}-${match[3]}-${match[4]}`
  return phone ? `+${phone}` : ''
}

export function phoneFromChatId(chatId: string): string {
  const match = /^(\d+)@c\.us$/.exec(chatId)
  return match ? match[1] : ''
}
