import type { DossierSectionId, Resource, SkillId } from '../content/types'

export const SCHEMA_VERSION = 1

export type LessonStatus = 'not_started' | 'in_progress' | 'done'

export interface LessonProgress {
  status: LessonStatus
  notes: string
  unclear: string
  /** Ответы на вопросы самопроверки по индексу вопроса. */
  answers: Record<string, string>
  startedAt?: string
  completedAt?: string
  postponedTo?: string
  updatedAt: string
}

export type SubmissionStatus = 'not_started' | 'in_progress' | 'ready' | 'needs_work' | 'accepted'

export type RubricKey = 'facts' | 'completeness' | 'logic' | 'calc' | 'conclusion'

export interface Submission {
  status: SubmissionStatus
  fields: Record<string, string>
  rows: Record<string, string>[]
  fileLink: string
  /** Отметки критериев качества по индексу критерия. */
  checklist: Record<string, boolean>
  rubric: Partial<Record<RubricKey, number>>
  selfAssessment: string
  reflection: { learned: string; distrust: string; clarify: string }
  postponedTo?: string
  acceptedAt?: string
  updatedAt: string
}

export interface StudySession {
  id: string
  /** ГГГГ-ММ-ДД */
  date: string
  minutes: number
  topic: string
  weekNumber?: number
  done: string
  unclear: string
  next: string
  createdAt: string
}

export interface WeeklyReflection {
  wentWell: string
  hard: string
  confidence: number | null
  repeat: string
  updatedAt: string
}

export interface ModuleReview {
  progress: string
  gaps: string
  plan: string
  updatedAt: string
}

export type SkillLevel = 0 | 1 | 2 | 3

export interface SkillAssessment {
  id: string
  skillId: SkillId
  level: SkillLevel
  /** Ссылка на артефакт: 'task:<id>', 'lesson:<id>', 'dossier:<id>' или 'other'. */
  artifactRef: string
  artifactNote: string
  comment: string
  date: string
}

export interface DossierSectionData {
  fields: Record<string, string>
  rows: Record<string, string>[]
  updatedAt?: string
}

export interface ResourceFlag {
  brokenReportedAt?: string
  note?: string
}

export interface Settings {
  weeklyTargetMinutes: number
  /** Дата начала курса (ГГГГ-ММ-ДД), от неё считается плановая неделя. */
  startDate: string
}

export interface ActiveTimer {
  startedAt: string
  topic: string
  weekNumber?: number
}

export interface UserState {
  schemaVersion: number
  courseId: string
  createdAt: string
  updatedAt: string
  settings: Settings
  lessons: Record<string, LessonProgress>
  submissions: Record<string, Submission>
  sessions: StudySession[]
  reflections: Record<string, WeeklyReflection>
  moduleReviews: Record<string, ModuleReview>
  skillAssessments: SkillAssessment[]
  dossier: Partial<Record<DossierSectionId, DossierSectionData>>
  resourceFlags: Record<string, ResourceFlag>
  customResources: Resource[]
  timer: ActiveTimer | null
}
