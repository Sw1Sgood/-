import type { RubricKey } from '../store/types'

export const rubric: { key: RubricKey; label: string; max: number; hint: string }[] = [
  { key: 'facts', label: 'Факты и первоисточники', max: 25, hint: 'У каждого факта есть источник и дата; приоритет официальным источникам.' },
  { key: 'completeness', label: 'Полнота факторов', max: 20, hint: 'Учтены все существенные факторы; пробелы названы.' },
  { key: 'logic', label: 'Логика и прозрачность допущений', max: 20, hint: 'Допущения помечены и объяснены; рассуждение можно проверить.' },
  { key: 'calc', label: 'Расчёты и проверка формул', max: 20, hint: 'Расчёты сделаны формулами и сверены. Если расчётов нет — оцените точность цифр.' },
  { key: 'conclusion', label: 'Вывод, ограничения и следующий шаг', max: 15, hint: 'Вывод следует из данных, ограничения и следующий шаг названы.' },
]

export const RUBRIC_MAX = rubric.reduce((a, r) => a + r.max, 0)

export const rubricBands = [
  { min: 85, label: 'Готово', tone: 'good' as const },
  { min: 70, label: 'Нужна конкретная доработка', tone: 'warn' as const },
  { min: 0, label: 'Исправить ключевые ошибки', tone: 'bad' as const },
]
