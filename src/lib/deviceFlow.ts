import {
  type DeviceCodeResponse,
  type DeviceFlowSession,
  pollToken,
  requestDeviceCode,
} from './edgeFunctionApi.js'

export type { DeviceCodeResponse, DeviceFlowSession }

export async function requestCode(): Promise<DeviceCodeResponse> {
  return requestDeviceCode()
}

export async function pollForSession(
  deviceCode: string,
  interval: number,
  expiresIn: number,
): Promise<DeviceFlowSession> {
  let currentInterval = interval
  let elapsed = 0

  while (elapsed < expiresIn) {
    await new Promise((resolve) => setTimeout(resolve, currentInterval * 1000))
    elapsed += currentInterval

    if (elapsed >= expiresIn) {
      break
    }

    const response = await pollToken(deviceCode)

    switch (response.status) {
      case 'success':
        return response.session
      case 'pending':
        continue
      case 'slow_down':
        currentInterval += 5
        continue
      case 'expired':
        throw new Error(
          '認証の有効期限が切れました。再度 urur login を実行してください。',
        )
      case 'error':
        throw new Error(response.message)
    }
  }

  throw new Error(
    '認証がタイムアウトしました。再度 urur login を実行してください。',
  )
}
