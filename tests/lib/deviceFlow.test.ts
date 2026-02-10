import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/lib/edgeFunctionApi.js', () => ({
  requestDeviceCode: vi.fn(),
  pollToken: vi.fn(),
}))

import { pollForSession, requestCode } from '../../src/lib/deviceFlow.js'
import { pollToken, requestDeviceCode } from '../../src/lib/edgeFunctionApi.js'

describe('deviceFlow', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('requestCode', () => {
    it('should delegate to requestDeviceCode', async () => {
      const mockResponse = {
        userCode: 'WDJB-MJHT',
        verificationUri: 'https://github.com/login/device',
        expiresIn: 900,
        interval: 5,
        deviceCode: 'device-code-123',
      }
      vi.mocked(requestDeviceCode).mockResolvedValue(mockResponse)

      const result = await requestCode()

      expect(requestDeviceCode).toHaveBeenCalled()
      expect(result).toEqual(mockResponse)
    })
  })

  describe('pollForSession', () => {
    it('should return session on success', async () => {
      const session = {
        accessToken: 'access-123',
        refreshToken: 'refresh-456',
        expiresAt: 1700000000,
        userName: 'testuser',
      }
      vi.mocked(pollToken).mockResolvedValue({ status: 'success', session })

      const resultPromise = pollForSession('device-code-123', 5, 900)
      await vi.advanceTimersByTimeAsync(5000)

      const result = await resultPromise
      expect(result).toEqual(session)
    })

    it('should continue polling on pending', async () => {
      const session = {
        accessToken: 'access-123',
        refreshToken: 'refresh-456',
        expiresAt: 1700000000,
        userName: 'testuser',
      }
      vi.mocked(pollToken)
        .mockResolvedValueOnce({ status: 'pending' })
        .mockResolvedValueOnce({ status: 'pending' })
        .mockResolvedValueOnce({ status: 'success', session })

      const resultPromise = pollForSession('device-code-123', 5, 900)

      // First poll at 5s
      await vi.advanceTimersByTimeAsync(5000)
      // Second poll at 10s
      await vi.advanceTimersByTimeAsync(5000)
      // Third poll at 15s
      await vi.advanceTimersByTimeAsync(5000)

      const result = await resultPromise
      expect(result).toEqual(session)
      expect(pollToken).toHaveBeenCalledTimes(3)
    })

    it('should increase interval on slow_down', async () => {
      const session = {
        accessToken: 'access-123',
        refreshToken: 'refresh-456',
        expiresAt: 1700000000,
        userName: 'testuser',
      }
      vi.mocked(pollToken)
        .mockResolvedValueOnce({ status: 'slow_down' })
        .mockResolvedValueOnce({ status: 'success', session })

      const resultPromise = pollForSession('device-code-123', 5, 900)

      // First poll at 5s → slow_down, interval becomes 10
      await vi.advanceTimersByTimeAsync(5000)
      // Second poll at 5 + 10 = 15s
      await vi.advanceTimersByTimeAsync(10000)

      const result = await resultPromise
      expect(result).toEqual(session)
      expect(pollToken).toHaveBeenCalledTimes(2)
    })

    it('should throw on expired', async () => {
      vi.mocked(pollToken).mockResolvedValue({ status: 'expired' })

      const resultPromise = pollForSession('device-code-123', 5, 900).catch(
        (e: Error) => e,
      )
      await vi.advanceTimersByTimeAsync(5000)

      const error = await resultPromise
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).toBe(
        '認証の有効期限が切れました。再度 urur login を実行してください。',
      )
    })

    it('should throw on error with message', async () => {
      vi.mocked(pollToken).mockResolvedValue({
        status: 'error',
        message: 'ユーザーが認証を拒否しました',
      })

      const resultPromise = pollForSession('device-code-123', 5, 900).catch(
        (e: Error) => e,
      )
      await vi.advanceTimersByTimeAsync(5000)

      const error = await resultPromise
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).toBe('ユーザーが認証を拒否しました')
    })

    it('should throw on timeout (expiresIn exceeded)', async () => {
      vi.mocked(pollToken).mockResolvedValue({ status: 'pending' })

      // expiresIn = 10 seconds, interval = 5
      const resultPromise = pollForSession('device-code-123', 5, 10).catch(
        (e: Error) => e,
      )

      // First poll at 5s → pending
      await vi.advanceTimersByTimeAsync(5000)
      // Second poll at 10s → pending, but expiresIn reached
      await vi.advanceTimersByTimeAsync(5000)

      const error = await resultPromise
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).toBe(
        '認証がタイムアウトしました。再度 urur login を実行してください。',
      )
    })
  })
})
