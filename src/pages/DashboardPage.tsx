import { Link } from 'react-router-dom'
import { SessionForm, SessionTimer } from '../components/SessionForm'
import { Badge, Notice, PageHeader, ProgressBar, Section, Stat } from '../components/ui'
import { course, lessonById, weeks } from '../content'
import { formatDate, today } from '../lib/dates'
import { formatHours, formatMinutes } from '../lib/format'
import {
  courseProgress,
  currentWeek,
  dossierSummary,
  minutesInCalendarWeek,
  moduleReviewDue,
  nextStep,
  planWeekNumber,
  postponedItems,
  rescheduledStartDate,
  weekStatus,
  weekStatusLabels,
} from '../lib/progress'
import { useStore } from '../store/useStore'

export function DashboardPage() {
  const { state, update } = useStore()
  const todayISO = today()
  const step = nextStep(state)
  const current = currentWeek(state)
  const plan = planWeekNumber(state, todayISO)
  const progress = courseProgress(state)
  const weekMinutes = minutesInCalendarWeek(state, todayISO)
  const target = state.settings.weeklyTargetMinutes
  const postponed = postponedItems(state)
  const dossier = dossierSummary(state)
  const reviewDue = moduleReviewDue(state, todayISO)
  const behind = plan - current.number

  const stepLink =
    step.kind === 'lesson' ? `/lesson/${step.id}` : step.kind === 'task' ? `/task/${step.id}` : step.kind === 'reflection' ? `/review/week/${step.week.number}` : '/project'

  const recentNotes = Object.entries(state.lessons)
    .filter(([, p]) => p.notes.trim() !== '')
    .sort((a, b) => (a[1].updatedAt < b[1].updatedAt ? 1 : -1))
    .slice(0, 3)

  const upcoming = weeks
    .filter((w) => w.number >= current.number && w.number <= current.number + 1)
    .flatMap((w) => [
      ...w.lessons.filter((l) => state.lessons[l.id]?.status !== 'done').map((l) => ({ to: `/lesson/${l.id}`, title: l.title, week: w.number, kind: 'Урок' })),
      ...w.tasks.filter((t) => state.submissions[t.id]?.status !== 'accepted').map((t) => ({ to: `/task/${t.id}`, title: t.title, week: w.number, kind: 'Задание' })),
    ])
    .slice(0, 4)

  return (
    <div className="space-y-5">
      <PageHeader title="Главная" subtitle={course.title} />

      <section className="card border-accent" aria-labelledby="continue-title">
        <div className="text-xs font-medium tracking-wide text-muted uppercase">Продолжить обучение</div>
        <h2 id="continue-title" className="mt-1 text-xl font-semibold">{step.title}</h2>
        {step.kind !== 'finished' && (
          <p className="mt-1 text-sm text-muted">
            Неделя {step.week.number}. {step.week.title} · {weekStatusLabels[weekStatus(state, step.week)]}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to={stepLink} className="btn btn-primary">{step.action}</Link>
          {step.kind !== 'finished' && (
            <Link to={`/week/${step.week.number}`} className="btn btn-secondary">Вся неделя</Link>
          )}
        </div>
      </section>

      {behind >= 2 && (
        <Notice tone="warn">
          <p>
            По календарю сейчас неделя {plan}, а по материалу — неделя {current.number}. Так бывает: можно спокойно продолжить в своём темпе
            или сдвинуть график, чтобы план совпал с фактом.
          </p>
          <button
            type="button"
            className="btn btn-secondary btn-sm mt-2"
            onClick={() => {
              const next = rescheduledStartDate(state, todayISO)
              if (window.confirm(`Пересчитать график? Новая дата начала курса: ${formatDate(next)}. Данные не изменятся.`)) {
                update((s) => { s.settings.startDate = next })
              }
            }}
          >
            Пересчитать график
          </button>
        </Notice>
      )}

      {reviewDue && (
        <Notice>
          Пора сделать обзор модуля {reviewDue.number} «{reviewDue.title}»: что получилось и какие пробелы остались.{' '}
          <Link className="link" to={`/review/module/${reviewDue.id}`}>Перейти к обзору</Link>
        </Notice>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <Section title="Прогресс курса">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Практики приняты" value={`${progress.tasksAccepted} / ${progress.tasksTotal}`} />
            <Stat label="Уроки изучены" value={`${progress.lessonsDone} / ${progress.lessonsTotal}`} />
            <Stat label="Недели завершены" value={`${progress.weeksDone} / ${weeks.length}`} />
          </div>
          <div className="mt-4">
            <div className="mb-1 text-xs text-muted">Главный показатель — принятые практические результаты</div>
            <ProgressBar value={progress.tasksAccepted} max={progress.tasksTotal} label="Принятые практики" />
          </div>
          <p className="mt-3 text-xs text-muted">
            Плановая неделя по календарю: {plan > weeks.length ? `${plan} (курс можно продолжать после 16-й)` : plan}. Начало курса: {formatDate(state.settings.startDate)}.
          </p>
        </Section>

        <Section title="Время на этой неделе">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="План" value={formatHours(target)} />
            <Stat label="Отмечено" value={formatHours(weekMinutes)} />
            <Stat label="Осталось" value={formatHours(Math.max(0, target - weekMinutes))} />
          </div>
          <div className="mt-4">
            <ProgressBar value={weekMinutes} max={target} label="Время за неделю" />
          </div>
          <div className="mt-4">
            <SessionTimer defaultWeek={current.number} />
          </div>
        </Section>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Section title="Ближайшие задачи">
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted">Всё на ближайшие недели сделано.</p>
          ) : (
            <ul className="divide-y divide-line">
              {upcoming.map((u) => (
                <li key={u.to} className="flex items-center justify-between gap-3 py-2">
                  <Link to={u.to} className="link min-w-0">{u.title}</Link>
                  <span className="shrink-0 text-xs text-muted">{u.kind} · нед. {u.week}</span>
                </li>
              ))}
            </ul>
          )}
          {postponed.length > 0 && (
            <div className="mt-4">
              <h3 className="h3 mb-1">Перенесено</h3>
              <ul className="space-y-1 text-sm">
                {postponed.map((p) => (
                  <li key={p.id} className="flex flex-wrap justify-between gap-2">
                    <Link to={`/${p.kind}/${p.id}`} className="link">{p.title}</Link>
                    <span className="text-xs text-muted">на {formatDate(p.to)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Section>

        <Section title="Учебный проект" actions={<Link to="/project" className="btn btn-ghost btn-sm">Открыть досье</Link>}>
          <div className="mb-3 flex flex-wrap gap-2 text-sm">
            <Badge tone="good">Готово: {dossier.ready}</Badge>
            <Badge tone="warn">В работе: {dossier.started}</Badge>
            <Badge>Пусто: {dossier.empty}</Badge>
          </div>
          <ul className="grid gap-1 text-sm sm:grid-cols-2">
            {dossier.items.map((i) => (
              <li key={i.section.id} className="flex items-center gap-2">
                <span aria-hidden className={`inline-block h-2 w-2 shrink-0 rounded-full ${i.ratio >= 1 ? 'bg-good' : i.ratio > 0 ? 'bg-warn' : 'bg-line'}`} />
                <Link to={`/project/${i.section.id}`} className="truncate hover:underline">{i.section.title}</Link>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Section title="Ручной ввод времени">
          <SessionForm compact defaultWeek={current.number} />
        </Section>
        <Section title="Последние заметки">
          {recentNotes.length === 0 ? (
            <p className="text-sm text-muted">Заметки к урокам появятся здесь.</p>
          ) : (
            <ul className="space-y-3">
              {recentNotes.map(([id, p]) => {
                const found = lessonById.get(id)
                return (
                  <li key={id} className="text-sm">
                    <Link to={`/lesson/${id}`} className="link">{found?.lesson.title ?? id}</Link>
                    <p className="mt-0.5 line-clamp-2 text-muted">{p.notes}</p>
                  </li>
                )
              })}
            </ul>
          )}
          <p className="mt-3 text-xs text-muted">Всего записано времени по курсу: {formatMinutes(state.sessions.reduce((a, s) => a + s.minutes, 0))}.</p>
        </Section>
      </div>
    </div>
  )
}
