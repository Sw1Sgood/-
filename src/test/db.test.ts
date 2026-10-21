import { describe, expect, it } from 'vitest'
import { closeDbForTests, loadState, saveState } from '../store/db'
import { createInitialState } from '../store/defaults'

describe('IndexedDB', () => {
  it('сохраняет и читает состояние, переживая «перезапуск» соединения', async () => {
    expect(await loadState()).toBeUndefined()
    const s = createInitialState()
    s.sessions.push({ id: '1', date: '2026-10-21', minutes: 40, topic: 'тест', done: '', unclear: '', next: '', createdAt: '' })
    await saveState(s)
    await closeDbForTests()
    const loaded = (await loadState()) as typeof s
    expect(loaded.sessions[0].topic).toBe('тест')
  })
})
