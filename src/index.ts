import { Command } from 'commander'
import { login } from './commands/login.js'
import { logout } from './commands/logout.js'
import { submit } from './commands/submit.js'
import { whoami } from './commands/whoami.js'

const program = new Command()

program
  .name('urur')
  .description('CLI for urur.dev - 日本の個人開発サービスディレクトリ')
  .version('0.1.0')

program.command('login').description('GitHub OAuthでログイン').action(login)

program
  .command('logout')
  .description('ログアウト（認証情報を削除）')
  .action(logout)

program.command('submit').description('サービスを投稿').action(submit)

program
  .command('whoami')
  .description('ログイン中のユーザー情報を表示')
  .action(whoami)

program.parse()
