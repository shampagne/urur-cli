import { defineConfig } from 'vitest/config'

export default defineConfig({
  define: {
    __SUPABASE_URL__: JSON.stringify('http://127.0.0.1:54321'),
    __SUPABASE_ANON_KEY__: JSON.stringify('test-anon-key'),
    __WEB_URL__: JSON.stringify('http://localhost:5173'),
  },
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts'],
    },
  },
})
