import { course, modules } from './course'
import { dossierById, dossierSections } from './dossier'
import { resources } from './resources'
import { skills } from './skills'
import type { Lesson, Task, Week } from './types'
import { module1Weeks } from './weeks/module1'
import { module2Weeks } from './weeks/module2'
import { module3Weeks } from './weeks/module3'
import { module4Weeks } from './weeks/module4'

export const weeks: Week[] = [...module1Weeks, ...module2Weeks, ...module3Weeks, ...module4Weeks]

export { course, modules, resources, skills, dossierSections, dossierById }

export const weekByNumber = new Map(weeks.map((w) => [w.number, w]))

export const lessonById = new Map<string, { lesson: Lesson; week: Week }>(
  weeks.flatMap((week) => week.lessons.map((lesson) => [lesson.id, { lesson, week }] as const)),
)

export const taskById = new Map<string, { task: Task; week: Week }>(
  weeks.flatMap((week) => week.tasks.map((task) => [task.id, { task, week }] as const)),
)

export const resourceById = new Map(resources.map((r) => [r.id, r]))

export const moduleById = new Map(modules.map((m) => [m.id, m]))
