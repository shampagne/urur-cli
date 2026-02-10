import { readFileSync } from 'node:fs'
import { defineConfig } from 'tsup'

function loadDotEnv(filePath: string): Record<string, string> {
  try {
    const content = readFileSync(filePath, 'utf-8')
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

const dotEnv = { ...loadDotEnv('.env'), ...loadDotEnv('.env.production') }

const supabaseUrl = process.env.SUPABASE_URL || dotEnv.SUPABASE_URL || ''
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY || dotEnv.SUPABASE_ANON_KEY || ''

if (process.env.npm_lifecycle_event === 'prepublishOnly') {
  if (!supabaseUrl || supabaseUrl.includes('127.0.0.1')) {
    console.warn(
      '\x1b[33m⚠ SUPABASE_URL is missing or points to localhost. Set production URL before publishing.\x1b[0m',
    )
    process.exit(1)
  }
  if (!supabaseAnonKey || supabaseAnonKey === 'your-anon-key') {
    console.warn(
      '\x1b[33m⚠ SUPABASE_ANON_KEY is missing or placeholder. Set production key before publishing.\x1b[0m',
    )
    process.exit(1)
  }
}

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
    __SUPABASE_URL__: JSON.stringify(supabaseUrl),
    __SUPABASE_ANON_KEY__: JSON.stringify(supabaseAnonKey),
    __WEB_URL__: JSON.stringify(
      process.env.WEB_URL || dotEnv.WEB_URL || 'https://urur.dev',
    ),
  },
})
