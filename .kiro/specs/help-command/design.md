# Design Document: help-command

## Overview

**Purpose**: urur CLIの各コマンドにCommander.jsの詳細ヘルプ（オプション定義・使用例・補足説明）を追加する。このヘルプ定義が各コマンドの実装仕様としても機能する。

**Users**: CLI利用者が `urur --help` や `urur <command> --help` で使い方を確認する。

### Goals
- 全コマンドのオプション・引数をCommander.jsで正式に定義する
- 使用例（`addHelpText`）を各コマンドに追加する
- ヘルプ出力をテストで検証する

### Non-Goals
- コマンドの本格実装（認証フロー、DB操作など）
- カスタムヘルプフォーマッター

## Architecture

### Architecture Pattern & Boundary Map

既存の `src/index.ts` からプログラム生成を `createProgram()` ファクトリ関数として切り出す。テストからも直接インポートできるようにし、ビルド不要でヘルプ出力を検証可能にする。

```
src/index.ts  ← createProgram()をimportしてparse()実行（エントリーポイント）
src/program.ts  ← 新規: createProgram()ファクトリ関数（オプション定義・addHelpText）
src/commands/*.ts  ← 関数シグネチャ更新（options引数追加）
tests/commands/help.test.ts  ← 新規テストファイル
```

**Technology Stack**:

| Layer | Choice / Version | Role | Notes |
|-------|-----------------|------|-------|
| CLI | Commander.js | オプション定義、ヘルプ生成 | `.option()`, `.addHelpText()`, `.configureOutput()` |
| Test | Vitest | ヘルプ出力検証 | `createProgram()` を直接importしてテスト |

## Components and Interfaces

| Component | Intent | Req Coverage |
|-----------|--------|--------------|
| `src/program.ts` | `createProgram()`: コマンド定義にオプション・ヘルプテキスト追加 | 1, 2, 3, 4, 5 |
| `src/index.ts` | エントリーポイント: `createProgram()` + `parse()` | 1 |
| `src/commands/*.ts` | 関数シグネチャにoptions型を追加 | 2, 3, 4, 5 |
| `tests/commands/help.test.ts` | ヘルプ出力の検証テスト | 6 |

### CLI Layer

#### `src/program.ts` — プログラム生成ファクトリ

コマンド定義を `createProgram()` として切り出し、テストから直接インポート可能にする:

```typescript
import { Command } from 'commander'
import { login } from './commands/login.js'
import { logout } from './commands/logout.js'
import { submit } from './commands/submit.js'
import { whoami } from './commands/whoami.js'

export function createProgram(): Command {
  const program = new Command()

  program
    .name('urur')
    .description('CLI for urur.dev - 個人開発サービスディレクトリ')
    .version('0.1.0')

  // login
  program
    .command('login')
    .description('GitHub OAuthでログイン')
    .option('--port <number>', 'コールバック用ポート', '8976')
    .addHelpText('after', `
使用例:
  $ urur login
  $ urur login --port 3000

ブラウザが開き、GitHubで認証後、トークンがローカルに保存されます。`)
    .action(login)

  // submit
  program
    .command('submit')
    .description('サービスを投稿')
    .option('--name <name>', 'サービス名（必須）')
    .option('--url <url>', 'サービスURL（必須）')
    .option('--tagline <text>', 'タグライン（200文字以内）')
    .option('--description <text>', '説明（2000文字以内）')
    .option('--logo-url <url>', 'ロゴURL')
    .option('-i, --interactive', '対話モードで入力')
    .addHelpText('after', `
使用例:
  $ urur submit -i
  $ urur submit --name "My App" --url "https://example.com"
  $ urur submit --name "My App" --url "https://example.com" --tagline "便利なツール"

オプション未指定の場合は対話モードで入力します。`)
    .action(submit)

  // whoami
  program
    .command('whoami')
    .description('ログイン中のユーザー情報を表示')
    .addHelpText('after', `
GitHubユーザー名とメールアドレスを表示します。
未ログインの場合は "urur login" を実行してください。`)
    .action(whoami)

  // logout
  program
    .command('logout')
    .description('ログアウト（認証情報を削除）')
    .addHelpText('after', `
~/.urur/credentials.json を削除します。`)
    .action(logout)

  return program
}
```

#### `src/index.ts` — エントリーポイント

ファクトリ関数を呼び出してCLIを起動するだけの薄いエントリーポイント:

```typescript
import { createProgram } from './program.js'

const program = createProgram()
program.parse()
```

#### `src/commands/*.ts` — シグネチャ更新

```typescript
// login.ts
interface LoginOptions {
  port: string
}
export async function login(options: LoginOptions): Promise<void>

// submit.ts
interface SubmitOptions {
  name?: string
  url?: string
  tagline?: string
  description?: string
  logoUrl?: string
  interactive?: boolean
}
export async function submit(options: SubmitOptions): Promise<void>

// whoami.ts, logout.ts — 変更なし（オプションなし）
```

### Test Layer

#### `tests/commands/help.test.ts`

`createProgram()` を直接インポートし、Commander.jsの `configureOutput()` で出力をキャプチャしてテスト。ビルド不要で高速に実行可能。

```typescript
import { createProgram } from '../../src/program.js'

// ヘルパー: helpテキストをキャプチャする
function captureHelp(args: string[]): string {
  let output = ''
  const program = createProgram()
  program.configureOutput({ writeOut: (str) => { output += str } })
  program.exitOverride() // process.exit()を防止
  try {
    program.parse(['node', 'urur', ...args])
  } catch {
    // Commander.jsはhelpで例外をthrowするが、outputは取得済み
  }
  return output
}

// テスト対象:
// - captureHelp(['--help']) → 4コマンド名が含まれる
// - captureHelp(['login', '--help']) → --port, 使用例
// - captureHelp(['submit', '--help']) → --name, --url, --tagline, --description, --logo-url, -i
// - captureHelp(['whoami', '--help']) → GitHubユーザー名
// - captureHelp(['logout', '--help']) → credentials.json
```

**Note**: ビルド不要。`createProgram()` をTypeScriptから直接インポートしてテストするため、TDDサイクル（RED → GREEN → REFACTOR）が高速に回せる。

## Requirements Traceability

| Requirement | Summary | Components |
|-------------|---------|------------|
| 1 | グローバルヘルプ | `src/program.ts`, `src/index.ts` |
| 2 | login ヘルプ | `src/program.ts`, `src/commands/login.ts` |
| 3 | submit ヘルプ | `src/program.ts`, `src/commands/submit.ts` |
| 4 | whoami ヘルプ | `src/program.ts` |
| 5 | logout ヘルプ | `src/program.ts` |
| 6 | テスト | `tests/commands/help.test.ts` |

## Testing Strategy

### Unit Tests
- `createProgram()` を直接インポートし、`configureOutput()` + `exitOverride()` でヘルプ出力をキャプチャ
- 各コマンドの `--help` 出力にオプション名・使用例が含まれるか検証
- `urur --help` に全4コマンドが含まれるか検証
- ビルド不要: TypeScriptソースを直接テスト（Vitestが処理）
