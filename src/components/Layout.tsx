import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useStore } from '../store/useStore'

const nav = [
  { to: '/', label: 'Главная', end: true },
  { to: '/plan', label: 'Учебный план' },
  { to: '/project', label: 'Проект' },
  { to: '/skills', label: 'Навыки' },
  { to: '/sessions', label: 'Сессии' },
  { to: '/resources', label: 'Материалы' },
  { to: '/settings', label: 'Настройки' },
]

function SaveIndicator() {
  const { saveStatus, saveError } = useStore()
  if (saveStatus === 'error') {
    return <span className="text-xs text-bad" title={saveError ?? ''} role="alert">Не сохранено: {saveError}</span>
  }
  if (saveStatus === 'saving') return <span className="text-xs text-muted">Сохранение…</span>
  if (saveStatus === 'saved') return <span className="text-xs text-muted">Сохранено</span>
  return null
}

export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `block rounded-md px-3 py-2 text-sm ${isActive ? 'bg-accent-soft font-medium text-accent' : 'text-ink hover:bg-surface-2'}`

  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-surface focus:p-2">
        К содержанию
      </a>
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
          <NavLink to="/" className="min-w-0 truncate font-semibold">
            Девелопер <span className="font-normal text-muted">· учебная платформа</span>
          </NavLink>
          <div className="flex items-center gap-3">
            <SaveIndicator />
            <button
              type="button"
              className="btn btn-secondary btn-sm lg:hidden"
              aria-expanded={menuOpen}
              aria-controls="main-nav"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? 'Закрыть' : 'Меню'}
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-5 lg:py-8">
        <nav
          id="main-nav"
          aria-label="Основная навигация"
          className={`${menuOpen ? 'block' : 'hidden'} fixed inset-x-0 top-[49px] z-20 border-b border-line bg-surface p-3 shadow-sm lg:static lg:block lg:w-48 lg:shrink-0 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none`}
        >
          <ul className="space-y-0.5 lg:sticky lg:top-20">
            {nav.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end={item.end} className={linkClass} onClick={() => setMenuOpen(false)}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <main id="main" className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
