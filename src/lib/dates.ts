// Даты храним как строки ГГГГ-ММ-ДД в местном времени, показываем в формате ДД.ММ.ГГГГ.

const pad = (n: number) => String(n).padStart(2, '0')

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function today(): string {
  return toISODate(new Date())
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function isISODate(s: unknown): s is string {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = parseISODate(s)
  return toISODate(d) === s
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

export function daysBetween(fromISO: string, toISO: string): number {
  const ms = parseISODate(toISO).getTime() - parseISODate(fromISO).getTime()
  return Math.round(ms / 86_400_000)
}

/** Понедельник недели, в которую попадает дата. */
export function startOfWeek(iso: string): string {
  const d = parseISODate(iso)
  const shift = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - shift)
  return toISODate(d)
}

export function formatDate(iso: string | undefined): string {
  if (!iso) return '—'
  const datePart = iso.slice(0, 10)
  if (!isISODate(datePart)) return iso
  const [y, m, d] = datePart.split('-')
  return `${d}.${m}.${y}`
}

export function formatDateTime(isoTimestamp: string): string {
  const d = new Date(isoTimestamp)
  if (Number.isNaN(d.getTime())) return isoTimestamp
  return `${formatDate(toISODate(d))}, ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
