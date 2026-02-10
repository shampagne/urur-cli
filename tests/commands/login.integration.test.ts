import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Integration tests: mock at edgeFunctionApi/supabase level,
// let deviceFlow/magicLink run real code

vi.mock('open', () => ({
  default: vi.fn(),
}))

vi.mock('ora', () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
  })),
}))

vi.mock('@inquirer/prompts', () => ({
  confirm: vi.fn(),
  select: vi.fn(),
  input: vi.fn(),
}))

vi.mock('../../src/lib/auth.js', () => ({
  loadCredentials: vi.fn(),
  saveCredentials: vi.fn(),
  clearCredentials: vi.fn(),
}))

vi.mock('../../src/lib/supabase.js', () => ({
  getSupabaseClient: vi.fn(),
}))

// Mock at edgeFunctionApi level (NOT deviceFlow/magicLink)
vi.mock('../../src/lib/edgeFunctionApi.js', () => ({
  requestDeviceCode: vi.fn(),
  pollToken: vi.fn(),
}))

import { confirm, input, select } from '@inquirer/prompts'
import { login } from '../../src/commands/login.js'
import { loadCredentials, saveCredentials } from '../../src/lib/auth.js'
import { pollToken, requestDeviceCode } from '../../src/lib/edgeFunctionApi.js'
import { getSupabaseClient } from '../../src/lib/supabase.js'

describe('integration: GitHub Device Flow', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>
  const originalExitCode = process.exitCode

  beforeEach(() => {
    vi.resetAllMocks()
    vi.useFakeTimers()
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    process.exitCode = undefined
    vi.mocked(loadCredentials).mockResolvedValue(null)
    vi.mocked(select).mockResolvedValue('github')
  })

  afterEach(() => {
    vi.useRealTimers()
    process.exitCode = originalExitCode
  })

  it('should complete full GitHub Device Flow with polling', async () => {
    vi.mocked(requestDeviceCode).mockResolvedValue({
      userCode: 'ABCD-EFGH',
      verificationUri: 'https://github.com/login/device',
      expiresIn: 900,
      interval: 5,
      deviceCode: 'device-code-123',
    })

    const session = {
      accessToken: 'access-123',
      refreshToken: 'refresh-456',
      expiresAt: 1700000000,
      userName: 'ghuser',
    }

    vi.mocked(pollToken)
      .mockResolvedValueOnce({ status: 'pending' })
      .mockResolvedValueOnce({ status: 'pending' })
      .mockResolvedValueOnce({ status: 'success', session })

    const loginPromise = login()

    // Advance through 3 polling intervals (5s each)
    await vi.advanceTimersByTimeAsync(5000)
    await vi.advanceTimersByTimeAsync(5000)
    await vi.advanceTimersByTimeAsync(5000)

    await loginPromise

    expect(pollToken).toHaveBeenCalledTimes(3)
    expect(saveCredentials).toHaveBeenCalledWith({
      access_token: 'access-123',
      refresh_token: 'refresh-456',
      expires_at: 1700000000,
    })

    const output = consoleSpy.mock.calls.flat().join('\n')
    expect(output).toContain('ABCD-EFGH')
    expect(output).toContain('ghuser')
  })

  it('should handle slow_down and increase interval', async () => {
    vi.mocked(requestDeviceCode).mockResolvedValue({
      userCode: 'SLOW-DOWN',
      verificationUri: 'https://github.com/login/device',
      expiresIn: 900,
      interval: 5,
      deviceCode: 'device-code-slow',
    })

    const session = {
      accessToken: 'access-slow',
      refreshToken: 'refresh-slow',
      expiresAt: 1700000000,
      userName: 'slowuser',
    }

    vi.mocked(pollToken)
      .mockResolvedValueOnce({ status: 'slow_down' })
      .mockResolvedValueOnce({ status: 'success', session })

    const loginPromise = login()

    // First poll at 5s → slow_down, interval becomes 10s
    await vi.advanceTimersByTimeAsync(5000)
    // Second poll at 10s after slow_down
    await vi.advanceTimersByTimeAsync(10000)

    await loginPromise

    expect(pollToken).toHaveBeenCalledTimes(2)
    expect(saveCredentials).toHaveBeenCalled()
  })

  it('should handle expired token', async () => {
    vi.mocked(requestDeviceCode).mockResolvedValue({
      userCode: 'EXPR-CODE',
      verificationUri: 'https://github.com/login/device',
      expiresIn: 900,
      interval: 5,
      deviceCode: 'device-code-expired',
    })

    vi.mocked(pollToken).mockResolvedValue({ status: 'expired' })

    const loginPromise = login().catch((e: Error) => e)

    await vi.advanceTimersByTimeAsync(5000)

    await loginPromise

    expect(process.exitCode).toBe(1)
    const output = consoleSpy.mock.calls.flat().join('\n')
    expect(output).toContain('有効期限')
  })
})

describe('integration: Magic Link Flow', () => {
  const originalExitCode = process.exitCode

  beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    process.exitCode = undefined
    vi.mocked(loadCredentials).mockResolvedValue(null)
    vi.mocked(select).mockResolvedValue('email')
  })

  afterEach(() => {
    process.exitCode = originalExitCode
  })

  it('should complete full Magic Link flow via Supabase', async () => {
    vi.mocked(input)
      .mockResolvedValueOnce('user@example.com')
      .mockResolvedValueOnce('654321')

    const mockSignInWithOtp = vi.fn().mockResolvedValue({
      data: {},
      error: null,
    })
    const mockVerifyOtp = vi.fn().mockResolvedValue({
      data: {
        session: {
          access_token: 'ml-access',
          refresh_token: 'ml-refresh',
          expires_at: 1700000000,
          user: { email: 'user@example.com' },
        },
      },
      error: null,
    })
    vi.mocked(getSupabaseClient).mockReturnValue({
      auth: {
        signInWithOtp: mockSignInWithOtp,
        verifyOtp: mockVerifyOtp,
      },
      // biome-ignore lint/suspicious/noExplicitAny: Supabase mock
    } as any)

    await login()

    expect(mockSignInWithOtp).toHaveBeenCalledWith({
      email: 'user@example.com',
    })
    expect(mockVerifyOtp).toHaveBeenCalledWith({
      email: 'user@example.com',
      token: '654321',
      type: 'email',
    })
    expect(saveCredentials).toHaveBeenCalledWith({
      access_token: 'ml-access',
      refresh_token: 'ml-refresh',
      expires_at: 1700000000,
    })
  })

  it('should handle OTP failure and resend flow', async () => {
    vi.mocked(input)
      .mockResolvedValueOnce('user@example.com') // email
      .mockResolvedValueOnce('bad1') // OTP attempt 1
      .mockResolvedValueOnce('bad2') // OTP attempt 2
      .mockResolvedValueOnce('bad3') // OTP attempt 3
      .mockResolvedValueOnce('good') // OTP after resend

    const mockSignInWithOtp = vi.fn().mockResolvedValue({
      data: {},
      error: null,
    })
    const mockVerifyOtp = vi
      .fn()
      .mockResolvedValueOnce({
        data: { session: null },
        error: { message: 'Invalid token' },
      })
      .mockResolvedValueOnce({
        data: { session: null },
        error: { message: 'Invalid token' },
      })
      .mockResolvedValueOnce({
        data: { session: null },
        error: { message: 'Invalid token' },
      })
      .mockResolvedValueOnce({
        data: {
          session: {
            access_token: 'ml-access-2',
            refresh_token: 'ml-refresh-2',
            expires_at: 1700000000,
            user: { email: 'user@example.com' },
          },
        },
        error: null,
      })

    vi.mocked(getSupabaseClient).mockReturnValue({
      auth: {
        signInWithOtp: mockSignInWithOtp,
        verifyOtp: mockVerifyOtp,
      },
      // biome-ignore lint/suspicious/noExplicitAny: Supabase mock
    } as any)

    vi.mocked(confirm).mockResolvedValue(true) // resend

    await login()

    expect(mockSignInWithOtp).toHaveBeenCalledTimes(2)
    expect(mockVerifyOtp).toHaveBeenCalledTimes(4)
    expect(saveCredentials).toHaveBeenCalledWith({
      access_token: 'ml-access-2',
      refresh_token: 'ml-refresh-2',
      expires_at: 1700000000,
    })
  })
})
