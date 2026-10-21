import { useRef, useState } from 'react'
import { Notice, PageHeader, Section } from '../components/ui'
import { course, dossierSections } from '../content'
import { formatDate, formatDateTime, isISODate, today } from '../lib/dates'
import { downloadText, dossierToMarkdown, sectionTableCsv, sessionsCsv, submissionsToMarkdown } from '../lib/export'
import { formatHours } from '../lib/format'
import { createBackup, parseBackupText, type ImportResult } from '../store/backup'
import { createInitialState } from '../store/defaults'
import { useStore } from '../store/useStore'

export function SettingsPage() {
  const { state, update, replace } = useStore()
  const [hours, setHours] = useState(String(state.settings.weeklyTargetMinutes / 60).replace('.', ','))
  const [hoursError, setHoursError] = useState<string | null>(null)
  const [pending, setPending] = useState<Extract<ImportResult, { ok: true }> | null>(null)
  const [importErrors, setImportErrors] = useState<string[] | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const saveHours = () => {
    const h = Number(hours.replace(',', '.'))
    if (!Number.isFinite(h) || h <= 0 || h > 80) {
      setHoursError('Укажите число часов от 0,5 до 80.')
      return
    }
    setHoursError(null)
    update((s) => { s.settings.weeklyTargetMinutes = Math.round(h * 60) })
    setMessage(`Цель на неделю: ${formatHours(Math.round(h * 60))}`)
  }

  const exportBackup = () => {
    downloadText(`developer-course-backup-${today()}.json`, JSON.stringify(createBackup(state), null, 2), 'application/json')
    setMessage('Резервная копия скачана. Храните файл в надёжном месте.')
  }

  const onFile = async (file: File) => {
    setPending(null)
    setImportErrors(null)
    setMessage(null)
    if (file.size > 20 * 1024 * 1024) {
      setImportErrors(['Файл слишком большой для резервной копии (больше 20 МБ).'])
      return
    }
    const text = await file.text()
    const result = parseBackupText(text)
    if (result.ok) setPending(result)
    else setImportErrors(result.errors)
  }

  const confirmImport = async () => {
    if (!pending) return
    await replace(pending.state)
    setPending(null)
    setMessage('Данные восстановлены из резервной копии.')
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Настройки и резервная копия" />
      {message && <Notice tone="good"><span role="status">{message}</span></Notice>}

      <Section title="Учебная нагрузка">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="hours">Цель часов в неделю</label>
            <div className="flex gap-2">
              <input id="hours" className="input" inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} />
              <button type="button" className="btn btn-primary" onClick={saveHours}>Сохранить</button>
            </div>
            {hoursError && <p className="mt-1 text-sm text-bad" role="alert">{hoursError}</p>}
            <p className="mt-1 text-xs text-muted">Рекомендовано курсом: 8–9 ч.</p>
          </div>
          <div>
            <label className="label" htmlFor="start">Дата начала курса</label>
            <input
              id="start"
              type="date"
              className="input"
              value={state.settings.startDate}
              onChange={(e) => {
                if (isISODate(e.target.value)) update((s) => { s.settings.startDate = e.target.value })
              }}
            />
            <p className="mt-1 text-xs text-muted">От неё считается плановая неделя. После паузы дату можно сдвинуть — прогресс не теряется.</p>
          </div>
        </div>
      </Section>

      <Section title="Резервная копия">
        <p className="text-sm">
          Все данные хранятся только в этом браузере (IndexedDB). Если очистить данные сайта, сменить браузер или устройство, они
          не перенесутся. Регулярно скачивайте резервную копию — например, раз в неделю.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" onClick={exportBackup}>Скачать резервную копию (JSON)</button>
          <label className="btn btn-secondary cursor-pointer">
            Восстановить из файла…
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f) }}
            />
          </label>
        </div>
        <p className="mt-2 text-xs text-muted">Последнее изменение данных: {formatDateTime(state.updatedAt)}.</p>

        {importErrors && (
          <div className="mt-4">
            <Notice tone="bad">
              <p className="font-medium">Файл не подходит — текущие данные не изменены.</p>
              <ul className="mt-1 list-disc pl-5">{importErrors.map((e) => <li key={e}>{e}</li>)}</ul>
            </Notice>
          </div>
        )}

        {pending && (
          <div className="mt-4 rounded-md border border-warn p-3">
            <p className="font-medium">Проверка файла прошла успешно</p>
            <ul className="mt-1 text-sm text-muted">
              {pending.summary.exportedAt && <li>Копия создана: {formatDateTime(pending.summary.exportedAt)}</li>}
              <li>Изученных уроков: {pending.summary.lessonsDone}</li>
              <li>Начатых заданий: {pending.summary.submissions}</li>
              <li>Учебных сессий: {pending.summary.sessions}</li>
              <li>Оценок навыков: {pending.summary.skillAssessments}</li>
              <li>Разделов досье с данными: {pending.summary.dossierSections}</li>
            </ul>
            {pending.warnings.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-sm text-warn">{pending.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
            )}
            <p className="mt-2 text-sm font-medium text-bad">Восстановление полностью заменит текущие данные в этом браузере.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" className="btn btn-danger" onClick={() => void confirmImport()}>Заменить данные</button>
              <button type="button" className="btn btn-secondary" onClick={() => { setPending(null); if (fileRef.current) fileRef.current.value = '' }}>Отмена</button>
            </div>
          </div>
        )}
      </Section>

      <Section title="Выгрузка артефактов">
        <p className="mb-3 text-sm text-muted">Файлы для портфолио и работы в табличном редакторе. CSV открывается в Excel и LibreOffice Calc.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-secondary" onClick={() => downloadText('dossier.md', dossierToMarkdown(state), 'text/markdown')}>Досье (Markdown)</button>
          <button type="button" className="btn btn-secondary" onClick={() => downloadText('tasks.md', submissionsToMarkdown(state), 'text/markdown')}>Задания (Markdown)</button>
          <button type="button" className="btn btn-secondary" onClick={() => downloadText('sessions.csv', sessionsCsv(state), 'text/csv')}>Сессии (CSV)</button>
          {dossierSections.filter((s) => s.table).map((s) => (
            <button key={s.id} type="button" className="btn btn-secondary" onClick={() => downloadText(`${s.id}.csv`, sectionTableCsv(state, s.id) ?? '', 'text/csv')}>
              {s.table!.title} (CSV)
            </button>
          ))}
        </div>
      </Section>

      <Section title="Опасная зона">
        <p className="text-sm">Удалить все данные из этого браузера и начать курс заново. Сначала скачайте резервную копию.</p>
        <button
          type="button"
          className="btn btn-danger mt-3"
          onClick={async () => {
            if (!window.confirm('Удалить все данные курса из этого браузера? Действие нельзя отменить без резервной копии.')) return
            if (!window.confirm('Точно удалить? Прогресс, задания, досье и сессии будут стёрты.')) return
            await replace(createInitialState())
            setMessage('Все данные удалены.')
          }}
        >
          Удалить все данные
        </button>
      </Section>

      <p className="text-xs text-muted">
        {course.title} · версия программы {course.version} · сегодня {formatDate(today())}
      </p>
    </div>
  )
}
