import { Link, useNavigate, useParams } from 'react-router-dom'
import { EditableTable } from '../components/EditableTable'
import { Badge, Notice, PageHeader, Section, TextField } from '../components/ui'
import { dossierById, dossierSections, weeks } from '../content'
import type { DossierSectionDef, DossierSectionId } from '../content/types'
import { formatDateTime } from '../lib/dates'
import { downloadText, dossierToMarkdown } from '../lib/export'
import { parseNum } from '../lib/number'
import { dossierSectionCompletion } from '../lib/progress'
import { useStore } from '../store/useStore'

const FACT_STATUSES = ['Подтверждено', 'Допущение', 'Гипотеза', 'Нужно уточнить'] as const
const statusKey = (fieldId: string) => `${fieldId}::status`

export function ProjectPage() {
  const { section } = useParams()
  const navigate = useNavigate()
  const { state } = useStore()
  const active = section && section in dossierById ? (section as DossierSectionId) : undefined
  const name = state.dossier.overview?.fields.name

  return (
    <div>
      <PageHeader
        title="Проектное досье"
        subtitle={name ? `Учебный проект: ${name}` : 'Сквозной учебный проект — многоквартирный жилой дом'}
        actions={
          <button type="button" className="btn btn-secondary" onClick={() => downloadText('dossier.md', dossierToMarkdown(state), 'text/markdown')}>
            Скачать досье (Markdown)
          </button>
        }
      />
      <Notice tone="neutral">
        Досье — учебный материал. Здесь нет юридических, градостроительных, инженерных или инвестиционных заключений. Учебные числа — условные;
        у каждого факта должны быть источник и дата.
      </Notice>

      <div className="mt-5 grid gap-5 lg:grid-cols-[14rem_1fr]">
        <div>
          <label htmlFor="section-select" className="sr-only">Раздел досье</label>
          <select
            id="section-select"
            className="input lg:hidden"
            value={active ?? ''}
            onChange={(e) => navigate(e.target.value ? `/project/${e.target.value}` : '/project')}
          >
            <option value="">Обзор всех разделов</option>
            {dossierSections.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
          <ul className="hidden space-y-0.5 lg:block" aria-label="Разделы досье">
            <li>
              <Link to="/project" className={`block rounded-md px-3 py-1.5 text-sm ${!active ? 'bg-accent-soft font-medium text-accent' : 'hover:bg-surface-2'}`}>
                Обзор всех разделов
              </Link>
            </li>
            {dossierSections.map((s) => {
              const c = dossierSectionCompletion(state, s.id)
              return (
                <li key={s.id}>
                  <Link
                    to={`/project/${s.id}`}
                    className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm ${active === s.id ? 'bg-accent-soft font-medium text-accent' : 'hover:bg-surface-2'}`}
                  >
                    <span aria-hidden className={`inline-block h-2 w-2 shrink-0 rounded-full ${c.ratio >= 1 ? 'bg-good' : c.ratio > 0 ? 'bg-warn' : 'bg-line'}`} />
                    {s.title}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
        <div className="min-w-0">{active ? <DossierSection key={active} def={dossierById[active]} /> : <Overview />}</div>
      </div>
    </div>
  )
}

function Overview() {
  const { state } = useStore()
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {dossierSections.map((s) => {
        const c = dossierSectionCompletion(state, s.id)
        return (
          <li key={s.id}>
            <Link to={`/project/${s.id}`} className="card block h-full hover:border-accent">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold">{s.title}</h2>
                <Badge tone={c.ratio >= 1 ? 'good' : c.ratio > 0 ? 'warn' : 'neutral'}>
                  {c.ratio >= 1 ? 'Заполнено' : c.ratio > 0 ? 'В работе' : 'Пусто'}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted">{s.description}</p>
              <p className="mt-2 text-xs text-muted">
                {s.fields.length > 0 && `Поля: ${c.filledFields}/${c.totalFields}. `}
                {s.table && `Строк в таблице: ${c.rows}. `}
                Недели: {s.weeks.join(', ')}
              </p>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function DossierSection({ def }: { def: DossierSectionDef }) {
  const { state, update } = useStore()
  const data = state.dossier[def.id] ?? { fields: {}, rows: [] }

  const patch = (fn: (d: { fields: Record<string, string>; rows: Record<string, string>[] }) => void) =>
    update((s) => {
      const d = s.dossier[def.id] ?? { fields: {}, rows: [] }
      fn(d)
      d.updatedAt = new Date().toISOString()
      s.dossier[def.id] = d
    })

  const relatedTasks = weeks.flatMap((w) => w.tasks.filter((t) => t.dossierSections.includes(def.id)).map((t) => ({ t, w })))

  return (
    <div className="space-y-5">
      <Section title={def.title}>
        <p className="mb-4 text-sm text-muted">{def.description}</p>
        {def.fields.length > 0 && (
          <div className="space-y-4">
            {def.fields.map((f) => {
              const v = data.fields[f.id] ?? ''
              return (
                <div key={f.id} className="grid gap-2 sm:grid-cols-[1fr_11rem] sm:items-start">
                  <div>
                    <TextField
                      label={f.label}
                      unit={f.unit}
                      placeholder={f.placeholder}
                      help={f.help}
                      multiline={f.kind === 'longtext'}
                      inputMode={f.kind === 'number' ? 'decimal' : undefined}
                      value={v}
                      onChange={(val) => patch((d) => { d.fields[f.id] = val })}
                    />
                    {f.kind === 'number' && v && parseNum(v) == null && <p className="mt-1 text-xs text-bad">Не похоже на число.</p>}
                  </div>
                  <div className="sm:pt-6">
                    <label className="sr-only" htmlFor={`st-${f.id}`}>Статус: {f.label}</label>
                    <select
                      id={`st-${f.id}`}
                      className="input text-xs"
                      value={data.fields[statusKey(f.id)] ?? ''}
                      onChange={(e) => patch((d) => { d.fields[statusKey(f.id)] = e.target.value })}
                    >
                      <option value="">Статус не указан</option>
                      {FACT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {def.table && (
          <div className={def.fields.length > 0 ? 'mt-6' : ''}>
            <h3 className="h3 mb-2">{def.table.title}</h3>
            <EditableTable def={def.table} rows={data.rows} caption={def.table.title} onChange={(rows) => patch((d) => { d.rows = rows })} />
          </div>
        )}
        {state.dossier[def.id]?.updatedAt && (
          <p className="mt-4 text-xs text-muted">Изменено: {formatDateTime(state.dossier[def.id]!.updatedAt!)}</p>
        )}
      </Section>

      <Section title="Связь с неделями">
        <ul className="space-y-1 text-sm">
          {relatedTasks.map(({ t, w }) => (
            <li key={t.id}>
              Неделя {w.number}: <Link to={`/task/${t.id}`} className="link">{t.title}</Link>
            </li>
          ))}
          {relatedTasks.length === 0 && <li className="text-muted">Раздел заполняется по итогам недель {def.weeks.join(', ')}.</li>}
        </ul>
      </Section>
    </div>
  )
}
