const RTF = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31536000],
  ['month', 2592000],
  ['week', 604800],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
]

/** "3m ago", "2h ago", "yesterday", etc. */
export function formatRelativeTime(iso: string): string {
  const diffSeconds = (new Date(iso).getTime() - Date.now()) / 1000

  for (const [unit, secondsInUnit] of UNITS) {
    if (Math.abs(diffSeconds) >= secondsInUnit) {
      return RTF.format(Math.round(diffSeconds / secondsInUnit), unit)
    }
  }
  return 'just now'
}

/** "Jan 14, 2026, 09:14 AM" */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Remaining time until a deadline as "14m", "2h 15m", or "Overdue" if in the past. */
export function formatCountdown(targetIso: string, now: Date = new Date()): string {
  const diffMs = new Date(targetIso).getTime() - now.getTime()
  if (diffMs <= 0) return 'Overdue'

  const totalMinutes = Math.floor(diffMs / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) return `${minutes}m`
  return `${hours}h ${minutes}m`
}
