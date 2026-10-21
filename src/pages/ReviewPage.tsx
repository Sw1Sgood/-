import { Link, useParams } from 'react-router-dom'
import { SubmissionStatusBadge, WeekStatusBadge } from '../components/status'
import { EmptyState, Notice, PageHeader, Section, TextField } from '../components/ui'
import { dossierById, moduleById, skills, weekByNumber } from '../content'
import { formatDateTime } from '../lib/dates'
import { formatMinutes } from '../lib/format'
import { dossierSectionCompletion, getSubmission, latestAssessment, minutesForCourseWeek, weekStatus } from '../lib/progress'
import { useStore } from '../store/useStore'
import type { ModuleReview, WeeklyReflection } from '../store/types'

export function ReviewPage() {
  const { kind, id = '' } = useParams()
  if (kind === 'week' && weekByNumber.has(Number(id))) return <WeekReview number={Number(id)} />
  if (kind === 'module' && moduleById.has(id)) return <ModuleReviewView id={id} />
  return <EmptyState title="Обзор не найден"><Link to="/plan" className="link">К учебному плану</Link></EmptyState>
}

const emptyReflection = (): WeeklyReflection => ({ wentWell: '', hard: '', confidence: null, repeat: '', updatedAt: new Date().toISOString() })

function WeekReview({ number }: { number: number }) {
  const { state, update } = useStore()
  const week = weekByNumber.get(number)!
  const r = state.reflections[String(number)] ?? emptyReflection()
  const patch = (fn: (x: WeeklyReflection) => void) =>
    update((s) => {
      const x = s.reflections[String(number)] ?? emptyReflection()
      fn(x)
      x.updatedAt = new Date().toISOString()
      s.reflections[String(number)] = x
    })

  return (
    <div className="space-y-5">
      <nav className="text-sm text-muted"><Link to={`/week/${number}`} className="hover:underline">Неделя {number}</Link></nav>
      <PageHeader title={`Итоги недели ${number}`} subtitle={week.title} actions={<WeekStatusBadge status={weekStatus(state, week)} />} />
      <Notice tone="neutral">
        Здесь нет оценок за усердие. Если неделя прошла не по плану — это информация для планирования, а не провал. Задания можно
        перенести, а график — пересчитать на главной.
      </Notice>
      <Section title="Факты недели">
        <ul className="space-y-1 text-sm">
          <li>Отмечено времени: {formatMinutes(minutesForCourseWeek(state, number))} (план {formatMinutes(week.plannedMinutes.min)}–{formatMinutes(week.plannedMinutes.max)})</li>
          {week.tasks.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-2">
              Задание: <Link to={`/task/${t.id}`} className="link">{t.title}</Link> <SubmissionStatusBadge status={getSubmission(state, t.id).status} />
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Рефлексия">
        <div className="space-y-4">
          <TextField label="Что получилось" multiline value={r.wentWell} onChange={(v) => patch((x) => { x.wentWell = v })} />
          <TextField label="Что было трудно" multiline value={r.hard} onChange={(v) => patch((x) => { x.hard = v })} />
          <fieldset>
            <legend className="label">Уверенность в материале недели</legend>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className={`btn btn-sm ${r.confidence === n ? 'btn-primary' : 'btn-secondary'}`}>
                  <input type="radio" name="confidence" className="sr-only" checked={r.confidence === n} onChange={() => patch((x) => { x.confidence = n })} />
                  {n}
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted">1 — почти ничего не понятно, 5 — могу объяснить другому.</p>
          </fieldset>
          <TextField label="Что повторить" multiline value={r.repeat} onChange={(v) => patch((x) => { x.repeat = v })} />
          {state.reflections[String(number)] && <p className="text-xs text-muted">Сохранено {formatDateTime(r.updatedAt)}</p>}
        </div>
      </Section>
      {weekByNumber.has(number + 1) && (
        <Link to={`/week/${number + 1}`} className="btn btn-primary">К неделе {number + 1}</Link>
      )}
    </div>
  )
}

const emptyModuleReview = (): ModuleReview => ({ progress: '', gaps: '', plan: '', updatedAt: new Date().toISOString() })

function ModuleReviewView({ id }: { id: string }) {
  const { state, update } = useStore()
  const mod = moduleById.get(id)!
  const r = state.moduleReviews[id] ?? emptyModuleReview()
  const patch = (fn: (x: ModuleReview) => void) =>
    update((s) => {
      const x = s.moduleReviews[id] ?? emptyModuleReview()
      fn(x)
      x.updatedAt = new Date().toISOString()
      s.moduleReviews[id] = x
    })

  const modWeeks = mod.weeks.map((n) => weekByNumber.get(n)!)
  const openTasks = modWeeks.flatMap((w) => w.tasks.filter((t) => getSubmission(state, t.id).status !== 'accepted').map((t) => ({ t, w })))
  const sectionIds = [...new Set(modWeeks.flatMap((w) => w.tasks.flatMap((t) => t.dossierSections)))]
  const emptySections = sectionIds.filter((sid) => dossierSectionCompletion(state, sid).ratio === 0)
  const modSkills = skills.filter((s) => s.weeks.some((n) => mod.weeks.includes(n)))
  const confidences = mod.weeks.map((n) => state.reflections[String(n)]?.confidence).filter((c): c is number => c != null)

  return (
    <div className="space-y-5">
      <nav className="text-sm text-muted"><Link to="/plan" className="hover:underline">Учебный план</Link></nav>
      <PageHeader title={`Обзор модуля ${mod.number}`} subtitle={`${mod.title} · недели ${mod.weeks.join(', ')}`} />
      <Section title="Что видно по данным">
        <ul className="space-y-1 text-sm">
          {modWeeks.map((w) => (
            <li key={w.number} className="flex flex-wrap items-center gap-2">
              <Link to={`/week/${w.number}`} className="link">Неделя {w.number}. {w.title}</Link> <WeekStatusBadge status={weekStatus(state, w)} />
            </li>
          ))}
        </ul>
        <h3 className="h3 mt-4 mb-1">Незакрытые пробелы</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {openTasks.map(({ t, w }) => (
            <li key={t.id}>Не принято задание недели {w.number}: <Link to={`/task/${t.id}`} className="link">{t.title}</Link></li>
          ))}
          {emptySections.map((sid) => (
            <li key={sid}>Пустой раздел досье: <Link to={`/project/${sid}`} className="link">{dossierById[sid].title}</Link></li>
          ))}
          {modSkills.filter((s) => (latestAssessment(state, s.id)?.level ?? 0) <= 1).map((s) => (
            <li key={s.id}>Навык на уровне 0–1: <Link to="/skills" className="link">{s.title}</Link></li>
          ))}
          {openTasks.length === 0 && emptySections.length === 0 && <li className="list-none text-good">Явных пробелов нет.</li>}
        </ul>
        {confidences.length > 0 && (
          <p className="mt-3 text-sm text-muted">Уверенность по итогам недель: {confidences.join(', ')} из 5.</p>
        )}
      </Section>
      <Section title="Обзор">
        <div className="space-y-4">
          <TextField label="Чему я научился за модуль" multiline value={r.progress} onChange={(v) => patch((x) => { x.progress = v })} />
          <TextField label="Какие пробелы остались" multiline value={r.gaps} onChange={(v) => patch((x) => { x.gaps = v })} />
          <TextField label="Что сделаю с пробелами" multiline value={r.plan} onChange={(v) => patch((x) => { x.plan = v })} />
          {state.moduleReviews[id] && <p className="text-xs text-muted">Сохранено {formatDateTime(r.updatedAt)}</p>}
        </div>
      </Section>
    </div>
  )
}
