import { useState } from 'react'
import { ResourceCard } from '../components/ResourceCard'
import { EmptyState, Notice, PageHeader, Section, TextField } from '../components/ui'
import { resources, weeks } from '../content'
import { resourceTypeLabels } from '../content/resources'
import type { Resource } from '../content/types'
import { newId } from '../store/defaults'
import { useStore } from '../store/useStore'

export function ResourcesPage() {
  const { state, update } = useStore()
  const [week, setWeek] = useState('')
  const [type, setType] = useState('')
  const all = [...resources, ...state.customResources]
  const filtered = all.filter((r) => (!week || r.weeks.includes(Number(week))) && (!type || r.type === type))
  const broken = all.filter((r) => state.resourceFlags[r.id]?.brokenReportedAt)

  return (
    <div className="space-y-5">
      <PageHeader title="Материалы" subtitle="Источники с пометкой, что искать и насколько им доверять." />
      <Notice tone="neutral">
        Приоритет: официальные порталы и тексты норм — для правовых требований; университетские материалы — для теории; официальная
        статистика — для рынка. Форумы и отзывы — это гипотезы и опыт, а не нормативные факты. Статус «ссылка открывалась» означает
        только, что страница была доступна при проверке; бесплатность и полноту материалов проверяйте сами.
      </Notice>

      {broken.length > 0 && (
        <Notice tone="warn">Вы отметили неработающие ссылки: {broken.map((r) => r.title).join('; ')}.</Notice>
      )}

      <div className="flex flex-wrap gap-3">
        <div>
          <label className="label" htmlFor="f-week">Неделя</label>
          <select id="f-week" className="input" value={week} onChange={(e) => setWeek(e.target.value)}>
            <option value="">Все</option>
            {weeks.map((w) => <option key={w.number} value={w.number}>{w.number}. {w.title}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="f-type">Тип</label>
          <select id="f-type" className="input" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Все</option>
            {Object.entries(resourceTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Нет материалов по фильтру" />
      ) : (
        <ul className="space-y-3">
          {filtered.map((r) => (
            <li key={r.id}>
              <ResourceCard resource={r} />
              <p className="mt-1 px-1 text-xs text-muted">
                Недели: {r.weeks.join(', ') || '—'} · Темы: {r.topics.join(', ') || '—'}
                {r.custom && (
                  <button
                    type="button"
                    className="ml-2 text-bad hover:underline"
                    onClick={() => {
                      if (window.confirm(`Удалить свой материал «${r.title}»?`)) update((s) => { s.customResources = s.customResources.filter((x) => x.id !== r.id) })
                    }}
                  >
                    Удалить
                  </button>
                )}
              </p>
            </li>
          ))}
        </ul>
      )}

      <AddResource />
    </div>
  )
}

function AddResource() {
  const { update } = useStore()
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [org, setOrg] = useState('')
  const [type, setType] = useState<Resource['type']>('professional')
  const [weeksText, setWeeksText] = useState('')
  const [what, setWhat] = useState('')
  const [error, setError] = useState<string | null>(null)

  const add = () => {
    let parsed: URL
    try {
      parsed = new URL(url.trim())
    } catch {
      setError('Укажите полный адрес, начиная с http:// или https://')
      return
    }
    if (!/^https?:$/.test(parsed.protocol)) {
      setError('Поддерживаются только ссылки http:// и https://')
      return
    }
    if (!title.trim()) {
      setError('Укажите название.')
      return
    }
    const ws = weeksText.split(/[,\s]+/).map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= weeks.length)
    update((s) => {
      s.customResources.push({
        id: `custom-${newId()}`,
        title: title.trim(),
        url: parsed.toString(),
        org: org.trim(),
        type,
        topics: [],
        weeks: ws,
        linkStatus: 'unverified',
        checkNote: 'Добавлено вами. Проверьте, что источник надёжен и актуален.',
        whatToFind: what.trim(),
        custom: true,
      })
    })
    setTitle(''); setUrl(''); setOrg(''); setWeeksText(''); setWhat(''); setError(null)
  }

  return (
    <Section title="Добавить свой материал">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Название" value={title} onChange={setTitle} />
        <TextField label="Ссылка" inputMode="url" value={url} onChange={setUrl} placeholder="https://" />
        <TextField label="Организация / автор" value={org} onChange={setOrg} />
        <div>
          <label className="label" htmlFor="add-type">Тип</label>
          <select id="add-type" className="input" value={type} onChange={(e) => setType(e.target.value as Resource['type'])}>
            {Object.entries(resourceTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <TextField label="Недели (через запятую)" value={weeksText} onChange={setWeeksText} placeholder="например, 3, 9" />
        <TextField label="Что там искать" value={what} onChange={setWhat} />
      </div>
      {error && <p className="mt-2 text-sm text-bad" role="alert">{error}</p>}
      <button type="button" className="btn btn-primary mt-3" onClick={add}>Добавить</button>
    </Section>
  )
}
