/** Разбирает число, введённое в русском формате: «1 250 000,5», «12,5», «-3». */
export function parseNum(value: string | undefined | null): number | null {
  if (value == null) return null
  const cleaned = String(value)
    .replace(/[\s  ]/g, '')
    .replace(/₽|руб\.?|м²|%/gi, '')
    .replace(',', '.')
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

/** Произведение; null, если хотя бы одного множителя нет. */
export function mul(...values: (string | undefined)[]): number | null {
  let result = 1
  for (const v of values) {
    const n = parseNum(v)
    if (n == null) return null
    result *= n
  }
  return result
}

export function sumColumn(rows: Record<string, string>[], column: string): number {
  return rows.reduce((acc, row) => acc + (parseNum(row[column]) ?? 0), 0)
}
