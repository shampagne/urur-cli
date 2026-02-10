# Research & Design Decisions

## Summary
- **Feature**: `multi-provider-login`
- **Discovery Scope**: Extension（既存ログインページへのプロバイダ追加）
- **Key Findings**:
  - Supabase の `signInWithOAuth` は provider パラメータを変えるだけで GitHub/Google 共通のフローを利用可能
  - `signInWithOtp` による Magic Link は PKCE code exchange と同じ `/auth/callback` エンドポイントで処理される
  - 既存の `auth/callback.tsx` は変更不要 — `exchangeCodeForSession(code)` がプロバイダ非依存で動作する

## Research Log

### Supabase OAuth プロバイダ追加
- **Context**: 既存の GitHub OAuth に Google を追加する際の API 互換性確認
- **Findings**:
  - `supabase.auth.signInWithOAuth({ provider: 'google' })` は GitHub と同一のインターフェース
  - `redirectTo` オプションも共通で、同じコールバック URL を使用可能
  - Supabase ダッシュボードで Google provider の有効化 + Client ID/Secret の設定が必要
- **Implications**: クライアント側のコード変更は最小限（provider 文字列の変更のみ）

### Supabase Magic Link (signInWithOtp)
- **Context**: Email ログインの実装方式の調査
- **Findings**:
  - `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } })` で Magic Link を送信
  - ユーザーがメール内リンクをクリックすると `emailRedirectTo` に `code` パラメータ付きでリダイレクト
  - この `code` は既存の PKCE `exchangeCodeForSession` で処理可能
  - Supabase ダッシュボードで Email provider の Magic Link を有効化する必要あり
- **Implications**: callback.tsx の変更不要。login.tsx にメール入力 UI と `signInWithOtp` 呼び出しを追加するのみ

### 認証コールバックの互換性
- **Context**: 3プロバイダ全てが同一コールバックで処理可能か
- **Findings**:
  - `auth/callback.tsx` の `exchangeCodeForSession(code)` はプロバイダ非依存
  - OAuth（GitHub/Google）も Magic Link も同一の code パラメータ形式
  - implicit flow の hash fragment フォールバックも引き続き動作
- **Implications**: コールバック側のロジック変更は一切不要

## Design Decisions

### Decision: クライアントサイド inline script パターンの維持
- **Context**: 既存の login.tsx は `dangerouslySetInnerHTML` でクライアントサイド JS を埋め込んでいる
- **Alternatives Considered**:
  1. 既存パターン維持（inline script）
  2. 別ファイルに分離してバンドル
- **Selected Approach**: 既存パターンを維持
- **Rationale**: HonoX の SSR パターンに合致しており、単一ファイルで完結する利点がある。OAuth ロジックは軽量で分離のメリットが小さい
- **Trade-offs**: inline script が長くなるが、共通関数（`handleOAuth`, `setButtonLoading`）で重複を排除

### Decision: OAuth ハンドラの共通化
- **Context**: GitHub と Google で同一の OAuth フローを使うため、コードの重複を避けたい
- **Selected Approach**: `handleOAuth(provider)` 関数を定義し、provider 名を引数で渡す
- **Rationale**: `signInWithOAuth` の呼び出しは provider 以外同一。ボタンの ID 命名規則 `{provider}-login-btn` で動的に取得

## Risks & Mitigations
- Supabase ダッシュボードで Google/Email provider が未設定の場合、ボタンは表示されるがクリック時にエラーになる — エラーハンドリングでユーザーに通知
- Magic Link のメール配信遅延 — 成功メッセージで「メールを確認してください」と案内

## References
- Supabase Auth signInWithOAuth — 公式ドキュメント
- Supabase Auth signInWithOtp — 公式ドキュメント
- Supabase PKCE flow — exchangeCodeForSession
