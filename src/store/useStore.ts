import { createContext, useContext } from 'react'
import type { UserState } from './types'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export interface StoreValue {
  state: UserState
  /** Изменение состояния: recipe получает копию и мутирует её. */
  update: (recipe: (draft: UserState) => void) => void
  /** Полная замена (импорт, сброс). Сохраняется сразу. */
  replace: (next: UserState) => Promise<void>
  saveStatus: SaveStatus
  saveError: string | null
}

export const StoreContext = createContext<StoreValue | null>(null)

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore вне StoreProvider')
  return ctx
}
