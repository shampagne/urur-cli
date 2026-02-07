# Technology Stack

## Architecture

**Node.js CLIツール**: Commander.jsベースのCLIアプリケーション。Supabase直接接続でデータアクセスし、GitHub OAuthで認証。npmパッケージとして配布。

## Core Technologies

- **Language**: TypeScript (strict mode)
- **CLI Framework**: Commander.js
- **Runtime**: Node.js 18+
- **Database**: Supabase直接接続（Web側と同じインスタンス）
- **Authentication**: Supabase GitHub OAuth（ブラウザ経由）
- **Build**: tsup (ESM出力)

## Key Libraries

- **commander** - CLI引数・コマンド管理
- **@supabase/supabase-js** (v2.49.1) - データベース操作、認証
- **open** - ブラウザ自動オープン（OAuth用）
- **@inquirer/prompts** - インタラクティブプロンプト
- **picocolors** - ターミナル色付き出力
- **ora** - ローディングスピナー

## Development Standards

### Type Safety
- TypeScript strict mode有効
- `any`型の使用禁止（Biome `noExplicitAny: error`）
- Web側と共有の型定義（`src/lib/types.ts`）

### Code Quality
- ESModule (`"type": "module"`)
- `.js`拡張子付きimport（ESM互換）
- 関数は`async function`でexport

### Testing
- Vitest (Node.js環境)
- TDD必須（RED → GREEN → REFACTOR）
- V8カバレッジ

## Spec-Driven Development Workflow

### 必須レビュープロセス
各フェーズでレビューを必須とし、品質を確保する。

**Requirements → Design**:
- 要件生成後、設計に進む前に要件をレビュー

**Design → Tasks**:
- `/kiro:validate-design {feature}` を**必ず実行**
- GO判定を得てからタスク生成に進む

**Tasks → Implementation**:
- タスクリストをレビューし、抜け漏れがないか確認

## Development Environment

### Required Tools
- Node.js 18+
- npm

### Common Commands
```bash
# Dev: ウォッチモードでビルド
npm run dev

# Build: 本番ビルド
npm run build

# Test: テスト実行
npm run test

# Lint: コード品質チェック
npm run check

# Typecheck: 型チェック
npm run typecheck
```

### Distribution
- npm公開（`npx urur`で実行可能）
- `"bin": { "urur": "./dist/index.js" }`
- shebang付きビルド (`#!/usr/bin/env node`)

---
_Document standards and patterns, not every dependency_
