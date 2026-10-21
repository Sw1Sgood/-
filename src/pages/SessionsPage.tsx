import { useState } from 'react'
import { SessionForm, SessionTimer } from '../components/SessionForm'
import { EmptyState, PageHeader, Section, Stat } from '../components/ui'
import { weekByNumber, weeks } from '../content'
import { addDays, formatDate, startOfWeek, today } from '../lib/dates'
import { downloadText, sessionsCsv } from '../lib/export'
import { formatHours, formatMinutes } from '../lib/format'
import { currentWeek, minutesForCourseWeek, minutesInCalendarWeek, totalMinutes } from '../lib/progress'
import { useStore } from '../store/useStore'

export function SessionsPage() {
  const { state, update } = useStore()
  const [editing, setEditing] = useState<string | null>(null)
  const todayISO = today()
  const target = state.settings.weeklyTargetMinutes
  const current = currentWeek(state).number

  const sorted = [...state.sessions].sort((a, b) => (a.date === b.date ? (a.createdAt < b.createdAt ? 1 : -1) : a.date < b.date ? 1 : -1))

  // Последние 6 календарных недель: план/факт без оценок и штрафов.
  const recentWeeks = Array.from({ length: 6 }, (_, i) => {
    const from = addDays(startOfWeek(todayISO), -7 * i)
    return { from, minutes: minutesInCalendarWeek(state, from) }
  })

  return (
    <div className="space-y-5">
      <PageHeader
        title="Учебные сессии"
        subtitle="Время помогает планировать, но главное — результат заданий, а не часы."
        actions={
          state.sessions.length > 0 && (
            <button type="button" className="btn btn-secondary" onClick={() => downloadText('sessions.csv', sessionsCsv(state), 'text/csv')}>
              Скачать CSV
            </button>
          )
        }
      />

      <div className="grid gap-5 md:grid-cols-2">
        <Section title="Сводка">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Эта неделя" value={formatHours(minutesInCalendarWeek(state, todayISO))} note={`план ${formatHours(target)}`} />
            <Stat label="Весь курс" value={formatHours(totalMinutes(state))} />
            <Stat label="Сессий" value={state.sessions.length} />
          </div>
          <h3 className="h3 mt-5 mb-2">По календарным неделям</h3>
          <ul className="space-y-1 text-sm">
            {recentWeeks.map((w) => (
              <li key={w.from} className="flex items-center gap-3">
                <span className="w-36 shrink-0 text-muted">{formatDate(w.from)} – {formatDate(addDays(w.from, 6))}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                  <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.min(100, (w.minutes / target) * 100)}%` }} />
                </span>
                <span className="w-24 shrink-0 text-right tabular-nums">{formatHours(w.minutes)}</span>
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Новая сессия">
          <div className="mb-4"><SessionTimer defaultWeek={current} /></div>
          <SessionForm defaultWeek={current} />
        </Section>
      </div>

      <Section title="По неделям курса">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted">
              <tr><th className="py-1 pr-3 font-medium">Неделя</th><th className="py-1 pr-3 font-medium">План</th><th className="py-1 font-medium">Отмечено</th></tr>
            </thead>
            <tbody>
              {weeks.filter((w) => minutesForCourseWeek(state, w.number) > 0 || w.number <= current).map((w) => (
                <tr key={w.number} className="border-t border-line">
                  <td className="py-1.5 pr-3">{w.number}. {w.title}</td>
                  <td className="py-1.5 pr-3 whitespace-nowrap text-muted">{formatHours(w.plannedMinutes.min)}–{formatHours(w.plannedMinutes.max)}</td>
                  <td className="py-1.5 whitespace-nowrap tabular-nums">{formatMinutes(minutesForCourseWeek(state, w.number))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Журнал">
        {sorted.length === 0 ? (
          <EmptyState title="Сессий пока нет">Запустите таймер или внесите время вручную.</EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {sorted.map((s) => (
              <li key={s.id} className="py-3">
                {editing === s.id ? (
                  <SessionForm initial={s} onDone={() => setEditing(null)} />
                ) : (
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 text-sm">
                      <div className="font-medium">
                        {formatDate(s.date)} · {formatMinutes(s.minutes)}
                        {s.weekNumber && <span className="font-normal text-muted"> · нед. {s.weekNumber}. {weekByNumber.get(s.weekNumber)?.title}</span>}
                      </div>
                      {s.topic && <div>{s.topic}</div>}
                      {s.done && <div className="text-muted">Сделано: {s.done}</div>}
                      {s.unclear && <div className="text-muted">Непонятно: {s.unclear}</div>}
                      {s.next && <div className="text-muted">Дальше: {s.next}</div>}
                    </div>
                    <div className="flex gap-1">
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(s.id)}>Изменить</button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          if (window.confirm(`Удалить сессию ${formatDate(s.date)} (${formatMinutes(s.minutes)})?`)) {
                            update((st) => { st.sessions = st.sessions.filter((x) => x.id !== s.id) })
                          }
                        }}
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  )
}
