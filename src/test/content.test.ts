import { describe, expect, it } from 'vitest'
import { course, dossierSections, modules, resourceById, resources, skills, weeks } from '../content'

describe('содержание курса', () => {
  it('16 недель по порядку, каждая в модуле', () => {
    expect(weeks).toHaveLength(course.weeks)
    weeks.forEach((w, i) => expect(w.number).toBe(i + 1))
    for (const w of weeks) expect(modules.some((m) => m.id === w.moduleId && m.weeks.includes(w.number))).toBe(true)
  })

  it('уникальные id уроков и заданий', () => {
    const ids = weeks.flatMap((w) => [...w.lessons.map((l) => l.id), ...w.tasks.map((t) => t.id)])
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('урок по стандарту ТЗ: 3–7 вопросов, словарь, ключевые мысли', () => {
    for (const l of weeks.flatMap((w) => w.lessons)) {
      expect(l.questions.length, l.id).toBeGreaterThanOrEqual(3)
      expect(l.questions.length, l.id).toBeLessThanOrEqual(7)
      expect(l.terms.length, l.id).toBeGreaterThan(0)
      expect(l.keyPoints.length, l.id).toBeGreaterThan(0)
      expect(l.intro.length, l.id).toBeGreaterThan(0)
    }
  })

  it('задание по стандарту ТЗ: 4–8 шагов, критерии, ошибки, связь с досье', () => {
    for (const t of weeks.flatMap((w) => w.tasks)) {
      expect(t.steps.length, t.id).toBeGreaterThanOrEqual(4)
      expect(t.steps.length, t.id).toBeLessThanOrEqual(8)
      expect(t.criteria.length, t.id).toBeGreaterThan(0)
      expect(t.mistakes.length, t.id).toBeGreaterThan(0)
      expect(t.dossierSections.length, t.id).toBeGreaterThan(0)
      expect(t.why && t.situation && t.resultFormat, t.id).toBeTruthy()
    }
  })

  it('у каждой недели есть практика и плановое время 8–9 часов', () => {
    for (const w of weeks) {
      expect(w.tasks.length).toBeGreaterThan(0)
      expect(w.plannedMinutes).toEqual({ min: 480, max: 540 })
    }
  })

  it('все ссылки на ресурсы ведут к существующим ресурсам', () => {
    const refs = weeks.flatMap((w) => [...w.lessons.flatMap((l) => l.resources), ...w.tasks.flatMap((t) => t.whereToLook)])
    for (const r of refs) expect(resourceById.has(r.resourceId), r.resourceId).toBe(true)
  })

  it('ресурс со статусом «ok» имеет дату проверки; без проверки — не «ok»', () => {
    for (const r of resources) {
      if (r.linkStatus === 'ok') expect(r.checkedAt, r.id).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(r.url).toMatch(/^https?:\/\//)
      expect(r.whatToFind.length).toBeGreaterThan(10)
    }
  })

  it('недели навыков и разделов досье существуют', () => {
    for (const s of skills) for (const n of s.weeks) expect(n).toBeLessThanOrEqual(16)
    for (const d of dossierSections) for (const n of d.weeks) expect(n).toBeLessThanOrEqual(16)
    const skillIds = new Set(skills.map((s) => s.id))
    for (const w of weeks) for (const s of w.skills) expect(skillIds.has(s)).toBe(true)
  })
})
