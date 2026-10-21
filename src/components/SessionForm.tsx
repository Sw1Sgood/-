import { useEffect, useState } from 'react'
import { weeks } from '../content'
import { formatMinutes } from '../lib/format'
import { today } from '../lib/dates'
import { newId } from '../store/defaults'
import { useStore } from '../store/useStore'
import type { StudySession } from '../store/types'
import { TextField } from './ui'

type Draft = Omit<StudySession, 'id' | 'createdAt' | 'minutes'> & { minutes: string }

const emptyDraft = (weekNumber?: number): Draft => ({
  date: today(),
  minutes: '',
  topic: '',
  weekNumber,
  done: '',
  unclear: '',
  next: '',
})

export function SessionForm({
  initial,
  defaultWeek,
  onDone,
  compact,
}: {
  initial?: StudySession
  defaultWeek?: number
  onDone?: () => void
  compact?: boolean
}) {
  const { update } = useStore()
  const [draft, setDraft] = useState<Draft>(() =>
    initial ? { ...initial, minutes: String(initial.minutes) } : emptyDraft(defaultWeek),
  )
  const [error, setError] = useState<string | null>(null)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }))

  const submit = () => {
    const minutes = Number(draft.minutes.replace(',', '.'))
    if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 24 * 60) {
      setError('Укажите длительность в минутах — от 1 до 1440.')
      return
    }
    if (!draft.date) {
      setError('Укажите дату.')
      return
    }
    setError(null)
    const session: StudySession = {
      ...draft,
      minutes: Math.round(minutes),
      id: initial?.id ?? newId(),
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    }
    update((s) => {
      const idx = s.sessions.findIndex((x) => x.id === session.id)
      if (idx >= 0) s.sessions[idx] = session
      else s.sessions.push(session)
    })
    if (!initial) {
      setDraft(emptyDraft(draft.weekNumber))
      setSavedMsg(`Записано: ${formatMinutes(session.minutes)}`)
    }
    onDone?.()
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="session-date">Дата</label>
          <input id="session-date" type="date" className="input" value={draft.date} onChange={(e) => set('date', e.target.value)} />
        </div>
        <TextField label="Минут" value={draft.minutes} inputMode="decimal" onChange={(v) => set('minutes', v)} placeholder="например, 45" />
        <div>
          <label className="label" htmlFor="session-week">Неделя курса</label>
          <select
            id="session-week"
            className="input"
            value={draft.weekNumber ?? ''}
            onChange={(e) => set('weekNumber', e.target.value ? Number(e.target.value) : undefined)}
          >
            <option value="">Без привязки</option>
            {weeks.map((w) => (
              <option key={w.number} value={w.number}>
                {w.number}. {w.title}
              </option>
            ))}
          </select>
        </div>
      </div>
      <TextField label="Тема" value={draft.topic} onChange={(v) => set('topic', v)} placeholder="Что изучали или делали" />
      {!compact && (
        <div className="grid gap-3 sm:grid-cols-3">
          <TextField label="Что сделано" multiline rows={2} value={draft.done} onChange={(v) => set('done', v)} />
          <TextField label="Что непонятно" multiline rows={2} value={draft.unclear} onChange={(v) => set('unclear', v)} />
          <TextField label="Следующий шаг" multiline rows={2} value={draft.next} onChange={(v) => set('next', v)} />
        </div>
      )}
      {error && <p className="text-sm text-bad" role="alert">{error}</p>}
      {savedMsg && <p className="text-sm text-good" role="status">{savedMsg}</p>}
      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary">{initial ? 'Сохранить изменения' : 'Записать сессию'}</button>
        {onDone && initial && (
          <button type="button" className="btn btn-secondary" onClick={onDone}>Отмена</button>
        )}
      </div>
    </form>
  )
}

/** Таймер учебной сессии. Время старта хранится в состоянии — переживает перезагрузку. */
export function SessionTimer({ defaultWeek }: { defaultWeek?: number }) {
  const { state, update } = useStore()
  const timer = state.timer
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!timer) return
    const id = setInterval(() => setNow(Date.now()), 15_000)
    return () => clearInterval(id)
  }, [timer])

  if (!timer) {
    return (
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => {
          setNow(Date.now())
          update((s) => {
            s.timer = { startedAt: new Date().toISOString(), topic: '', weekNumber: defaultWeek }
          })
        }}
      >
        Начать учебную сессию
      </button>
    )
  }

  const elapsed = Math.max(0, Math.round((now - new Date(timer.startedAt).getTime()) / 60_000))

  const stop = () => {
    const exact = Math.round((Date.now() - new Date(timer.startedAt).getTime()) / 60_000)
    const minutes = Math.max(1, Math.min(exact, 24 * 60))
    update((s) => {
      s.sessions.push({
        id: newId(),
        date: today(),
        minutes,
        topic: s.timer?.topic || 'Учебная сессия',
        weekNumber: s.timer?.weekNumber,
        done: '',
        unclear: '',
        next: '',
        createdAt: new Date().toISOString(),
      })
      s.timer = null
    })
  }

  return (
    <div className="space-y-2 rounded-md border border-accent bg-accent-soft p-3">
      <div className="text-sm">
        Идёт сессия: <strong className="tabular-nums">{formatMinutes(elapsed)}</strong>
      </div>
      <input
        className="input"
        aria-label="Тема сессии"
        placeholder="Тема сессии"
        value={timer.topic}
        onChange={(e) => update((s) => { if (s.timer) s.timer.topic = e.target.value })}
      />
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary" onClick={stop}>Завершить и записать</button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            if (window.confirm('Отменить сессию без записи времени?')) update((s) => { s.timer = null })
          }}
        >
          Отменить
        </button>
      </div>
      <p className="text-xs text-muted">Подробности (что сделано, что непонятно) можно добавить потом в разделе «Сессии».</p>
    </div>
  )
}
