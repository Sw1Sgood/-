import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, PageHeader, Section, TextField } from '../components/ui'
import { dossierSections, lessonById, skills, taskById, weeks } from '../content'
import { skillLevelNames } from '../content/skills'
import type { Skill } from '../content/types'
import { formatDate, today } from '../lib/dates'
import { getSubmission, submissionStatusLabels } from '../lib/progress'
import { newId } from '../store/defaults'
import { useStore } from '../store/useStore'
import type { SkillAssessment, SkillLevel, UserState } from '../store/types'

function artifactLabel(ref: string): string {
  const [kind, id] = ref.split(':')
  if (kind === 'task') return `Задание: ${taskById.get(id)?.task.title ?? id}`
  if (kind === 'lesson') return `Заметки урока: ${lessonById.get(id)?.lesson.title ?? id}`
  if (kind === 'dossier') return `Досье: ${dossierSections.find((s) => s.id === id)?.title ?? id}`
  return 'Другой артефакт'
}

function artifactLink(ref: string): string | null {
  const [kind, id] = ref.split(':')
  if (kind === 'task') return `/task/${id}`
  if (kind === 'lesson') return `/lesson/${id}`
  if (kind === 'dossier') return `/project/${id}`
  return null
}

function artifactOptions(state: UserState, skill: Skill) {
  const related = weeks.filter((w) => skill.weeks.includes(w.number))
  const others = weeks.filter((w) => !skill.weeks.includes(w.number))
  const taskOpt = (w: (typeof weeks)[number]) =>
    w.tasks.map((t) => ({ value: `task:${t.id}`, label: `Нед. ${w.number}: ${t.title} (${submissionStatusLabels[getSubmission(state, t.id).status]})` }))
  return {
    related: related.flatMap(taskOpt),
    others: others.flatMap(taskOpt),
    lessons: weeks.flatMap((w) => w.lessons.filter((l) => state.lessons[l.id]?.notes.trim()).map((l) => ({ value: `lesson:${l.id}`, label: `Нед. ${w.number}: ${l.title}` }))),
    dossier: dossierSections.map((s) => ({ value: `dossier:${s.id}`, label: s.title })),
  }
}

export function SkillsPage() {
  const { state } = useStore()
  return (
    <div>
      <PageHeader
        title="Навыки"
        subtitle="Шкала 0–3. Каждая самооценка выше нуля должна ссылаться на конкретный артефакт — задание, заметки или раздел досье."
      />
      <div className="mb-5 grid gap-2 text-sm sm:grid-cols-2">
        {([0, 1, 2, 3] as const).map((l) => (
          <div key={l} className="flex gap-2"><Badge tone={l === 0 ? 'neutral' : l === 3 ? 'good' : 'accent'}>{l}</Badge>{skillLevelNames[l]}</div>
        ))}
      </div>
      <div className="space-y-4">
        {skills.map((s) => <SkillCard key={s.id} skill={s} history={state.skillAssessments.filter((a) => a.skillId === s.id)} />)}
      </div>
    </div>
  )
}

function SkillCard({ skill, history }: { skill: Skill; history: SkillAssessment[] }) {
  const { state, update } = useStore()
  const sorted = [...history].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  const latest = sorted[0]
  const [open, setOpen] = useState(false)
  const [level, setLevel] = useState<SkillLevel>(latest?.level ?? 1)
  const [artifactRef, setArtifactRef] = useState('')
  const [artifactNote, setArtifactNote] = useState('')
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)
  const opts = artifactOptions(state, skill)

  const save = () => {
    if (level > 0 && !artifactRef) {
      setError('Выберите артефакт, который подтверждает уровень.')
      return
    }
    if (artifactRef === 'other' && !artifactNote.trim()) {
      setError('Опишите артефакт: что это и где он лежит.')
      return
    }
    update((s) => {
      s.skillAssessments.push({ id: newId(), skillId: skill.id, level, artifactRef: level === 0 ? '' : artifactRef, artifactNote, comment, date: today() })
    })
    setOpen(false)
    setArtifactRef('')
    setArtifactNote('')
    setComment('')
    setError(null)
  }

  return (
    <Section
      title={skill.title}
      actions={<Badge tone={!latest || latest.level === 0 ? 'neutral' : latest.level === 3 ? 'good' : 'accent'}>Уровень {latest?.level ?? 0}</Badge>}
    >
      <p className="text-sm text-muted">{skill.description} Недели: {skill.weeks.join(', ')}.</p>
      <ol className="mt-3 space-y-1 text-sm">
        {([1, 2, 3] as const).map((l) => (
          <li key={l} className={latest && latest.level >= l ? '' : 'text-muted'}>
            <span className="font-medium">{l}.</span> {skill.levels[l]}
          </li>
        ))}
      </ol>
      {latest && latest.level > 0 && (
        <p className="mt-3 text-sm">
          Подтверждение:{' '}
          {artifactLink(latest.artifactRef) ? (
            <Link to={artifactLink(latest.artifactRef)!} className="link">{artifactLabel(latest.artifactRef)}</Link>
          ) : (
            latest.artifactNote || artifactLabel(latest.artifactRef)
          )}
          {' · '}{formatDate(latest.date)}
        </p>
      )}

      {!open ? (
        <button type="button" className="btn btn-secondary mt-3" onClick={() => setOpen(true)}>Оценить навык</button>
      ) : (
        <div className="mt-4 space-y-3 rounded-md border border-line p-3">
          <fieldset>
            <legend className="label">Уровень</legend>
            <div className="flex flex-wrap gap-2">
              {([0, 1, 2, 3] as const).map((l) => (
                <label key={l} className={`btn btn-sm ${level === l ? 'btn-primary' : 'btn-secondary'}`}>
                  <input type="radio" className="sr-only" name={`level-${skill.id}`} checked={level === l} onChange={() => setLevel(l)} />
                  {l} — {skillLevelNames[l]}
                </label>
              ))}
            </div>
          </fieldset>
          {level > 0 && (
            <div>
              <label className="label" htmlFor={`art-${skill.id}`}>Подтверждающий артефакт</label>
              <select id={`art-${skill.id}`} className="input" value={artifactRef} onChange={(e) => setArtifactRef(e.target.value)}>
                <option value="">Выберите…</option>
                <optgroup label="Задания по этому навыку">{opts.related.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</optgroup>
                <optgroup label="Разделы досье">{opts.dossier.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</optgroup>
                {opts.lessons.length > 0 && <optgroup label="Заметки к урокам">{opts.lessons.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</optgroup>}
                <optgroup label="Другие задания">{opts.others.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</optgroup>
                <option value="other">Другой артефакт (описать)</option>
              </select>
            </div>
          )}
          {artifactRef === 'other' && <TextField label="Что это за артефакт и где он" value={artifactNote} onChange={setArtifactNote} />}
          <TextField label="Почему такой уровень" multiline rows={2} value={comment} onChange={setComment} />
          {error && <p className="text-sm text-bad" role="alert">{error}</p>}
          <div className="flex gap-2">
            <button type="button" className="btn btn-primary" onClick={save}>Сохранить оценку</button>
            <button type="button" className="btn btn-secondary" onClick={() => { setOpen(false); setError(null) }}>Отмена</button>
          </div>
        </div>
      )}

      {sorted.length > 0 && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-accent">История оценок ({sorted.length})</summary>
          <ul className="mt-2 space-y-2">
            {sorted.map((a) => (
              <li key={a.id} className="flex flex-wrap items-start justify-between gap-2 border-b border-line pb-2">
                <div>
                  <div>
                    {formatDate(a.date)} · уровень {a.level}
                    {a.artifactRef && ` · ${a.artifactRef === 'other' ? a.artifactNote : artifactLabel(a.artifactRef)}`}
                  </div>
                  {a.comment && <div className="text-muted">{a.comment}</div>}
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    if (window.confirm('Удалить эту оценку?')) update((s) => { s.skillAssessments = s.skillAssessments.filter((x) => x.id !== a.id) })
                  }}
                >
                  Удалить
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </Section>
  )
}
