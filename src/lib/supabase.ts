import { createClient } from '@supabase/supabase-js'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config.js'

export function getSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}
