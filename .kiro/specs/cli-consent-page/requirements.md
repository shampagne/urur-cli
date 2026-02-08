# Requirements Document

## Introduction
`urur login` コマンドは現在、ブラウザを直接 GitHub OAuth URL に遷移させている。ユーザーがログイン操作を明示的に確認できるよう、urur.dev にホスト型の同意ページを追加する。CLIが生成した OAuth URL をクエリパラメータとして同意ページに渡し、ユーザーが承認ボタンを押した場合のみ OAuth フローに進む。PKCE フローは CLI 側で完結させ、同意ページはリダイレクトのみを担当する。

## Requirements

### Requirement 1: 同意ページの表示
**Objective:** CLIユーザーとして、ログイン前にブラウザで確認画面を見たい。意図しない認証を防ぐため。

#### Acceptance Criteria
1. When `urur login` コマンドが実行された場合, the CLI shall urur.dev の同意ページ URL をブラウザで開く（直接 OAuth URL ではなく）
2. The 同意ページ shall 「urur CLI にログインしますか？」という趣旨の確認メッセージを表示する
3. The 同意ページ shall 承認ボタンとキャンセルボタンを表示する
4. When 承認ボタンがクリックされた場合, the 同意ページ shall クエリパラメータで渡された OAuth URL にリダイレクトする
5. When キャンセルボタンがクリックされた場合, the 同意ページ shall ウィンドウを閉じる

### Requirement 2: PKCE フローの維持
**Objective:** システムとして、既存の PKCE 認証フローを壊さずに同意ページを挿入したい。セキュリティを維持するため。

#### Acceptance Criteria
1. The CLI shall `signInWithOAuth()` で生成した OAuth URL をそのまま同意ページにクエリパラメータとして渡す
2. The 同意ページ shall OAuth の `signInWithOAuth()` を呼び出さない（リダイレクトのみ）
3. The CLI shall PKCE の `code_verifier` をインメモリに保持し、コールバックで `code` を受け取り `exchangeCodeForSession()` でセッションを取得する

### Requirement 3: セキュリティバリデーション
**Objective:** セキュリティとして、オープンリダイレクト攻撃を防止したい。同意ページが悪意あるリダイレクト先に利用されないため。

#### Acceptance Criteria
1. The 同意ページ shall `redirect_uri` パラメータが `http://127.0.0.1:*` または `http://localhost:*` である場合のみ許可する
2. The 同意ページ shall `oauth_url` パラメータのホスト名が Supabase URL のホスト名と一致する場合のみ許可する
3. If `redirect_uri` が不正な値の場合, the 同意ページ shall リダイレクトせずエラーメッセージを表示する
4. If `oauth_url` が不正な値の場合, the 同意ページ shall リダイレクトせずエラーメッセージを表示する
5. If 必須パラメータが欠落している場合, the 同意ページ shall リダイレクトせずエラーメッセージを表示する

### Requirement 4: デザインの一貫性
**Objective:** ユーザーとして、既存の urur.dev ログインページと一貫したデザインで同意ページを見たい。ブランド体験の統一のため。

#### Acceptance Criteria
1. The 同意ページ shall login.tsx と同じデザインシステム（中央カード、Space Mono ロゴ、ink/paper カラー）を使用する
2. The 同意ページ shall Supabase CDN やクライアントライブラリを読み込まない（OAuth 呼び出しは行わないため）

### Requirement 5: CLI の WEB_URL 設定
**Objective:** 開発者として、同意ページの URL をビルド時に設定可能にしたい。開発環境と本番環境で異なるホストを使い分けるため。

#### Acceptance Criteria
1. The CLI shall ビルド時定数 `WEB_URL` を通じて同意ページのベース URL を設定可能にする
2. The CLI shall 本番環境のデフォルト値として `https://urur.dev` を使用する
3. The CLI shall 開発環境（`.env`）で `WEB_URL` を上書き可能にする
