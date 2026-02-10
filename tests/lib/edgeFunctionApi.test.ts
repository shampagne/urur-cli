import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/lib/config.js', () => ({
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
}))

import { pollToken, requestDeviceCode } from '../../src/lib/edgeFunctionApi.js'

describe('edgeFunctionApi', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('requestDeviceCode', () => {
    it('should send correct request and return device code response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            userCode: 'WDJB-MJHT',
            verificationUri: 'https://github.com/login/device',
            expiresIn: 900,
            interval: 5,
            deviceCode: 'device-code-123',
          }),
      })

      const result = await requestDeviceCode()

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.supabase.co/functions/v1/cli-auth',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-anon-key',
          },
          body: JSON.stringify({ action: 'device-code' }),
        },
      )
      expect(result).toEqual({
        userCode: 'WDJB-MJHT',
        verificationUri: 'https://github.com/login/device',
        expiresIn: 900,
        interval: 5,
        deviceCode: 'device-code-123',
      })
    })

    it('should throw on HTTP error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      await expect(requestDeviceCode()).rejects.toThrow(
        'Edge Function エラー: 500',
      )
    })

    it('should throw on network error', async () => {
      mockFetch.mockRejectedValue(new Error('fetch failed'))

      await expect(requestDeviceCode()).rejects.toThrow('fetch failed')
    })
  })

  describe('pollToken', () => {
    it('should return pending status', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'pending' }),
      })

      const result = await pollToken('device-code-123')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.supabase.co/functions/v1/cli-auth',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-anon-key',
          },
          body: JSON.stringify({
            action: 'poll-token',
            deviceCode: 'device-code-123',
          }),
        },
      )
      expect(result).toEqual({ status: 'pending' })
    })

    it('should return slow_down status', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'slow_down' }),
      })

      const result = await pollToken('device-code-123')
      expect(result).toEqual({ status: 'slow_down' })
    })

    it('should return expired status', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'expired' }),
      })

      const result = await pollToken('device-code-123')
      expect(result).toEqual({ status: 'expired' })
    })

    it('should return success with session', async () => {
      const session = {
        accessToken: 'access-123',
        refreshToken: 'refresh-456',
        expiresAt: 1700000000,
        userName: 'testuser',
      }
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'success', session }),
      })

      const result = await pollToken('device-code-123')
      expect(result).toEqual({ status: 'success', session })
    })

    it('should return error with message', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ status: 'error', message: 'Something went wrong' }),
      })

      const result = await pollToken('device-code-123')
      expect(result).toEqual({
        status: 'error',
        message: 'Something went wrong',
      })
    })

    it('should throw on HTTP error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      await expect(pollToken('device-code-123')).rejects.toThrow(
        'Edge Function エラー: 500',
      )
    })
  })
})
