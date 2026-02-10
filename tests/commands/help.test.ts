import { describe, expect, it } from 'vitest'
import { createProgram } from '../../src/program.js'

function captureHelp(args: string[]): string {
  let output = ''
  const program = createProgram()
  program.configureOutput({
    writeOut: (str) => {
      output += str
    },
  })
  program.exitOverride()
  try {
    program.parse(['node', 'urur', ...args])
  } catch {
    // Commander.js throws on --help after writing output
  }
  return output
}

describe('グローバルヘルプ', () => {
  it('should display CLI description', () => {
    const output = captureHelp(['--help'])
    expect(output).toContain(
      'CLI for urur.dev - 個人開発プロダクトディレクトリ',
    )
  })

  it('should list all 4 commands', () => {
    const output = captureHelp(['--help'])
    expect(output).toContain('login')
    expect(output).toContain('logout')
    expect(output).toContain('submit')
    expect(output).toContain('whoami')
  })

  it('should display Japanese descriptions for each command', () => {
    const output = captureHelp(['--help'])
    expect(output).toContain('GitHubまたはメールアドレスでログイン')
    expect(output).toContain('ログアウト（認証情報を削除）')
    expect(output).toContain('プロダクトを投稿')
    expect(output).toContain('ログイン中のユーザー情報を表示')
  })
})

describe('login --help', () => {
  it('should display usage example', () => {
    const output = captureHelp(['login', '--help'])
    expect(output).toContain('urur login')
  })

  it('should describe auth methods', () => {
    const output = captureHelp(['login', '--help'])
    expect(output).toContain('GitHub Device Flow')
    expect(output).toContain('Magic Link')
  })
})

describe('submit --help', () => {
  it('should display all options', () => {
    const output = captureHelp(['submit', '--help'])
    expect(output).toContain('--name')
    expect(output).toContain('--url')
    expect(output).toContain('--tagline')
    expect(output).toContain('--description')
    expect(output).toContain('--logo-url')
    expect(output).toContain('-i, --interactive')
  })

  it('should display usage examples', () => {
    const output = captureHelp(['submit', '--help'])
    expect(output).toContain('urur submit -i')
    expect(output).toContain(
      'urur submit --name "My App" --url "https://example.com"',
    )
  })

  it('should mention interactive fallback', () => {
    const output = captureHelp(['submit', '--help'])
    expect(output).toContain('対話モード')
  })
})

describe('whoami --help', () => {
  it('should mention GitHub username and email', () => {
    const output = captureHelp(['whoami', '--help'])
    expect(output).toContain('GitHubユーザー名')
    expect(output).toContain('メールアドレス')
  })

  it('should mention guidance for unauthenticated users', () => {
    const output = captureHelp(['whoami', '--help'])
    expect(output).toContain('urur login')
  })
})

describe('logout --help', () => {
  it('should mention credentials.json deletion', () => {
    const output = captureHelp(['logout', '--help'])
    expect(output).toContain('credentials.json')
  })
})
