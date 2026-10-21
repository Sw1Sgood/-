import { Link } from 'react-router-dom'
import { WeekStatusBadge } from '../components/status'
import { PageHeader } from '../components/ui'
import { course, modules, weekByNumber } from '../content'
import { today } from '../lib/dates'
import { formatHours, formatMinutes } from '../lib/format'
import { currentWeek, minutesForCourseWeek, planWeekNumber, weekStatus } from '../lib/progress'
import { useStore } from '../store/useStore'

export function PlanPage() {
  const { state } = useStore()
  const current = currentWeek(state).number
  const plan = planWeekNumber(state, today())

  return (
    <div>
      <PageHeader
        title="Учебный план"
        subtitle={`${course.weeks} недель · ${course.totalHours.min}–${course.totalHours.max} часов. Недели не блокируются: можно идти вперёд, возвращаться и повторять.`}
      />
      <div className="space-y-6">
        {modules.map((m) => (
          <section key={m.id} aria-labelledby={`${m.id}-title`}>
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <h2 id={`${m.id}-title`} className="h2">Модуль {m.number}. {m.title}</h2>
              <Link to={`/review/module/${m.id}`} className="text-sm link">Обзор модуля</Link>
            </div>
            <p className="mb-3 text-sm text-muted">{m.summary}</p>
            <ol className="grid gap-3 md:grid-cols-2">
              {m.weeks.map((n) => {
                const w = weekByNumber.get(n)!
                const status = weekStatus(state, w)
                const spent = minutesForCourseWeek(state, n)
                return (
                  <li key={n}>
                    <Link
                      to={`/week/${n}`}
                      className={`card block h-full transition-colors hover:border-accent ${n === current ? 'border-accent' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-xs text-muted">
                          Неделя {n}
                          {n === current && ' · текущая'}
                          {n === plan && n !== current && ' · по календарю'}
                        </div>
                        <WeekStatusBadge status={status} />
                      </div>
                      <h3 className="mt-1 font-semibold">{w.title}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-muted">{w.topics}</p>
                      <p className="mt-2 text-xs text-muted">
                        Результат: {w.artifact}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        План {formatHours(w.plannedMinutes.min)}–{formatHours(w.plannedMinutes.max)}
                        {spent > 0 && ` · отмечено ${formatMinutes(spent)}`}
                      </p>
                    </Link>
                  </li>
                )
              })}
            </ol>
          </section>
        ))}
      </div>
    </div>
  )
}
