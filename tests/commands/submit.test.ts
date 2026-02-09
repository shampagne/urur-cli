import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock dependencies before importing submit
vi.mock('ora', () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
  })),
}))

vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
  confirm: vi.fn(),
}))

vi.mock('../../src/lib/auth.js', () => ({
  loadCredentials: vi.fn(),
}))

vi.mock('../../src/lib/supabase.js', () => ({
  getSupabaseClient: vi.fn(),
}))

vi.mock('../../src/lib/validation.js', () => ({
  validateAll: vi.fn(),
  validateName: vi.fn(),
  validateUrl: vi.fn(),
  validateTagline: vi.fn(),
  validateDescription: vi.fn(),
  validateLogoUrl: vi.fn(),
}))

import { confirm, input } from '@inquirer/prompts'
import ora from 'ora'
import { submit } from '../../src/commands/submit.js'
import { loadCredentials } from '../../src/lib/auth.js'
import { getSupabaseClient } from '../../src/lib/supabase.js'
import { validateAll } from '../../src/lib/validation.js'

// Helper to create a mock Supabase client with auth and data methods
function createMockSupabase({
  setSessionError = null,
  getUserData = { id: 'user-123' },
  getUserError = null,
  insertData = { id: 'service-1', name: 'Test App' },
  insertError = null,
}: {
  setSessionError?: { message: string } | null
  getUserData?: { id: string } | null
  getUserError?: { message: string } | null
  insertData?: { id: string; name: string } | null
  insertError?: { message: string } | null
} = {}) {
  const mockSingle = vi.fn().mockResolvedValue({
    data: insertData,
    error: insertError,
  })
  const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
  const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })
  const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert })

  return {
    auth: {
      setSession: vi.fn().mockResolvedValue({ error: setSessionError }),
      getUser: vi.fn().mockResolvedValue({
        data: getUserData ? { user: getUserData } : { user: null },
        error: getUserError,
      }),
    },
    from: mockFrom,
    // biome-ignore lint/suspicious/noExplicitAny: Supabase mock
  } as any
}

describe('submit command', () => {
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

  // Task 2.1: 未認証時のエラーハンドリング
  describe('authentication check', () => {
    it('should show login required message when no credentials', async () => {
      vi.mocked(loadCredentials).mockResolvedValue(null)

      await submit({})

      const output = consoleSpy.mock.calls.flat().join('\n')
      expect(output).toContain('ログインが必要です')
      expect(output).toContain('urur login')
      expect(process.exitCode).toBe(1)
    })

    // Task 2.2: セッション無効時のエラーハンドリング
    it('should show error when session is invalid', async () => {
      vi.mocked(loadCredentials).mockResolvedValue({
        access_token: 'invalid-token',
        refresh_token: 'invalid-refresh',
        expires_at: Date.now() / 1000 + 3600,
      })

      const mockSupabase = createMockSupabase({
        getUserError: { message: 'Invalid token' },
        getUserData: null,
      })
      vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase)

      await submit({})

      const output = consoleSpy.mock.calls.flat().join('\n')
      expect(output).toContain('認証エラー')
      expect(output).toContain('再ログイン')
      expect(process.exitCode).toBe(1)
    })

    it('should show error when getUser returns no user', async () => {
      vi.mocked(loadCredentials).mockResolvedValue({
        access_token: 'token',
        refresh_token: 'refresh',
        expires_at: Date.now() / 1000 + 3600,
      })

      const mockSupabase = createMockSupabase({
        getUserData: null,
      })
      vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase)

      await submit({})

      const output = consoleSpy.mock.calls.flat().join('\n')
      expect(output).toContain('認証エラー')
      expect(process.exitCode).toBe(1)
    })
  })

  // Task 3.1: 対話モード判定
  describe('interactive mode detection', () => {
    it('should use interactive mode when -i flag is set', async () => {
      vi.mocked(loadCredentials).mockResolvedValue({
        access_token: 'token',
        refresh_token: 'refresh',
        expires_at: Date.now() / 1000 + 3600,
      })
      const mockSupabase = createMockSupabase()
      vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase)
      vi.mocked(input).mockResolvedValue('Test App')
      vi.mocked(confirm).mockResolvedValue(false)

      await submit({ interactive: true })

      expect(input).toHaveBeenCalled()
    })

    it('should fallback to interactive mode when name is missing', async () => {
      vi.mocked(loadCredentials).mockResolvedValue({
        access_token: 'token',
        refresh_token: 'refresh',
        expires_at: Date.now() / 1000 + 3600,
      })
      const mockSupabase = createMockSupabase()
      vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase)
      vi.mocked(input).mockResolvedValue('Test App')
      vi.mocked(confirm).mockResolvedValue(false)

      await submit({ url: 'https://example.com' })

      expect(input).toHaveBeenCalled()
    })

    it('should fallback to interactive mode when url is missing', async () => {
      vi.mocked(loadCredentials).mockResolvedValue({
        access_token: 'token',
        refresh_token: 'refresh',
        expires_at: Date.now() / 1000 + 3600,
      })
      const mockSupabase = createMockSupabase()
      vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase)
      vi.mocked(input).mockResolvedValue('https://example.com')
      vi.mocked(confirm).mockResolvedValue(false)

      await submit({ name: 'Test App' })

      expect(input).toHaveBeenCalled()
    })

    it('should use CLI options mode when both name and url are provided', async () => {
      vi.mocked(loadCredentials).mockResolvedValue({
        access_token: 'token',
        refresh_token: 'refresh',
        expires_at: Date.now() / 1000 + 3600,
      })
      const mockSupabase = createMockSupabase()
      vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase)
      vi.mocked(validateAll).mockReturnValue({ valid: true, errors: {} })
      vi.mocked(confirm).mockResolvedValue(false)

      await submit({ name: 'Test App', url: 'https://example.com' })

      expect(input).not.toHaveBeenCalled()
    })
  })

  // Task 3.2: 対話プロンプトでのデータ収集
  describe('interactive prompt data collection', () => {
    it('should prompt for all fields in order', async () => {
      vi.mocked(loadCredentials).mockResolvedValue({
        access_token: 'token',
        refresh_token: 'refresh',
        expires_at: Date.now() / 1000 + 3600,
      })
      const mockSupabase = createMockSupabase()
      vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase)

      vi.mocked(input)
        .mockResolvedValueOnce('My Service')
        .mockResolvedValueOnce('https://myservice.dev')
        .mockResolvedValueOnce('A cool service')
        .mockResolvedValueOnce('Detailed description')
        .mockResolvedValueOnce('https://logo.example.com/logo.png')
      vi.mocked(confirm).mockResolvedValue(false)

      await submit({ interactive: true })

      expect(input).toHaveBeenCalledTimes(5)
      // Verify prompts have validate callbacks
      const calls = vi.mocked(input).mock.calls
      for (const call of calls) {
        expect(call[0]).toHaveProperty('message')
      }
    })
  })

  // Task 3.3: CLIオプションからのデータ構築
  describe('CLI option data construction', () => {
    it('should include optional fields when provided', async () => {
      vi.mocked(loadCredentials).mockResolvedValue({
        access_token: 'token',
        refresh_token: 'refresh',
        expires_at: Date.now() / 1000 + 3600,
      })
      const mockSupabase = createMockSupabase()
      vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase)
      vi.mocked(validateAll).mockReturnValue({ valid: true, errors: {} })
      vi.mocked(confirm).mockResolvedValue(true)

      await submit({
        name: 'Test App',
        url: 'https://example.com',
        tagline: 'A great app',
        description: 'Full description',
        logoUrl: 'https://logo.example.com/img.png',
      })

      // Verify insert was called with all fields including source
      const insertCall =
        mockSupabase.from.mock.results[0].value.insert.mock.calls[0][0]
      expect(insertCall).toMatchObject({
        name: 'Test App',
        url: 'https://example.com',
        tagline: 'A great app',
        description: 'Full description',
        logo_url: 'https://logo.example.com/img.png',
        user_id: 'user-123',
        source: 'cli',
      })
    })
  })

  // Task 4.1: バリデーションとエラー表示
  describe('validation', () => {
    it('should validate with validateAll in CLI mode', async () => {
      vi.mocked(loadCredentials).mockResolvedValue({
        access_token: 'token',
        refresh_token: 'refresh',
        expires_at: Date.now() / 1000 + 3600,
      })
      const mockSupabase = createMockSupabase()
      vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase)
      vi.mocked(validateAll).mockReturnValue({
        valid: false,
        errors: {
          name: 'プロダクト名は必須です',
          url: 'URLは必須です',
        },
      })

      await submit({ name: 'x', url: 'invalid' })

      expect(validateAll).toHaveBeenCalled()
      const output = consoleSpy.mock.calls.flat().join('\n')
      expect(output).toContain('プロダクト名は必須です')
      expect(output).toContain('URLは必須です')
      expect(process.exitCode).toBe(1)
    })

    it('should not proceed to insert when validation fails', async () => {
      vi.mocked(loadCredentials).mockResolvedValue({
        access_token: 'token',
        refresh_token: 'refresh',
        expires_at: Date.now() / 1000 + 3600,
      })
      const mockSupabase = createMockSupabase()
      vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase)
      vi.mocked(validateAll).mockReturnValue({
        valid: false,
        errors: { name: 'error' },
      })

      await submit({ name: 'x', url: 'y' })

      expect(mockSupabase.from).not.toHaveBeenCalled()
    })
  })

  // Task 5.1: 投稿前確認
  describe('confirmation prompt', () => {
    it('should display summary and ask for confirmation', async () => {
      vi.mocked(loadCredentials).mockResolvedValue({
        access_token: 'token',
        refresh_token: 'refresh',
        expires_at: Date.now() / 1000 + 3600,
      })
      const mockSupabase = createMockSupabase()
      vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase)
      vi.mocked(validateAll).mockReturnValue({ valid: true, errors: {} })
      vi.mocked(confirm).mockResolvedValue(true)

      await submit({ name: 'Test App', url: 'https://example.com' })

      const output = consoleSpy.mock.calls.flat().join('\n')
      expect(output).toContain('Test App')
      expect(output).toContain('https://example.com')
      expect(confirm).toHaveBeenCalled()
    })

    it('should cancel when user declines confirmation', async () => {
      vi.mocked(loadCredentials).mockResolvedValue({
        access_token: 'token',
        refresh_token: 'refresh',
        expires_at: Date.now() / 1000 + 3600,
      })
      const mockSupabase = createMockSupabase()
      vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase)
      vi.mocked(validateAll).mockReturnValue({ valid: true, errors: {} })
      vi.mocked(confirm).mockResolvedValue(false)

      await submit({ name: 'Test App', url: 'https://example.com' })

      const output = consoleSpy.mock.calls.flat().join('\n')
      expect(output).toContain('キャンセル')
      expect(mockSupabase.from).not.toHaveBeenCalled()
      expect(process.exitCode).toBeUndefined()
    })
  })

  // Task 5.2: Supabaseへの投稿
  describe('service submission', () => {
    it('should insert service and show success message', async () => {
      vi.mocked(loadCredentials).mockResolvedValue({
        access_token: 'token',
        refresh_token: 'refresh',
        expires_at: Date.now() / 1000 + 3600,
      })
      const mockSupabase = createMockSupabase({
        insertData: { id: 'svc-1', name: 'Test App' },
      })
      vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase)
      vi.mocked(validateAll).mockReturnValue({ valid: true, errors: {} })
      vi.mocked(confirm).mockResolvedValue(true)

      await submit({ name: 'Test App', url: 'https://example.com' })

      expect(mockSupabase.from).toHaveBeenCalledWith('services')
      const output = consoleSpy.mock.calls.flat().join('\n')
      expect(output).toContain('Test App')
      expect(process.exitCode).toBeUndefined()
    })

    it('should include source: cli in insert data', async () => {
      vi.mocked(loadCredentials).mockResolvedValue({
        access_token: 'token',
        refresh_token: 'refresh',
        expires_at: Date.now() / 1000 + 3600,
      })
      const mockSupabase = createMockSupabase()
      vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase)
      vi.mocked(validateAll).mockReturnValue({ valid: true, errors: {} })
      vi.mocked(confirm).mockResolvedValue(true)

      await submit({ name: 'Test App', url: 'https://example.com' })

      const insertCall =
        mockSupabase.from.mock.results[0].value.insert.mock.calls[0][0]
      expect(insertCall.source).toBe('cli')
    })

    it('should show error when insert fails', async () => {
      vi.mocked(loadCredentials).mockResolvedValue({
        access_token: 'token',
        refresh_token: 'refresh',
        expires_at: Date.now() / 1000 + 3600,
      })
      const mockSupabase = createMockSupabase({
        insertError: { message: 'RLS policy violation' },
        insertData: null,
      })
      vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase)
      vi.mocked(validateAll).mockReturnValue({ valid: true, errors: {} })
      vi.mocked(confirm).mockResolvedValue(true)

      await submit({ name: 'Test App', url: 'https://example.com' })

      const output = consoleSpy.mock.calls.flat().join('\n')
      expect(output).toContain('投稿エラー')
      expect(output).toContain('RLS policy violation')
      expect(process.exitCode).toBe(1)
    })

    it('should show spinner during submission', async () => {
      vi.mocked(loadCredentials).mockResolvedValue({
        access_token: 'token',
        refresh_token: 'refresh',
        expires_at: Date.now() / 1000 + 3600,
      })
      const mockSupabase = createMockSupabase()
      vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase)
      vi.mocked(validateAll).mockReturnValue({ valid: true, errors: {} })
      vi.mocked(confirm).mockResolvedValue(true)

      await submit({ name: 'Test App', url: 'https://example.com' })

      expect(ora).toHaveBeenCalled()
    })
  })

  // Task 6.1: 統合テスト
  describe('end-to-end flow', () => {
    it('should complete CLI options flow: auth → validate → confirm → insert', async () => {
      vi.mocked(loadCredentials).mockResolvedValue({
        access_token: 'token',
        refresh_token: 'refresh',
        expires_at: Date.now() / 1000 + 3600,
      })
      const mockSupabase = createMockSupabase({
        insertData: { id: 'svc-new', name: 'My App' },
      })
      vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase)
      vi.mocked(validateAll).mockReturnValue({ valid: true, errors: {} })
      vi.mocked(confirm).mockResolvedValue(true)

      await submit({
        name: 'My App',
        url: 'https://myapp.dev',
        tagline: 'Best app ever',
      })

      // Auth
      expect(loadCredentials).toHaveBeenCalled()
      expect(mockSupabase.auth.setSession).toHaveBeenCalled()
      expect(mockSupabase.auth.getUser).toHaveBeenCalled()
      // Validate
      expect(validateAll).toHaveBeenCalled()
      // Confirm
      expect(confirm).toHaveBeenCalled()
      // Insert
      expect(mockSupabase.from).toHaveBeenCalledWith('services')
      // No error
      expect(process.exitCode).toBeUndefined()
    })

    it('should complete interactive flow: auth → prompt → confirm → insert', async () => {
      vi.mocked(loadCredentials).mockResolvedValue({
        access_token: 'token',
        refresh_token: 'refresh',
        expires_at: Date.now() / 1000 + 3600,
      })
      const mockSupabase = createMockSupabase({
        insertData: { id: 'svc-int', name: 'Interactive App' },
      })
      vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase)

      vi.mocked(input)
        .mockResolvedValueOnce('Interactive App')
        .mockResolvedValueOnce('https://interactive.dev')
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('')
      vi.mocked(confirm).mockResolvedValue(true)

      await submit({ interactive: true })

      // Auth
      expect(loadCredentials).toHaveBeenCalled()
      // Prompt
      expect(input).toHaveBeenCalledTimes(5)
      // No validateAll in interactive mode
      expect(validateAll).not.toHaveBeenCalled()
      // Confirm
      expect(confirm).toHaveBeenCalled()
      // Insert
      expect(mockSupabase.from).toHaveBeenCalledWith('services')
      expect(process.exitCode).toBeUndefined()
    })
  })
})
