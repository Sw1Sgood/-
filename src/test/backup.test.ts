import { describe, expect, it } from 'vitest'
import { createBackup, parseBackupText, validateBackup } from '../store/backup'
import { createInitialState, emptySubmission } from '../store/defaults'
import type { UserState } from '../store/types'

function sampleState(): UserState {
  const s = createInitialState()
  s.settings = { weeklyTargetMinutes: 540, startDate: '2026-09-07' }
  s.lessons['w01-l1'] = { status: 'done', notes: 'Заметка', unclear: 'ТЗ', answers: { '0': 'ответ' }, updatedAt: '2026-09-08T10:00:00.000Z', completedAt: '2026-09-08T10:00:00.000Z' }
  s.submissions['w03-t1'] = {
    ...emptySubmission(),
    status: 'ready',
    fields: { conclusion: 'Город А' },
    rows: [{ criterion: 'Население', a: '1 000 000', b: '600 000' }],
    checklist: { '0': true },
    rubric: { facts: 20, completeness: 18 },
  }
  s.sessions.push({ id: 'x1', date: '2026-09-08', minutes: 90, topic: 'Роли', weekNumber: 1, done: '', unclear: '', next: '', createdAt: '2026-09-08T10:00:00.000Z' })
  s.skillAssessments.push({ id: 'a1', skillId: 'roles', level: 2, artifactRef: 'task:w01-t1', artifactNote: '', comment: '', date: '2026-09-12' })
  s.dossier.budget = { fields: { notes: 'условно' }, rows: [{ item: 'СМР', amount: '500000000', status: 'Допущение' }] }
  s.reflections['1'] = { wentWell: 'да', hard: 'нет', confidence: 4, repeat: '', updatedAt: '2026-09-13T10:00:00.000Z' }
  s.customResources.push({ id: 'custom-1', title: 'Мой', url: 'https://example.org/', org: '', type: 'professional', topics: [], weeks: [3], linkStatus: 'unverified', checkNote: '', whatToFind: '', custom: true })
  return s
}

describe('резервная копия', () => {
  it('экспорт → импорт восстанавливает данные без потерь', () => {
    const state = sampleState()
    const text = JSON.stringify(createBackup(state))
    const result = parseBackupText(text)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const { updatedAt: _a, ...restored } = result.state
    const { updatedAt: _b, ...original } = state
    expect(restored).toEqual({ ...original, timer: null })
    expect(result.summary).toMatchObject({ lessonsDone: 1, submissions: 1, sessions: 1, skillAssessments: 1, dossierSections: 1 })
  })

  it('не JSON — понятная ошибка', () => {
    const r = parseBackupText('это не json')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors[0]).toMatch(/JSON/)
  })

  it('чужой JSON отклоняется', () => {
    const r = parseBackupText(JSON.stringify({ hello: 'world' }))
    expect(r.ok).toBe(false)
  })

  it('копия из будущей версии отклоняется', () => {
    const b = createBackup(sampleState())
    const r = validateBackup({ ...b, schemaVersion: 999 })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors[0]).toMatch(/новой версией/)
  })

  it('структурные ошибки перечисляются с путями', () => {
    const b = createBackup(sampleState()) as unknown as { state: Record<string, unknown> }
    b.state.sessions = [{ id: 's', date: '08.09.2026', minutes: 30 }, { id: 't', date: '2026-09-08', minutes: -5 }]
    b.state.lessons = { 'w01-l1': { status: 'выучил' } }
    const r = validateBackup(b)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.errors.some((e) => e.includes('state.sessions[0].date'))).toBe(true)
    expect(r.errors.some((e) => e.includes('state.sessions[1].minutes'))).toBe(true)
    expect(r.errors.some((e) => e.includes('state.lessons.w01-l1.status'))).toBe(true)
  })

  it('неизвестные поля отбрасываются, отсутствующие заполняются по умолчанию', () => {
    const r = validateBackup({ app: 'developer-course-backup', schemaVersion: 1, state: { extra: 1, lessons: {} } })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.state.sessions).toEqual([])
    expect((r.state as unknown as Record<string, unknown>).extra).toBeUndefined()
  })
})
