// The platform serves Nigeria, so always render in West Africa Time (UTC+1),
// independent of where the code runs (Vercel is UTC). Without a fixed timeZone
// the same timestamp shows an hour earlier on a UTC server than the admin meant.
export const APP_TIME_ZONE = 'Africa/Lagos'

const dateTimeFmt = new Intl.DateTimeFormat('en-NG', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: APP_TIME_ZONE,
})

const relativeFmt = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

export function formatDateTime(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input) : input
  return dateTimeFmt.format(d)
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 60 * 60 * 24 * 365],
  ['month', 60 * 60 * 24 * 30],
  ['week', 60 * 60 * 24 * 7],
  ['day', 60 * 60 * 24],
  ['hour', 60 * 60],
  ['minute', 60],
  ['second', 1],
]

export function formatRelative(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input) : input
  const diffSec = Math.round((d.getTime() - Date.now()) / 1000)
  for (const [unit, secsInUnit] of RELATIVE_UNITS) {
    if (Math.abs(diffSec) >= secsInUnit || unit === 'second') {
      return relativeFmt.format(Math.round(diffSec / secsInUnit), unit)
    }
  }
  return relativeFmt.format(diffSec, 'second')
}
