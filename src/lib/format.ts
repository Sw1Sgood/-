const rub = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 })
const num = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 })
const pct = new Intl.NumberFormat('ru-RU', { style: 'percent', maximumFractionDigits: 1 })

export const formatRub = (n: number) => `${rub.format(n)} ₽`
export const formatNumber = (n: number) => num.format(n)
export const formatPercent = (fraction: number) => pct.format(fraction)

export function formatMinutes(total: number): string {
  const h = Math.floor(total / 60)
  const m = Math.round(total % 60)
  if (h === 0) return `${m} мин`
  if (m === 0) return `${h} ч`
  return `${h} ч ${m} мин`
}

export function formatHours(total: number): string {
  return `${num.format(Math.round((total / 60) * 10) / 10)} ч`
}

/** Склонение: plural(5, ['неделя', 'недели', 'недель']). */
export function plural(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return forms[0]
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1]
  return forms[2]
}
