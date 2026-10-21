import { course, dossierSections, weeks } from '../content'
import type { TableDef } from '../content/types'
import type { UserState } from '../store/types'
import { formatDate, today } from './dates'
import { submissionStatusLabels } from './progress'

export function downloadText(filename: string, text: string, mime = 'text/plain') {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// CSV для Excel/Calc с русской локалью: разделитель «;», BOM для корректной кириллицы.
function csvCell(v: string | number | undefined): string {
  const s = v == null ? '' : String(v)
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(header: string[], rows: (string | number | undefined)[][]): string {
  return '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n')
}

function tableRowsCsv(def: TableDef, rows: Record<string, string>[]): string {
  const cols = def.columns
  return toCsv(
    cols.map((c) => (c.unit ? `${c.label}, ${c.unit}` : c.label)),
    rows.map((r) => cols.map((c) => (c.kind === 'computed' ? (c.compute?.(r) ?? '') : (r[c.id] ?? '')))),
  )
}

export function sectionTableCsv(state: UserState, sectionId: string): string | null {
  const def = dossierSections.find((s) => s.id === sectionId)
  if (!def?.table) return null
  return tableRowsCsv(def.table, state.dossier[def.id]?.rows ?? [])
}

export function sessionsCsv(state: UserState): string {
  const sorted = [...state.sessions].sort((a, b) => (a.date < b.date ? -1 : 1))
  return toCsv(
    ['Дата', 'Минуты', 'Неделя курса', 'Тема', 'Что сделано', 'Что непонятно', 'Следующий шаг'],
    sorted.map((s) => [formatDate(s.date), s.minutes, s.weekNumber ?? '', s.topic, s.done, s.unclear, s.next]),
  )
}

function mdTable(def: TableDef, rows: Record<string, string>[]): string {
  const filled = rows.filter((r) => Object.values(r).some((v) => v.trim() !== ''))
  if (filled.length === 0) return '_Таблица пуста._\n'
  const esc = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ')
  const head = `| ${def.columns.map((c) => esc(c.unit ? `${c.label}, ${c.unit}` : c.label)).join(' | ')} |`
  const sep = `| ${def.columns.map(() => '---').join(' | ')} |`
  const body = filled.map(
    (r) => `| ${def.columns.map((c) => esc(c.kind === 'computed' ? String(c.compute?.(r) ?? '') : (r[c.id] ?? ''))).join(' | ')} |`,
  )
  return [head, sep, ...body].join('\n') + '\n'
}

export function dossierToMarkdown(state: UserState): string {
  const out: string[] = [
    `# Проектное досье${state.dossier.overview?.fields.name ? `: ${state.dossier.overview.fields.name}` : ''}`,
    '',
    `Курс «${course.title}». Выгрузка ${formatDate(today())}.`,
    '',
    '> Учебный материал. Не является юридическим, градостроительным, инженерным или инвестиционным заключением. Учебные числа условные.',
    '',
  ]
  for (const def of dossierSections) {
    const data = state.dossier[def.id]
    out.push(`## ${def.title}`, '')
    for (const f of def.fields) {
      const v = data?.fields[f.id]?.trim()
      const st = data?.fields[`${f.id}::status`]
      out.push(`**${f.label}${f.unit ? `, ${f.unit}` : ''}:** ${v || '—'}${st ? ` _(${st})_` : ''}`, '')
    }
    if (def.table) {
      out.push(`### ${def.table.title}`, '', mdTable(def.table, data?.rows ?? []))
    }
  }
  return out.join('\n')
}

export function submissionsToMarkdown(state: UserState): string {
  const out: string[] = [`# Практические задания`, '', `Выгрузка ${formatDate(today())}.`, '']
  for (const w of weeks) {
    for (const t of w.tasks) {
      const s = state.submissions[t.id]
      out.push(`## Неделя ${w.number}. ${t.title}`, '', `Статус: ${submissionStatusLabels[s?.status ?? 'not_started']}`, '')
      if (!s) continue
      for (const f of t.fields) {
        const v = s.fields[f.id]?.trim()
        if (v) out.push(`**${f.label}:**`, '', v, '')
      }
      if (t.table) out.push(mdTable(t.table, s.rows))
      if (s.fileLink) out.push(`Файл: ${s.fileLink}`, '')
      const r = s.reflection
      if (r.learned || r.distrust || r.clarify) {
        out.push('**Рефлексия:**', '', `- Что узнал: ${r.learned || '—'}`, `- Чему не доверяю: ${r.distrust || '—'}`, `- Что уточнить: ${r.clarify || '—'}`, '')
      }
      if (s.selfAssessment) out.push(`**Самооценка:** ${s.selfAssessment}`, '')
    }
  }
  return out.join('\n')
}
