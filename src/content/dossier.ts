import { parseNum, mul } from '../lib/number'
import type { DossierSectionDef } from './types'

const factOptions = ['Подтверждено', 'Допущение', 'Гипотеза', 'Нужно уточнить']

export const dossierSections: DossierSectionDef[] = [
  {
    id: 'overview',
    title: 'Обзор проекта',
    description: 'Где, что и для кого. Заполняйте постепенно — к неделе 9 обзор должен быть полным.',
    weeks: [1, 3, 9],
    fields: [
      { id: 'name', label: 'Рабочее название проекта', kind: 'text', placeholder: 'Например: «ЖК у парка», учебный' },
      { id: 'region', label: 'Регион', kind: 'text' },
      { id: 'city', label: 'Город / район', kind: 'text' },
      { id: 'objectType', label: 'Тип объекта', kind: 'text', placeholder: 'Многоквартирный жилой дом' },
      { id: 'audience', label: 'Целевая аудитория', kind: 'longtext' },
      { id: 'stage', label: 'Стадия анализа', kind: 'text', placeholder: 'Идея / предварительная проверка / концепция / модель' },
    ],
  },
  {
    id: 'site',
    title: 'Локация и участок',
    description: 'Только сведения с источником и датой проверки. Чего нет — так и пишите: «нет данных».',
    weeks: [5, 8],
    fields: [
      { id: 'address', label: 'Адрес или ориентир', kind: 'text' },
      { id: 'cadastral', label: 'Кадастровый номер (при наличии)', kind: 'text', placeholder: 'Формат вида 00:00:0000000:000' },
      { id: 'area', label: 'Площадь участка', kind: 'number', unit: 'м²' },
      { id: 'category', label: 'Категория земель', kind: 'text' },
      { id: 'access', label: 'Подъезд и транспорт', kind: 'longtext' },
      { id: 'utilities', label: 'Сети: что известно', kind: 'longtext', help: 'Наличие сетей рядом ≠ возможность подключения. Пишите, что подтверждено.' },
      { id: 'source', label: 'Источник сведений', kind: 'text' },
      { id: 'checkedAt', label: 'Дата проверки', kind: 'text', placeholder: 'ДД.ММ.ГГГГ' },
    ],
  },
  {
    id: 'urban',
    title: 'Градостроительные сведения',
    description: 'ВРИ, ПЗЗ, зона, ГПЗУ и ограничения. Это учебная проверка, не юридическое заключение.',
    weeks: [6, 7],
    fields: [
      { id: 'vri', label: 'Вид разрешённого использования (ВРИ)', kind: 'text' },
      { id: 'zone', label: 'Территориальная зона по ПЗЗ', kind: 'text' },
      { id: 'pzzSource', label: 'Где найдены ПЗЗ (ссылка, редакция)', kind: 'text' },
      { id: 'gpzu', label: 'ГПЗУ', kind: 'text', placeholder: 'Есть / нет / неизвестно' },
      { id: 'params', label: 'Предельные параметры застройки (что нашли)', kind: 'longtext' },
      { id: 'limits', label: 'Зоны с особыми условиями и ограничения', kind: 'longtext' },
    ],
    table: {
      title: 'Матрица «подтверждено / нужно уточнить»',
      initialRows: 3,
      columns: [
        { id: 'question', label: 'Вопрос', kind: 'text', width: 'lg' },
        { id: 'answer', label: 'Что известно', kind: 'text', width: 'lg' },
        { id: 'status', label: 'Статус', kind: 'select', options: factOptions },
        { id: 'who', label: 'Кого спросить', kind: 'text' },
      ],
    },
  },
  {
    id: 'market',
    title: 'Рынок',
    description: 'Конкуренты и наблюдаемые цены. Цены из объявлений — это цены предложения, а не сделок.',
    weeks: [3, 9, 15],
    fields: [
      { id: 'demand', label: 'Факторы спроса в локации', kind: 'longtext' },
      { id: 'audience', label: 'Кто покупатель', kind: 'longtext' },
      { id: 'conclusion', label: 'Вывод по рынку', kind: 'longtext' },
    ],
    table: {
      title: 'Конкуренты',
      initialRows: 3,
      columns: [
        { id: 'name', label: 'Проект', kind: 'text', width: 'md' },
        { id: 'distance', label: 'Расстояние', kind: 'text', unit: 'км', width: 'sm' },
        { id: 'class', label: 'Класс', kind: 'text', width: 'sm' },
        { id: 'price', label: 'Цена предложения', kind: 'number', unit: '₽/м²' },
        { id: 'deadline', label: 'Срок ввода', kind: 'text', width: 'sm' },
        { id: 'source', label: 'Источник и дата', kind: 'text', width: 'md' },
      ],
    },
  },
  {
    id: 'concept',
    title: 'Концепция',
    description: 'Что строим и почему именно это.',
    weeks: [9],
    fields: [
      { id: 'type', label: 'Тип объекта и класс', kind: 'text' },
      { id: 'gba', label: 'Общая площадь здания (оценка)', kind: 'number', unit: 'м²' },
      { id: 'sellable', label: 'Продаваемая площадь (оценка)', kind: 'number', unit: 'м²' },
      { id: 'product', label: 'Продуктовая идея и преимущества', kind: 'longtext' },
      { id: 'assumptions', label: 'Ключевые допущения', kind: 'longtext' },
    ],
  },
  {
    id: 'budget',
    title: 'Бюджет (укрупнённый)',
    description: 'Учебные числа — условные. В каждой строке отметьте, факт это или допущение.',
    weeks: [10, 11],
    fields: [{ id: 'notes', label: 'Комментарий к бюджету', kind: 'longtext' }],
    table: {
      title: 'Статьи затрат',
      initialRows: 0,
      totalColumn: 'amount',
      columns: [
        { id: 'item', label: 'Статья', kind: 'text', width: 'lg' },
        { id: 'amount', label: 'Сумма', kind: 'number', unit: '₽' },
        { id: 'basis', label: 'Основание расчёта', kind: 'text', width: 'lg' },
        { id: 'status', label: 'Статус', kind: 'select', options: factOptions },
      ],
    },
  },
  {
    id: 'revenue',
    title: 'Доходы',
    description: 'Продаваемая площадь × средняя цена, с учётом темпа продаж.',
    weeks: [11, 15],
    fields: [
      { id: 'pace', label: 'Темп продаж (оценка)', kind: 'text', placeholder: 'м² в месяц или % в квартал' },
      { id: 'notes', label: 'Обоснование цены и темпа', kind: 'longtext' },
    ],
    table: {
      title: 'Продукты',
      initialRows: 0,
      totalColumn: 'revenue',
      columns: [
        { id: 'product', label: 'Продукт', kind: 'text', width: 'md' },
        { id: 'area', label: 'Площадь', kind: 'number', unit: 'м²' },
        { id: 'price', label: 'Цена', kind: 'number', unit: '₽/м²' },
        { id: 'revenue', label: 'Выручка', kind: 'computed', format: 'rub', compute: (r) => mul(r.area, r.price) },
        { id: 'status', label: 'Статус', kind: 'select', options: factOptions },
      ],
    },
  },
  {
    id: 'finmodel',
    title: 'Финансовая модель',
    description: 'Сводка сценариев. Сама модель по периодам ведётся в табличном редакторе; сюда — итог и ссылка на файл.',
    weeks: [11, 12, 13],
    fields: [
      { id: 'fileLink', label: 'Ссылка или путь к файлу модели', kind: 'text' },
      { id: 'peakDeficit', label: 'Пиковая потребность в капитале', kind: 'number', unit: '₽' },
      { id: 'discountRate', label: 'Учебная ставка дисконтирования и её обоснование', kind: 'text' },
      { id: 'thresholds', label: 'При каких параметрах проект неприемлем', kind: 'longtext' },
    ],
    table: {
      title: 'Сценарии',
      initialRows: 0,
      columns: [
        { id: 'name', label: 'Сценарий', kind: 'text', width: 'md' },
        { id: 'revenue', label: 'Выручка', kind: 'number', unit: '₽' },
        { id: 'costs', label: 'Затраты', kind: 'number', unit: '₽' },
        {
          id: 'profit',
          label: 'Прибыль',
          kind: 'computed',
          format: 'rub',
          compute: (r) => {
            const rev = parseNum(r.revenue)
            const cost = parseNum(r.costs)
            return rev == null || cost == null ? null : rev - cost
          },
        },
        {
          id: 'margin',
          label: 'Маржа',
          kind: 'computed',
          format: 'percent',
          compute: (r) => {
            const rev = parseNum(r.revenue)
            const cost = parseNum(r.costs)
            return rev == null || cost == null || rev === 0 ? null : (rev - cost) / rev
          },
        },
        { id: 'months', label: 'Срок', kind: 'number', unit: 'мес.' },
      ],
    },
  },
  {
    id: 'schedule',
    title: 'График и управление',
    description: 'Этапы, зависимости, роли и контрольные точки.',
    weeks: [10, 14],
    fields: [{ id: 'raci', label: 'Матрица ответственности (кратко или ссылка)', kind: 'longtext' }],
    table: {
      title: 'Этапы',
      initialRows: 0,
      columns: [
        { id: 'stage', label: 'Этап', kind: 'text', width: 'lg' },
        { id: 'months', label: 'Длительность', kind: 'number', unit: 'мес.' },
        { id: 'dependsOn', label: 'Зависит от', kind: 'text', width: 'md' },
        { id: 'owner', label: 'Ответственный', kind: 'text', width: 'md' },
        { id: 'milestone', label: 'Контрольная точка', kind: 'text', width: 'md' },
      ],
    },
  },
  {
    id: 'risks',
    title: 'Риски',
    description: 'Реестр рисков: вероятность и последствия по шкале 1–5.',
    weeks: [8, 12, 15],
    fields: [],
    table: {
      title: 'Реестр рисков',
      initialRows: 0,
      columns: [
        { id: 'risk', label: 'Риск', kind: 'text', width: 'lg' },
        { id: 'p', label: 'Вероятность 1–5', kind: 'number', width: 'sm' },
        { id: 'i', label: 'Последствия 1–5', kind: 'number', width: 'sm' },
        { id: 'score', label: 'Оценка', kind: 'computed', format: 'number', compute: (r) => mul(r.p, r.i) },
        { id: 'mitigation', label: 'Меры снижения', kind: 'text', width: 'lg' },
        { id: 'status', label: 'Статус', kind: 'select', options: ['Открыт', 'Под контролем', 'Закрыт'] },
      ],
    },
  },
  {
    id: 'decision',
    title: 'Итоговое решение',
    description: 'Продолжить, изменить концепцию, собрать данные или отказаться — с аргументами.',
    weeks: [8, 16],
    fields: [
      { id: 'decision', label: 'Решение', kind: 'text', placeholder: 'Продолжить / изменить концепцию / собрать данные / отказаться' },
      { id: 'arguments', label: 'Аргументы', kind: 'longtext' },
      { id: 'gaps', label: 'Пробелы и что проверить у специалистов', kind: 'longtext' },
      { id: 'presentation', label: 'Ссылка на презентацию', kind: 'text' },
    ],
  },
  {
    id: 'sources',
    title: 'Журнал источников',
    description: 'Каждый факт в досье должен иметь строку здесь.',
    weeks: [3, 5, 6, 7],
    fields: [],
    table: {
      title: 'Источники',
      initialRows: 0,
      columns: [
        { id: 'title', label: 'Название', kind: 'text', width: 'md' },
        { id: 'url', label: 'URL', kind: 'text', width: 'md' },
        { id: 'org', label: 'Организация', kind: 'text', width: 'md' },
        { id: 'date', label: 'Дата обращения', kind: 'text', width: 'sm' },
        { id: 'claim', label: 'Что подтверждает', kind: 'text', width: 'lg' },
        { id: 'reliability', label: 'Надёжность', kind: 'select', options: ['Официальный', 'Отраслевой', 'Вторичный', 'Мнение / форум'] },
      ],
    },
  },
]

export const dossierById = Object.fromEntries(dossierSections.map((s) => [s.id, s])) as Record<
  DossierSectionDef['id'],
  DossierSectionDef
>
