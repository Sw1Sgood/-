// Хранилище — IndexedDB. Почему не localStorage: IndexedDB асинхронна (не блокирует
// интерфейс), не ограничена ~5 МБ и лучше переживает очистку «лёгких» данных сайта.
// Всё состояние пользователя хранится одним документом: запись атомарна, а экспорт
// и импорт резервной копии сводятся к сериализации этого документа.

import type { UserState } from './types'

const DB_NAME = 'developer-course'
const DB_VERSION = 1
const STORE = 'kv'
const STATE_KEY = 'state'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB недоступна в этом браузере'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('Не удалось открыть хранилище'))
    req.onblocked = () => reject(new Error('Хранилище занято другой вкладкой'))
  })
}

let dbPromise: Promise<IDBDatabase> | null = null

function getDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = openDb().catch((e) => {
      dbPromise = null
      throw e
    })
  }
  return dbPromise
}

export async function loadState(): Promise<unknown | undefined> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(STATE_KEY)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveState(state: UserState): Promise<void> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(state, STATE_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error ?? new Error('Запись прервана'))
  })
}

/** Просит браузер не удалять данные при нехватке места. Результат не критичен. */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) return await navigator.storage.persist()
  } catch {
    // Некоторые браузеры не поддерживают API — это не ошибка.
  }
  return false
}

/** Только для тестов: закрыть соединение, чтобы можно было удалить базу. */
export async function closeDbForTests(): Promise<void> {
  if (dbPromise) (await dbPromise).close()
  dbPromise = null
}
