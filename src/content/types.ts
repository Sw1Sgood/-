// Типы содержания курса. Содержание — это данные: программу, задания и источники
// можно править в src/content/*, не трогая интерфейс.

export type SkillId =
  | 'roles'
  | 'market'
  | 'land'
  | 'urban'
  | 'cost'
  | 'finmodel'
  | 'risk'
  | 'financing'
  | 'management'

export type DossierSectionId =
  | 'overview'
  | 'site'
  | 'urban'
  | 'market'
  | 'concept'
  | 'budget'
  | 'revenue'
  | 'finmodel'
  | 'schedule'
  | 'risks'
  | 'decision'
  | 'sources'

export interface Course {
  id: string
  title: string
  version: string
  weeks: number
  /** Целевая нагрузка в минутах в неделю (по умолчанию). */
  weeklyTargetMinutes: number
  totalHours: { min: number; max: number }
}

export interface Module {
  id: string
  number: number
  title: string
  weeks: number[]
  summary: string
}

export interface Term {
  term: string
  /** Английский отраслевой термин, если он широко используется. */
  en?: string
  definition: string
  example?: string
}

export interface Question {
  q: string
  /** Краткая подсказка для самопроверки (раскрывается по кнопке). */
  hint: string
}

export interface ResourceRef {
  resourceId: string
  /** Зачем идти по ссылке и что именно найти. */
  what: string
}

export interface Lesson {
  id: string
  title: string
  minutes: number
  intro: string[]
  terms: Term[]
  keyPoints: string[]
  questions: Question[]
  resources: ResourceRef[]
}

export type FieldKind = 'text' | 'longtext' | 'number'

export interface FieldDef {
  id: string
  label: string
  kind: FieldKind
  placeholder?: string
  unit?: string
  help?: string
}

export type ColumnKind = 'text' | 'number' | 'select' | 'computed'

export interface ColumnDef {
  id: string
  label: string
  kind: ColumnKind
  unit?: string
  options?: string[]
  /** Только для kind: 'computed' — вычисляется из значений строки. */
  compute?: (row: Record<string, string>) => number | null
  /** Формат вычисленного значения. */
  format?: 'number' | 'rub' | 'percent'
  width?: 'sm' | 'md' | 'lg'
}

export interface TableDef {
  columns: ColumnDef[]
  /** Сколько пустых строк показать в начале. */
  initialRows?: number
  /** Колонка, по которой считается итог (сумма). */
  totalColumn?: string
}

export type TaskKind = 'intro' | 'analytic'

export interface Task {
  id: string
  title: string
  minutes: number
  /** intro — лёгкая самопроверка по чек-листу; analytic — рубрика на 100 баллов. */
  kind: TaskKind
  why: string
  situation: string
  inputs: string[]
  whereToLook: ResourceRef[]
  steps: string[]
  resultFormat: string
  fields: FieldDef[]
  table?: TableDef
  criteria: string[]
  mistakes: string[]
  dossierSections: DossierSectionId[]
}

export interface Week {
  number: number
  moduleId: string
  title: string
  plannedMinutes: { min: number; max: number }
  topics: string
  goals: string[]
  projectLink: string
  lessons: Lesson[]
  tasks: Task[]
  artifact: string
  skills: SkillId[]
}

export type ResourceType =
  | 'law'
  | 'official'
  | 'university'
  | 'statistics'
  | 'market'
  | 'professional'

export type LinkStatus = 'ok' | 'unverified' | 'unreachable'

export interface Resource {
  id: string
  title: string
  url: string
  org: string
  type: ResourceType
  topics: string[]
  weeks: number[]
  /** Дата последней проверки ссылки (ГГГГ-ММ-ДД), если проверка была. */
  checkedAt?: string
  linkStatus: LinkStatus
  /** Что именно было проверено и чем ограничена проверка. */
  checkNote: string
  /** Условия доступа — указывать только если подтверждены. */
  access?: string
  whatToFind: string
  custom?: boolean
}

export interface SkillLevelText {
  1: string
  2: string
  3: string
}

export interface Skill {
  id: SkillId
  title: string
  description: string
  levels: SkillLevelText
  weeks: number[]
}

export interface DossierSectionDef {
  id: DossierSectionId
  title: string
  description: string
  weeks: number[]
  fields: FieldDef[]
  table?: TableDef & { title: string }
}
