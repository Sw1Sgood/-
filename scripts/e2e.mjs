// Сквозная проверка ключевого сценария в настоящем браузере.
// Запуск: npm run build && npm run e2e
// Путь к Chromium можно задать переменной CHROMIUM_PATH (иначе — браузер Playwright).

import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import { chromium } from 'playwright'

const PORT = 4179
const BASE = `http://localhost:${PORT}/`
const shots = process.env.SHOTS_DIR
if (shots) mkdirSync(shots, { recursive: true })

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
const stop = () => server.kill('SIGTERM')

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(BASE)
      if (r.ok) return
    } catch {}
    await new Promise((r) => setTimeout(r, 200))
  }
  throw new Error('preview-сервер не запустился')
}

function check(cond, msg) {
  if (!cond) throw new Error(`Проверка не прошла: ${msg}`)
  console.log(`  ✓ ${msg}`)
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })
try {
  await waitForServer()
  const ctx = await browser.newContext({ acceptDownloads: true, locale: 'ru-RU' })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('dialog', (d) => d.accept())

  console.log('Главная')
  await page.goto(BASE)
  await page.getByRole('heading', { name: 'Кто делает проект и через что он проходит' }).waitFor()
  check(true, 'карточка «Продолжить обучение» показывает первый урок')

  console.log('Урок')
  await page.getByRole('link', { name: 'Начать урок' }).click()
  await page.getByLabel('Мои заметки').fill('Девелопер управляет решениями и рисками.')
  await page.getByRole('button', { name: 'Сохранить заметку' }).click()
  await page.getByText('Заметка сохранена').waitFor()
  await page.getByRole('button', { name: 'Отметить изученным' }).click()
  await page.getByText('Изучен', { exact: true }).waitFor()
  check(true, 'заметка сохранена, урок отмечен изученным')

  console.log('Задание')
  await page.goto(`${BASE}#/`)
  await page.getByRole('link', { name: 'Начать задание' }).click()
  await page.getByLabel('Проект, город, источник').fill('Учебный пример, г. N, карточка проекта')
  const checks = page.getByRole('checkbox')
  const n = await checks.count()
  for (let i = 0; i < n; i++) await checks.nth(i).check()
  await page.getByRole('button', { name: 'Готово к проверке' }).click()
  await page.getByRole('button', { name: 'Принять' }).click()
  await page.getByText(/Задание принято/).waitFor()
  check(true, `задание выполнено и принято (${n} критериев)`)

  console.log('Сессия и досье')
  await page.goto(`${BASE}#/sessions`)
  await page.getByLabel('Минут').fill('95')
  await page.getByLabel('Тема', { exact: true }).fill('Роли участников')
  await page.getByRole('button', { name: 'Записать сессию' }).click()
  await page.getByText('Записано: 1 ч 35 мин').waitFor()
  check(true, 'сессия записана')

  await page.goto(`${BASE}#/project/budget`)
  await page.getByRole('button', { name: '+ Добавить строку' }).click()
  await page.getByLabel('Статья, строка 1').fill('СМР (условно)')
  await page.getByLabel('Сумма, строка 1').fill('500 000 000')
  await page.getByText('500 000 000 ₽').waitFor()
  check(true, 'бюджет: строка добавлена, итог посчитан')

  if (shots) await page.screenshot({ path: `${shots}/desktop-budget.png`, fullPage: true })

  console.log('Сохранение между перезапусками')
  await page.waitForTimeout(800)
  await page.reload()
  await page.getByLabel('Статья, строка 1').waitFor()
  check((await page.getByLabel('Статья, строка 1').inputValue()) === 'СМР (условно)', 'данные пережили перезагрузку')

  console.log('Резервная копия: экспорт → сброс → импорт')
  await page.goto(`${BASE}#/settings`)
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Скачать резервную копию (JSON)' }).click()])
  const backupPath = await download.path()
  const backup = JSON.parse(readFileSync(backupPath, 'utf8'))
  check(backup.app === 'developer-course-backup' && backup.state.sessions.length === 1, 'копия скачана и содержит данные')

  await page.getByRole('button', { name: 'Удалить все данные' }).click()
  await page.getByText('Все данные удалены.').waitFor()
  await page.goto(`${BASE}#/sessions`)
  await page.getByText('Сессий пока нет').waitFor()
  check(true, 'после сброса данных нет')

  await page.goto(`${BASE}#/settings`)
  await page.locator('input[type=file]').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"oops":1}') })
  await page.getByText('Файл не подходит — текущие данные не изменены.').waitFor()
  check(true, 'некорректный файл отклонён с понятной ошибкой')

  await page.locator('input[type=file]').setInputFiles(backupPath)
  await page.getByText('Проверка файла прошла успешно').waitFor()
  await page.getByRole('button', { name: 'Заменить данные' }).click()
  await page.getByText('Данные восстановлены из резервной копии.').waitFor()
  await page.goto(`${BASE}#/`)
  await page.getByText('1 / 16').first().waitFor()
  await page.goto(`${BASE}#/sessions`)
  await page.getByText('Роли участников').waitFor()
  check(true, 'импорт восстановил прогресс и сессии')

  console.log('Мобильный экран')
  const mobile = await browser.newContext({ viewport: { width: 375, height: 740 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  const m = await mobile.newPage()
  m.on('pageerror', (e) => errors.push(e.message))
  for (const route of ['', 'plan', 'lesson/w03-l1', 'task/w03-t1', 'project/market', 'skills', 'sessions', 'resources', 'settings']) {
    await m.goto(`${BASE}#/${route}`)
    await m.locator('main h1').first().waitFor()
    const overflow = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    check(overflow <= 0, `/${route || ''}: нет горизонтальной прокрутки страницы (${overflow}px)`)
    if (shots) await m.screenshot({ path: `${shots}/mobile-${route.replace(/\//g, '-') || 'home'}.png`, fullPage: false })
  }
  await m.getByRole('button', { name: 'Меню' }).click()
  await m.getByRole('link', { name: 'Учебный план' }).click()
  await m.getByRole('heading', { name: 'Учебный план' }).waitFor()
  check(true, 'мобильное меню работает')

  check(errors.length === 0, `нет ошибок JavaScript${errors.length ? ': ' + errors.join('; ') : ''}`)
  console.log('\nСквозная проверка пройдена.')
} catch (e) {
  console.error(e)
  process.exitCode = 1
} finally {
  await browser.close()
  stop()
}
