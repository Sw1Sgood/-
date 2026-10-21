import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { BACKUP_APP_ID, validateBackup } from './backup'
import { loadState, requestPersistence, saveState } from './db'
import { createInitialState } from './defaults'
import { StoreContext, type SaveStatus } from './useStore'
import type { UserState } from './types'
import { SCHEMA_VERSION } from './types'


const SAVE_DELAY_MS = 400

type LoadPhase =
  | { phase: 'loading' }
  | { phase: 'ready' }
  | { phase: 'error'; message: string; raw?: unknown }

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<UserState>(createInitialState)
  const [load, setLoad] = useState<LoadPhase>({ phase: 'loading' })
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latest = useRef(state)

  useEffect(() => {
    let cancelled = false
    loadState()
      .then((raw) => {
        if (cancelled) return
        if (raw === undefined) {
          const initial = createInitialState()
          latest.current = initial
          setState(initial)
          void saveState(initial)
          setLoad({ phase: 'ready' })
          return
        }
        const result = validateBackup({ app: BACKUP_APP_ID, schemaVersion: (raw as UserState)?.schemaVersion ?? SCHEMA_VERSION, state: raw })
        if (result.ok) {
          latest.current = result.state
          setState(result.state)
          setLoad({ phase: 'ready' })
        } else {
          setLoad({ phase: 'error', message: result.errors.join('\n'), raw })
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setLoad({ phase: 'error', message: e instanceof Error ? e.message : String(e) })
      })
    void requestPersistence()
    return () => {
      cancelled = true
    }
  }, [])

  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    setSaveStatus('saving')
    try {
      await saveState(latest.current)
      setSaveStatus('saved')
      setSaveError(null)
    } catch (e) {
      setSaveStatus('error')
      setSaveError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  const update = useCallback(
    (recipe: (draft: UserState) => void) => {
      const draft = structuredClone(latest.current)
      recipe(draft)
      draft.updatedAt = new Date().toISOString()
      latest.current = draft
      setState(draft)
      setSaveStatus('saving')
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => void flush(), SAVE_DELAY_MS)
    },
    [flush],
  )

  const replace = useCallback(
    async (next: UserState) => {
      latest.current = next
      setState(next)
      await flush()
    },
    [flush],
  )

  // Не терять последние правки при закрытии вкладки.
  useEffect(() => {
    const onHide = () => {
      if (timer.current) void flush()
    }
    window.addEventListener('pagehide', onHide)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('pagehide', onHide)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [flush])

  const value = useMemo(() => ({ state, update, replace, saveStatus, saveError }), [state, update, replace, saveStatus, saveError])

  if (load.phase === 'loading') {
    return <div className="p-8 text-center text-muted">Загрузка данных…</div>
  }
  if (load.phase === 'error') {
    return <LoadError message={load.message} raw={load.raw} onReset={async () => {
      const fresh = createInitialState()
      latest.current = fresh
      setState(fresh)
      await saveState(fresh)
      setLoad({ phase: 'ready' })
    }} />
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

function LoadError({ message, raw, onReset }: { message: string; raw?: unknown; onReset: () => Promise<void> }) {
  const download = () => {
    const blob = new Blob([JSON.stringify(raw, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'developer-course-raw-data.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }
  return (
    <div className="mx-auto max-w-xl p-6">
      <h1 className="mb-3 text-xl font-semibold">Не удалось загрузить сохранённые данные</h1>
      <p className="mb-3 text-sm">Данные не изменены. Причина:</p>
      <pre className="mb-4 max-h-60 overflow-auto rounded border border-line bg-surface-2 p-3 text-xs whitespace-pre-wrap">{message}</pre>
      <div className="flex flex-wrap gap-2">
        {raw !== undefined && (
          <button type="button" className="btn btn-secondary" onClick={download}>Скачать сохранённые данные как есть</button>
        )}
        <button
          type="button"
          className="btn btn-danger"
          onClick={() => {
            if (window.confirm('Начать с чистого листа? Текущие сохранённые данные будут перезаписаны. Сначала скачайте их, если они нужны.')) void onReset()
          }}
        >
          Начать заново
        </button>
      </div>
    </div>
  )
}

