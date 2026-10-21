import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { LessonBody } from '../components/LessonBody'
import { PostponeControl, ResourceCard } from '../components/ResourceCard'
import { LessonStatusBadge } from '../components/status'
import { AutoTextarea, Disclosure, EmptyState, Notice, PageHeader, Section } from '../components/ui'
import { lessonById, resourceById } from '../content'
import { formatMinutes } from '../lib/format'
import { getLesson } from '../lib/progress'
import { emptyLessonProgress } from '../store/defaults'
import { useStore } from '../store/useStore'
import type { LessonProgress } from '../store/types'

export function LessonPage() {
  const { id = '' } = useParams()
  const found = lessonById.get(id)
  if (!found) return <EmptyState title="Урок не найден"><Link to="/plan" className="link">К учебному плану</Link></EmptyState>
  return <Lesson key={id} id={id} />
}

function Lesson({ id }: { id: string }) {
  const { lesson, week } = lessonById.get(id)!
  const { state, update } = useStore()
  const progress = getLesson(state, id)
  const [notes, setNotes] = useState(progress.notes)
  const [unclear, setUnclear] = useState(progress.unclear)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)

  const patch = (fn: (p: LessonProgress) => void) =>
    update((s) => {
      const p = s.lessons[id] ?? emptyLessonProgress()
      fn(p)
      p.updatedAt = new Date().toISOString()
      s.lessons[id] = p
    })

  const dirty = notes !== progress.notes || unclear !== progress.unclear
  const saveNotes = () => {
    patch((p) => {
      p.notes = notes
      p.unclear = unclear
      if (p.status === 'not_started' && (notes.trim() || unclear.trim())) {
        p.status = 'in_progress'
        p.startedAt ??= new Date().toISOString()
      }
    })
    setSavedMsg('Заметка сохранена')
  }

  const task = week.tasks[0]

  return (
    <div className="space-y-5">
      <nav className="text-sm text-muted" aria-label="Путь">
        <Link to="/plan" className="hover:underline">Учебный план</Link> / <Link to={`/week/${week.number}`} className="hover:underline">Неделя {week.number}</Link>
      </nav>
      <PageHeader
        title={lesson.title}
        subtitle={`Неделя ${week.number}. ${week.title} · ≈ ${formatMinutes(lesson.minutes)} на урок и материалы`}
        actions={<LessonStatusBadge status={progress.status} />}
      />

      <div className="flex flex-wrap items-center gap-2">
        {progress.status === 'not_started' && (
          <button type="button" className="btn btn-primary" onClick={() => patch((p) => { p.status = 'in_progress'; p.startedAt = new Date().toISOString() })}>
            Начать урок
          </button>
        )}
        {progress.status !== 'done' ? (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              if (dirty) saveNotes()
              patch((p) => { p.status = 'done'; p.completedAt = new Date().toISOString(); p.postponedTo = undefined })
            }}
          >
            Отметить изученным
          </button>
        ) : (
          <button type="button" className="btn btn-secondary" onClick={() => patch((p) => { p.status = 'in_progress'; p.completedAt = undefined })}>
            Вернуть в работу
          </button>
        )}
        {progress.status !== 'done' && (
          <PostponeControl value={progress.postponedTo} onChange={(d) => patch((p) => { p.postponedTo = d })} />
        )}
      </div>

      <Section title="Цель и связь с проектом">
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {week.goals.map((g) => <li key={g}>{g}</li>)}
        </ul>
        <p className="mt-3 text-sm"><span className="font-medium">Связь с итоговым проектом:</span> {week.projectLink}</p>
      </Section>

      <Section title="Объяснение">
        <div className="prose-text max-w-prose text-[15px]">
          {lesson.intro.map((p, i) => <p key={i}>{p}</p>)}
        </div>
        {lesson.sections && (
          <div className="mt-6">
            <LessonBody sections={lesson.sections} />
          </div>
        )}
      </Section>

      <Section title="Словарь">
        <dl className="grid gap-3 sm:grid-cols-2">
          {lesson.terms.map((t) => (
            <div key={t.term} className="rounded-md bg-surface-2 p-3">
              <dt className="font-medium">
                {t.term}
                {t.en && <span className="font-normal text-muted"> ({t.en})</span>}
              </dt>
              <dd className="mt-1 text-sm">{t.definition}</dd>
              {t.example && <dd className="mt-1 text-sm text-muted">Пример: {t.example}</dd>}
            </div>
          ))}
        </dl>
      </Section>

      <Section title="Что важно понять">
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {lesson.keyPoints.map((k) => <li key={k}>{k}</li>)}
        </ul>
      </Section>

      <Section title="Вопросы для самопроверки">
        <p className="mb-3 text-sm text-muted">Сначала ответьте своими словами, потом сверьтесь с подсказкой.</p>
        <ol className="space-y-4">
          {lesson.questions.map((q, i) => (
            <li key={i}>
              <p className="text-sm font-medium">{i + 1}. {q.q}</p>
              <AutoTextarea
                aria-label={`Ответ на вопрос ${i + 1}`}
                rows={2}
                className="mt-1"
                value={progress.answers[String(i)] ?? ''}
                onChange={(e) => patch((p) => { p.answers[String(i)] = e.target.value; if (p.status === 'not_started') p.status = 'in_progress' })}
              />
              <div className="mt-1"><Disclosure summary="Показать подсказку">{q.hint}</Disclosure></div>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Внешние материалы">
        {lesson.resources.length === 0 ? (
          <p className="text-sm text-muted">Для этого урока внешние материалы не обязательны — достаточно объяснения и задания.</p>
        ) : (
          <div className="space-y-3">
            {lesson.resources.map((r) => {
              const res = resourceById.get(r.resourceId)
              return res ? <ResourceCard key={r.resourceId} resource={res} what={r.what} /> : null
            })}
          </div>
        )}
      </Section>

      <Section title="Заметки">
        <div className="space-y-3">
          <div>
            <label htmlFor="lesson-notes" className="label">Мои заметки</label>
            <AutoTextarea id="lesson-notes" rows={5} value={notes} onChange={(e) => { setNotes(e.target.value); setSavedMsg(null) }} onBlur={() => dirty && saveNotes()} />
          </div>
          <div>
            <label htmlFor="lesson-unclear" className="label">Что осталось непонятно</label>
            <AutoTextarea id="lesson-unclear" rows={3} value={unclear} onChange={(e) => { setUnclear(e.target.value); setSavedMsg(null) }} onBlur={() => dirty && saveNotes()} />
          </div>
          <div className="flex items-center gap-3">
            <button type="button" className="btn btn-primary" onClick={saveNotes} disabled={!dirty}>Сохранить заметку</button>
            {savedMsg && !dirty && <span className="text-sm text-good" role="status">{savedMsg}</span>}
            {dirty && <span className="text-sm text-muted">Есть несохранённые изменения</span>}
          </div>
        </div>
      </Section>

      {task && (
        <Notice>
          Следующий шаг недели — практика: <Link to={`/task/${task.id}`} className="link">{task.title}</Link>
        </Notice>
      )}
    </div>
  )
}
