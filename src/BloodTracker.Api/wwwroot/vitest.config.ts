import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'js'),
    },
  },
  test: {
    environment: 'happy-dom',
    setupFiles: ['./js/__tests__/setup.ts'],
    include: ['js/__tests__/**/*.test.ts', 'js/__tests__/**/*.test.tsx'],
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['js/**/*.ts'],
      exclude: ['js/__tests__/**', 'js/types/**', 'js/global.d.ts'],
    },
  },
})
