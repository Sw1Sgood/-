import { Link, useParams } from 'react-router-dom'
import { LessonStatusBadge, SubmissionStatusBadge, WeekStatusBadge } from '../components/status'
import { EmptyState, PageHeader, Section } from '../components/ui'
import { dossierById, moduleById, skills, weekByNumber, weeks } from '../content'
import { formatHours, formatMinutes } from '../lib/format'
import { getLesson, getSubmission, minutesForCourseWeek, weekStatus } from '../lib/progress'
import { useStore } from '../store/useStore'

export function WeekPage() {
  const { number } = useParams()
  const { state } = useStore()
  const week = weekByNumber.get(Number(number))
  if (!week) return <EmptyState title="Такой недели нет"><Link to="/plan" className="link">К учебному плану</Link></EmptyState>

  const mod = moduleById.get(week.moduleId)!
  const prev = weeks.find((w) => w.number === week.number - 1)
  const next = weeks.find((w) => w.number === week.number + 1)
  const reflection = state.reflections[String(week.number)]
  const spent = minutesForCourseWeek(state, week.number)

  return (
    <div className="space-y-5">
      <nav className="text-sm text-muted" aria-label="Путь">
        <Link to="/plan" className="hover:underline">Учебный план</Link> / Модуль {mod.number}
      </nav>
      <PageHeader
        title={`Неделя ${week.number}. ${week.title}`}
        subtitle={`Плановое время: ${formatHours(week.plannedMinutes.min)}–${formatHours(week.plannedMinutes.max)}${spent ? ` · отмечено ${formatMinutes(spent)}` : ''}`}
        actions={<WeekStatusBadge status={weekStatus(state, week)} />}
      />

      <Section title="Цели недели">
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {week.goals.map((g) => <li key={g}>{g}</li>)}
        </ul>
        <p className="mt-3 text-sm"><span className="font-medium">Темы:</span> {week.topics}</p>
        <p className="mt-2 text-sm"><span className="font-medium">Итоговый артефакт:</span> {week.artifact}</p>
        <p className="mt-2 text-sm"><span className="font-medium">Связь с проектом:</span> {week.projectLink}</p>
        <p className="mt-2 text-sm text-muted">
          Навыки: {week.skills.map((id) => skills.find((s) => s.id === id)?.title).join('; ')}
        </p>
      </Section>

      <Section title="Уроки">
        <ul className="divide-y divide-line">
          {week.lessons.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <Link to={`/lesson/${l.id}`} className="link">{l.title}</Link>
              <span className="flex items-center gap-2 text-xs text-muted">
                ≈ {formatMinutes(l.minutes)} <LessonStatusBadge status={getLesson(state, l.id).status} />
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Практическое задание">
        <ul className="divide-y divide-line">
          {week.tasks.map((t) => (
            <li key={t.id} className="py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link to={`/task/${t.id}`} className="link">{t.title}</Link>
                <span className="flex items-center gap-2 text-xs text-muted">
                  ≈ {formatMinutes(t.minutes)} <SubmissionStatusBadge status={getSubmission(state, t.id).status} />
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">
                Разделы досье: {t.dossierSections.map((d) => dossierById[d].title).join(', ')}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Итоги недели">
        {reflection ? (
          <p className="text-sm">Итоги записаны. Уверенность: {reflection.confidence ?? '—'} из 5.</p>
        ) : (
          <p className="text-sm text-muted">Что получилось, что было трудно, что повторить — пара минут в конце недели.</p>
        )}
        <Link to={`/review/week/${week.number}`} className="btn btn-secondary mt-3">
          {reflection ? 'Открыть итоги' : 'Подвести итоги'}
        </Link>
      </Section>

      <div className="flex justify-between gap-2">
        {prev ? <Link to={`/week/${prev.number}`} className="btn btn-secondary">← Неделя {prev.number}</Link> : <span />}
        {next && <Link to={`/week/${next.number}`} className="btn btn-secondary">Неделя {next.number} →</Link>}
      </div>
    </div>
  )
}
