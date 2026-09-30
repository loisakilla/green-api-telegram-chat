const timeFormat = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' })
const dayFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' })
const shortDayFormat = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })

function startOfDay(timestamp: number): number {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

export function formatTime(timestamp: number): string {
  return timeFormat.format(timestamp)
}

export function formatListTime(timestamp: number, now = Date.now()): string {
  return startOfDay(timestamp) === startOfDay(now) ? timeFormat.format(timestamp) : shortDayFormat.format(timestamp)
}

export function formatDayDivider(timestamp: number, now = Date.now()): string {
  const diffDays = Math.round((startOfDay(now) - startOfDay(timestamp)) / 86_400_000)
  if (diffDays === 0) return 'Сегодня'
  if (diffDays === 1) return 'Вчера'
  return dayFormat.format(timestamp)
}

export function isSameDay(a: number, b: number): boolean {
  return startOfDay(a) === startOfDay(b)
}
