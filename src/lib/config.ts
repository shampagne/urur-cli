import os from 'node:os'
import path from 'node:path'

export const CONFIG_DIR = path.join(os.homedir(), '.urur')
export const CREDENTIALS_PATH = path.join(CONFIG_DIR, 'credentials.json')

// TODO: 本番用の値に置き換える
export const SUPABASE_URL = 'https://your-project.supabase.co'
export const SUPABASE_ANON_KEY = 'your-anon-key'
