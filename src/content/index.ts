import { course, modules } from './course'
import { dossierById, dossierSections } from './dossier'
import { caseStudySections } from './lessons/caseStudy'
import { deepDiveSections } from './lessons/deepDive'
import { resources } from './resources'
import { skills } from './skills'
import type { Lesson, Task, Week } from './types'
import { module1Weeks } from './weeks/module1'
import { module2Weeks } from './weeks/module2'
import { module3Weeks } from './weeks/module3'
import { module4Weeks } from './weeks/module4'

// Разбор вглубь, сквозной кейс и типичные ошибки вставляются перед последним разделом урока («Как применить…»).
function withCaseStudy(week: Week): Week {
  return {
    ...week,
    lessons: week.lessons.map((lesson) => {
      const extra = [...(deepDiveSections[lesson.id] ?? []), ...(caseStudySections[lesson.id] ?? [])]
      if (extra.length === 0 || !lesson.sections) return lesson
      const sections = [...lesson.sections]
      const practice = sections.pop()!
      return { ...lesson, sections: [...sections, ...extra, practice] }
    }),
  }
}

export const weeks: Week[] = [...module1Weeks, ...module2Weeks, ...module3Weeks, ...module4Weeks].map(withCaseStudy)

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
