import { Link, useParams } from 'react-router-dom'
import { EditableTable } from '../components/EditableTable'
import { PostponeControl, ResourceCard } from '../components/ResourceCard'
import { SubmissionStatusBadge } from '../components/status'
import { Badge, EmptyState, Notice, PageHeader, Section, TextField } from '../components/ui'
import { dossierById, resourceById, taskById } from '../content'
import { rubric, RUBRIC_MAX } from '../content/rubric'
import { formatDateTime } from '../lib/dates'
import { formatMinutes } from '../lib/format'
import { parseNum } from '../lib/number'
import { canAccept, getSubmission, rubricBand, rubricTotal } from '../lib/progress'
import { emptySubmission } from '../store/defaults'
import { useStore } from '../store/useStore'
import type { Submission } from '../store/types'

export function TaskPage() {
  const { id = '' } = useParams()
  if (!taskById.has(id)) return <EmptyState title="Задание не найдено"><Link to="/plan" className="link">К учебному плану</Link></EmptyState>
  return <TaskView key={id} id={id} />
}

function TaskView({ id }: { id: string }) {
  const { task, week } = taskById.get(id)!
  const { state, update } = useStore()
  const sub = getSubmission(state, id)

  const patch = (fn: (s: Submission) => void, touch = true) =>
    update((st) => {
      const s = st.submissions[id] ?? emptySubmission()
      fn(s)
      if (touch && s.status === 'not_started') s.status = 'in_progress'
      s.updatedAt = new Date().toISOString()
      st.submissions[id] = s
    })

  const setStatus = (status: Submission['status']) =>
    patch((s) => {
      s.status = status
      s.acceptedAt = status === 'accepted' ? new Date().toISOString() : undefined
      if (status === 'accepted') s.postponedTo = undefined
    }, false)

  const total = rubricTotal(sub)
  const band = total != null ? rubricBand(total) : null
  const acceptance = canAccept(task, sub)
  const criteriaDone = task.criteria.filter((_, i) => sub.checklist[String(i)]).length

  return (
    <div className="space-y-5">
      <nav className="text-sm text-muted" aria-label="Путь">
        <Link to="/plan" className="hover:underline">Учебный план</Link> / <Link to={`/week/${week.number}`} className="hover:underline">Неделя {week.number}</Link>
      </nav>
      <PageHeader
        title={task.title}
        subtitle={`Практика недели ${week.number} · ≈ ${formatMinutes(task.minutes)} · ${task.kind === 'analytic' ? 'аналитическая работа, рубрика 100 баллов' : 'вводное упражнение, проверка по чек-листу'}`}
        actions={<SubmissionStatusBadge status={sub.status} />}
      />
      <p className="text-xs text-muted">Последнее изменение: {sub.status === 'not_started' ? '—' : formatDateTime(sub.updatedAt)}</p>

      <Section title="Зачем это девелоперу">
        <p className="text-sm">{task.why}</p>
      </Section>

      <Section title="Ситуация и входные данные">
        <p className="text-sm">{task.situation}</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
          {task.inputs.map((x) => <li key={x}>{x}</li>)}
        </ul>
        {task.whereToLook.length > 0 && (
          <div className="mt-4 space-y-3">
            <h3 className="h3">Где искать данные</h3>
            {task.whereToLook.map((r) => {
              const res = resourceById.get(r.resourceId)
              return res ? <ResourceCard key={r.resourceId} resource={res} what={r.what} /> : null
            })}
          </div>
        )}
      </Section>

      <Section title="Шаги">
        <ol className="list-decimal space-y-2 pl-5 text-sm">
          {task.steps.map((s) => <li key={s}>{s}</li>)}
        </ol>
        <p className="mt-3 text-sm"><span className="font-medium">Формат результата:</span> {task.resultFormat}</p>
        <p className="mt-2 text-sm">
          <span className="font-medium">Разделы досье:</span>{' '}
          {task.dossierSections.map((d, i) => (
            <span key={d}>
              {i > 0 && ', '}
              <Link to={`/project/${d}`} className="link">{dossierById[d].title}</Link>
            </span>
          ))}
        </p>
      </Section>

      <Section title="Мой результат">
        <div className="space-y-4">
          {task.fields.map((f) => {
            const v = sub.fields[f.id] ?? ''
            return (
              <div key={f.id}>
                <TextField
                  label={f.label}
                  unit={f.unit}
                  placeholder={f.placeholder}
                  multiline={f.kind === 'longtext'}
                  rows={6}
                  inputMode={f.kind === 'number' ? 'decimal' : undefined}
                  value={v}
                  onChange={(val) => patch((s) => { s.fields[f.id] = val })}
                />
                {f.kind === 'number' && v && parseNum(v) == null && <p className="mt-1 text-xs text-bad">Не похоже на число.</p>}
              </div>
            )
          })}
          {task.table && (
            <div>
              <div className="label">Таблица результата</div>
              <EditableTable def={task.table} rows={sub.rows} caption={`Таблица результата: ${task.title}`} onChange={(rows) => patch((s) => { s.rows = rows })} />
            </div>
          )}
          <TextField
            label="Ссылка на файл (таблица, схема, презентация)"
            inputMode="url"
            placeholder="https://… или путь к файлу на компьютере"
            value={sub.fileLink}
            onChange={(v) => patch((s) => { s.fileLink = v })}
            help="Приложение не хранит сами файлы — только ссылку или путь, чтобы вы нашли их позже."
          />
        </div>
      </Section>

      <Section title="Критерии качества" actions={<Badge tone={criteriaDone === task.criteria.length ? 'good' : 'neutral'}>{criteriaDone} / {task.criteria.length}</Badge>}>
        <ul className="space-y-2">
          {task.criteria.map((c, i) => (
            <li key={c}>
              <label className="flex cursor-pointer items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 shrink-0 accent-[var(--c-accent)]"
                  checked={!!sub.checklist[String(i)]}
                  onChange={(e) => patch((s) => { s.checklist[String(i)] = e.target.checked })}
                />
                <span>{c}</span>
              </label>
            </li>
          ))}
        </ul>
        <h3 className="h3 mt-5 mb-2">Частые ошибки</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
          {task.mistakes.map((m) => <li key={m}>{m}</li>)}
        </ul>
      </Section>

      <Section title="Рефлексия">
        <div className="grid gap-3 md:grid-cols-3">
          <TextField label="Что узнал" multiline rows={3} value={sub.reflection.learned} onChange={(v) => patch((s) => { s.reflection.learned = v })} />
          <TextField label="Чему не доверяю" multiline rows={3} value={sub.reflection.distrust} onChange={(v) => patch((s) => { s.reflection.distrust = v })} />
          <TextField label="Что уточнить" multiline rows={3} value={sub.reflection.clarify} onChange={(v) => patch((s) => { s.reflection.clarify = v })} />
        </div>
      </Section>

      <Section title="Самооценка и проверка">
        <div className="space-y-4">
          {task.kind === 'analytic' && (
            <div>
              <p className="mb-2 text-sm text-muted">
                Оцените работу честно по рубрике. 85–100 — готово; 70–84 — нужна конкретная доработка; ниже 70 — исправить ключевые ошибки.
              </p>
              <div className="space-y-2">
                {rubric.map((r) => (
                  <div key={r.key} className="grid items-center gap-2 sm:grid-cols-[1fr_8rem]">
                    <label htmlFor={`rubric-${r.key}`} className="text-sm">
                      <span className="font-medium">{r.label}</span> <span className="text-muted">(до {r.max})</span>
                      <span className="block text-xs text-muted">{r.hint}</span>
                    </label>
                    <input
                      id={`rubric-${r.key}`}
                      type="number"
                      min={0}
                      max={r.max}
                      className="input tabular-nums"
                      value={sub.rubric[r.key] ?? ''}
                      onChange={(e) =>
                        patch((s) => {
                          const n = e.target.value === '' ? undefined : Math.max(0, Math.min(r.max, Math.round(Number(e.target.value))))
                          if (n === undefined || Number.isNaN(n)) delete s.rubric[r.key]
                          else s.rubric[r.key] = n
                        })
                      }
                    />
                  </div>
                ))}
              </div>
              <div className="mt-3 text-sm">
                Итого: <strong className="tabular-nums">{total ?? '—'}</strong> / {RUBRIC_MAX}
                {band && <span className="ml-2"><Badge tone={band.tone}>{band.label}</Badge></span>}
              </div>
            </div>
          )}
          <TextField
            label="Самооценка своими словами"
            multiline
            rows={3}
            placeholder="Что получилось хорошо, что слабее всего, что доработать"
            value={sub.selfAssessment}
            onChange={(v) => patch((s) => { s.selfAssessment = v })}
          />

          {sub.status === 'needs_work' && <Notice tone="warn">Задание отмечено «Нужно доработать». Исправьте слабые места и снова отправьте на проверку.</Notice>}
          {sub.status === 'accepted' && <Notice tone="good">Задание принято{sub.acceptedAt ? ` ${formatDateTime(sub.acceptedAt)}` : ''}. Его можно указывать как артефакт при оценке навыков.</Notice>}

          <div className="flex flex-wrap items-center gap-2">
            {sub.status === 'not_started' && (
              <button type="button" className="btn btn-primary" onClick={() => setStatus('in_progress')}>Начать задание</button>
            )}
            {(sub.status === 'in_progress' || sub.status === 'needs_work') && (
              <button type="button" className="btn btn-primary" onClick={() => setStatus('ready')}>Готово к проверке</button>
            )}
            {sub.status === 'ready' && (
              <>
                <button type="button" className="btn btn-primary" disabled={!acceptance.ok} onClick={() => setStatus('accepted')}>Принять</button>
                <button type="button" className="btn btn-secondary" onClick={() => setStatus('needs_work')}>Нужно доработать</button>
              </>
            )}
            {sub.status === 'accepted' && (
              <button type="button" className="btn btn-secondary" onClick={() => setStatus('needs_work')}>Вернуть на доработку</button>
            )}
            {sub.status !== 'accepted' && (
              <PostponeControl value={sub.postponedTo} onChange={(d) => patch((s) => { s.postponedTo = d }, false)} />
            )}
          </div>
          {sub.status === 'ready' && !acceptance.ok && <p className="text-sm text-muted">{acceptance.reason}</p>}
          <p className="text-xs text-muted">
            Самопроверка не заменяет профессиональную экспертизу: она показывает, насколько работа соответствует учебным критериям.
          </p>
        </div>
      </Section>
    </div>
  )
}
