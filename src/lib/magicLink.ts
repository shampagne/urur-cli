import { getSupabaseClient } from './supabase.js'

export interface MagicLinkSession {
  accessToken: string
  refreshToken: string
  expiresAt: number
  email: string
}

export async function sendOtp(email: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.auth.signInWithOtp({ email })

  if (error) {
    throw new Error(error.message)
  }
}

export async function verifyOtp(
  email: string,
  token: string,
): Promise<MagicLinkSession> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  })

  if (error) {
    throw new Error(error.message)
  }

  if (!data.session) {
    throw new Error('セッションが取得できませんでした')
  }

  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at ?? 0,
    email: data.session.user?.email ?? email,
  }
}
