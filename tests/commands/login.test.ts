import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

vi.mock('../../src/lib/deviceFlow.js', () => ({
  requestCode: vi.fn(),
  pollForSession: vi.fn(),
}))

vi.mock('../../src/lib/magicLink.js', () => ({
  sendOtp: vi.fn(),
  verifyOtp: vi.fn(),
}))

import { confirm, input, select } from '@inquirer/prompts'
import open from 'open'
import { login } from '../../src/commands/login.js'
import {
  clearCredentials,
  loadCredentials,
  saveCredentials,
} from '../../src/lib/auth.js'
import { pollForSession, requestCode } from '../../src/lib/deviceFlow.js'
import { sendOtp, verifyOtp } from '../../src/lib/magicLink.js'
import { getSupabaseClient } from '../../src/lib/supabase.js'

describe('login command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>
  const originalExitCode = process.exitCode

  beforeEach(() => {
    vi.resetAllMocks()
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    process.exitCode = undefined
  })

  afterEach(() => {
    process.exitCode = originalExitCode
  })

  describe('existing login state', () => {
    it('should show re-login prompt when already logged in', async () => {
      vi.mocked(loadCredentials).mockResolvedValue({
        access_token: 'existing-token',
        refresh_token: 'existing-refresh',
        expires_at: Date.now() / 1000 + 3600,
      })

      const mockGetUser = vi.fn().mockResolvedValue({
        data: { user: { user_metadata: { user_name: 'testuser' } } },
        error: null,
      })
      vi.mocked(getSupabaseClient).mockReturnValue({
        auth: {
          getUser: mockGetUser,
          setSession: vi.fn().mockResolvedValue({ error: null }),
        },
        // biome-ignore lint/suspicious/noExplicitAny: Supabase mock
      } as any)

      vi.mocked(confirm).mockResolvedValue(false)

      await login()

      expect(loadCredentials).toHaveBeenCalled()
      expect(confirm).toHaveBeenCalled()
      expect(select).not.toHaveBeenCalled()
    })

    it('should show post-login guide after re-login', async () => {
      vi.mocked(loadCredentials).mockResolvedValue({
        access_token: 'existing-token',
        refresh_token: 'existing-refresh',
        expires_at: Date.now() / 1000 + 3600,
      })

      const mockGetUser = vi.fn().mockResolvedValue({
        data: { user: { user_metadata: { user_name: 'testuser' } } },
        error: null,
      })
      vi.mocked(getSupabaseClient).mockReturnValue({
        auth: {
          getUser: mockGetUser,
          setSession: vi.fn().mockResolvedValue({ error: null }),
        },
        // biome-ignore lint/suspicious/noExplicitAny: Supabase mock
      } as any)

      vi.mocked(confirm).mockResolvedValue(true)
      vi.mocked(select).mockResolvedValue('github')

      vi.mocked(requestCode).mockResolvedValue({
        userCode: 'WDJB-MJHT',
        verificationUri: 'https://github.com/login/device',
        expiresIn: 900,
        interval: 5,
        deviceCode: 'device-code-123',
      })
      vi.mocked(pollForSession).mockResolvedValue({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
        expiresAt: 1700000000,
        userName: 'testuser',
      })

      await login()

      const output = consoleSpy.mock.calls.flat().join('\n')
      expect(output).toContain('urur submit')
    })

    it('should proceed with login method selection when user confirms re-login', async () => {
      vi.mocked(loadCredentials).mockResolvedValue({
        access_token: 'existing-token',
        refresh_token: 'existing-refresh',
        expires_at: Date.now() / 1000 + 3600,
      })

      const mockGetUser = vi.fn().mockResolvedValue({
        data: { user: { user_metadata: { user_name: 'testuser' } } },
        error: null,
      })
      vi.mocked(getSupabaseClient).mockReturnValue({
        auth: {
          getUser: mockGetUser,
          setSession: vi.fn().mockResolvedValue({ error: null }),
        },
        // biome-ignore lint/suspicious/noExplicitAny: Supabase mock
      } as any)

      vi.mocked(confirm).mockResolvedValue(true)
      vi.mocked(select).mockResolvedValue('github')

      const session = {
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
        expiresAt: 1700000000,
        userName: 'testuser',
      }
      vi.mocked(requestCode).mockResolvedValue({
        userCode: 'WDJB-MJHT',
        verificationUri: 'https://github.com/login/device',
        expiresIn: 900,
        interval: 5,
        deviceCode: 'device-code-123',
      })
      vi.mocked(pollForSession).mockResolvedValue(session)

      await login()

      expect(clearCredentials).toHaveBeenCalled()
      expect(select).toHaveBeenCalled()
      expect(saveCredentials).toHaveBeenCalled()
    })
  })

  describe('GitHub Device Flow', () => {
    beforeEach(() => {
      vi.mocked(loadCredentials).mockResolvedValue(null)
      vi.mocked(select).mockResolvedValue('github')
    })

    it('should display user code and open browser', async () => {
      vi.mocked(requestCode).mockResolvedValue({
        userCode: 'WDJB-MJHT',
        verificationUri: 'https://github.com/login/device',
        expiresIn: 900,
        interval: 5,
        deviceCode: 'device-code-123',
      })
      vi.mocked(pollForSession).mockResolvedValue({
        accessToken: 'access-123',
        refreshToken: 'refresh-456',
        expiresAt: 1700000000,
        userName: 'ghuser',
      })

      await login()

      const output = consoleSpy.mock.calls.flat().join('\n')
      expect(output).toContain('WDJB-MJHT')
      expect(open).toHaveBeenCalledWith('https://github.com/login/device')
    })

    it('should save credentials and show username on success', async () => {
      vi.mocked(requestCode).mockResolvedValue({
        userCode: 'ABCD-EFGH',
        verificationUri: 'https://github.com/login/device',
        expiresIn: 900,
        interval: 5,
        deviceCode: 'device-code-123',
      })
      vi.mocked(pollForSession).mockResolvedValue({
        accessToken: 'access-123',
        refreshToken: 'refresh-456',
        expiresAt: 1700000000,
        userName: 'ghuser',
      })

      await login()

      expect(saveCredentials).toHaveBeenCalledWith({
        access_token: 'access-123',
        refresh_token: 'refresh-456',
        expires_at: 1700000000,
      })

      const output = consoleSpy.mock.calls.flat().join('\n')
      expect(output).toContain('ghuser')
    })

    it('should show post-login guide after successful GitHub login', async () => {
      vi.mocked(requestCode).mockResolvedValue({
        userCode: 'ABCD-EFGH',
        verificationUri: 'https://github.com/login/device',
        expiresIn: 900,
        interval: 5,
        deviceCode: 'device-code-123',
      })
      vi.mocked(pollForSession).mockResolvedValue({
        accessToken: 'access-123',
        refreshToken: 'refresh-456',
        expiresAt: 1700000000,
        userName: 'ghuser',
      })

      await login()

      const output = consoleSpy.mock.calls.flat().join('\n')
      expect(output).toContain('urur submit')
      expect(output).toContain('プロダクトを投稿')
    })

    it('should call pollForSession with correct arguments', async () => {
      vi.mocked(requestCode).mockResolvedValue({
        userCode: 'ABCD-EFGH',
        verificationUri: 'https://github.com/login/device',
        expiresIn: 900,
        interval: 5,
        deviceCode: 'device-code-123',
      })
      vi.mocked(pollForSession).mockResolvedValue({
        accessToken: 'access-123',
        refreshToken: 'refresh-456',
        expiresAt: 1700000000,
        userName: 'ghuser',
      })

      await login()

      expect(pollForSession).toHaveBeenCalledWith('device-code-123', 5, 900)
    })

    it('should handle requestCode error', async () => {
      vi.mocked(requestCode).mockRejectedValue(
        new Error('Edge Function エラー: 500'),
      )

      await login()

      expect(process.exitCode).toBe(1)
      const output = consoleSpy.mock.calls.flat().join('\n')
      expect(output).toContain('Edge Function エラー: 500')
    })

    it('should handle pollForSession error', async () => {
      vi.mocked(requestCode).mockResolvedValue({
        userCode: 'ABCD-EFGH',
        verificationUri: 'https://github.com/login/device',
        expiresIn: 900,
        interval: 5,
        deviceCode: 'device-code-123',
      })
      vi.mocked(pollForSession).mockRejectedValue(
        new Error(
          '認証がタイムアウトしました。再度 urur login を実行してください。',
        ),
      )

      await login()

      expect(process.exitCode).toBe(1)
    })
  })

  describe('Magic Link Flow', () => {
    beforeEach(() => {
      vi.mocked(loadCredentials).mockResolvedValue(null)
      vi.mocked(select).mockResolvedValue('email')
    })

    it('should send OTP and verify successfully', async () => {
      vi.mocked(input)
        .mockResolvedValueOnce('test@example.com')
        .mockResolvedValueOnce('123456')
      vi.mocked(verifyOtp).mockResolvedValue({
        accessToken: 'access-123',
        refreshToken: 'refresh-456',
        expiresAt: 1700000000,
        email: 'test@example.com',
      })

      await login()

      expect(sendOtp).toHaveBeenCalledWith('test@example.com')
      expect(verifyOtp).toHaveBeenCalledWith('test@example.com', '123456')
      expect(saveCredentials).toHaveBeenCalledWith({
        access_token: 'access-123',
        refresh_token: 'refresh-456',
        expires_at: 1700000000,
      })

      const output = consoleSpy.mock.calls.flat().join('\n')
      expect(output).toContain('test@example.com')
    })

    it('should show post-login guide after successful Email login', async () => {
      vi.mocked(input)
        .mockResolvedValueOnce('test@example.com')
        .mockResolvedValueOnce('123456')
      vi.mocked(verifyOtp).mockResolvedValue({
        accessToken: 'access-123',
        refreshToken: 'refresh-456',
        expiresAt: 1700000000,
        email: 'test@example.com',
      })

      await login()

      const output = consoleSpy.mock.calls.flat().join('\n')
      expect(output).toContain('urur submit')
      expect(output).toContain('プロダクトを投稿')
    })

    it('should handle sendOtp error', async () => {
      vi.mocked(input).mockResolvedValueOnce('test@example.com')
      vi.mocked(sendOtp).mockRejectedValue(new Error('Rate limit exceeded'))

      await login()

      expect(process.exitCode).toBe(1)
      const output = consoleSpy.mock.calls.flat().join('\n')
      expect(output).toContain('Rate limit exceeded')
    })

    it('should retry OTP verification up to 3 times then offer resend', async () => {
      vi.mocked(input)
        .mockResolvedValueOnce('test@example.com') // email
        .mockResolvedValueOnce('wrong1') // OTP attempt 1
        .mockResolvedValueOnce('wrong2') // OTP attempt 2
        .mockResolvedValueOnce('wrong3') // OTP attempt 3
        .mockResolvedValueOnce('correct') // OTP after resend

      vi.mocked(verifyOtp)
        .mockRejectedValueOnce(new Error('Invalid token'))
        .mockRejectedValueOnce(new Error('Invalid token'))
        .mockRejectedValueOnce(new Error('Invalid token'))
        .mockResolvedValueOnce({
          accessToken: 'access-123',
          refreshToken: 'refresh-456',
          expiresAt: 1700000000,
          email: 'test@example.com',
        })

      vi.mocked(confirm).mockResolvedValue(true) // Yes, resend

      await login()

      expect(sendOtp).toHaveBeenCalledTimes(2) // initial + resend
      expect(verifyOtp).toHaveBeenCalledTimes(4) // 3 failed + 1 success
      expect(saveCredentials).toHaveBeenCalled()
    })

    it('should exit when user declines resend after 3 failures', async () => {
      vi.mocked(input)
        .mockResolvedValueOnce('test@example.com')
        .mockResolvedValueOnce('wrong1')
        .mockResolvedValueOnce('wrong2')
        .mockResolvedValueOnce('wrong3')

      vi.mocked(verifyOtp)
        .mockRejectedValueOnce(new Error('Invalid token'))
        .mockRejectedValueOnce(new Error('Invalid token'))
        .mockRejectedValueOnce(new Error('Invalid token'))

      vi.mocked(confirm).mockResolvedValue(false) // No, don't resend

      await login()

      expect(sendOtp).toHaveBeenCalledTimes(1)
      expect(saveCredentials).not.toHaveBeenCalled()
    })
  })
})
