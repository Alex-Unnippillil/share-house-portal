import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['supabase/tests/**/*.test.ts'],
    environment: 'node',
    globals: true,
  },
})
