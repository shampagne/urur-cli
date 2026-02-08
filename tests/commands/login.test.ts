import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock dependencies before importing login
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
}))

vi.mock('../../src/lib/auth.js', () => ({
  loadCredentials: vi.fn(),
  saveCredentials: vi.fn(),
  clearCredentials: vi.fn(),
}))

vi.mock('../../src/lib/supabase.js', () => ({
  getSupabaseClient: vi.fn(),
}))

vi.mock('../../src/lib/oauthServer.js', () => ({
  createOAuthServer: vi.fn(),
  OAuthServerError: class OAuthServerError extends Error {
    type: string
    constructor(type: string, message: string) {
      super(message)
      this.type = type
      this.name = 'OAuthServerError'
    }
  },
}))

import { confirm } from '@inquirer/prompts'
import open from 'open'
import { login } from '../../src/commands/login.js'
import {
  clearCredentials,
  loadCredentials,
  saveCredentials,
} from '../../src/lib/auth.js'
import {
  createOAuthServer,
  OAuthServerError,
} from '../../src/lib/oauthServer.js'
import { getSupabaseClient } from '../../src/lib/supabase.js'

describe('login command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>
  const originalExitCode = process.exitCode

  beforeEach(() => {
    vi.clearAllMocks()
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

      // Mock Supabase getUser to return user info
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

      await login({ port: '8976' })

      expect(loadCredentials).toHaveBeenCalled()
      expect(confirm).toHaveBeenCalled()
      // User cancelled re-login, should exit without starting OAuth
      expect(open).not.toHaveBeenCalled()
    })

    it('should proceed with OAuth when user confirms re-login', async () => {
      vi.mocked(loadCredentials).mockResolvedValue({
        access_token: 'existing-token',
        refresh_token: 'existing-refresh',
        expires_at: Date.now() / 1000 + 3600,
      })

      const mockGetUser = vi.fn().mockResolvedValue({
        data: { user: { user_metadata: { user_name: 'testuser' } } },
        error: null,
      })
      const mockSetSession = vi.fn().mockResolvedValue({ error: null })
      const mockSignInWithOAuth = vi.fn().mockResolvedValue({
        data: { url: 'https://supabase.example.com/oauth' },
        error: null,
      })
      const mockExchangeCode = vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'new-access',
            refresh_token: 'new-refresh',
            expires_at: Date.now() / 1000 + 3600,
            user: { user_metadata: { user_name: 'testuser' } },
          },
        },
        error: null,
      })

      vi.mocked(getSupabaseClient).mockReturnValue({
        auth: {
          getUser: mockGetUser,
          setSession: mockSetSession,
          signInWithOAuth: mockSignInWithOAuth,
          exchangeCodeForSession: mockExchangeCode,
        },
        // biome-ignore lint/suspicious/noExplicitAny: Supabase mock
      } as any)

      vi.mocked(confirm).mockResolvedValue(true)

      const mockWaitForCallback = vi
        .fn()
        .mockResolvedValue({ code: 'auth-code' })
      const mockClose = vi.fn()
      vi.mocked(createOAuthServer).mockReturnValue({
        waitForCallback: mockWaitForCallback,
        close: mockClose,
      })

      await login({ port: '8976' })

      expect(clearCredentials).toHaveBeenCalled()
      expect(open).toHaveBeenCalled()
      expect(saveCredentials).toHaveBeenCalled()
    })

    it('should start OAuth flow when no existing credentials', async () => {
      vi.mocked(loadCredentials).mockResolvedValue(null)

      const mockSignInWithOAuth = vi.fn().mockResolvedValue({
        data: { url: 'https://supabase.example.com/oauth' },
        error: null,
      })
      const mockExchangeCode = vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'new-access',
            refresh_token: 'new-refresh',
            expires_at: Date.now() / 1000 + 3600,
            user: { user_metadata: { user_name: 'newuser' } },
          },
        },
        error: null,
      })

      vi.mocked(getSupabaseClient).mockReturnValue({
        auth: {
          signInWithOAuth: mockSignInWithOAuth,
          exchangeCodeForSession: mockExchangeCode,
        },
        // biome-ignore lint/suspicious/noExplicitAny: Supabase mock
      } as any)

      const mockWaitForCallback = vi
        .fn()
        .mockResolvedValue({ code: 'auth-code' })
      const mockClose = vi.fn()
      vi.mocked(createOAuthServer).mockReturnValue({
        waitForCallback: mockWaitForCallback,
        close: mockClose,
      })

      await login({ port: '8976' })

      expect(confirm).not.toHaveBeenCalled()
      expect(open).toHaveBeenCalled()
      // Should open consent page URL, not direct OAuth URL
      const openedUrl = vi.mocked(open).mock.calls[0][0] as string
      expect(openedUrl).toContain('http://localhost:5173/cli/consent')
      expect(openedUrl).toContain(
        `oauth_url=${encodeURIComponent('https://supabase.example.com/oauth')}`,
      )
      expect(openedUrl).toContain(
        `redirect_uri=${encodeURIComponent('http://127.0.0.1:8976/callback')}`,
      )
      expect(saveCredentials).toHaveBeenCalledWith(
        expect.objectContaining({
          access_token: 'new-access',
          refresh_token: 'new-refresh',
        }),
      )
    })
  })

  describe('OAuth flow', () => {
    it('should save credentials and show username on success', async () => {
      vi.mocked(loadCredentials).mockResolvedValue(null)

      const mockSignInWithOAuth = vi.fn().mockResolvedValue({
        data: { url: 'https://supabase.example.com/oauth' },
        error: null,
      })
      const expiresAt = Math.floor(Date.now() / 1000) + 3600
      const mockExchangeCode = vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'access-123',
            refresh_token: 'refresh-456',
            expires_at: expiresAt,
            user: { user_metadata: { user_name: 'ghuser' } },
          },
        },
        error: null,
      })

      vi.mocked(getSupabaseClient).mockReturnValue({
        auth: {
          signInWithOAuth: mockSignInWithOAuth,
          exchangeCodeForSession: mockExchangeCode,
        },
        // biome-ignore lint/suspicious/noExplicitAny: Supabase mock
      } as any)

      const mockWaitForCallback = vi
        .fn()
        .mockResolvedValue({ code: 'code-xyz' })
      const mockClose = vi.fn()
      vi.mocked(createOAuthServer).mockReturnValue({
        waitForCallback: mockWaitForCallback,
        close: mockClose,
      })

      await login({ port: '8976' })

      expect(saveCredentials).toHaveBeenCalledWith({
        access_token: 'access-123',
        refresh_token: 'refresh-456',
        expires_at: expiresAt,
      })

      // Should display username
      const output = consoleSpy.mock.calls.flat().join('\n')
      expect(output).toContain('ghuser')
    })

    it('should use custom port when specified', async () => {
      vi.mocked(loadCredentials).mockResolvedValue(null)

      const mockSignInWithOAuth = vi.fn().mockResolvedValue({
        data: { url: 'https://supabase.example.com/oauth' },
        error: null,
      })
      const mockExchangeCode = vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'a',
            refresh_token: 'r',
            expires_at: 9999999999,
            user: { user_metadata: { user_name: 'user' } },
          },
        },
        error: null,
      })

      vi.mocked(getSupabaseClient).mockReturnValue({
        auth: {
          signInWithOAuth: mockSignInWithOAuth,
          exchangeCodeForSession: mockExchangeCode,
        },
        // biome-ignore lint/suspicious/noExplicitAny: Supabase mock
      } as any)

      const mockWaitForCallback = vi.fn().mockResolvedValue({ code: 'c' })
      const mockClose = vi.fn()
      vi.mocked(createOAuthServer).mockReturnValue({
        waitForCallback: mockWaitForCallback,
        close: mockClose,
      })

      await login({ port: '3000' })

      expect(mockWaitForCallback).toHaveBeenCalledWith(3000, expect.any(Number))
      expect(mockSignInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            redirectTo: expect.stringContaining('3000'),
          }),
        }),
      )
      // Should include custom port in consent page redirect_uri parameter
      const openedUrl = vi.mocked(open).mock.calls[0][0] as string
      expect(openedUrl).toContain(
        `redirect_uri=${encodeURIComponent('http://127.0.0.1:3000/callback')}`,
      )
    })
  })

  describe('error handling', () => {
    it('should handle OAuth server error (PORT_IN_USE)', async () => {
      vi.mocked(loadCredentials).mockResolvedValue(null)

      vi.mocked(getSupabaseClient).mockReturnValue({
        auth: {
          signInWithOAuth: vi.fn().mockResolvedValue({
            data: { url: 'https://example.com/oauth' },
            error: null,
          }),
        },
        // biome-ignore lint/suspicious/noExplicitAny: Supabase mock
      } as any)

      const mockWaitForCallback = vi
        .fn()
        .mockRejectedValue(
          new OAuthServerError('PORT_IN_USE', 'ポート 8976 は既に使用中です。'),
        )
      vi.mocked(createOAuthServer).mockReturnValue({
        waitForCallback: mockWaitForCallback,
        close: vi.fn(),
      })

      await login({ port: '8976' })

      expect(process.exitCode).toBe(1)
    })

    it('should handle OAuth signIn error', async () => {
      vi.mocked(loadCredentials).mockResolvedValue(null)

      vi.mocked(getSupabaseClient).mockReturnValue({
        auth: {
          signInWithOAuth: vi.fn().mockResolvedValue({
            data: { url: null },
            error: { message: 'OAuth error' },
          }),
        },
        // biome-ignore lint/suspicious/noExplicitAny: Supabase mock
      } as any)

      await login({ port: '8976' })

      expect(process.exitCode).toBe(1)
    })
  })
})
