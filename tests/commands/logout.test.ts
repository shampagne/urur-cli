import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/lib/auth.js', () => ({
  loadCredentials: vi.fn(),
  clearCredentials: vi.fn(),
}))

import { logout } from '../../src/commands/logout.js'
import { clearCredentials, loadCredentials } from '../../src/lib/auth.js'

describe('logout command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  it('should clear credentials and show success message', async () => {
    vi.mocked(loadCredentials).mockResolvedValue({
      access_token: 'token',
      refresh_token: 'refresh',
      expires_at: Date.now() / 1000 + 3600,
    })

    await logout()

    expect(clearCredentials).toHaveBeenCalled()
    const output = consoleSpy.mock.calls.flat().join('\n')
    expect(output).toContain('ログアウトしました')
  })

  it('should show message when not logged in', async () => {
    vi.mocked(loadCredentials).mockResolvedValue(null)

    await logout()

    expect(clearCredentials).not.toHaveBeenCalled()
    const output = consoleSpy.mock.calls.flat().join('\n')
    expect(output).toContain('ログインしていません')
  })
})
