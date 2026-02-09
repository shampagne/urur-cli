import { Command } from 'commander'
import { login } from './commands/login.js'
import { logout } from './commands/logout.js'
import { submit } from './commands/submit.js'
import { whoami } from './commands/whoami.js'

export function createProgram(): Command {
  const program = new Command()

  program
    .name('urur')
    .description('CLI for urur.dev - 個人開発プロダクトディレクトリ')
    .version('0.1.0')

  program
    .command('login')
    .description('GitHub OAuthでログイン')
    .option('--port <number>', 'コールバック用ポート', '8976')
    .addHelpText(
      'after',
      `
使用例:
  $ urur login
  $ urur login --port 3000

ブラウザが開き、GitHubで認証後、トークンがローカルに保存されます。`,
    )
    .action(login)

  program
    .command('logout')
    .description('ログアウト（認証情報を削除）')
    .addHelpText(
      'after',
      `
~/.urur/credentials.json を削除します。`,
    )
    .action(logout)

  program
    .command('submit')
    .description('プロダクトを投稿')
    .option('--name <name>', 'プロダクト名（必須）')
    .option('--url <url>', 'プロダクトURL（必須）')
    .option('--tagline <text>', 'タグライン（200文字以内）')
    .option('--description <text>', '説明（2000文字以内）')
    .option('--logo-url <url>', 'ロゴURL')
    .option('-i, --interactive', '対話モードで入力')
    .addHelpText(
      'after',
      `
使用例:
  $ urur submit -i
  $ urur submit --name "My App" --url "https://example.com"
  $ urur submit --name "My App" --url "https://example.com" --tagline "便利なツール"

オプション未指定の場合は対話モードで入力します。`,
    )
    .action(submit)

  program
    .command('whoami')
    .description('ログイン中のユーザー情報を表示')
    .addHelpText(
      'after',
      `
GitHubユーザー名とメールアドレスを表示します。
未ログインの場合は "urur login" を実行してください。`,
    )
    .action(whoami)

  return program
}
