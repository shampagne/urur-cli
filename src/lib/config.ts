import os from 'node:os'
import path from 'node:path'

export const CONFIG_DIR = path.join(os.homedir(), '.urur')
export const CREDENTIALS_PATH = path.join(CONFIG_DIR, 'credentials.json')

// tsup の define でビルド時に埋め込まれる
declare const __SUPABASE_URL__: string
declare const __SUPABASE_ANON_KEY__: string
declare const __WEB_URL__: string

export const SUPABASE_URL: string = __SUPABASE_URL__
export const SUPABASE_ANON_KEY: string = __SUPABASE_ANON_KEY__
export const WEB_URL: string = __WEB_URL__
