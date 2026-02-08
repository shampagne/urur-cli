import { readFileSync } from 'node:fs'
import { defineConfig } from 'tsup'

function loadDotEnv(): Record<string, string> {
  try {
    const content = readFileSync('.env', 'utf-8')
    const env: Record<string, string> = {}
    for (const line of content.split('\n')) {
      const match = line.match(/^([^#=]+)=(.*)$/)
      if (match) {
        env[match[1].trim()] = match[2].trim()
      }
    }
    return env
  } catch {
    return {}
  }
}

const dotEnv = loadDotEnv()

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  banner: {
    js: '#!/usr/bin/env node',
  },
  splitting: false,
  clean: true,
  sourcemap: true,
  dts: true,
  define: {
    __SUPABASE_URL__: JSON.stringify(
      process.env.SUPABASE_URL || dotEnv.SUPABASE_URL || '',
    ),
    __SUPABASE_ANON_KEY__: JSON.stringify(
      process.env.SUPABASE_ANON_KEY || dotEnv.SUPABASE_ANON_KEY || '',
    ),
    __WEB_URL__: JSON.stringify(
      process.env.WEB_URL || dotEnv.WEB_URL || 'https://urur.dev',
    ),
  },
})
