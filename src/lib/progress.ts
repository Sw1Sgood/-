// Производные показатели: статусы недель, следующий шаг, время, навыки, досье.
// Чистые функции от состояния — легко тестировать.

import { dossierSections, modules, skills, weeks } from '../content'
import { rubric, rubricBands } from '../content/rubric'
import type { DossierSectionId, SkillId, Task, Week } from '../content/types'
import { emptyLessonProgress, emptySubmission } from '../store/defaults'
import type { LessonProgress, SkillAssessment, Submission, UserState } from '../store/types'
import { addDays, daysBetween, startOfWeek } from './dates'

export type WeekStatus = 'not_started' | 'in_progress' | 'awaiting' | 'done'

export const weekStatusLabels: Record<WeekStatus, string> = {
  not_started: 'Не начата',
  in_progress: 'В процессе',
  awaiting: 'Ожидает проверки',
  done: 'Завершена',
}

export const lessonStatusLabels: Record<LessonProgress['status'], string> = {
  not_started: 'Не начат',
  in_progress: 'В процессе',
  done: 'Изучен',
}

export const submissionStatusLabels: Record<Submission['status'], string> = {
  not_started: 'Не начато',
  in_progress: 'В процессе',
  ready: 'Готово к проверке',
  needs_work: 'Нужно доработать',
  accepted: 'Принято',
}

export function getLesson(state: UserState, id: string): LessonProgress {
  return state.lessons[id] ?? emptyLessonProgress()
}

export function getSubmission(state: UserState, id: string): Submission {
  return state.submissions[id] ?? emptySubmission()
}

export function weekStatus(state: UserState, week: Week): WeekStatus {
  const lessons = week.lessons.map((l) => getLesson(state, l.id))
  const subs = week.tasks.map((t) => getSubmission(state, t.id))
  const allLessonsDone = lessons.every((l) => l.status === 'done')
  const allAccepted = subs.every((s) => s.status === 'accepted')
  if (allLessonsDone && allAccepted) return 'done'
  if (subs.some((s) => s.status === 'ready')) return 'awaiting'
  const touched =
    lessons.some((l) => l.status !== 'not_started' || l.notes.trim() !== '') ||
    subs.some((s) => s.status !== 'not_started')
  return touched ? 'in_progress' : 'not_started'
}

/** Текущая неделя по прогрессу — первая незавершённая. */
export function currentWeek(state: UserState): Week {
  return weeks.find((w) => weekStatus(state, w) !== 'done') ?? weeks[weeks.length - 1]
}

/** Неделя по календарю от даты начала (может быть больше 16 — курс можно продолжать). */
export function planWeekNumber(state: UserState, todayISO: string): number {
  const days = daysBetween(state.settings.startDate, todayISO)
  return Math.max(1, Math.floor(days / 7) + 1)
}

/** Новая дата начала, при которой плановая неделя совпадёт с текущей неделей прогресса. */
export function rescheduledStartDate(state: UserState, todayISO: string): string {
  const current = currentWeek(state).number
  return addDays(startOfWeek(todayISO), -(current - 1) * 7)
}

export type NextStep =
  | { kind: 'lesson'; week: Week; id: string; title: string; action: string }
  | { kind: 'task'; week: Week; id: string; title: string; action: string }
  | { kind: 'reflection'; week: Week; title: string; action: string }
  | { kind: 'finished'; title: string; action: string }

const taskAction: Record<Submission['status'], string> = {
  not_started: 'Начать задание',
  in_progress: 'Продолжить задание',
  ready: 'Проверить по критериям',
  needs_work: 'Доработать задание',
  accepted: 'Открыть задание',
}

export function nextStep(state: UserState): NextStep {
  for (const week of weeks) {
    if (weekStatus(state, week) === 'done') {
      if (!state.reflections[String(week.number)]) {
        // Обзор недели предлагаем, но не требуем: он не блокирует следующий шаг дольше одной недели.
        const later = weeks.find((w) => w.number > week.number)
        if (!later || weekStatus(state, later) === 'not_started') {
          return { kind: 'reflection', week, title: `Итоги недели ${week.number}`, action: 'Подвести итоги недели' }
        }
      }
      continue
    }
    const lesson = week.lessons.find((l) => getLesson(state, l.id).status !== 'done')
    if (lesson) {
      const started = getLesson(state, lesson.id).status === 'in_progress'
      return { kind: 'lesson', week, id: lesson.id, title: lesson.title, action: started ? 'Продолжить урок' : 'Начать урок' }
    }
    const task = week.tasks.find((t) => getSubmission(state, t.id).status !== 'accepted')
    if (task) {
      const status = getSubmission(state, task.id).status
      return { kind: 'task', week, id: task.id, title: task.title, action: taskAction[status] }
    }
  }
  return { kind: 'finished', title: 'Все 16 недель завершены', action: 'Посмотреть досье' }
}

// ——— Время ———

export function minutesBetween(state: UserState, fromISO: string, toISOExclusive: string): number {
  return state.sessions
    .filter((s) => s.date >= fromISO && s.date < toISOExclusive)
    .reduce((acc, s) => acc + s.minutes, 0)
}

/** Минуты за календарную неделю (пн–вс), содержащую дату. */
export function minutesInCalendarWeek(state: UserState, dateISO: string): number {
  const from = startOfWeek(dateISO)
  return minutesBetween(state, from, addDays(from, 7))
}

export function minutesForCourseWeek(state: UserState, weekNumber: number): number {
  return state.sessions.filter((s) => s.weekNumber === weekNumber).reduce((a, s) => a + s.minutes, 0)
}

export function totalMinutes(state: UserState): number {
  return state.sessions.reduce((a, s) => a + s.minutes, 0)
}

// ——— Сводка прогресса ———

export function courseProgress(state: UserState) {
  const allLessons = weeks.flatMap((w) => w.lessons)
  const allTasks = weeks.flatMap((w) => w.tasks)
  const subs = allTasks.map((t) => getSubmission(state, t.id))
  return {
    lessonsDone: allLessons.filter((l) => getLesson(state, l.id).status === 'done').length,
    lessonsTotal: allLessons.length,
    tasksAccepted: subs.filter((s) => s.status === 'accepted').length,
    tasksInReview: subs.filter((s) => s.status === 'ready').length,
    tasksStarted: subs.filter((s) => s.status !== 'not_started').length,
    tasksTotal: allTasks.length,
    weeksDone: weeks.filter((w) => weekStatus(state, w) === 'done').length,
  }
}

// ——— Рубрика ———

export function rubricTotal(sub: Submission): number | null {
  const values = rubric.map((r) => sub.rubric[r.key])
  if (values.some((v) => v === undefined)) return null
  return values.reduce<number>((a, v) => a + (v ?? 0), 0)
}

export function rubricBand(total: number) {
  return rubricBands.find((b) => total >= b.min) ?? rubricBands[rubricBands.length - 1]
}

/** Можно ли принять задание по правилам самопроверки. */
export function canAccept(task: Task, sub: Submission): { ok: boolean; reason?: string } {
  if (task.kind === 'intro') {
    const done = task.criteria.filter((_, i) => sub.checklist[String(i)]).length
    return done === task.criteria.length
      ? { ok: true }
      : { ok: false, reason: `Отмечено ${done} из ${task.criteria.length} критериев качества.` }
  }
  const total = rubricTotal(sub)
  if (total == null) return { ok: false, reason: 'Оцените работу по всем пяти пунктам рубрики.' }
  if (total < 85) return { ok: false, reason: `По рубрике ${total} из 100 — для принятия нужно от 85.` }
  return { ok: true }
}

// ——— Навыки ———

export function latestAssessment(state: UserState, skillId: SkillId): SkillAssessment | undefined {
  return state.skillAssessments
    .filter((a) => a.skillId === skillId)
    .sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1))[0]
}

export function skillLevels(state: UserState) {
  return skills.map((s) => ({ skill: s, assessment: latestAssessment(state, s.id), level: latestAssessment(state, s.id)?.level ?? 0 }))
}

// ——— Досье ———

function isFilled(v: string | undefined) {
  return v != null && v.trim() !== ''
}

export function dossierSectionCompletion(state: UserState, id: DossierSectionId) {
  const def = dossierSections.find((s) => s.id === id)!
  const data = state.dossier[id]
  const filledFields = def.fields.filter((f) => isFilled(data?.fields[f.id])).length
  const rows = (data?.rows ?? []).filter((r) => Object.values(r).some(isFilled)).length
  const parts = def.fields.length + (def.table ? 1 : 0)
  const done = filledFields + (def.table && rows > 0 ? 1 : 0)
  return { filledFields, totalFields: def.fields.length, rows, ratio: parts === 0 ? 0 : done / parts }
}

export function dossierSummary(state: UserState) {
  const items = dossierSections.map((s) => ({ section: s, ...dossierSectionCompletion(state, s.id) }))
  return {
    items,
    ready: items.filter((i) => i.ratio >= 1).length,
    started: items.filter((i) => i.ratio > 0 && i.ratio < 1).length,
    empty: items.filter((i) => i.ratio === 0).length,
  }
}

// ——— Перенесённое ———

export function postponedItems(state: UserState) {
  const out: { kind: 'lesson' | 'task'; id: string; title: string; week: Week; to: string }[] = []
  for (const week of weeks) {
    for (const l of week.lessons) {
      const p = state.lessons[l.id]
      if (p?.postponedTo && p.status !== 'done') out.push({ kind: 'lesson', id: l.id, title: l.title, week, to: p.postponedTo })
    }
    for (const t of week.tasks) {
      const s = state.submissions[t.id]
      if (s?.postponedTo && s.status !== 'accepted') out.push({ kind: 'task', id: t.id, title: t.title, week, to: s.postponedTo })
    }
  }
  return out.sort((a, b) => (a.to < b.to ? -1 : 1))
}

// ——— Обзоры модулей ———

/** Модуль, по которому пора сделать обзор: все недели завершены или календарь ушёл дальше. */
export function moduleReviewDue(state: UserState, todayISO: string) {
  const plan = planWeekNumber(state, todayISO)
  return modules.find((m) => {
    if (state.moduleReviews[m.id]) return false
    const last = m.weeks[m.weeks.length - 1]
    const allDone = m.weeks.every((n) => weekStatus(state, weeks[n - 1]) === 'done')
    return allDone || plan > last
  })
}
