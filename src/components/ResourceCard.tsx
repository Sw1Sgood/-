import { useState } from 'react'
import { linkStatusLabels, resourceTypeLabels } from '../content/resources'
import type { Resource } from '../content/types'
import { formatDate, formatDateTime, today, addDays } from '../lib/dates'
import { useStore } from '../store/useStore'
import { Badge, ExternalLink } from './ui'

export function ResourceCard({ resource, what }: { resource: Resource; what?: string }) {
  const { state, update } = useStore()
  const flag = state.resourceFlags[resource.id]
  const statusTone = flag?.brokenReportedAt ? 'bad' : resource.linkStatus === 'ok' ? 'good' : resource.linkStatus === 'unreachable' ? 'bad' : 'warn'

  return (
    <div className="rounded-md border border-line p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <ExternalLink href={resource.url}>{resource.title}</ExternalLink>
          <div className="text-xs text-muted">{resource.org}</div>
        </div>
        <div className="flex flex-wrap gap-1">
          <Badge>{resourceTypeLabels[resource.type]}</Badge>
          <Badge tone={statusTone}>
            {flag?.brokenReportedAt ? 'Вы отметили: не работает' : linkStatusLabels[resource.linkStatus]}
            {!flag?.brokenReportedAt && resource.checkedAt ? ` (${formatDate(resource.checkedAt)})` : ''}
          </Badge>
        </div>
      </div>
      <p className="mt-2 text-sm"><span className="font-medium">Что найти:</span> {what ?? resource.whatToFind}</p>
      <p className="mt-1 text-xs text-muted">{resource.checkNote}</p>
      {resource.access && <p className="mt-1 text-xs text-muted">Доступ: {resource.access}</p>}
      <div className="mt-2">
        {flag?.brokenReportedAt ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            Отмечено {formatDateTime(flag.brokenReportedAt)}.
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => update((s) => { delete s.resourceFlags[resource.id] })}>
              Снова работает
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => update((s) => { s.resourceFlags[resource.id] = { brokenReportedAt: new Date().toISOString() } })}
          >
            Сообщить: ссылка не работает
          </button>
        )}
      </div>
    </div>
  )
}

/** Кнопка «Перенести» с выбором даты. */
export function PostponeControl({ value, onChange }: { value?: string; onChange: (date: string | undefined) => void }) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(value ?? addDays(today(), 7))

  if (value && !open) {
    return (
      <span className="inline-flex flex-wrap items-center gap-2 text-sm">
        Перенесено на {formatDate(value)}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>Изменить</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange(undefined)}>Отменить перенос</button>
      </span>
    )
  }
  if (!open) {
    return <button type="button" className="btn btn-secondary" onClick={() => setOpen(true)}>Перенести</button>
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="postpone-date">Перенести на дату</label>
      <input id="postpone-date" type="date" className="input w-auto" value={date} min={today()} onChange={(e) => setDate(e.target.value)} />
      <button type="button" className="btn btn-primary" onClick={() => { onChange(date || undefined); setOpen(false) }}>
        Перенести
      </button>
      <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Отмена</button>
    </span>
  )
}
