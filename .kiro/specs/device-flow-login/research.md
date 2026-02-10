# Research & Design Decisions

## Summary
- **Feature**: `device-flow-login`
- **Discovery Scope**: Complex Integration
- **Key Findings**:
  - GitHub Device Flow はクライアントシークレット不要。エンドポイント2つ: `/login/device/code` と `/login/oauth/access_token`
  - Supabase は Device Flow 未サポート。`admin.generateLink(magiclink)` + `verifyOtp(token_hash)` で サーバーサイドセッション生成が可能
  - Automatic User Linking がデフォルト有効。verified メールアドレスが一致すれば既存ユーザーに自動統合される

## Research Log

### GitHub Device Flow API
- **Context**: CLI ログインでローカルサーバーを不要にするため
- **Sources Consulted**: [GitHub Docs](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)
- **Findings**:
  - Step 1: `POST https://github.com/login/device/code` → `device_code`, `user_code`, `verification_uri`, `expires_in`(900s), `interval`(5s)
  - Step 2: ユーザーが `https://github.com/login/device` でコード入力
  - Step 3: `POST https://github.com/login/oauth/access_token` でポーリング（`grant_type=urn:ietf:params:oauth:grant-type:device_code`）
  - エラー: `authorization_pending`(継続), `slow_down`(+5s), `expired_token`(再開始), `access_denied`(ユーザーキャンセル)
  - クライアントシークレット不要（public client）
  - `Accept: application/json` ヘッダーで JSON レスポンス取得
- **Implications**: CLI から直接 GitHub API を呼ぶか Edge Function 経由にするか。セキュリティ上 Edge Function 経由が望ましい（client_id の隠蔽、GitHub token の中継）

### Supabase セッション生成（サーバーサイド）
- **Context**: GitHub access_token を Supabase セッションに変換する方法
- **Sources Consulted**: [Supabase Docs](https://supabase.com/docs/reference/javascript/auth-admin-generatelink), [catjam.fi](https://catjam.fi/articles/supabase-generatelink-fix)
- **Findings**:
  - `admin.generateLink({ type: 'magiclink', email })` → `data.properties.hashed_token` を取得
  - `supabase.auth.verifyOtp({ token_hash, type: 'email' })` → セッション生成
  - `generateLink` はユーザーが存在しなければ自動作成する
  - `SUPABASE_SERVICE_ROLE_KEY` が必要（admin 操作）
  - Edge Function 内で完結可能
- **Implications**: Edge Function で GitHub token → メール取得 → generateLink → verifyOtp の流れでセッション生成

### Supabase Edge Function ランタイム
- **Context**: Edge Function の開発環境と制約
- **Sources Consulted**: Supabase config.toml
- **Findings**:
  - Deno v2 ランタイム
  - `supabase/functions/` ディレクトリに配置
  - 現在 Edge Function は未使用（新規作成）
  - 環境変数: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` は自動提供
- **Implications**: GitHub OAuth App の `client_id` を Edge Function の環境変数として追加設定が必要

### Magic Link（メール OTP）フロー
- **Context**: GitHub なしでもログインできるようにする
- **Findings**:
  - `supabase.auth.signInWithOtp({ email })` で Magic Link メール送信
  - CLI 側で OTP コード入力 → `supabase.auth.verifyOtp({ email, token, type: 'email' })` でセッション取得
  - Edge Function 不要（Supabase クライアントから直接可能）
- **Implications**: Magic Link フローは CLI から Supabase に直接アクセスするため、Edge Function は GitHub Device Flow 専用

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Edge Function プロキシ | GitHub API 呼び出しを Edge Function に集約 | client_id 隠蔽、GitHub token がクライアントに残らない | Edge Function の追加管理コスト | 採用 |
| CLI 直接呼び出し | CLI から GitHub API を直接呼ぶ | シンプル、Edge Function 不要 | client_id が CLI バイナリに埋め込まれる | 不採用（セキュリティ上） |

## Design Decisions

### Decision: Edge Function のエンドポイント設計
- **Context**: Device Flow には2段階の API 呼び出しが必要
- **Alternatives Considered**:
  1. 2つの Edge Function（device-code, poll-token）に分割
  2. 1つの Edge Function でパスルーティング
- **Selected Approach**: 1つの Edge Function `cli-auth` でリクエストボディの `action` フィールドでルーティング
- **Rationale**: 関連する機能を1つにまとめ、共通の初期化コードを共有。Supabase Edge Function はファイル単位でデプロイされるため、1ファイルが自然
- **Trade-offs**: ファイルが大きくなるが、2アクション程度なら問題なし

### Decision: CLI 側のポーリング実装
- **Context**: Device Flow のポーリングを CLI と Edge Function のどちらで行うか
- **Alternatives Considered**:
  1. CLI がポーリングし、完了後に Edge Function でセッション生成
  2. Edge Function がポーリングを含めて処理
- **Selected Approach**: CLI が Edge Function の poll エンドポイントを定期的に呼び出し、Edge Function は毎回 GitHub API に問い合わせてレスポンスを返す
- **Rationale**: Edge Function はステートレスであるべき。長時間のポーリングは Edge Function のタイムアウト制約に抵触する
- **Trade-offs**: CLI が複数回 Edge Function を呼ぶが、各呼び出しは高速

## Risks & Mitigations
- **GitHub API レート制限** — ポーリング間隔を `interval` レスポンスに従い、`slow_down` で +5s 追加
- **Edge Function タイムアウト** — 各リクエストを独立させ、ステートレスに保つ
- **メールアドレスの不一致** — GitHub API から verified メールのみ使用。verified メールがない場合はエラーを返す
- **Automatic User Linking の前提** — Supabase のデフォルト動作に依存。ドキュメント化して運用リスクを軽減

## References
- [GitHub Device Flow Docs](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps) — Device Flow の公式ドキュメント
- [Supabase admin.generateLink](https://supabase.com/docs/reference/javascript/auth-admin-generatelink) — サーバーサイドリンク生成 API
- [Supabase Identity Linking](https://supabase.com/docs/guides/auth/auth-identity-linking) — Automatic Linking の仕様
- [catjam.fi generateLink fix](https://catjam.fi/articles/supabase-generatelink-fix) — generateLink + verifyOtp の実装例
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions) — Edge Function の開発ガイド
