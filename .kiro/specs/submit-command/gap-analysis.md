# ギャップ分析: submit-command

## 1. 現状調査

### 既存の再利用可能アセット

| アセット | ファイル | 状態 |
|---------|--------|------|
| 認証情報の読み書き | `src/lib/auth.ts` | ✅ 実装済み（`loadCredentials`, `saveCredentials`, `clearCredentials`） |
| Supabaseクライアント | `src/lib/supabase.ts` | ✅ 実装済み（`getSupabaseClient`、PKCE+メモリストレージ） |
| バリデーション関数 | `src/lib/validation.ts` | ✅ 実装済み（`validateAll`, 個別バリデータ5種、テスト済み） |
| 型定義 | `src/lib/types.ts` | ✅ 実装済み（`ServiceInsert`, `ServiceFormData`, `Service`等） |
| submitコマンドスタブ | `src/commands/submit.ts` | ⚠️ スタブのみ（インターフェース定義+未実装メッセージ） |
| Commander登録 | `src/program.ts` | ✅ 登録済み（オプション定義、ヘルプテキスト完備） |
| テストパターン | `tests/commands/login.test.ts` | ✅ モックパターン確立済み |

### 確認済みの規約パターン

- **認証→セッション設定**: `loadCredentials()` → `supabase.auth.setSession()` → `supabase.auth.getUser()`（login.tsで確立）
- **エラーハンドリング**: `process.exitCode = 1` + `pc.red()`でメッセージ表示
- **スピナー**: `ora('メッセージ').start()` / `spinner.stop()`
- **プロンプト**: `@inquirer/prompts`の`confirm`, `input`等
- **テストモック**: `vi.mock()`でdeps全モック → `vi.mocked()`で型安全アクセス

## 2. 要件−アセット対応マップ

| 要件 | 必要な技術要素 | ギャップ |
|-----|-------------|--------|
| Req 1: 認証チェック | `loadCredentials()`, `setSession()`, `getUser()` | **なし** — login.tsで確立済みパターンをそのまま適用 |
| Req 2: 対話モード | `@inquirer/prompts`の`input` | **Missing** — inputプロンプトのフロー実装が必要 |
| Req 3: CLIオプション | Commander options | **なし** — program.tsで登録済み、値を受け取るだけ |
| Req 4: バリデーション | `validateAll()` | **なし** — 完全実装済み＆テスト済み |
| Req 5: DB INSERT | `supabase.from('services').insert()` | **Missing** — Supabase data操作は初。auth操作のみ実績あり |
| Req 6: 投稿前確認 | `confirm()`, サマリー表示 | **Missing** — UIロジックの実装が必要 |

### ギャップサマリー

- **Missing**: 対話プロンプトフロー、DB INSERT処理、投稿前確認UI
- **Unknown**: なし（全技術要素は既知のライブラリ）
- **Constraint**: Supabase RLSポリシーに依存（`user_id`は認証ユーザーに紐づく）

## 3. 実装アプローチ

### 推奨: Option A — 既存コンポーネント拡張

**理由**: submitコマンドの全責務は1ファイル（`src/commands/submit.ts`）に収まる。新しいlibファイルは不要。

- **変更ファイル**:
  - `src/commands/submit.ts` — スタブを完全実装に書き換え
  - `tests/commands/submit.test.ts` — 新規作成（テスト）

- **再利用する既存資産**:
  - `loadCredentials()` — 認証情報読み込み
  - `getSupabaseClient()` — Supabaseクライアント取得
  - `validateAll()` — 入力バリデーション
  - `ServiceInsert` 型 — INSERT用データ型
  - login.test.tsのモックパターン — テスト構造

- **新規コードの範囲**:
  - 認証チェック（login.tsパターンのコピー）
  - 対話プロンプトフロー（`@inquirer/prompts`の`input`使用）
  - フォールバック判定ロジック（name/url未指定 → 対話モード）
  - サマリー表示＋確認プロンプト
  - `supabase.from('services').insert()`呼び出し

**トレードオフ**:
- ✅ 最小ファイル変更（submit.ts書き換え + テスト新規）
- ✅ 既存パターンをそのまま適用
- ✅ 新しい抽象化やlibファイル不要
- ❌ submit.tsがやや長くなる可能性（ただし許容範囲）

### Option B/Cは不採用

認証ヘルパーの共通化（login/submitで共有）は将来検討可能だが、現時点では2コマンドのみであり、抽象化は時期尚早。

## 4. 複雑性とリスク

- **Effort**: **S**（1–3日） — 既存パターンの組み合わせ、新技術要素なし
- **Risk**: **Low** — 全技術要素が既知、明確なスコープ、login.tsの成功パターンを踏襲

## 5. 設計フェーズへの推奨事項

- **推奨アプローチ**: Option A（submit.ts書き換え + テスト新規作成）
- **キー決定事項**: 対話モードフォールバックのトリガー条件（name/url未指定時）
- **Research Needed**: なし
