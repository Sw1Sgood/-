import { course } from '../content'
import { today } from '../lib/dates'
import type { LessonProgress, Submission, UserState } from './types'
import { SCHEMA_VERSION } from './types'

export function createInitialState(): UserState {
  const now = new Date().toISOString()
  return {
    schemaVersion: SCHEMA_VERSION,
    courseId: course.id,
    createdAt: now,
    updatedAt: now,
    settings: { weeklyTargetMinutes: course.weeklyTargetMinutes, startDate: today() },
    lessons: {},
    submissions: {},
    sessions: [],
    reflections: {},
    moduleReviews: {},
    skillAssessments: [],
    dossier: {},
    resourceFlags: {},
    customResources: [],
    timer: null,
  }
}

export function emptyLessonProgress(): LessonProgress {
  return { status: 'not_started', notes: '', unclear: '', answers: {}, updatedAt: new Date().toISOString() }
}

export function emptySubmission(): Submission {
  return {
    status: 'not_started',
    fields: {},
    rows: [],
    fileLink: '',
    checklist: {},
    rubric: {},
    selfAssessment: '',
    reflection: { learned: '', distrust: '', clarify: '' },
    updatedAt: new Date().toISOString(),
  }
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
