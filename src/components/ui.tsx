import { useId, useState, type ReactNode, type TextareaHTMLAttributes } from 'react'

export type Tone = 'neutral' | 'accent' | 'good' | 'warn' | 'bad'

const toneClass: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-muted',
  accent: 'bg-accent-soft text-accent',
  good: 'bg-good-soft text-good',
  warn: 'bg-warn-soft text-warn',
  bad: 'bg-bad-soft text-bad',
}

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium whitespace-nowrap ${toneClass[tone]}`}>{children}</span>
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="h1">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  )
}

export function Section({ title, children, actions, id }: { title: string; children: ReactNode; actions?: ReactNode; id?: string }) {
  return (
    <section className="card" id={id} aria-labelledby={id ? `${id}-title` : undefined}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="h2" id={id ? `${id}-title` : undefined}>{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  )
}

export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max === 0 ? 0 : Math.min(100, Math.round((value / max) * 100))
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
      <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
    </div>
  )
}

export function Stat({ label, value, note }: { label: string; value: ReactNode; note?: ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className="text-xl font-semibold tabular-nums">{value}</div>
      {note && <div className="text-xs text-muted">{note}</div>}
    </div>
  )
}

/** Поле ввода с подписью. Значение сохраняется на каждое изменение (через onChange). */
export function TextField({
  label,
  value,
  onChange,
  multiline,
  placeholder,
  unit,
  help,
  inputMode,
  rows = 4,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  multiline?: boolean
  placeholder?: string
  unit?: string
  help?: string
  inputMode?: 'decimal' | 'text' | 'url'
  rows?: number
}) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
        {unit && <span className="font-normal text-muted">, {unit}</span>}
      </label>
      {multiline ? (
        <AutoTextarea id={id} value={value} placeholder={placeholder} rows={rows} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input id={id} className="input" value={value} placeholder={placeholder} inputMode={inputMode} onChange={(e) => onChange(e.target.value)} />
      )}
      {help && <p className="mt-1 text-xs text-muted">{help}</p>}
    </div>
  )
}

export function AutoTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`input resize-y ${props.className ?? ''}`} />
}

export function Disclosure({ summary, children }: { summary: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button type="button" className="text-sm text-accent hover:underline" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? 'Скрыть' : summary}
      </button>
      {open && <div className="mt-2 rounded-md bg-surface-2 p-3 text-sm">{children}</div>}
    </div>
  )
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line p-6 text-center">
      <p className="font-medium">{title}</p>
      {children && <div className="mt-1 text-sm text-muted">{children}</div>}
    </div>
  )
}

export function Notice({ tone = 'accent', children }: { tone?: Tone; children: ReactNode }) {
  return <div className={`rounded-md px-3 py-2 text-sm ${toneClass[tone]}`}>{children}</div>
}

export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="link break-words">
      {children}
      <span className="sr-only"> (откроется в новой вкладке)</span>
    </a>
  )
}
