import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/lib/supabase.js', () => ({
  getSupabaseClient: vi.fn(),
}))

import { sendOtp, verifyOtp } from '../../src/lib/magicLink.js'
import { getSupabaseClient } from '../../src/lib/supabase.js'

describe('magicLink', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('sendOtp', () => {
    it('should call signInWithOtp with email', async () => {
      const mockSignInWithOtp = vi.fn().mockResolvedValue({
        data: {},
        error: null,
      })
      vi.mocked(getSupabaseClient).mockReturnValue({
        auth: { signInWithOtp: mockSignInWithOtp },
        // biome-ignore lint/suspicious/noExplicitAny: Supabase mock
      } as any)

      await sendOtp('test@example.com')

      expect(mockSignInWithOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
      })
    })

    it('should throw on Supabase error', async () => {
      const mockSignInWithOtp = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Rate limit exceeded' },
      })
      vi.mocked(getSupabaseClient).mockReturnValue({
        auth: { signInWithOtp: mockSignInWithOtp },
        // biome-ignore lint/suspicious/noExplicitAny: Supabase mock
      } as any)

      await expect(sendOtp('test@example.com')).rejects.toThrow(
        'Rate limit exceeded',
      )
    })
  })

  describe('verifyOtp', () => {
    it('should return MagicLinkSession on success', async () => {
      const mockVerifyOtp = vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'access-123',
            refresh_token: 'refresh-456',
            expires_at: 1700000000,
            user: { email: 'test@example.com' },
          },
        },
        error: null,
      })
      vi.mocked(getSupabaseClient).mockReturnValue({
        auth: { verifyOtp: mockVerifyOtp },
        // biome-ignore lint/suspicious/noExplicitAny: Supabase mock
      } as any)

      const result = await verifyOtp('test@example.com', '123456')

      expect(mockVerifyOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        token: '123456',
        type: 'email',
      })
      expect(result).toEqual({
        accessToken: 'access-123',
        refreshToken: 'refresh-456',
        expiresAt: 1700000000,
        email: 'test@example.com',
      })
    })

    it('should throw on Supabase error', async () => {
      const mockVerifyOtp = vi.fn().mockResolvedValue({
        data: { session: null },
        error: { message: 'Token has expired or is invalid' },
      })
      vi.mocked(getSupabaseClient).mockReturnValue({
        auth: { verifyOtp: mockVerifyOtp },
        // biome-ignore lint/suspicious/noExplicitAny: Supabase mock
      } as any)

      await expect(verifyOtp('test@example.com', 'wrong')).rejects.toThrow(
        'Token has expired or is invalid',
      )
    })

    it('should throw when session is null', async () => {
      const mockVerifyOtp = vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      })
      vi.mocked(getSupabaseClient).mockReturnValue({
        auth: { verifyOtp: mockVerifyOtp },
        // biome-ignore lint/suspicious/noExplicitAny: Supabase mock
      } as any)

      await expect(verifyOtp('test@example.com', '123456')).rejects.toThrow(
        'セッションが取得できませんでした',
      )
    })
  })
})
