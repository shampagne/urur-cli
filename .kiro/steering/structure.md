# Project Structure

## Organization Philosophy

**Command-based architecture with shared utilities**: 1コマンド1ファイルの構成。共通ロジックは`src/lib/`に集約し、エントリーポイント（`src/index.ts`）でCommander.jsにコマンドを登録。

## Directory Patterns

### Commands (`src/commands/`)
**Location**: `/src/commands/`
**Purpose**: 各CLIコマンドの実装。1ファイル1コマンド。
**Example**:
- `login.ts` → `urur login`
- `logout.ts` → `urur logout`
- `submit.ts` → `urur submit`
- `whoami.ts` → `urur whoami`

**Conventions**:
- `async function`をdefault exportまたはnamed export
- コマンド固有のロジックのみ含む
- 共通処理は`src/lib/`に委譲

### Shared Libraries (`src/lib/`)
**Location**: `/src/lib/`
**Purpose**: コマンド間で共有されるユーティリティ、設定、認証ロジック
**Example**:
- `config.ts` - 設定パス・環境変数
- `auth.ts` - 認証トークンの読み書き
- `supabase.ts` - Supabaseクライアント初期化
- `validation.ts` - バリデーション関数（Web側と共有）
- `types.ts` - 型定義（Web側と共有）

**Conventions**:
- 各ファイルは単一責任
- 型定義は`types.ts`に集約
- バリデーションは`validation.ts`でWeb側と同一ロジック

### Tests (`tests/`)
**Location**: `/tests/`
**Purpose**: テストファイル。ソース構造をミラーリング。
**Example**:
- `tests/lib/validation.test.ts`
- `tests/commands/login.test.ts`

### Entry Point (`src/index.ts`)
**Purpose**: Commander.jsでコマンド登録、CLIのエントリーポイント
**Conventions**:
- コマンド定義のみ
- ビジネスロジックは含まない

## Naming Conventions

- **Files**: camelCase (`validation.ts`, `supabase.ts`)
- **Functions**: camelCase (`loadCredentials()`, `validateName()`)
- **Types/Interfaces**: PascalCase (`Credentials`, `ServiceFormData`)
- **Constants**: UPPER_SNAKE_CASE (`CONFIG_DIR`, `SUPABASE_URL`)

## Import Organization

```typescript
// External dependencies
import { Command } from 'commander'
import { createClient } from '@supabase/supabase-js'

// Internal imports
import { loadCredentials } from '../lib/auth.js'
import type { Credentials } from '../lib/auth.js'
```

**Note**: ESM requires `.js` extension in import paths.

---
_Document patterns, not file trees. New files following patterns shouldn't require updates_
