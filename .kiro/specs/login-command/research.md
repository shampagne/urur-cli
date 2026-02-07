# Research & Design Decisions

## Summary
- **Feature**: `login-command`
- **Discovery Scope**: Extension（既存の auth.ts / supabase.ts / config.ts を活用）
- **Key Findings**:
  - Supabase JS v2 は PKCE フローを内蔵。`signInWithOAuth({ skipBrowserRedirect: true })` で OAuth URL を取得し、`exchangeCodeForSession(code)` でトークン交換
  - CLI では `node:http` でローカルサーバーを起動し、コールバックで `code` パラメータを受け取る
  - Supabase クライアントに カスタム storage adapter が必要（PKCE の code_verifier 保持のため）

## Research Log

### Supabase OAuth PKCE フロー（CLI向け）
- **Context**: CLI から GitHub OAuth を行う方法の調査
- **Sources**: Supabase 公式ドキュメント（PKCE flow, signInWithOAuth, exchangeCodeForSession）
- **Findings**:
  - `supabase.auth.signInWithOAuth({ provider: 'github', options: { redirectTo, skipBrowserRedirect: true } })` で OAuth URL を取得
  - `data.url` をブラウザで開く
  - コールバック URL に `?code=xxx` が返る（トークンではなく認可コード）
  - `supabase.auth.exchangeCodeForSession(code)` で code_verifier と合わせてトークン交換
  - session に `access_token`, `refresh_token`, `expires_in`, `user` が含まれる
- **Implications**:
  - Supabase クライアント初期化時に `auth.flowType: 'pkce'` と `auth.storage` を指定する必要がある
  - code_verifier はインメモリ Map で十分（同一プロセス内で完結するため）
  - 既存の `getSupabaseClient()` を拡張してストレージアダプターを注入する

### カスタム Storage Adapter
- **Context**: Node.js 環境に localStorage がないため、Supabase Auth の PKCE フローに必要
- **Findings**:
  - `getItem`, `setItem`, `removeItem` の3メソッドを実装すればよい
  - CLI のログインは1回きりのプロセスなので、インメモリ Map で十分
  - セッション永続化は `auth.ts` の `saveCredentials()` で別途行う

## Design Decisions

### Decision: ローカルHTTPサーバーで OAuth コールバックを受信
- **Context**: CLI ツールが OAuth リダイレクトを受け取る必要がある
- **Alternatives**:
  1. `node:http` で一時サーバー起動 — 標準ライブラリのみ、依存なし
  2. Express/Fastify — オーバースペック
- **Selected Approach**: `node:http` で最小限のサーバーを起動
- **Rationale**: 依存を増やさず、1リクエスト受信してすぐ閉じるだけなので軽量で十分
- **Trade-offs**: 低レベルだが処理は極めて単純

### Decision: PKCE フローの採用
- **Context**: OAuth のセキュリティベストプラクティスとして PKCE が推奨される
- **Selected Approach**: Supabase JS 内蔵の PKCE フローを使用
- **Rationale**: supabase-js が code_verifier/code_challenge を自動管理するため、手動実装不要

## Risks & Mitigations
- **ポート衝突**: ユーザー指定ポートが使用中 → エラーメッセージで案内、`--port` で別ポート指定可能
- **タイムアウト**: ユーザーがブラウザで認証しない → 60秒タイムアウトで自動終了
- **code_verifier 消失**: プロセスが途中終了 → 再度 `urur login` で最初からやり直し（問題なし）
