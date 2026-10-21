import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'

// base: './' — собранную папку dist можно открыть с любого статического хостинга или подпапки.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  // Содержание курса встроено в бандл (~150 КБ gzip) — это осознанно: приложение работает офлайн.
  build: { chunkSizeWarningLimit: 800 },
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
  },
})
