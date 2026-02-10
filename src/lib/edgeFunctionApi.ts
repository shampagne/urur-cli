import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config.js'

export interface DeviceCodeResponse {
  userCode: string
  verificationUri: string
  expiresIn: number
  interval: number
  deviceCode: string
}

export interface DeviceFlowSession {
  accessToken: string
  refreshToken: string
  expiresAt: number
  userName: string
}

export type PollTokenResponse =
  | { status: 'pending' }
  | { status: 'slow_down' }
  | { status: 'expired' }
  | { status: 'success'; session: DeviceFlowSession }
  | { status: 'error'; message: string }

const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/cli-auth`

function buildHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  }
}

export async function requestDeviceCode(): Promise<DeviceCodeResponse> {
  const res = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ action: 'device-code' }),
  })

  if (!res.ok) {
    throw new Error(`Edge Function エラー: ${res.status}`)
  }

  return res.json()
}

export async function pollToken(
  deviceCode: string,
): Promise<PollTokenResponse> {
  const res = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ action: 'poll-token', deviceCode }),
  })

  if (!res.ok) {
    throw new Error(`Edge Function エラー: ${res.status}`)
  }

  return res.json()
}
