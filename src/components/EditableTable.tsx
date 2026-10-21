import type { ColumnDef, TableDef } from '../content/types'
import { formatNumber, formatPercent, formatRub } from '../lib/format'
import { parseNum, sumColumn } from '../lib/number'

function formatComputed(col: ColumnDef, value: number | null): string {
  if (value == null) return '—'
  if (col.format === 'rub') return formatRub(value)
  if (col.format === 'percent') return formatPercent(value)
  return formatNumber(value)
}

const widthClass = { sm: 'min-w-20', md: 'min-w-36', lg: 'min-w-56' }

/** Редактируемая таблица. На узком экране прокручивается горизонтально внутри своей рамки. */
export function EditableTable({
  def,
  rows,
  onChange,
  caption,
}: {
  def: TableDef
  rows: Record<string, string>[]
  onChange: (rows: Record<string, string>[]) => void
  caption: string
}) {
  const visibleRows: Record<string, string>[] =
    rows.length > 0 ? rows : Array.from({ length: def.initialRows ?? 1 }, () => ({}))

  const setCell = (rowIndex: number, colId: string, value: string) => {
    const next = visibleRows.map((r) => ({ ...r }))
    next[rowIndex][colId] = value
    onChange(next)
  }
  const addRow = () => onChange([...visibleRows.map((r) => ({ ...r })), {}])
  const removeRow = (i: number) => {
    const row = visibleRows[i]
    const hasData = Object.values(row).some((v) => v.trim() !== '')
    if (hasData && !window.confirm('Удалить строку с данными?')) return
    onChange(visibleRows.filter((_, idx) => idx !== i))
  }

  const totalCol = def.totalColumn ? def.columns.find((c) => c.id === def.totalColumn) : undefined
  const total = totalCol
    ? totalCol.kind === 'computed'
      ? visibleRows.reduce((a, r) => a + (totalCol.compute?.(r) ?? 0), 0)
      : sumColumn(visibleRows, totalCol.id)
    : null

  return (
    <div>
      <div className="overflow-x-auto rounded-md border border-line">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-surface-2 text-left">
            <tr>
              {def.columns.map((col) => (
                <th key={col.id} scope="col" className={`border-b border-line px-2 py-2 font-medium ${widthClass[col.width ?? (col.kind === 'number' || col.kind === 'computed' ? 'md' : 'sm')]}`}>
                  {col.label}
                  {col.unit && <span className="font-normal text-muted">, {col.unit}</span>}
                </th>
              ))}
              <th scope="col" className="w-10 border-b border-line px-2 py-2"><span className="sr-only">Действия</span></th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, ri) => (
              <tr key={ri} className="align-top">
                {def.columns.map((col) => (
                  <td key={col.id} className="border-b border-line p-1">
                    {col.kind === 'computed' ? (
                      <div className="px-2 py-1.5 tabular-nums text-muted">{formatComputed(col, col.compute?.(row) ?? null)}</div>
                    ) : col.kind === 'select' ? (
                      <select
                        aria-label={`${col.label}, строка ${ri + 1}`}
                        className="input py-1.5"
                        value={row[col.id] ?? ''}
                        onChange={(e) => setCell(ri, col.id, e.target.value)}
                      >
                        <option value="">—</option>
                        {col.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input
                        aria-label={`${col.label}, строка ${ri + 1}`}
                        className={`input py-1.5 ${col.kind === 'number' ? 'tabular-nums' : ''} ${col.kind === 'number' && row[col.id] && parseNum(row[col.id]) == null ? 'border-bad' : ''}`}
                        inputMode={col.kind === 'number' ? 'decimal' : undefined}
                        value={row[col.id] ?? ''}
                        onChange={(e) => setCell(ri, col.id, e.target.value)}
                      />
                    )}
                  </td>
                ))}
                <td className="border-b border-line p-1 text-center">
                  <button type="button" className="btn btn-ghost btn-sm" aria-label={`Удалить строку ${ri + 1}`} onClick={() => removeRow(ri)}>
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          {totalCol && (
            <tfoot>
              <tr className="bg-surface-2 font-medium">
                <td className="px-2 py-2" colSpan={def.columns.length + 1}>
                  Итого «{totalCol.label}»: <span className="tabular-nums">{formatRub(total ?? 0)}</span>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <button type="button" className="btn btn-secondary btn-sm mt-2" onClick={addRow}>
        + Добавить строку
      </button>
    </div>
  )
}
