import type { Submission } from '../store/types'
import type { LessonProgress } from '../store/types'
import { lessonStatusLabels, submissionStatusLabels, weekStatusLabels, type WeekStatus } from '../lib/progress'
import { Badge, type Tone } from './ui'

const weekTone: Record<WeekStatus, Tone> = { not_started: 'neutral', in_progress: 'accent', awaiting: 'warn', done: 'good' }
const lessonTone: Record<LessonProgress['status'], Tone> = { not_started: 'neutral', in_progress: 'accent', done: 'good' }
const submissionTone: Record<Submission['status'], Tone> = {
  not_started: 'neutral',
  in_progress: 'accent',
  ready: 'warn',
  needs_work: 'bad',
  accepted: 'good',
}

export const WeekStatusBadge = ({ status }: { status: WeekStatus }) => <Badge tone={weekTone[status]}>{weekStatusLabels[status]}</Badge>
export const LessonStatusBadge = ({ status }: { status: LessonProgress['status'] }) => (
  <Badge tone={lessonTone[status]}>{lessonStatusLabels[status]}</Badge>
)
export const SubmissionStatusBadge = ({ status }: { status: Submission['status'] }) => (
  <Badge tone={submissionTone[status]}>{submissionStatusLabels[status]}</Badge>
)
