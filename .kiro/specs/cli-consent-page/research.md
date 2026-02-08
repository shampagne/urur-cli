# ギャップ分析: cli-consent-page

## 分析概要

CLI ログインの同意ページ機能について、既存コードベースとの差分を分析した。

## 1. 現状調査

### 既存アセット

| カテゴリ | ファイル | 状態 |
|---------|--------|------|
| CLI ログインコマンド | `cli/src/commands/login.ts` | ✅ 存在（変更が必要） |
| CLI 設定 | `cli/src/lib/config.ts` | ✅ 存在（`WEB_URL` 追加が必要） |
| CLI ビルド設定 | `cli/tsup.config.ts` | ✅ 存在（`__WEB_URL__` 追加が必要） |
| CLI テスト設定 | `cli/vitest.config.ts` | ✅ 存在（`__WEB_URL__` 追加が必要） |
| CLI テスト | `cli/tests/commands/login.test.ts` | ✅ 存在（テスト更新が必要） |
| Web ログインページ | `web/app/routes/login.tsx` | ✅ 参照用（デザインパターン） |
| Web バリデーション | `web/app/lib/cli-consent-validation.ts` | ❌ 新規作成 |
| Web 同意ページ | `web/app/routes/cli/consent.tsx` | ❌ 新規作成 |
| CLI .env | `cli/.env` | ✅ 存在（`WEB_URL` 追加が必要） |
| CLI .env.example | `cli/.env.example` | ✅ 存在（`WEB_URL` 追加が必要） |

### 既存パターン・規約

- **CLI ビルド時定数**: `tsup.config.ts` の `define` で `__SUPABASE_URL__`, `__SUPABASE_ANON_KEY__` を埋め込み。`config.ts` で `declare const` → export のパターン。`WEB_URL` も同一パターンで追加可能。
- **Web ルーティング**: HonoX のファイルベースルーティング。`routes/cli/consent.tsx` は `routes/cli/` ディレクトリに配置。
- **Web ページデザイン**: `login.tsx` で中央カード、Space Mono ロゴ、ink/paper カラー (#0a0a0a/#fafaf9) のパターンが確立済み。
- **テストモック**: `login.test.ts` で `vi.mock` を使った依存モック済み。`open` のモックもあり、URL 引数の検証パターンが確立。

### 統合ポイント

- **CLI → Web**: `login.ts` の `open(oauthData.url)` を `open(consentUrl)` に変更するだけ。1行の変更。
- **Web → GitHub OAuth**: 同意ページは `window.location.href = oauth_url` でリダイレクトするだけ。Supabase クライアント不要。
- **環境変数**: Web 側では `c.env.SUPABASE_URL` からホスト名を取得可能（バリデーション用）。

## 2. 要件実現可能性分析

### 技術的ニーズ

| 要件 | 必要なもの | 状態 |
|------|----------|------|
| Req 1: 同意ページ表示 | HonoX ルート、JSX UI | 新規作成（login.tsx パターン流用） |
| Req 2: PKCE 維持 | CLI の open 先変更 | 既存コード 1行変更 |
| Req 3: セキュリティ | バリデーション関数 | 新規作成（シンプルなURL検証） |
| Req 4: デザイン一貫性 | login.tsx のスタイル参照 | パターン確立済み |
| Req 5: WEB_URL 設定 | config.ts + tsup + vitest | 既存パターンで追加（SUPABASE_URL と同一パターン） |

### ギャップと制約

- **Missing**: `web/app/routes/cli/` ディレクトリが存在しない → 新規作成
- **Missing**: バリデーション関数が存在しない → 新規作成
- **Constraint**: HonoX ルートは `createRoute` で作成する必要がある
- **Constraint**: Web 側では Supabase URL がサーバー環境変数 `c.env.SUPABASE_URL` で利用可能

### 複雑性

- **シンプルなリダイレクト**: 同意ページはCRUDやワークフローではなく、単純なバリデーション → 表示 → リダイレクト
- **既存パターンの踏襲**: すべての変更が既存パターンに沿っている

## 3. 実装アプローチ

### 推奨: Option C（ハイブリッドアプローチ）

**理由**: Web 側は新規作成、CLI 側は既存拡張

#### Web 側（新規作成）
- `web/app/lib/cli-consent-validation.ts` — バリデーション関数
- `web/app/lib/cli-consent-validation.test.ts` — テスト
- `web/app/routes/cli/consent.tsx` — 同意ページルート

**メリット**:
- CLI 関連のルートが `routes/cli/` に名前空間化される
- バリデーションが独立モジュールとしてテスト可能
- 既存の login.tsx に影響なし

#### CLI 側（既存拡張）
- `cli/src/lib/config.ts` — `WEB_URL` 追加（3行）
- `cli/tsup.config.ts` — `define` に `__WEB_URL__` 追加（3行）
- `cli/vitest.config.ts` — `define` に `__WEB_URL__` 追加（1行）
- `cli/src/commands/login.ts` — `open(oauthData.url)` → `open(consentUrl)` に変更（約5行）
- `cli/.env` / `cli/.env.example` — `WEB_URL` 追加（各1行）
- `cli/tests/commands/login.test.ts` — テスト更新

**メリット**:
- 変更が局所的で既存パターンに沿う
- 後方互換性に問題なし

### Option A / B の検討は不要
この機能は明確に Web 新規 + CLI 拡張のハイブリッドであり、他のアプローチは合理的でない。

## 4. 工数とリスク

- **工数**: **S**（既存パターンの踏襲、依存関係少、統合シンプル）
- **リスク**: **Low**（既知技術、明確なスコープ、最小限の統合ポイント）

## 5. 設計フェーズへの推奨事項

- **推奨アプローチ**: ハイブリッド（Web 新規 + CLI 既存拡張）
- **キー判断**: なし（すべて明確）
- **Research Needed**: なし（すべて既知技術）
