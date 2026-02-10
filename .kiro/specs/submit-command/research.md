# Research & Design Decisions: submit-command

## Summary
- **Feature**: `submit-command`
- **Discovery Scope**: Extension（既存CLIへのコマンド実装）
- **Key Findings**:
  - 認証→セッション設定パターンは login.ts で確立済み。そのまま適用可能
  - `@inquirer/prompts` の `input` は login.ts で使用実績なし（`confirm` のみ）。ただし同パッケージに含まれ、追加依存不要
  - Supabase data操作（`.from().insert()`）はコードベース初だが、標準的なAPI

## Research Log

### Supabase INSERT API パターン
- **Context**: コードベースでは auth 操作のみ実績があり、data 操作は初
- **Sources Consulted**: `@supabase/supabase-js` v2 ドキュメント
- **Findings**:
  - `supabase.from('services').insert(data).select().single()` で INSERT + 結果取得
  - RLS ポリシーにより `user_id` は認証済みユーザーに自動的に紐づく
  - エラーは `{ data, error }` パターンで返却（auth 操作と同じ）
- **Implications**: login.ts と同じエラーハンドリングパターンを適用可能

### @inquirer/prompts の input 関数
- **Context**: 対話モードで名前・URL等のテキスト入力が必要
- **Sources Consulted**: `@inquirer/prompts` パッケージ
- **Findings**:
  - `input({ message, validate? })` で利用。validate 関数でリアルタイムバリデーション可能
  - プロジェクトでは v7.2.1 を使用（package.json確認済み）
  - 追加依存なし
- **Implications**: 対話プロンプトでのバリデーションには既存の個別バリデータを直接利用可能

### 対話モードフォールバック判定
- **Context**: program.ts では `--name` と `--url` が必須ではなくオプション扱い
- **Findings**:
  - Commander options は全て optional。name と url が未指定なら対話モードにフォールバック
  - `-i` フラグは明示的に対話モードを選択する場合用
  - フォールバック時もオプションで指定済みの値はスキップしない（全項目を対話で入力）
- **Implications**: `!options.name || !options.url` → 対話モード。シンプルな判定

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| 単一ファイル拡張 | submit.ts 内に全ロジックを配置 | 最小変更、パターン踏襲 | ファイルがやや長くなる | ギャップ分析の推奨と一致 |

## Design Decisions

### Decision: 対話モードのフォールバック条件
- **Context**: ユーザーが `--name`/`--url` を指定しない場合の動作
- **Alternatives Considered**:
  1. name/url 未指定時にエラー終了
  2. name/url 未指定時に自動で対話モードにフォールバック
- **Selected Approach**: フォールバック方式（Option 2）
- **Rationale**: program.ts のヘルプテキストに「オプション未指定の場合は対話モードで入力します」と記載済み。ユーザー期待に合致
- **Trade-offs**: 対話なし環境（CI）では name/url 必須であることを明示する必要がある

### Decision: 投稿ステータスの初期値
- **Context**: `ServiceInsert.status` のデフォルト値
- **Selected Approach**: `status` フィールドは指定しない（DB デフォルト or RLS ポリシーに委譲）
- **Rationale**: サーバーサイドのロジックに従う。CLIが直接ステータスを制御すべきではない

## Risks & Mitigations
- RLS ポリシーによる INSERT 拒否 → エラーメッセージで明示的にユーザーに伝達
- セッション期限切れ → `getUser()` でセッション有効性を事前検証
