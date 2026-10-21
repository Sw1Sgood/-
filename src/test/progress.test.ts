import { describe, expect, it } from 'vitest'
import { taskById, weeks } from '../content'
import { addDays, startOfWeek } from '../lib/dates'
import { mul, parseNum } from '../lib/number'
import { toCsv } from '../lib/export'
import {
  canAccept,
  currentWeek,
  minutesInCalendarWeek,
  nextStep,
  planWeekNumber,
  rescheduledStartDate,
  rubricTotal,
  weekStatus,
} from '../lib/progress'
import { createInitialState, emptyLessonProgress, emptySubmission } from '../store/defaults'

const w1 = weeks[0]

describe('статусы и следующий шаг', () => {
  it('новый пользователь: неделя 1, следующий шаг — урок', () => {
    const s = createInitialState()
    expect(weekStatus(s, w1)).toBe('not_started')
    expect(currentWeek(s).number).toBe(1)
    const step = nextStep(s)
    expect(step.kind).toBe('lesson')
    if (step.kind === 'lesson') expect(step.action).toBe('Начать урок')
  })

  it('урок изучен → следующий шаг задание; задание на проверке → «Ожидает проверки»', () => {
    const s = createInitialState()
    s.lessons[w1.lessons[0].id] = { ...emptyLessonProgress(), status: 'done' }
    expect(nextStep(s).kind).toBe('task')
    s.submissions[w1.tasks[0].id] = { ...emptySubmission(), status: 'ready' }
    expect(weekStatus(s, w1)).toBe('awaiting')
  })

  it('прочитанное не равно освоенному: урок изучен, но неделя не завершена без принятой практики', () => {
    const s = createInitialState()
    s.lessons[w1.lessons[0].id] = { ...emptyLessonProgress(), status: 'done' }
    expect(weekStatus(s, w1)).toBe('in_progress')
  })

  it('неделя завершена → предлагаются итоги, затем следующая неделя', () => {
    const s = createInitialState()
    s.lessons[w1.lessons[0].id] = { ...emptyLessonProgress(), status: 'done' }
    s.submissions[w1.tasks[0].id] = { ...emptySubmission(), status: 'accepted' }
    expect(weekStatus(s, w1)).toBe('done')
    expect(nextStep(s).kind).toBe('reflection')
    s.reflections['1'] = { wentWell: '', hard: '', confidence: 3, repeat: '', updatedAt: '' }
    const step = nextStep(s)
    expect(step.kind === 'lesson' && step.week.number).toBe(2)
  })

  it('недели не блокируются: можно начать неделю 5 раньше', () => {
    const s = createInitialState()
    s.submissions[weeks[4].tasks[0].id] = { ...emptySubmission(), status: 'in_progress' }
    expect(weekStatus(s, weeks[4])).toBe('in_progress')
    expect(currentWeek(s).number).toBe(1)
  })
})

describe('принятие заданий', () => {
  it('вводное — нужны все критерии', () => {
    const { task } = taskById.get('w01-t1')!
    const sub = emptySubmission()
    expect(canAccept(task, sub).ok).toBe(false)
    task.criteria.forEach((_, i) => (sub.checklist[String(i)] = true))
    expect(canAccept(task, sub).ok).toBe(true)
  })

  it('аналитическое — нужна полная рубрика и от 85 баллов', () => {
    const { task } = taskById.get('w03-t1')!
    const sub = emptySubmission()
    sub.rubric = { facts: 25, completeness: 20, logic: 20, calc: 10 }
    expect(rubricTotal(sub)).toBeNull()
    expect(canAccept(task, sub).ok).toBe(false)
    sub.rubric.conclusion = 5
    expect(rubricTotal(sub)).toBe(80)
    expect(canAccept(task, sub).ok).toBe(false)
    sub.rubric.calc = 15
    expect(rubricTotal(sub)).toBe(85)
    expect(canAccept(task, sub).ok).toBe(true)
  })
})

describe('время и график', () => {
  it('считает минуты за календарную неделю с понедельника', () => {
    const s = createInitialState()
    s.sessions.push(
      { id: '1', date: '2026-10-19', minutes: 60, topic: '', done: '', unclear: '', next: '', createdAt: '' },
      { id: '2', date: '2026-10-25', minutes: 30, topic: '', done: '', unclear: '', next: '', createdAt: '' },
      { id: '3', date: '2026-10-26', minutes: 45, topic: '', done: '', unclear: '', next: '', createdAt: '' },
    )
    expect(startOfWeek('2026-10-21')).toBe('2026-10-19')
    expect(minutesInCalendarWeek(s, '2026-10-21')).toBe(90)
  })

  it('плановая неделя и пересчёт графика после паузы', () => {
    const s = createInitialState()
    s.settings.startDate = '2026-09-07'
    expect(planWeekNumber(s, '2026-09-07')).toBe(1)
    expect(planWeekNumber(s, '2026-10-21')).toBe(7)
    const start = rescheduledStartDate(s, '2026-10-21')
    s.settings.startDate = start
    expect(planWeekNumber(s, '2026-10-21')).toBe(currentWeek(s).number)
    expect(addDays(start, 0)).toBe('2026-10-19')
  })
})

describe('числа и CSV', () => {
  it('разбирает русский формат чисел', () => {
    expect(parseNum('1 250 000,5')).toBe(1250000.5)
    expect(parseNum('120 000 ₽')).toBe(120000)
    expect(parseNum('')).toBeNull()
    expect(parseNum('abc')).toBeNull()
    expect(mul('10 000', '120000')).toBe(1_200_000_000)
    expect(mul('10', '')).toBeNull()
  })

  it('CSV экранирует разделители и кавычки', () => {
    const csv = toCsv(['a', 'b'], [['x;y', 'он сказал "да"']])
    expect(csv).toBe('﻿a;b\r\n"x;y";"он сказал ""да"""')
  })
})
