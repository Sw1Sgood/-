// Резервная копия: экспорт состояния в JSON и импорт с проверкой формата.
// Импорт строгий: при любой структурной ошибке данные не заменяются, а пользователь
// видит список проблем. Неизвестные поля молча отбрасываются.

import { course } from '../content'
import type { Resource } from '../content/types'
import { isISODate } from '../lib/dates'
import { createInitialState } from './defaults'
import type {
  DossierSectionData,
  LessonProgress,
  ModuleReview,
  SkillAssessment,
  StudySession,
  Submission,
  UserState,
  WeeklyReflection,
} from './types'
import { SCHEMA_VERSION } from './types'

export const BACKUP_APP_ID = 'developer-course-backup'

export interface BackupFile {
  app: typeof BACKUP_APP_ID
  exportedAt: string
  schemaVersion: number
  courseVersion: string
  state: UserState
}

export function createBackup(state: UserState): BackupFile {
  return {
    app: BACKUP_APP_ID,
    exportedAt: new Date().toISOString(),
    schemaVersion: SCHEMA_VERSION,
    courseVersion: course.version,
    state,
  }
}

export type ImportResult =
  | { ok: true; state: UserState; warnings: string[]; summary: BackupSummary }
  | { ok: false; errors: string[] }

export interface BackupSummary {
  exportedAt?: string
  lessonsDone: number
  submissions: number
  sessions: number
  skillAssessments: number
  dossierSections: number
}

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const isStr = (v: unknown): v is string => typeof v === 'string'
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

class Checker {
  errors: string[] = []
  warnings: string[] = []
  fail(path: string, msg: string) {
    if (this.errors.length < 30) this.errors.push(`${path}: ${msg}`)
  }
  str(o: Obj, key: string, path: string, fallback = ''): string {
    const v = o[key]
    if (v === undefined || v === null) return fallback
    if (!isStr(v)) {
      this.fail(`${path}.${key}`, 'ожидалась строка')
      return fallback
    }
    return v
  }
  optStr(o: Obj, key: string, path: string): string | undefined {
    const v = o[key]
    if (v === undefined || v === null) return undefined
    if (!isStr(v)) {
      this.fail(`${path}.${key}`, 'ожидалась строка')
      return undefined
    }
    return v
  }
  strRecord(v: unknown, path: string): Record<string, string> {
    if (v === undefined) return {}
    if (!isObj(v)) {
      this.fail(path, 'ожидался объект')
      return {}
    }
    const out: Record<string, string> = {}
    for (const [k, val] of Object.entries(v)) {
      if (isStr(val)) out[k] = val
      else if (isNum(val)) out[k] = String(val)
      else this.fail(`${path}.${k}`, 'ожидалась строка')
    }
    return out
  }
  rows(v: unknown, path: string): Record<string, string>[] {
    if (v === undefined) return []
    if (!Array.isArray(v)) {
      this.fail(path, 'ожидался список строк таблицы')
      return []
    }
    return v.map((row, i) => this.strRecord(row, `${path}[${i}]`))
  }
  oneOf<T extends string>(v: unknown, allowed: readonly T[], path: string, fallback: T): T {
    if (v === undefined) return fallback
    if (isStr(v) && (allowed as readonly string[]).includes(v)) return v as T
    this.fail(path, `недопустимое значение «${String(v)}»`)
    return fallback
  }
}

const lessonStatuses = ['not_started', 'in_progress', 'done'] as const
const submissionStatuses = ['not_started', 'in_progress', 'ready', 'needs_work', 'accepted'] as const
const rubricKeys = ['facts', 'completeness', 'logic', 'calc', 'conclusion'] as const
const skillIds = ['roles', 'market', 'land', 'urban', 'cost', 'finmodel', 'risk', 'financing', 'management'] as const
const dossierIds = [
  'overview', 'site', 'urban', 'market', 'concept', 'budget', 'revenue', 'finmodel', 'schedule', 'risks', 'decision', 'sources',
] as const
const resourceTypes = ['law', 'official', 'university', 'statistics', 'market', 'professional'] as const

export function parseBackupText(text: string): ImportResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, errors: ['Файл не является корректным JSON. Выберите файл резервной копии, сохранённый этим приложением.'] }
  }
  return validateBackup(raw)
}

export function validateBackup(raw: unknown): ImportResult {
  if (!isObj(raw)) return { ok: false, errors: ['Файл не похож на резервную копию: ожидался объект.'] }
  if (raw.app !== BACKUP_APP_ID) {
    return { ok: false, errors: ['Это не резервная копия учебной платформы (нет отметки приложения).'] }
  }
  if (!isNum(raw.schemaVersion)) return { ok: false, errors: ['Не указана версия формата (schemaVersion).'] }
  if (raw.schemaVersion > SCHEMA_VERSION) {
    return {
      ok: false,
      errors: [`Копия создана более новой версией приложения (формат ${raw.schemaVersion}, поддерживается до ${SCHEMA_VERSION}). Обновите приложение.`],
    }
  }
  if (!isObj(raw.state)) return { ok: false, errors: ['В копии нет раздела state с данными.'] }

  const c = new Checker()
  const s = raw.state
  const base = createInitialState()

  if (s.courseId !== undefined && s.courseId !== course.id) {
    c.warnings.push(`Копия относится к другому курсу («${String(s.courseId)}»). Данные несовместимых уроков будут проигнорированы.`)
  }

  // settings
  const settingsRaw = isObj(s.settings) ? s.settings : {}
  if (s.settings !== undefined && !isObj(s.settings)) c.fail('state.settings', 'ожидался объект')
  let weeklyTargetMinutes = base.settings.weeklyTargetMinutes
  if (settingsRaw.weeklyTargetMinutes !== undefined) {
    if (isNum(settingsRaw.weeklyTargetMinutes) && settingsRaw.weeklyTargetMinutes > 0 && settingsRaw.weeklyTargetMinutes <= 60 * 80) {
      weeklyTargetMinutes = Math.round(settingsRaw.weeklyTargetMinutes)
    } else c.fail('state.settings.weeklyTargetMinutes', 'ожидалось число минут от 1 до 4800')
  }
  let startDate = base.settings.startDate
  if (settingsRaw.startDate !== undefined) {
    if (isISODate(settingsRaw.startDate)) startDate = settingsRaw.startDate
    else c.fail('state.settings.startDate', 'ожидалась дата ГГГГ-ММ-ДД')
  }

  // lessons
  const lessons: Record<string, LessonProgress> = {}
  if (s.lessons !== undefined && !isObj(s.lessons)) c.fail('state.lessons', 'ожидался объект')
  for (const [id, v] of Object.entries(isObj(s.lessons) ? s.lessons : {})) {
    const p = `state.lessons.${id}`
    if (!isObj(v)) {
      c.fail(p, 'ожидался объект')
      continue
    }
    lessons[id] = {
      status: c.oneOf(v.status, lessonStatuses, `${p}.status`, 'not_started'),
      notes: c.str(v, 'notes', p),
      unclear: c.str(v, 'unclear', p),
      answers: c.strRecord(v.answers, `${p}.answers`),
      startedAt: c.optStr(v, 'startedAt', p),
      completedAt: c.optStr(v, 'completedAt', p),
      postponedTo: c.optStr(v, 'postponedTo', p),
      updatedAt: c.str(v, 'updatedAt', p, base.createdAt),
    }
  }

  // submissions
  const submissions: Record<string, Submission> = {}
  if (s.submissions !== undefined && !isObj(s.submissions)) c.fail('state.submissions', 'ожидался объект')
  for (const [id, v] of Object.entries(isObj(s.submissions) ? s.submissions : {})) {
    const p = `state.submissions.${id}`
    if (!isObj(v)) {
      c.fail(p, 'ожидался объект')
      continue
    }
    const checklist: Record<string, boolean> = {}
    if (isObj(v.checklist)) {
      for (const [k, val] of Object.entries(v.checklist)) {
        if (typeof val === 'boolean') checklist[k] = val
        else c.fail(`${p}.checklist.${k}`, 'ожидалось true/false')
      }
    } else if (v.checklist !== undefined) c.fail(`${p}.checklist`, 'ожидался объект')
    const rubric: Submission['rubric'] = {}
    if (isObj(v.rubric)) {
      for (const key of rubricKeys) {
        const val = v.rubric[key]
        if (val === undefined || val === null) continue
        if (isNum(val) && val >= 0 && val <= 25) rubric[key] = val
        else c.fail(`${p}.rubric.${key}`, 'ожидалось число баллов')
      }
    } else if (v.rubric !== undefined) c.fail(`${p}.rubric`, 'ожидался объект')
    const refl = isObj(v.reflection) ? v.reflection : {}
    submissions[id] = {
      status: c.oneOf(v.status, submissionStatuses, `${p}.status`, 'not_started'),
      fields: c.strRecord(v.fields, `${p}.fields`),
      rows: c.rows(v.rows, `${p}.rows`),
      fileLink: c.str(v, 'fileLink', p),
      checklist,
      rubric,
      selfAssessment: c.str(v, 'selfAssessment', p),
      reflection: {
        learned: c.str(refl, 'learned', `${p}.reflection`),
        distrust: c.str(refl, 'distrust', `${p}.reflection`),
        clarify: c.str(refl, 'clarify', `${p}.reflection`),
      },
      postponedTo: c.optStr(v, 'postponedTo', p),
      acceptedAt: c.optStr(v, 'acceptedAt', p),
      updatedAt: c.str(v, 'updatedAt', p, base.createdAt),
    }
  }

  // sessions
  const sessions: StudySession[] = []
  if (s.sessions !== undefined && !Array.isArray(s.sessions)) c.fail('state.sessions', 'ожидался список')
  ;(Array.isArray(s.sessions) ? s.sessions : []).forEach((v, i) => {
    const p = `state.sessions[${i}]`
    if (!isObj(v)) return c.fail(p, 'ожидался объект')
    if (!isStr(v.id) || !v.id) return c.fail(`${p}.id`, 'нет идентификатора')
    if (!isISODate(v.date)) return c.fail(`${p}.date`, 'ожидалась дата ГГГГ-ММ-ДД')
    if (!isNum(v.minutes) || v.minutes <= 0 || v.minutes > 24 * 60) return c.fail(`${p}.minutes`, 'ожидалось число минут от 1 до 1440')
    sessions.push({
      id: v.id,
      date: v.date,
      minutes: Math.round(v.minutes),
      topic: c.str(v, 'topic', p),
      weekNumber: isNum(v.weekNumber) ? v.weekNumber : undefined,
      done: c.str(v, 'done', p),
      unclear: c.str(v, 'unclear', p),
      next: c.str(v, 'next', p),
      createdAt: c.str(v, 'createdAt', p, base.createdAt),
    })
  })

  // reflections
  const reflections: Record<string, WeeklyReflection> = {}
  for (const [k, v] of Object.entries(isObj(s.reflections) ? s.reflections : {})) {
    const p = `state.reflections.${k}`
    if (!isObj(v)) {
      c.fail(p, 'ожидался объект')
      continue
    }
    const conf = v.confidence
    if (conf !== undefined && conf !== null && !(isNum(conf) && conf >= 1 && conf <= 5)) c.fail(`${p}.confidence`, 'ожидалось 1–5')
    reflections[k] = {
      wentWell: c.str(v, 'wentWell', p),
      hard: c.str(v, 'hard', p),
      confidence: isNum(conf) && conf >= 1 && conf <= 5 ? conf : null,
      repeat: c.str(v, 'repeat', p),
      updatedAt: c.str(v, 'updatedAt', p, base.createdAt),
    }
  }

  const moduleReviews: Record<string, ModuleReview> = {}
  for (const [k, v] of Object.entries(isObj(s.moduleReviews) ? s.moduleReviews : {})) {
    const p = `state.moduleReviews.${k}`
    if (!isObj(v)) {
      c.fail(p, 'ожидался объект')
      continue
    }
    moduleReviews[k] = {
      progress: c.str(v, 'progress', p),
      gaps: c.str(v, 'gaps', p),
      plan: c.str(v, 'plan', p),
      updatedAt: c.str(v, 'updatedAt', p, base.createdAt),
    }
  }

  // skill assessments
  const skillAssessments: SkillAssessment[] = []
  if (s.skillAssessments !== undefined && !Array.isArray(s.skillAssessments)) c.fail('state.skillAssessments', 'ожидался список')
  ;(Array.isArray(s.skillAssessments) ? s.skillAssessments : []).forEach((v, i) => {
    const p = `state.skillAssessments[${i}]`
    if (!isObj(v)) return c.fail(p, 'ожидался объект')
    const level = v.level
    if (!(level === 0 || level === 1 || level === 2 || level === 3)) return c.fail(`${p}.level`, 'ожидался уровень 0–3')
    if (!isStr(v.skillId) || !(skillIds as readonly string[]).includes(v.skillId)) return c.fail(`${p}.skillId`, 'неизвестный навык')
    skillAssessments.push({
      id: isStr(v.id) && v.id ? v.id : `imported-${i}`,
      skillId: v.skillId as SkillAssessment['skillId'],
      level,
      artifactRef: c.str(v, 'artifactRef', p),
      artifactNote: c.str(v, 'artifactNote', p),
      comment: c.str(v, 'comment', p),
      date: isISODate(v.date) ? v.date : base.settings.startDate,
    })
  })

  // dossier
  const dossier: UserState['dossier'] = {}
  if (s.dossier !== undefined && !isObj(s.dossier)) c.fail('state.dossier', 'ожидался объект')
  for (const [k, v] of Object.entries(isObj(s.dossier) ? s.dossier : {})) {
    const p = `state.dossier.${k}`
    if (!(dossierIds as readonly string[]).includes(k)) {
      c.warnings.push(`Неизвестный раздел досье «${k}» пропущен.`)
      continue
    }
    if (!isObj(v)) {
      c.fail(p, 'ожидался объект')
      continue
    }
    const section: DossierSectionData = {
      fields: c.strRecord(v.fields, `${p}.fields`),
      rows: c.rows(v.rows, `${p}.rows`),
      updatedAt: c.optStr(v, 'updatedAt', p),
    }
    dossier[k as keyof UserState['dossier']] = section
  }

  // resource flags
  const resourceFlags: UserState['resourceFlags'] = {}
  for (const [k, v] of Object.entries(isObj(s.resourceFlags) ? s.resourceFlags : {})) {
    if (!isObj(v)) {
      c.fail(`state.resourceFlags.${k}`, 'ожидался объект')
      continue
    }
    resourceFlags[k] = {
      brokenReportedAt: c.optStr(v, 'brokenReportedAt', `state.resourceFlags.${k}`),
      note: c.optStr(v, 'note', `state.resourceFlags.${k}`),
    }
  }

  const customResources: Resource[] = []
  ;(Array.isArray(s.customResources) ? s.customResources : []).forEach((v, i) => {
    const p = `state.customResources[${i}]`
    if (!isObj(v)) return c.fail(p, 'ожидался объект')
    if (!isStr(v.id) || !isStr(v.title) || !isStr(v.url)) return c.fail(p, 'нужны id, title и url')
    customResources.push({
      id: v.id,
      title: v.title,
      url: v.url,
      org: c.str(v, 'org', p),
      type: c.oneOf(v.type, resourceTypes, `${p}.type`, 'professional'),
      topics: Array.isArray(v.topics) ? v.topics.filter(isStr) : [],
      weeks: Array.isArray(v.weeks) ? v.weeks.filter(isNum) : [],
      checkedAt: isISODate(v.checkedAt) ? v.checkedAt : undefined,
      linkStatus: c.oneOf(v.linkStatus, ['ok', 'unverified', 'unreachable'] as const, `${p}.linkStatus`, 'unverified'),
      checkNote: c.str(v, 'checkNote', p),
      whatToFind: c.str(v, 'whatToFind', p),
      custom: true,
    })
  })

  if (c.errors.length > 0) return { ok: false, errors: c.errors }

  const state: UserState = {
    ...base,
    createdAt: isStr(s.createdAt) ? s.createdAt : base.createdAt,
    updatedAt: new Date().toISOString(),
    settings: { weeklyTargetMinutes, startDate },
    lessons,
    submissions,
    sessions,
    reflections,
    moduleReviews,
    skillAssessments,
    dossier,
    resourceFlags,
    customResources,
    timer: null,
  }

  return {
    ok: true,
    state,
    warnings: c.warnings,
    summary: {
      exportedAt: isStr(raw.exportedAt) ? raw.exportedAt : undefined,
      lessonsDone: Object.values(lessons).filter((l) => l.status === 'done').length,
      submissions: Object.values(submissions).filter((x) => x.status !== 'not_started').length,
      sessions: sessions.length,
      skillAssessments: skillAssessments.length,
      dossierSections: Object.keys(dossier).length,
    },
  }
}
