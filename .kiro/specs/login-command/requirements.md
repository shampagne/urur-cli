# Requirements Document

## Introduction

urur CLIのloginコマンドを実装する。GitHub OAuthでブラウザ認証を行い、Supabaseのアクセストークン/リフレッシュトークンをローカル（`~/.urur/credentials.json`）に保存する。CLIはローカルHTTPサーバーを起動してOAuthコールバックを受け取り、ブラウザを自動で開く。認証成功後にユーザー名を表示して終了する。

## Requirements

### Requirement 1: OAuth認証フローの開始
**Objective:** As a CLI利用者, I want `urur login` でGitHub認証を開始したい, so that ターミナルから簡単にログインできる

#### Acceptance Criteria
1. When `urur login` を実行した時, the CLI shall ローカルHTTPサーバーをデフォルトポート8976で起動する
2. When `urur login --port 3000` を実行した時, the CLI shall 指定されたポート3000でローカルHTTPサーバーを起動する
3. When ローカルHTTPサーバーが起動した時, the CLI shall Supabase GitHub OAuthのURLをブラウザで自動的に開く
4. While ブラウザでの認証を待っている間, the CLI shall スピナーを表示して待機状態であることをユーザーに伝える

### Requirement 2: OAuthコールバックの処理
**Objective:** As a CLI利用者, I want GitHub認証後に自動的にトークンが保存されてほしい, so that 手動でトークンをコピーする手間がない

#### Acceptance Criteria
1. When SupabaseからOAuthコールバックを受信した時, the CLI shall アクセストークン・リフレッシュトークン・有効期限を `~/.urur/credentials.json` に保存する
2. When トークンの保存が成功した時, the CLI shall ローカルHTTPサーバーをシャットダウンする
3. When トークンの保存が成功した時, the CLI shall 認証されたGitHubユーザー名を表示する
4. When トークンの保存が成功した時, the CLI shall ログイン成功メッセージを表示してプロセスを正常終了する

### Requirement 3: エラーハンドリング
**Objective:** As a CLI利用者, I want 認証に失敗した場合にわかりやすいエラーメッセージを見たい, so that 問題を特定して再試行できる

#### Acceptance Criteria
1. If 指定されたポートが既に使用中の場合, the CLI shall ポートが使用中である旨のエラーメッセージを表示して終了する
2. If OAuthコールバックでエラーが返された場合, the CLI shall エラー内容を表示してローカルHTTPサーバーをシャットダウンし終了する
3. If 認証が60秒以内に完了しなかった場合, the CLI shall タイムアウトメッセージを表示してローカルHTTPサーバーをシャットダウンし終了する

### Requirement 4: 既存ログイン状態の考慮
**Objective:** As a CLI利用者, I want 既にログイン済みの場合に適切に案内されたい, so that 不要な再認証を避けられる

#### Acceptance Criteria
1. While 有効な認証情報が既に存在する時, when `urur login` を実行した時, the CLI shall 既にログイン済みである旨とユーザー名を表示する
2. While 有効な認証情報が既に存在する時, when `urur login` を実行した時, the CLI shall 再ログインするか確認プロンプトを表示する
3. When ユーザーが再ログインを選択した時, the CLI shall 既存の認証情報を削除して新しい認証フローを開始する
4. When ユーザーが再ログインをキャンセルした時, the CLI shall 何もせずに終了する

### Requirement 5: テスト
**Objective:** As a 開発者, I want loginコマンドの認証フローがテストで保証されていてほしい, so that リグレッションを防止できる

#### Acceptance Criteria
1. The test suite shall OAuthコールバック処理（トークン保存・ユーザー情報取得）をユニットテストで検証する
2. The test suite shall エラーケース（ポート使用中・タイムアウト・コールバックエラー）をユニットテストで検証する
3. The test suite shall 既存ログイン状態の判定ロジックをユニットテストで検証する
4. The test suite shall Vitestで実行される
