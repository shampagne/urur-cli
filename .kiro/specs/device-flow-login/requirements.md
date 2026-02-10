# Requirements Document

## Introduction

現在の CLI ログインはローカルサーバー（127.0.0.1:8976）+ PKCE フローを使用しているが、ポート衝突や UX の問題がある。GitHub Device Flow と Magic Link（メール）の2方式に移行し、ローカルサーバーを廃止する。Supabase は Device Flow をネイティブサポートしていないため、Supabase Edge Function を中間サーバーとして使用し、GitHub access_token から Supabase セッションを生成する。

## Requirements

### Requirement 1: ログイン方法の選択

**Objective:** CLI ユーザーとして、ログイン方法を選択したい。GitHub アカウントまたはメールアドレスのどちらかで認証できるようにするため。

#### Acceptance Criteria

1. When `urur login` を実行した時, the CLI shall ログイン方法の選択肢（GitHub / メールアドレス）を表示する
2. When ユーザーがログイン方法を選択した時, the CLI shall 選択された方式に応じた認証フローを開始する
3. While 既にログイン済みの状態で, when `urur login` を実行した時, the CLI shall 現在のユーザー名を表示し再ログインするか確認する

### Requirement 2: GitHub Device Flow ログイン

**Objective:** CLI ユーザーとして、GitHub Device Flow でログインしたい。ローカルサーバーを起動せず、任意のデバイスで認証できるようにするため。

#### Acceptance Criteria

1. When GitHub ログインを選択した時, the CLI shall ユーザーコードと認証 URL（https://github.com/login/device）を表示する
2. When ユーザーコードを表示した時, the CLI shall 認証 URL をブラウザで自動的に開く
3. While 認証待ちの状態で, the CLI shall スピナーを表示しながらポーリングでトークンの取得を試みる
4. When GitHub で認証が完了した時, the CLI shall Edge Function 経由で Supabase セッションを取得し、認証情報をローカルに保存する
5. When 認証が成功した時, the CLI shall ログインしたユーザー名を表示する

### Requirement 3: Magic Link（メール）ログイン

**Objective:** CLI ユーザーとして、メールアドレスでログインしたい。GitHub アカウントを持っていなくてもサービスを利用できるようにするため。

#### Acceptance Criteria

1. When メールアドレスログインを選択した時, the CLI shall メールアドレスの入力を求める
2. When 有効なメールアドレスを入力した時, the CLI shall Supabase の Magic Link メールを送信する
3. When メールを送信した時, the CLI shall メール内の認証コード（OTP）の入力を求める
4. When 正しい OTP を入力した時, the CLI shall Supabase セッションを取得し、認証情報をローカルに保存する
5. If 無効なメールアドレスを入力した時, the CLI shall エラーメッセージを表示し再入力を求める
6. If 無効な OTP を入力した時, the CLI shall エラーメッセージを表示し再入力を求める

### Requirement 4: Supabase Edge Function（トークン交換）

**Objective:** CLI システムとして、GitHub access_token を Supabase セッションに変換したい。Supabase が Device Flow をネイティブサポートしていないため。

#### Acceptance Criteria

1. When CLI から GitHub Device Flow の開始リクエストを受けた時, the Edge Function shall GitHub API にデバイスコードを要求し、user_code と verification_uri を返す
2. When CLI からポーリングリクエストを受けた時, the Edge Function shall GitHub API にトークンを問い合わせ、認証が完了していれば Supabase セッションを生成して返す
3. When GitHub access_token を受け取った時, the Edge Function shall GitHub API からユーザーの verified メールアドレスを取得する
4. When verified メールアドレスを取得した時, the Edge Function shall `admin.generateLink` と `verifyOtp` を使用して Supabase セッションを生成する
5. If GitHub API からのレスポンスが `authorization_pending` の場合, the Edge Function shall その旨を CLI に返す
6. If GitHub API からのレスポンスが `expired_token` の場合, the Edge Function shall 期限切れエラーを CLI に返す
7. The Edge Function shall SUPABASE_SERVICE_ROLE_KEY をサーバーサイドでのみ使用し、CLI に公開しない

### Requirement 5: エラーハンドリング

**Objective:** CLI ユーザーとして、認証エラー時に適切なフィードバックを受けたい。問題を特定して再試行できるようにするため。

#### Acceptance Criteria

1. If Device Flow の認証が 15 分以内に完了しなかった場合, the CLI shall タイムアウトメッセージを表示する
2. If ネットワークエラーが発生した場合, the CLI shall ネットワーク接続を確認するよう促すメッセージを表示する
3. If Edge Function がエラーを返した場合, the CLI shall エラー内容を表示し、`process.exitCode = 1` を設定する
4. If Magic Link の OTP 入力が一定回数失敗した場合, the CLI shall メールの再送を提案する
5. The CLI shall エラー発生時に `process.exit()` を呼ばず、`process.exitCode = 1` を使用する

### Requirement 6: 既存コードの廃止

**Objective:** 開発者として、不要になったローカルサーバー関連コードを削除したい。コードベースをシンプルに保つため。

#### Acceptance Criteria

1. The CLI shall ローカル HTTP サーバー（oauthServer）を使用しない
2. The CLI shall `--port` オプションを `login` コマンドから削除する
3. The CLI shall Web 側の consent ページ（`/cli/consent`）への依存を削除する
